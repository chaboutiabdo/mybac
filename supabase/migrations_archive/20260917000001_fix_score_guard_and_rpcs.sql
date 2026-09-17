-- Fixes found by the code audit and confirmed live against the running stack.
--
-- The headline item is a REGRESSION introduced by 20251121000002: the profile
-- guard reverted `total_score` on every non-admin write, INCLUDING the
-- legitimate SECURITY DEFINER trigger that banks earned points. Net effect:
-- students earned points, `points_transactions` filled up, and
-- `profiles.total_score` stayed at 0 forever. The leaderboard was frozen.
--
-- Measured before this migration:
--   total_score before: 0
--   rpc record_points_transaction -> 200      (25 legitimate points)
--   total_score after : 0                     <-- silently reverted
--
-- The same faulty condition was also a security hole. It read:
--
--   IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN ... revert
--
-- on the assumption that `auth.uid() IS NULL` meant "migration or service_role".
-- It does not: a request carrying only the anon publishable key also has
-- auth.uid() = NULL, so the guard skipped anonymous callers entirely.
--
-- Probed on the live stack. `current_user` is NOT usable here: this trigger is
-- itself SECURITY DEFINER, so inside it current_user is ALWAYS 'postgres', no
-- matter who called. `auth.role()` reads the JWT claim and survives that:
--
--   anon request      -> auth.role() = 'anon'
--   student request   -> auth.role() = 'authenticated'
--   service key       -> auth.role() = 'service_role'
--   psql / migration  -> auth.role() IS NULL
--
-- and `pg_trigger_depth()` separates a DIRECT client UPDATE (depth 1) from the
-- nested write made by update_student_total_score, which fires AFTER INSERT on
-- points_transactions and then updates profiles (depth 2). A client cannot
-- forge either value through PostgREST.

CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Constrain only a DIRECT write from an end user or an anonymous caller.
  -- Nested trigger writes (the scoring path), the service key, migrations and
  -- admins all pass through.
  IF pg_trigger_depth() <= 1
     AND auth.role() IN ('anon', 'authenticated')
     AND NOT public.is_admin()
  THEN
    NEW.role                := OLD.role;
    NEW.total_score         := OLD.total_score;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_tier   := OLD.subscription_tier;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------- calculate_user_score
-- SECURITY DEFINER, takes a caller-supplied uuid, and ends with
--   UPDATE profiles SET total_score = ... WHERE user_id = user_id_param
-- It inherited the default EXECUTE TO PUBLIC, so PostgREST served it at
-- /rest/v1/rpc/calculate_user_score to the anon role. Confirmed live:
-- an anonymous POST with any user's uid returned HTTP 200 and rewrote that
-- user's score.
--
-- Nothing in src/ calls it; it exists to back triggers, and trigger execution
-- does not consult EXECUTE privileges.
REVOKE ALL ON FUNCTION public.calculate_user_score(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_user_score(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.calculate_user_score(uuid) FROM authenticated;

-- Same treatment for every other SECURITY DEFINER helper that writes scores.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN ('update_user_score', 'update_student_total_score',
                        'recalculate_all_user_scores')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
  END LOOP;
END $$;

-- -------------------------------------------- record_points_transaction
-- The ownership check was added in 20251121000003, but `p_points` was still
-- whatever the caller sent — a student could bank 1,000,000 points in one
-- call. Derive the amount from the activity instead, and make the ownership
-- comparison NULL-safe (`<>` against a NULL auth.uid() yields NULL, which
-- does not fire the IF).
-- NOTE: the parameter ORDER must match the original definition exactly.
-- Changing it creates a second overload and PostgREST answers 300 Multiple
-- Choices to every call.
CREATE OR REPLACE FUNCTION public.record_points_transaction(
  p_student_id uuid,
  p_points integer,
  p_source_type text,
  p_source_id uuid DEFAULT NULL,
  p_source_description text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_chapter text DEFAULT NULL,
  p_quiz_type text DEFAULT NULL,
  p_question_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_id uuid;
BEGIN
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'student_id is required';
  END IF;

  -- IS DISTINCT FROM so a NULL auth.uid() (anon) fails closed
  IF p_student_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Cannot record points for another user';
  END IF;

  -- The value of an activity is set here, not by the caller.
  v_points := CASE p_source_type
                WHEN 'video'   THEN 5
                WHEN 'exam'    THEN 10
                WHEN 'booking' THEN 70
                WHEN 'quiz'    THEN CASE WHEN p_quiz_type = 'daily' THEN 25 ELSE 8 END
                ELSE NULL
              END;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Unknown source_type: %', p_source_type;
  END IF;

  INSERT INTO public.points_transactions (
    student_id, points, source_type, source_id, source_description,
    subject, chapter, quiz_type, question_id
  ) VALUES (
    p_student_id, v_points, p_source_type, p_source_id, p_source_description,
    p_subject, p_chapter, p_quiz_type, p_question_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- drop the accidental overload if a previous run of this file created one
DROP FUNCTION IF EXISTS public.record_points_transaction(
  uuid, integer, text, text, uuid, text, text, text, text);

REVOKE ALL ON FUNCTION public.record_points_transaction(
  uuid, integer, text, uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_points_transaction(
  uuid, integer, text, uuid, text, text, text, text, text) TO authenticated;

-- The same activity cannot be banked twice.
CREATE UNIQUE INDEX IF NOT EXISTS points_transactions_unique_award
  ON public.points_transactions (student_id, source_type, source_id, question_id)
  WHERE source_id IS NOT NULL AND question_id IS NOT NULL;

-- ------------------------------------------ quiz_question_results replay
-- The INSERT policy checks only `student_id = auth.uid()`, so `is_correct`
-- is attacker-chosen and the same question could be submitted for credit any
-- number of times. Server-side grading is the real fix (see DEVELOPMENT.md);
-- this at least makes each answer bankable once.
DELETE FROM public.quiz_question_results a
  USING public.quiz_question_results b
  WHERE a.ctid < b.ctid
    AND a.quiz_attempt_id = b.quiz_attempt_id
    AND a.question_id = b.question_id;

CREATE UNIQUE INDEX IF NOT EXISTS quiz_question_results_unique_answer
  ON public.quiz_question_results (quiz_attempt_id, question_id);

-- --------------------------------------------------------- avatars bucket
-- Created public with three write policies that gated on nothing but the
-- bucket name and carried no TO clause, so they applied to anon. Confirmed
-- live: an anonymous PUT returned HTTP 200 — anyone could host arbitrary
-- content on the project's own storage origin, and delete anyone's file.
--
-- The bucket is referenced zero times in src/. Storage rows are delete-
-- protected by storage.protect_delete(), so revoke the access instead:
-- flip it private and drop every permissive policy.
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

DROP POLICY IF EXISTS "Users can upload avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- If the bucket is ever used, re-add scoped policies in the standard shape:
--   WITH CHECK (bucket_id = 'avatars'
--               AND (storage.foldername(name))[1] = auth.uid()::text)
-- With no policy at all, RLS on storage.objects denies by default.

-- ------------------------------------------------------- probe cleanup
DROP FUNCTION IF EXISTS public._probe_ctx();
DROP FUNCTION IF EXISTS public._probe_definer();

DROP FUNCTION IF EXISTS public._p2();

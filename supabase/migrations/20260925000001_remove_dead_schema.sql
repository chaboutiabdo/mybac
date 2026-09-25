-- Dead weight (inventory of 24 Sep 2026): the alumni/bookings feature tables,
-- two write-only logs, broken updated_at triggers (every advice_tips UPDATE
-- failed, so editing a tip in the admin panel never worked), policies that
-- can never match, duplicate policies and indexes, and never-used columns.
-- The app code that wrote any of these was removed in the same change.
-- Separate from the review-log migration so its guard can never block that fix.

-- Guard: stop (and change nothing) if a "dead" table turns out to hold data
-- on this database. questions_import is only ever a copy of quizzes.questions.
DO $$
DECLARE t text; n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['alumni','alumni_advice','alumni_files','alumni_resources','bookings','student_questions_log'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION 'refusing to drop %: it holds % row(s) — check them first', t, n;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ── 2. dead tables ───────────────────────────────────────────────────────
-- The alumni / booking feature was removed from the app long ago (see
-- 20260920000000_score_integrity.sql); these held no rows and nothing reads them.
DROP TABLE IF EXISTS public.bookings, public.alumni_advice, public.alumni_files,
  public.alumni_resources, public.alumni;
DROP TYPE IF EXISTS public.booking_status;
-- The empty alumni-files bucket itself is left for the dashboard; its
-- policies go, so nothing can read or write it.
DROP POLICY IF EXISTS "Admins can delete alumni files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update alumni files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload alumni files" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in users can view alumni files" ON storage.objects;

-- Written by two hook functions nothing called; read by one admin tab.
DROP TABLE IF EXISTS public.student_questions_log;
-- A write-only copy of every uploaded quiz's questions, never read.
DROP TABLE IF EXISTS public.questions_import;

-- ── 3. broken or redundant triggers ──────────────────────────────────────
-- These tables have no updated_at column: every UPDATE on advice_tips failed.
DROP TRIGGER IF EXISTS handle_updated_at ON public.advice_tips;
DROP TRIGGER IF EXISTS update_exam_activity_logs_updated_at ON public.exam_activity_logs;
DROP TRIGGER IF EXISTS update_video_activity_logs_updated_at ON public.video_activity_logs;
-- Silently deleted an admin's expired tips; reads already hide them.
DROP TRIGGER IF EXISTS clean_expired_tips_trigger ON public.advice_tips;
DROP FUNCTION IF EXISTS public.clean_expired_tips();

-- ── 4. policies that never match, and exact duplicates ───────────────────
-- profiles.id is never auth.uid(): these two compared the wrong column.
DROP POLICY IF EXISTS "Admins can see all support requests" ON public.support_requests;
DROP POLICY IF EXISTS "Users can see their own support requests" ON public.support_requests;
-- The JWT role claim is 'authenticated', never 'admin'. Because it never
-- matched, admins could only see active public tips: a tip aimed at one
-- student (or an expired one) vanished from /admin/tips and couldn't be edited
-- or deleted. The real admin rule replaces it.
DROP POLICY IF EXISTS "Admins have full access to advice tips" ON public.advice_tips;
CREATE POLICY "Admins can view all tips" ON public.advice_tips
  FOR SELECT TO authenticated USING (public.is_admin());
-- profiles: keep one own-read, one own-update (the one with WITH CHECK) and
-- the admin policies; drop the identical copies.
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile subscription" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own subscription status" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- ── 5. never-used columns ────────────────────────────────────────────────
-- The guard copied subscription_tier; re-create it without that line first.
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    NEW.email               := OLD.email;
  END IF;
  RETURN NEW;
END;
$function$;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS subscription_tier;
DROP TYPE IF EXISTS public.subscription_tier;

ALTER TABLE public.quiz_question_results DROP COLUMN IF EXISTS time_spent;
ALTER TABLE public.exam_progress DROP COLUMN IF EXISTS completed_at;
ALTER TABLE public.video_progress DROP COLUMN IF EXISTS watch_time;
ALTER TABLE public.video_activity_logs DROP COLUMN IF EXISTS position, DROP COLUMN IF EXISTS session_id;
ALTER TABLE public.exam_activity_logs DROP COLUMN IF EXISTS difficulty;
ALTER TABLE public.videos DROP COLUMN IF EXISTS views;
ALTER TABLE public.advice_tips DROP COLUMN IF EXISTS category;

-- ── 6. duplicate indexes ─────────────────────────────────────────────────
-- Exact duplicates:
DROP INDEX IF EXISTS public.idx_profiles_user_id;            -- = profiles_user_id_key
DROP INDEX IF EXISTS public.advice_tips_target_user_idx;     -- = idx_advice_tips_target_user
DROP INDEX IF EXISTS public.support_requests_status_idx;     -- = idx_support_requests_status
-- The leading column(s) of a wider index on the same table:
DROP INDEX IF EXISTS public.idx_ai_conversations_user_id;             -- (user_id, created_at)
DROP INDEX IF EXISTS public.idx_quiz_question_results_student_id;     -- (student_id, quiz_id, question_id)
DROP INDEX IF EXISTS public.idx_quiz_question_results_quiz_attempt;   -- (quiz_attempt_id, question_id)
DROP INDEX IF EXISTS public.idx_quiz_attempts_quiz_student;           -- (quiz_id, student_id, attempt_number)
DROP INDEX IF EXISTS public.idx_support_requests_email;               -- (email, type)
DROP INDEX IF EXISTS public.idx_support_requests_type;                -- (type, status)
DROP INDEX IF EXISTS public.idx_mistakes_student_id;                  -- (student_id, quiz_id, question_id)
DROP INDEX IF EXISTS public.idx_points_transactions_student_id;       -- (student_id, source_type, ...)

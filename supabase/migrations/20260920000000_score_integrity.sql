-- Score integrity.
--
-- profiles.total_score had THREE writers: update_student_total_score (the
-- points ledger), update_user_score (SUM of quiz_attempts.score + progress
-- row counts) and calculate_user_score (its own per-activity formula, wired
-- up 15 times). Whichever fired last won, and two of the three read tables a
-- student can write:
--
--   * INSERT INTO quiz_attempts (quiz_id, student_id, score) VALUES (..., 999999)
--     passed the "student_id = auth.uid()" policy, fired update_user_score,
--     and wrote 999999 straight into profiles.total_score. The profile guard
--     let it through by design: it only constrains a DIRECT write
--     (pg_trigger_depth() <= 1), and this one is nested.
--   * A retake re-banked its score the same way, although submit_quiz_attempt
--     deliberately skips the ledger on a retake.
--   * record_points_transaction was EXECUTE-able by `authenticated` and its
--     anti-replay index was PARTIAL (source_id AND question_id NOT NULL), so
--     a call with no ids banked 70 (booking), 10 (exam) or 5 (video) every
--     time, forever.
--
-- After this migration the ledger is the only source of truth: points enter
-- through SECURITY DEFINER code only, once per (student, source, question),
-- and update_student_total_score is the only thing that writes total_score.

-- ─────────────────────────────────────────── 1. the legacy scoring formulas
-- CASCADE takes the 15 update_user_score_trigger triggers and the 3
-- update_user_score ones down with their functions.
DROP FUNCTION IF EXISTS public.update_user_score_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_score() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_update_user_score() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_user_score(uuid) CASCADE;

-- ──────────────────────────────────────────────────────────── 2. bookings
-- The alumni booking feature was deleted from the app; the table, its
-- student INSERT policy and a trigger paying 70 points per row stayed behind.
DROP FUNCTION IF EXISTS public.handle_booking_points() CASCADE;
DROP POLICY IF EXISTS "Students can create bookings" ON public.bookings;

-- ──────────────────────────────────────────── 3. one award, once, forever
-- Dedupe before the unique index can be built. Keep the earliest row of each
-- award; join on source_id itself so legacy rows with a NULL source_id are
-- left alone (they are NULLS DISTINCT under the new index anyway).
DELETE FROM public.points_transactions dup
USING public.points_transactions keep
WHERE keep.student_id  = dup.student_id
  AND keep.source_type = dup.source_type
  AND keep.source_id   = dup.source_id
  AND COALESCE(keep.question_id, '') = COALESCE(dup.question_id, '')
  AND (keep.created_at, keep.id) < (dup.created_at, dup.id);

DROP INDEX IF EXISTS public.points_transactions_unique_award;

-- Not partial any more: a video/exam award (question_id NULL) now dedupes on
-- (student, source_type, source_id) too, so deleting and re-inserting your
-- own progress row cannot re-pay. The COALESCE expression needs its own
-- parentheses inside the column list.
CREATE UNIQUE INDEX points_transactions_unique_award
  ON public.points_transactions (student_id, source_type, source_id, (COALESCE(question_id, '')));

-- An award with no source cannot be deduplicated, so there must not be one.
-- NOT VALID: new rows only, legacy rows are left as they are.
ALTER TABLE public.points_transactions
  ADD CONSTRAINT points_transactions_source_id_required
  CHECK (source_id IS NOT NULL) NOT VALID;

-- Only SECURITY DEFINER code awards points now: submit_quiz_attempt and the
-- two handle_*_points triggers. They run as the function owner, so revoking
-- the client's EXECUTE does not reach them.
REVOKE ALL ON FUNCTION public.record_points_transaction(
  uuid, integer, text, uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────── 4. backfill
-- Restate every score as the ledger sees it. The WHERE matters: an
-- unconditional UPDATE would touch updated_at on all 59 rows, and the admin
-- roster falls back to updated_at for "last active".
UPDATE public.profiles p
SET total_score = s.total
FROM (
  SELECT pr.user_id, COALESCE(SUM(t.points), 0)::int AS total
  FROM public.profiles pr
  LEFT JOIN public.points_transactions t ON t.student_id = pr.user_id
  GROUP BY pr.user_id
) s
WHERE s.user_id = p.user_id
  AND p.total_score IS DISTINCT FROM s.total;

-- ──────────────────────────────── 5. a student may only OPEN an attempt
-- Quizzes.tsx already inserts exactly this shape; submit_quiz_attempt
-- (SECURITY DEFINER) is the only thing that may fill in a score.
ALTER POLICY "Students can create attempts" ON public.quiz_attempts
  WITH CHECK (
    student_id = auth.uid()
    AND score = 0
    AND completed_at IS NULL
    AND NOT submitted
  );

-- ───────────────────────────────────────────────────── 6. email identity
-- profiles.email is what the admin roster shows and what a premium receipt
-- carries, so it is account identity, not a profile field. Pin it like role.
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
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
    NEW.email               := OLD.email;
  END IF;
  RETURN NEW;
END;
$fn$;

-- ...which leaves a confirmed auth.updateUser({ email }) as the one way it
-- can change. Mirror it. NOTE: this trigger lives on auth.users, outside
-- `public` - `supabase db dump` does not capture it, so it belongs on the
-- baseline's hand-maintained list next to on_auth_user_created.
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE user_id = NEW.id;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (NEW.email IS NOT NULL AND OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email();

-- ───────────────────────────────── 7. a premium request carries its filer
-- requester_id was already bound, but name/email were free text, and the
-- admin inbox shows those. A request could be made to look like a known
-- payer's receipt while the approval upgraded the attacker. With email now
-- guarded (6), the profile's email is trustworthy enough to bind to.
ALTER POLICY "Users file support requests as themselves" ON public.support_requests
  WITH CHECK (
    requester_id = auth.uid()
    AND email = (SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────── 8. small hardening
-- The mistakes migration revoked PUBLIC but not anon, and the baseline grants
-- ALL ON FUNCTIONS to anon by default.
REVOKE ALL ON FUNCTION public.mark_mistake_reviewed(uuid) FROM anon;

-- gemini-chat writes conversations with the service role; nothing in the app
-- inserts here. The policy only enabled forged logs.
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.ai_learning_conversations;

-- ────────────────────────────────────────── 9. premium video delivery
-- Videos.tsx signs URLs out of a `videos` bucket that no migration ever
-- created: whoever made it by hand chose its policies, and a public one is a
-- premium bypass. Define it here, private, premium-gated, with limits.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', false, 524288000, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Premium users can read videos" ON storage.objects;
CREATE POLICY "Premium users can read videos" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'videos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('premium', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins manage videos storage" ON storage.objects;
CREATE POLICY "Admins manage videos storage" ON storage.objects FOR ALL
  USING (bucket_id = 'videos' AND public.is_admin())
  WITH CHECK (bucket_id = 'videos' AND public.is_admin());

-- Past papers are free content, but an unbounded bucket accepting any MIME
-- type is an upload primitive. Cap it.
UPDATE storage.buckets
SET file_size_limit    = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
WHERE id = 'documents';

-- alumni-files: public bucket, anon-readable, 0 objects, dead feature.
UPDATE storage.buckets SET public = false WHERE id = 'alumni-files';
DROP POLICY IF EXISTS "Anyone can view alumni files" ON storage.objects;
CREATE POLICY "Signed-in users can view alumni files" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'alumni-files');

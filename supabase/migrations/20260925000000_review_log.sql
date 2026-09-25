-- Progress that survives re-reviews.
--
-- The streak, "days this month", today's goal, the weekly report and the
-- calendar built study days from mistakes.last_reviewed_at and
-- student_flashcard_progress.last_reviewed_at — one timestamp per item that
-- every re-review OVERWRITES. A card rated "hard" is due again the next day,
-- so each day's revision erased the day before: the owner saw the streak and
-- study days "deleted every new day". review_log is append-only, one row per
-- review, filled by triggers (so every writer is caught: both review RPCs and
-- gemini-chat's service-role explanation stamp), and backfilled once from the
-- timestamps that exist today (earlier days were already overwritten and
-- cannot be recovered).

-- ── 1. review log ────────────────────────────────────────────────────────
CREATE TABLE public.review_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('mistake', 'flashcard')),
  item_id uuid NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_log_student_reviewed ON public.review_log (student_id, reviewed_at);

ALTER TABLE public.review_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can read their own review log" ON public.review_log
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Admins can read all review logs" ON public.review_log
  FOR SELECT TO authenticated USING (public.is_admin());
-- No INSERT/UPDATE/DELETE policy for anyone: only the triggers below write.
REVOKE ALL ON TABLE public.review_log FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.review_log FROM authenticated;
GRANT SELECT ON TABLE public.review_log TO authenticated;
GRANT ALL ON TABLE public.review_log TO service_role;

-- reviewed_at is the row's own last_reviewed_at, not now(): identical in
-- normal use, and a backdated write (tests, repairs) logs the right day.
CREATE OR REPLACE FUNCTION public.log_mistake_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.last_reviewed_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.last_reviewed_at IS DISTINCT FROM OLD.last_reviewed_at) THEN
    INSERT INTO public.review_log (student_id, kind, item_id, reviewed_at)
    VALUES (NEW.student_id, 'mistake', NEW.id, NEW.last_reviewed_at);
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_flashcard_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.last_reviewed_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.last_reviewed_at IS DISTINCT FROM OLD.last_reviewed_at) THEN
    INSERT INTO public.review_log (student_id, kind, item_id, reviewed_at)
    VALUES (NEW.student_id, 'flashcard', NEW.flashcard_id, NEW.last_reviewed_at);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_mistake_review() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_flashcard_review() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER log_mistake_review AFTER INSERT OR UPDATE OF last_reviewed_at ON public.mistakes
  FOR EACH ROW EXECUTE FUNCTION public.log_mistake_review();
CREATE TRIGGER log_flashcard_review AFTER INSERT OR UPDATE OF last_reviewed_at ON public.student_flashcard_progress
  FOR EACH ROW EXECUTE FUNCTION public.log_flashcard_review();

-- One-time backfill: the only history that still exists is the latest review.
INSERT INTO public.review_log (student_id, kind, item_id, reviewed_at)
SELECT student_id, 'mistake', id, last_reviewed_at FROM public.mistakes WHERE last_reviewed_at IS NOT NULL;
INSERT INTO public.review_log (student_id, kind, item_id, reviewed_at)
SELECT student_id, 'flashcard', flashcard_id, last_reviewed_at FROM public.student_flashcard_progress;

-- Same function as 20260921200000_study_streak.sql; the two review sources
-- now read review_log. Exam opens still don't count (by design).
CREATE OR REPLACE FUNCTION public.get_study_stats()
 RETURNS TABLE(current_streak integer, longest_streak integer, days_this_month integer, tasks_completed_today integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
WITH study_days AS (
  SELECT DISTINCT (completed_at AT TIME ZONE 'Africa/Algiers')::date AS d
    FROM public.quiz_attempts
   WHERE student_id = auth.uid() AND completed_at IS NOT NULL
  UNION
  SELECT DISTINCT (reviewed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.review_log
   WHERE student_id = auth.uid()
  UNION
  SELECT DISTINCT (completed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.exam_simulation_sessions
   WHERE student_id = auth.uid() AND completed_at IS NOT NULL
  UNION
  SELECT DISTINCT (completed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.video_progress
   WHERE student_id = auth.uid() AND completed_at IS NOT NULL
),
today AS (SELECT (now() AT TIME ZONE 'Africa/Algiers')::date AS d),
-- gaps-and-islands: within a run of consecutive dates, (date - row_number) is
-- constant, so grouping by it collapses each run into one row.
grouped AS (SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::int AS grp FROM study_days),
runs AS (SELECT grp, COUNT(*)::int AS len, MAX(d) AS last_day FROM grouped GROUP BY grp)
SELECT
  COALESCE((SELECT len FROM runs, today WHERE runs.last_day IN (today.d, today.d - 1) LIMIT 1), 0),
  COALESCE((SELECT MAX(len) FROM runs), 0),
  (SELECT COUNT(*)::int FROM study_days, today
    WHERE date_trunc('month', study_days.d) = date_trunc('month', today.d)),
  -- the daily goal's numerator: distinct items reviewed today (the
  -- denominator stays client-side, useTodaysRevision.ts)
  (SELECT COUNT(DISTINCT (l.kind, l.item_id))::int FROM public.review_log l, today
    WHERE l.student_id = auth.uid() AND (l.reviewed_at AT TIME ZONE 'Africa/Algiers')::date = today.d)
$function$;

-- Same function as 20260922000000_audit_fixes.sql; study days and the two
-- "reviewed this week" counts now read review_log.
CREATE OR REPLACE FUNCTION public.get_weekly_report(p_weeks_ago integer DEFAULT 0)
 RETURNS TABLE(week_start date, week_end date, prev_week_start date, prev_week_end date, questions_answered integer, questions_correct integer, lessons_completed integer, simulations_completed integer, study_days integer, prev_questions_answered integer, prev_questions_correct integer, prev_lessons_completed integer, prev_simulations_completed integer, prev_study_days integer, flashcards_reviewed integer, mistakes_reviewed integer, mistakes_made integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
WITH bounds AS (
  SELECT (date_trunc('week', (now() AT TIME ZONE 'Africa/Algiers')::date)::date
          - (LEAST(GREATEST(COALESCE(p_weeks_ago, 0), 0), 52) * 7)) AS this_start
),
w AS (
  SELECT this_start, this_start + 6 AS this_end, this_start - 7 AS prev_start, this_start - 1 AS prev_end
    FROM bounds
),
reviews AS (
  SELECT l.kind, l.item_id, (l.reviewed_at AT TIME ZONE 'Africa/Algiers')::date AS d
    FROM public.review_log l, w
   WHERE l.student_id = auth.uid()
     AND (l.reviewed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.this_end
),
days AS (
  SELECT DISTINCT (a.completed_at AT TIME ZONE 'Africa/Algiers')::date AS d
    FROM public.quiz_attempts a, w
   WHERE a.student_id = auth.uid() AND a.completed_at IS NOT NULL
     AND (a.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.this_end
  UNION
  SELECT DISTINCT d FROM reviews
  UNION
  SELECT DISTINCT (s.completed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.exam_simulation_sessions s, w
   WHERE s.student_id = auth.uid() AND s.completed_at IS NOT NULL
     AND (s.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.this_end
  UNION
  SELECT DISTINCT (v.completed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.video_progress v, w
   WHERE v.student_id = auth.uid() AND v.completed_at IS NOT NULL
     AND (v.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.this_end
)
SELECT
  w.this_start, w.this_end, w.prev_start, w.prev_end,

  (SELECT COUNT(*)::int FROM public.quiz_question_results r
    WHERE r.student_id = auth.uid()
      AND (r.created_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.quiz_question_results r
    WHERE r.student_id = auth.uid() AND r.is_correct
      AND (r.created_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.video_progress v
    WHERE v.student_id = auth.uid() AND v.completed_at IS NOT NULL
      AND (v.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.exam_simulation_sessions s
    WHERE s.student_id = auth.uid() AND s.completed_at IS NOT NULL
      AND (s.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM days WHERE days.d BETWEEN w.this_start AND w.this_end),

  (SELECT COUNT(*)::int FROM public.quiz_question_results r
    WHERE r.student_id = auth.uid()
      AND (r.created_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM public.quiz_question_results r
    WHERE r.student_id = auth.uid() AND r.is_correct
      AND (r.created_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM public.video_progress v
    WHERE v.student_id = auth.uid() AND v.completed_at IS NOT NULL
      AND (v.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM public.exam_simulation_sessions s
    WHERE s.student_id = auth.uid() AND s.completed_at IS NOT NULL
      AND (s.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM days WHERE days.d BETWEEN w.prev_start AND w.prev_end),

  (SELECT COUNT(DISTINCT item_id)::int FROM reviews
    WHERE kind = 'flashcard' AND d BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(DISTINCT item_id)::int FROM reviews
    WHERE kind = 'mistake' AND d BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.mistakes m
    WHERE m.student_id = auth.uid()
      AND (m.last_mistaken_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end)
FROM w
$function$;

REVOKE ALL ON FUNCTION public.get_study_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_study_stats() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_weekly_report(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_report(integer) TO authenticated, service_role;

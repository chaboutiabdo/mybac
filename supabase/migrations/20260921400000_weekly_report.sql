-- Weekly Performance Report -- feature 5 of 5.
--
-- One read-only aggregate over data that already exists: no new table, no new
-- write path, and deliberately no Gemini (statistics that SQL computes
-- reliably must not cost an AI call).
--
-- WEEK = MONDAY -> SUNDAY, in 'Africa/Algiers'. date_trunc('week', ...) is
-- Monday-based in Postgres, and Africa/Algiers is the day boundary
-- 20260921200000_study_streak.sql established and 20260921300000_daily_question.sql
-- reused -- this is the third feature on it. Note for whoever revisits this:
-- the Algerian weekend is Friday-Saturday, so a student's week arguably starts
-- on SUNDAY; switching is one expression here
-- (date_trunc('week', d + 1) - 1), and nothing else in the app depends on the
-- Monday choice.
--
-- This is NOT the same window as WeeklyActivity.tsx, which shows a ROLLING
-- last-seven-days chart and says so on its face ("آخر 7 أيام"). A rolling
-- window cannot answer "compared with last week", which is the whole point of
-- this report. Two windows, two honest labels -- not two definitions of one
-- word.
--
-- WHY SOME METRICS HAVE NO WEEK-OVER-WEEK COMPARISON.
-- quiz_question_results, video_progress.completed_at,
-- exam_simulation_sessions.completed_at and mistakes.last_mistaken_at are
-- effectively append-only: once a row lands in a week it stays in that week,
-- so comparing two weeks is meaningful.
-- student_flashcard_progress.last_reviewed_at and mistakes.last_reviewed_at
-- are NOT: they are overwritten on every review, recording only the LATEST
-- one. "Flashcards reviewed last week" would therefore shrink every time the
-- student reviewed one of those same cards again this week -- a report that
-- silently rewrites its own history. Those two are returned for the requested
-- week only, and the UI shows them without a delta. Turning them into real
-- time series would need a review-events log, which is a bigger change than
-- this feature justifies.
--
-- Accuracy is returned as questions_answered + questions_correct rather than a
-- percentage: one rounding step, done once, in the client -- and "0 answered"
-- stays 0 answered instead of becoming a misleading 0%.

CREATE OR REPLACE FUNCTION public.get_weekly_report(p_weeks_ago integer DEFAULT 0)
RETURNS TABLE(
  week_start date,
  week_end date,
  prev_week_start date,
  prev_week_end date,
  -- requested week
  questions_answered integer,
  questions_correct integer,
  mistakes_made integer,
  lessons_completed integer,
  simulations_completed integer,
  study_days integer,
  -- the week before it, for the comparison
  prev_questions_answered integer,
  prev_questions_correct integer,
  prev_mistakes_made integer,
  prev_lessons_completed integer,
  prev_simulations_completed integer,
  prev_study_days integer,
  -- requested week only -- see the header: these cannot be compared honestly
  flashcards_reviewed integer,
  mistakes_reviewed integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH bounds AS (
  -- clamped: a caller cannot ask for a week outside a sane range
  SELECT (date_trunc('week', (now() AT TIME ZONE 'Africa/Algiers')::date)::date
          - (LEAST(GREATEST(COALESCE(p_weeks_ago, 0), 0), 52) * 7)) AS this_start
),
w AS (
  SELECT this_start,
         this_start + 6 AS this_end,
         this_start - 7 AS prev_start,
         this_start - 1 AS prev_end
    FROM bounds
),
-- one row per (source, local date) this student was active on, reusing the
-- same five qualifying sources as get_study_stats()
days AS (
  SELECT DISTINCT (completed_at AT TIME ZONE 'Africa/Algiers')::date AS d
    FROM public.quiz_attempts
   WHERE student_id = auth.uid() AND completed_at IS NOT NULL
  UNION
  SELECT DISTINCT (last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.mistakes WHERE student_id = auth.uid() AND last_reviewed_at IS NOT NULL
  UNION
  SELECT DISTINCT (last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.student_flashcard_progress WHERE student_id = auth.uid()
  UNION
  SELECT DISTINCT (completed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.exam_simulation_sessions
   WHERE student_id = auth.uid() AND completed_at IS NOT NULL
  UNION
  SELECT DISTINCT (completed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.video_progress WHERE student_id = auth.uid() AND completed_at IS NOT NULL
)
SELECT
  w.this_start, w.this_end, w.prev_start, w.prev_end,

  (SELECT COUNT(*)::int FROM public.quiz_question_results r
    WHERE r.student_id = auth.uid()
      AND (r.created_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.quiz_question_results r
    WHERE r.student_id = auth.uid() AND r.is_correct
      AND (r.created_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.mistakes m
    WHERE m.student_id = auth.uid()
      AND (m.last_mistaken_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
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
  (SELECT COUNT(*)::int FROM public.mistakes m
    WHERE m.student_id = auth.uid()
      AND (m.last_mistaken_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM public.video_progress v
    WHERE v.student_id = auth.uid() AND v.completed_at IS NOT NULL
      AND (v.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM public.exam_simulation_sessions s
    WHERE s.student_id = auth.uid() AND s.completed_at IS NOT NULL
      AND (s.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM days WHERE days.d BETWEEN w.prev_start AND w.prev_end),

  (SELECT COUNT(*)::int FROM public.student_flashcard_progress f
    WHERE f.student_id = auth.uid()
      AND (f.last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.mistakes m
    WHERE m.student_id = auth.uid() AND m.last_reviewed_at IS NOT NULL
      AND (m.last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end)
FROM w
$$;

-- Read-only, no student parameter, auth.uid() throughout: IDOR-proof by
-- construction, like get_chapter_mastery() and get_study_stats().
-- REVOKE ... FROM PUBLIC alone does NOT block anon -- baseline.sql grants
-- EXECUTE on functions to anon by default, and omitting anon here is the exact
-- bug the attack suite caught in the chapter-mastery stage.
REVOKE ALL ON FUNCTION public.get_weekly_report(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_report(integer) TO authenticated, service_role;

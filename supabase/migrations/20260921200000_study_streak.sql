-- Study streak + daily goal -- feature 3 of 5.
--
-- DERIVED, NOT RECORDED. The obvious alternative -- a `study_days` table
-- written on every qualifying action -- was rejected for one decisive reason:
-- a new table starts EMPTY, so every existing student would see a 0-day streak
-- on deploy and all their past work would be invisible. Deriving the streak
-- from activity that already happened is correct retroactively from the first
-- deploy, cannot drift out of sync with the activity it describes, and adds no
-- write path to secure.
--
-- This also REPLACES a streak that already existed: useQuizStats.ts computed
-- one in the browser, from quiz_attempts only, deduped with .toDateString()
-- (the LOCAL BROWSER timezone), persisted nowhere. That client-side version is
-- deleted in the same change -- two numbers under the same "أيام متتالية"
-- label on different pages is exactly the confusion this replaces.
--
-- QUALIFYING ACTIVITY -- five timestamp sources, one per way a student can do
-- real work:
--   quiz_attempts.completed_at                     -- finished a quiz
--   mistakes.last_reviewed_at                      -- reviewed an error (mark_mistake_reviewed)
--   student_flashcard_progress.last_reviewed_at    -- rated a flashcard (record_flashcard_review)
--   exam_simulation_sessions.completed_at          -- finished a simulated exam
--   video_progress.completed_at                    -- FINISHED a lesson, not merely opened one
-- Today's-Revision tasks need no source of their own: completing one IS a
-- mistake review or a flashcard review, already counted above.
--
-- DELIBERATELY EXCLUDED: exam_progress (viewed_exam/viewed_solution is "opened
-- a PDF", and its completed_at column is dead -- nothing has ever written it),
-- and the raw video_activity_logs / exam_activity_logs event logs, which
-- record views. Opening a page is not studying.
--
-- TIMEZONE: this function establishes 'Africa/Algiers' as the app's day
-- boundary. There was no prior convention to follow -- a grep of every
-- migration for AT TIME ZONE / CURRENT_DATE / ::date returned nothing. Algeria
-- is UTC+1 year-round with no DST, so a fixed zone needs no DST reasoning.
-- The Weekly Report feature must reuse this same zone.
--
-- A STREAK BREAKS ONLY AFTER A FULL MISSED DAY: the current streak is the run
-- of consecutive days ending today OR yesterday, so a student who simply has
-- not studied yet today still sees their streak instead of watching it read 0
-- every morning.

CREATE OR REPLACE FUNCTION public.get_study_stats()
RETURNS TABLE(
  current_streak integer,
  longest_streak integer,
  days_this_month integer,
  tasks_completed_today integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH study_days AS (
  SELECT DISTINCT (completed_at AT TIME ZONE 'Africa/Algiers')::date AS d
    FROM public.quiz_attempts
   WHERE student_id = auth.uid() AND completed_at IS NOT NULL
  UNION
  SELECT DISTINCT (last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.mistakes
   WHERE student_id = auth.uid() AND last_reviewed_at IS NOT NULL
  UNION
  SELECT DISTINCT (last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.student_flashcard_progress
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
  -- at most one run can end in {today, yesterday} -- if both days were studied
  -- they belong to the same run by definition.
  COALESCE((SELECT len FROM runs, today
             WHERE runs.last_day IN (today.d, today.d - 1) LIMIT 1), 0),
  COALESCE((SELECT MAX(len) FROM runs), 0),
  (SELECT COUNT(*)::int FROM study_days, today
    WHERE date_trunc('month', study_days.d) = date_trunc('month', today.d)),
  -- the daily goal's numerator. The DENOMINATOR is deliberately not computed
  -- here: "what is due today" has exactly one definition, the client-side
  -- composition in useTodaysRevision.ts, and a second SQL implementation of it
  -- would be free to drift.
  (SELECT ((SELECT COUNT(*) FROM public.mistakes
             WHERE student_id = auth.uid() AND last_reviewed_at IS NOT NULL
               AND (last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date = today.d)
         + (SELECT COUNT(*) FROM public.student_flashcard_progress
             WHERE student_id = auth.uid()
               AND (last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date = today.d)
          )::int FROM today)
$$;

-- No parameters and auth.uid() throughout, so there is no id to guess and no
-- ownership check to write -- IDOR-proof by construction, the same property
-- get_chapter_mastery() has.
--
-- REVOKE ... FROM PUBLIC alone does NOT block anon: baseline.sql runs
-- `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON FUNCTIONS TO anon`, and forgetting
-- to name anon here was a real security bug caught by the attack suite in the
-- chapter-mastery stage.
REVOKE ALL ON FUNCTION public.get_study_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_study_stats() TO authenticated, service_role;

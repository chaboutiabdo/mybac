-- Chapter/subject mastery — stage 2 of the learning-loop initiative (stage 1
-- was the error notebook: 20260919120000_mistakes_error_notebook.sql).
--
-- One new read-only RPC. No new table, no change to submit_quiz_attempt or
-- mark_mistake_reviewed. At today's volume — a handful of rows per student in
-- quiz_question_results and mistakes — a materialized table would be solving
-- a performance problem this app does not have; computing mastery on every
-- page load costs a couple of index-backed lookups and can never go stale.
-- Revisit only if a single student's row count ever reaches the tens of
-- thousands, which a BAC student's realistic quiz volume across a school
-- year does not.
--
-- Formula (deliberately simple — not spaced repetition, no recency decay):
--   base    = round(100 * correct / attempted)   per subject+chapter, across
--             every quiz_question_results row the student has, any quiz type
--   penalty = 5 points per question in that subject+chapter that is STILL an
--             unresolved mistake right now (mistakes.status = 'active') — one
--             flat deduction per still-wrong question, not per retry. Fixing
--             it (submit_quiz_attempt flips the row to 'resolved') removes
--             the penalty on the next read, automatically.
--   mastery = greatest(0, base - penalty)
--
-- Returns one row per subject+chapter the student has ANY footprint in (an
-- attempted answer or an active mistake) — never a fabricated row for a
-- chapter never touched. The frontend cross-references this sparse result
-- against chaptersFor() from src/lib/bac.ts to tell "never attempted" apart
-- from "attempted and still at 0%": two different things this must not
-- conflate.
--
-- SECURITY DEFINER + auth.uid(), no parameters — same shape as
-- mark_mistake_reviewed / is_admin. There is nothing a caller can pass that
-- could target another student's numbers, because there is nothing to pass.

CREATE INDEX idx_quiz_question_results_mastery
  ON public.quiz_question_results USING btree (student_id, quiz_subject, quiz_chapter)
  INCLUDE (is_correct);
-- Nothing added on `mistakes`: idx_mistakes_student_id already makes "this
-- student's active mistakes" cheap, and a student's mistake-row count is
-- bounded by the size of the question bank, not by retries — it will not
-- grow the way quiz_question_results does. Add a composite there only if
-- that stops being true.

CREATE OR REPLACE FUNCTION public.get_chapter_mastery()
RETURNS TABLE (
  quiz_subject text,
  quiz_chapter text,
  attempted integer,
  correct integer,
  active_mistakes integer,
  mastery_pct integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH results AS (
    SELECT
      qr.quiz_subject,
      qr.quiz_chapter,
      count(*)::int AS attempted,
      count(*) FILTER (WHERE qr.is_correct)::int AS correct
    FROM public.quiz_question_results qr
    WHERE qr.student_id = auth.uid()
      -- a handful of legacy/malformed quizzes never set subject or chapter;
      -- there is no chapter to credit those rows to, so they are left out
      -- rather than grouped under a fake "unknown" chapter
      AND qr.quiz_subject IS NOT NULL
      AND qr.quiz_chapter IS NOT NULL
    GROUP BY qr.quiz_subject, qr.quiz_chapter
  ),
  active AS (
    SELECT
      m.quiz_subject,
      m.quiz_chapter,
      count(*)::int AS active_mistakes
    FROM public.mistakes m
    WHERE m.student_id = auth.uid()
      AND m.status = 'active'
      AND m.quiz_subject IS NOT NULL
      AND m.quiz_chapter IS NOT NULL
    GROUP BY m.quiz_subject, m.quiz_chapter
  ),
  merged AS (
    SELECT
      COALESCE(r.quiz_subject, a.quiz_subject) AS quiz_subject,
      COALESCE(r.quiz_chapter, a.quiz_chapter) AS quiz_chapter,
      COALESCE(r.attempted, 0) AS attempted,
      COALESCE(r.correct, 0) AS correct,
      COALESCE(a.active_mistakes, 0) AS active_mistakes
    FROM results r
    FULL OUTER JOIN active a
      ON a.quiz_subject = r.quiz_subject AND a.quiz_chapter = r.quiz_chapter
  )
  SELECT
    quiz_subject,
    quiz_chapter,
    attempted,
    correct,
    active_mistakes,
    GREATEST(
      0,
      -- attempted = 0 only happens for a mistake row seeded outside the
      -- normal submit_quiz_attempt path (it always writes both tables
      -- together); guard it so a stray row can never divide by zero — this
      -- is not theoretical, premium@mybac.test has exactly this row today
      (CASE WHEN attempted = 0 THEN 0 ELSE round(100.0 * correct / attempted) END)::int
        - active_mistakes * 5
    ) AS mastery_pct
  FROM merged;
$$;

-- REVOKE ... FROM PUBLIC alone does NOT block anon here: this project's
-- bootstrap runs `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
-- GRANT ALL ON FUNCTIONS TO anon` (baseline.sql), which grants EXECUTE to
-- anon directly — a separate grant from PUBLIC's, so revoking PUBLIC's never
-- touches it. Every other SECURITY DEFINER function in this codebase has the
-- same latent gap; it stays invisible there because each one's own body
-- raises an exception when auth.uid() is null (a mismatched id, an
-- ownership check). This function has no such check to fall back on — a
-- null auth.uid() just matches zero rows and returns an empty set — so it
-- needs the anon grant revoked explicitly, not just assumed away.
REVOKE ALL ON FUNCTION public.get_chapter_mastery() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chapter_mastery() TO authenticated, service_role;

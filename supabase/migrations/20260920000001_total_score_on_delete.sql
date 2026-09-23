-- update_student_total_score is now the ONLY writer of profiles.total_score
-- (20260920000000 removed the two rival formulas), which makes a latent bug in
-- it load-bearing.
--
-- It is an AFTER INSERT OR DELETE trigger, but it only ever read
-- NEW.student_id. On a DELETE, NEW is NULL: the statement raised, the
-- function's own blanket EXCEPTION handler swallowed the error as a WARNING,
-- and profiles.total_score was left showing points that no longer exist.
--
-- Proven on the local stack before this fix: insert a 25-point row, the score
-- reads 25; delete that row, the ledger sums to 0 and the score still reads
-- 25. While the legacy triggers existed, any later quiz or video write
-- recomputed the column and hid it. Nothing recomputes it now.
CREATE OR REPLACE FUNCTION public.update_student_total_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_student uuid := COALESCE(NEW.student_id, OLD.student_id);
BEGIN
  UPDATE public.profiles
  SET total_score = COALESCE((
    SELECT SUM(points)
    FROM public.points_transactions
    WHERE student_id = v_student
  ), 0)
  WHERE user_id = v_student;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  -- A scoring failure must not roll back the student's actual work (the quiz
  -- they submitted, the lesson they watched), so this stays a warning. It is
  -- also what hid the bug above for months: if you are debugging a score that
  -- will not move, read the Postgres log for this line first.
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating student total score for %: %', v_student, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$fn$;

-- Re-sync anything the bug has already left stale.
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

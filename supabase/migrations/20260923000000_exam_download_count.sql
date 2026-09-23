-- exams.downloads: how many students have opened each paper.
--
-- Exams.tsx used to write `downloads + 1` straight onto the exams row. Only
-- admins may update exams, so RLS refused every student's write without an
-- error and the counter stayed at 0 for ever. Letting students write it would
-- let one student loop it to any number.
--
-- It is now derived from exam_progress, which Exams.tsx already writes when a
-- student opens a paper (viewed_exam = true, one row per student per paper):
-- opening twice counts once, and nothing a student sends can set the number.
--
-- ponytail: two students opening the same paper for the first time in the
-- same instant can each count before seeing the other's row, leaving the
-- number one short until the next view recounts it. A display counter, so
-- accepted; lock the exams row first if it ever becomes a billing number.

CREATE OR REPLACE FUNCTION public.sync_exam_downloads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target uuid := COALESCE(NEW.exam_id, OLD.exam_id);
BEGIN
  UPDATE public.exams
     SET downloads = (SELECT count(*) FROM public.exam_progress
                       WHERE exam_id = target AND viewed_exam)
   WHERE id = target;
  RETURN NULL;
END;
$$;

-- A trigger function only, never an RPC.
REVOKE EXECUTE ON FUNCTION public.sync_exam_downloads() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS exam_progress_downloads ON public.exam_progress;
CREATE TRIGGER exam_progress_downloads
  AFTER INSERT OR DELETE OR UPDATE OF viewed_exam ON public.exam_progress
  FOR EACH ROW EXECUTE FUNCTION public.sync_exam_downloads();

-- Backfill from the views already recorded.
UPDATE public.exams e
   SET downloads = (SELECT count(*) FROM public.exam_progress p
                     WHERE p.exam_id = e.id AND p.viewed_exam);

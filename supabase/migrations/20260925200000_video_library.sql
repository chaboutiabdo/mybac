-- Video library: chapter lessons, exercise/method videos and BAC paper
-- corrections, collected from YouTube. Only links are stored: nothing is
-- downloaded or re-hosted. RLS is unchanged (signed-in users read youtube
-- rows, admins write).

-- The seed's three placeholders all pointed at the same unrelated video. They
-- go first, or the unique rule below can't be added.
DELETE FROM public.videos WHERE url LIKE '%dQw4w9WgXcQ%';

ALTER TABLE public.videos
  -- what the video is; /videos filters on it
  ADD COLUMN kind text NOT NULL DEFAULT 'lesson'
    CONSTRAINT videos_kind_check CHECK (kind IN ('lesson', 'exercises', 'correction')),
  -- the BAC paper a correction solves, so /exams can offer it on that paper.
  -- CASCADE, not SET NULL: a correction of a deleted paper corrects nothing,
  -- and SET NULL would trip the check below and block the paper's deletion.
  ADD COLUMN exam_id uuid
    CONSTRAINT videos_exam_id_fkey REFERENCES public.exams(id) ON DELETE CASCADE,
  -- the teacher's channel, credited on the card
  ADD COLUMN channel text,
  -- a correction always names its paper, and nothing else does
  ADD CONSTRAINT videos_correction_has_exam CHECK ((kind = 'correction') = (exam_id IS NOT NULL)),
  -- one row per YouTube link per paper: no duplicate lessons, and every insert
  -- can be an upsert. A correction may be listed twice, because the Mathématiques
  -- and Technique Mathématiques streams sit the same physics paper. NULLS NOT
  -- DISTINCT makes (url, no paper) collide too.
  ADD CONSTRAINT videos_url_exam_key UNIQUE NULLS NOT DISTINCT (url, exam_id);

CREATE INDEX idx_videos_exam ON public.videos USING btree (exam_id) WHERE exam_id IS NOT NULL;

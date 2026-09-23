-- Flashcards — stage 3 of the learning-loop initiative (stage 1: error
-- notebook, 20260919120000; stage 2: chapter mastery, 20260919130000).
--
-- SHARED DECK, not per-student: one `flashcards` row set per subject+chapter,
-- visible to every signed-in student, exactly like `exams`/`videos`/`quizzes`
-- are shared content with separate per-student progress tables
-- (`exam_progress`, `video_progress`). This project runs on Gemini's shared
-- free-tier quota (see README's "Keep the Gemini key free"); a private deck
-- per student who asks for the same chapter would multiply AI cost for no
-- benefit. Once anyone generates "Math -> limits" cards, that deck exists for
-- everyone.
--
-- Tier split: STUDYING is free-tier (RLS below mirrors "Authenticated users
-- can view exams" exactly: SELECT for `authenticated`, not `anon`).
-- GENERATING is premium/admin only, enforced in gemini-chat's existing
-- top-level role check (unchanged) — a chapter's shared deck can already be
-- populated by someone else's premium generation, so a free student gets
-- real value studying it even though they could never generate it themselves.
-- REVIEWING (the recall-rating action) is also free-tier: it's studying, not
-- generation.
--
-- `source` distinguishes an AI-written row from a future admin-authored one
-- (no admin authoring UI this stage — see is_admin() CRUD policies below,
-- which already accept 'admin' so a later admin screen needs no migration).
-- No approval queue: AI-generated rows insert directly, matching how stage
-- 1's explain_mistake and the mistake-capture in submit_quiz_attempt both
-- act with no human review step.
--
-- `next_review_at` uses the same "fixed N-day bump, not real spaced
-- repetition" placeholder mark_mistake_reviewed already established: hard
-- +1 day, medium +3 days, easy +7 days.
--
-- No DB-level uniqueness on (subject, chapter, lower(front)): a rare race
-- between two simultaneous generate requests for the same empty chapter
-- producing a couple of duplicate cards is an accepted, documented
-- simplification, not worth a constraint on free-text content. Dedup against
-- exact (trimmed, case-insensitive) front-text matches happens once, in
-- gemini-chat's generate_flashcards branch, before insert.
--
-- REMINDER (the stage-2 lesson): this project's bootstrap runs
-- `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON
-- FUNCTIONS TO anon` (baseline.sql) — REVOKE ... FROM PUBLIC alone does NOT
-- block anon. record_flashcard_review below revokes FROM PUBLIC, anon
-- explicitly, from the start.

CREATE TABLE public.flashcards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  -- plain `subject`/`chapter`, not `quiz_subject`/`quiz_chapter` like
  -- `mistakes`: that table prefixes because it snapshots quiz-attempt
  -- context. A flashcard has no quiz behind it, so it follows the plainer
  -- exams/videos/quizzes naming instead.
  subject text NOT NULL,
  chapter text NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  -- short concept tag shown as a pill above the card; optional, not every
  -- future writer (e.g. a later admin screen) needs to fill it
  concept text,
  source text DEFAULT 'ai_generated' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT flashcards_source_check CHECK (source = ANY (ARRAY['ai_generated'::text, 'admin'::text]))
);

ALTER TABLE ONLY public.flashcards
  ADD CONSTRAINT flashcards_pkey PRIMARY KEY (id);

-- The only query pattern this stage has: "this chapter's deck" (the ceiling
-- check and the study-session read both filter on exactly these two columns).
CREATE INDEX idx_flashcards_subject_chapter ON public.flashcards USING btree (subject, chapter);

CREATE OR REPLACE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- Mirrors "Authenticated users can view exams" exactly: free-tier study
-- access is the point of this stage, not an oversight.
CREATE POLICY "Authenticated users can view flashcards" ON public.flashcards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert flashcards" ON public.flashcards
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update flashcards" ON public.flashcards
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete flashcards" ON public.flashcards
  FOR DELETE USING (public.is_admin());

-- generate_flashcards (below, in gemini-chat) writes via the service role,
-- which bypasses RLS entirely — the INSERT policy above exists only for a
-- possible future admin authoring screen using the user's own session, the
-- same relationship submit_quiz_attempt has to student-facing INSERT policies.
GRANT ALL ON TABLE public.flashcards TO anon, authenticated, service_role;


-- Per-student study state on a shared card. Never client-writable: the RPC
-- below is the only writer, the same shape mark_mistake_reviewed already
-- established for `mistakes`. Even admin gets read-only here — there is no
-- "admin authors student progress" concept, unlike `flashcards` content itself.
CREATE TABLE public.student_flashcard_progress (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  flashcard_id uuid NOT NULL,
  recall_rating text NOT NULL,
  review_count integer DEFAULT 1 NOT NULL,
  last_reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
  next_review_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT student_flashcard_progress_recall_rating_check
    CHECK (recall_rating = ANY (ARRAY['hard'::text, 'medium'::text, 'easy'::text]))
);

ALTER TABLE ONLY public.student_flashcard_progress
  ADD CONSTRAINT student_flashcard_progress_pkey PRIMARY KEY (id);

-- NOT profiles(id) — see the identical note in the mistakes migration:
-- auth.uid() only ever matches profiles.user_id.
ALTER TABLE ONLY public.student_flashcard_progress
  ADD CONSTRAINT student_flashcard_progress_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.student_flashcard_progress
  ADD CONSTRAINT student_flashcard_progress_flashcard_id_fkey
    FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id) ON DELETE CASCADE;

-- The natural key AND the RPC's ON CONFLICT target AND — since RLS always
-- adds student_id = auth.uid() as an equality filter — exactly the index the
-- embedded-resource study read (flashcards -> student_flashcard_progress)
-- needs: leading student_id makes "this caller's row for this card" a single
-- index probe.
CREATE UNIQUE INDEX student_flashcard_progress_unique
  ON public.student_flashcard_progress USING btree (student_id, flashcard_id);

CREATE OR REPLACE TRIGGER update_student_flashcard_progress_updated_at
  BEFORE UPDATE ON public.student_flashcard_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.student_flashcard_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own flashcard progress" ON public.student_flashcard_progress
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admins can view all flashcard progress" ON public.student_flashcard_progress
  FOR SELECT USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policy for anyone, admin included: every write
-- goes through record_flashcard_review below, SECURITY DEFINER and owned by
-- postgres, bypassing RLS the same way mark_mistake_reviewed does.
GRANT ALL ON TABLE public.student_flashcard_progress TO anon, authenticated, service_role;


-- The one client-facing write on student progress. Takes a flashcard id (a
-- shared, non-sensitive resource — knowing it grants no access to anyone
-- else's data) and a rating; student_id is ALWAYS auth.uid(), never a
-- parameter, so there is no id to guess and no ownership check to write —
-- the function is IDOR-proof by construction, not by a runtime guard.
--
-- Existence of p_flashcard_id is enforced by the FK constraint itself (an
-- unknown id raises a foreign-key-violation on INSERT); no redundant
-- existence SELECT before it.
CREATE OR REPLACE FUNCTION public.record_flashcard_review(p_flashcard_id uuid, p_recall_rating text)
RETURNS public.student_flashcard_progress
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bump interval;
  v_row public.student_flashcard_progress;
BEGIN
  IF p_recall_rating NOT IN ('hard', 'medium', 'easy') THEN
    RAISE EXCEPTION 'Invalid recall rating: %', p_recall_rating;
  END IF;

  v_bump := CASE p_recall_rating
    WHEN 'hard' THEN interval '1 day'
    WHEN 'medium' THEN interval '3 days'
    ELSE interval '7 days' -- 'easy'
  END;

  INSERT INTO public.student_flashcard_progress
    (student_id, flashcard_id, recall_rating, review_count, last_reviewed_at, next_review_at)
  VALUES
    (auth.uid(), p_flashcard_id, p_recall_rating, 1, now(), now() + v_bump)
  ON CONFLICT (student_id, flashcard_id) DO UPDATE SET
    recall_rating     = EXCLUDED.recall_rating,
    review_count      = public.student_flashcard_progress.review_count + 1,
    last_reviewed_at  = now(),
    next_review_at    = now() + v_bump
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- REVOKE ... FROM PUBLIC alone does NOT block anon (baseline.sql grants
-- FUNCTIONS to anon via ALTER DEFAULT PRIVILEGES) — revoke anon explicitly,
-- from the start, per the stage-2 lesson.
REVOKE ALL ON FUNCTION public.record_flashcard_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_flashcard_review(uuid, text) TO authenticated, service_role;

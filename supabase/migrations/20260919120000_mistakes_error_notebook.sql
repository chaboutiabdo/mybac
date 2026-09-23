-- Error notebook: one row per (student, quiz question) the student has ever
-- gotten wrong. Written only by submit_quiz_attempt (below) and
-- mark_mistake_reviewed; there is no client INSERT/UPDATE/DELETE policy, so
-- the server is the only place mistake_count/status can change. Designed so
-- a later mastery % and daily-revision planner can read this table as ground
-- truth without a schema change — see review_due_at and status.

CREATE TABLE public.mistakes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  quiz_id uuid NOT NULL,
  -- matches quiz_question_results.question_id: the question's own "id", or
  -- "q_<position>" when the quiz JSON never set one (see submit_quiz_attempt)
  question_id text NOT NULL,
  quiz_subject text,
  quiz_chapter text,
  quiz_type text,
  question_text text NOT NULL,
  -- the 4 choices as shown to the student — NOT the answer key (that's
  -- correct_answer below). Already fully visible live via quizzes_public, so
  -- copying it here carries no new exposure. Snapshotted so the card and the
  -- AI explanation never need to re-read `quizzes`, which students can't.
  options jsonb,
  student_answer text,
  correct_answer text NOT NULL,
  -- how many times this exact question has been answered wrong, across every
  -- retake. Never reset; only the points rule in submit_quiz_attempt ignores
  -- retakes, this counter does not.
  mistake_count integer DEFAULT 1 NOT NULL,
  first_mistaken_at timestamp with time zone DEFAULT now() NOT NULL,
  last_mistaken_at timestamp with time zone DEFAULT now() NOT NULL,
  -- 'resolved' is set automatically the next time the student answers this
  -- same question correctly (see submit_quiz_attempt) — never by the client.
  status text DEFAULT 'active' NOT NULL,
  resolved_at timestamp with time zone,
  -- self-reported: stamped by mark_mistake_reviewed when the student
  -- dismisses the card or reads the AI explanation. Independent of `status`
  -- — a reviewed mistake can still come back wrong on the next attempt.
  last_reviewed_at timestamp with time zone,
  review_due_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT mistakes_status_check CHECK (status = ANY (ARRAY['active'::text, 'resolved'::text]))
);

ALTER TABLE ONLY public.mistakes
  ADD CONSTRAINT mistakes_pkey PRIMARY KEY (id);

-- NOT profiles(id) — profiles.id is a random uuid distinct from user_id,
-- and auth.uid() (used everywhere below) only ever matches user_id.
ALTER TABLE ONLY public.mistakes
  ADD CONSTRAINT mistakes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.mistakes
  ADD CONSTRAINT mistakes_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

-- The natural key: one live row per question a student has ever missed, and
-- the ON CONFLICT target submit_quiz_attempt upserts into.
CREATE UNIQUE INDEX mistakes_unique_question ON public.mistakes USING btree (student_id, quiz_id, question_id);

CREATE INDEX idx_mistakes_student_id ON public.mistakes USING btree (student_id);
CREATE INDEX idx_mistakes_quiz_id ON public.mistakes USING btree (quiz_id);
CREATE INDEX idx_mistakes_status ON public.mistakes USING btree (status);
CREATE INDEX idx_mistakes_quiz_subject ON public.mistakes USING btree (quiz_subject);
CREATE INDEX idx_mistakes_quiz_chapter ON public.mistakes USING btree (quiz_chapter);
-- What a later daily-revision planner will scan: active mistakes whose
-- review is due. Partial so that scan stays cheap.
CREATE INDEX idx_mistakes_review_due_at ON public.mistakes USING btree (review_due_at) WHERE (status = 'active');

CREATE OR REPLACE TRIGGER update_mistakes_updated_at BEFORE UPDATE ON public.mistakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own mistakes" ON public.mistakes
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admins can view all mistakes" ON public.mistakes
  FOR SELECT USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policy for authenticated/anon on purpose: every
-- write goes through submit_quiz_attempt or mark_mistake_reviewed below,
-- both SECURITY DEFINER and owned by postgres, so they bypass RLS the same
-- way record_points_transaction already does for points_transactions.
GRANT ALL ON TABLE public.mistakes TO anon, authenticated, service_role;


-- Distinguishes an "Explain my mistake" log entry from an ordinary
-- /learn-ai chat turn, and — when set — which mistake it explained. Reuses
-- the existing log table instead of a new one; the admin's existing "view
-- all conversations" policy covers the new mode for free.
ALTER TABLE public.ai_learning_conversations
  ADD COLUMN mode text DEFAULT 'tutor' NOT NULL,
  ADD COLUMN mistake_id uuid REFERENCES public.mistakes(id) ON DELETE SET NULL;

ALTER TABLE public.ai_learning_conversations
  ADD CONSTRAINT ai_learning_conversations_mode_check CHECK (mode = ANY (ARRAY['tutor'::text, 'explain_mistake'::text]));

CREATE INDEX idx_ai_learning_conversations_mistake_id ON public.ai_learning_conversations USING btree (mistake_id);


-- "Mark reviewed": the one client-facing write on `mistakes`, narrowed to
-- exactly the two self-reported columns so a student can never touch
-- status/mistake_count through it.
CREATE OR REPLACE FUNCTION public.mark_mistake_reviewed(p_mistake_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT student_id INTO v_owner FROM public.mistakes WHERE id = p_mistake_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mistake not found';
  END IF;

  IF v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not your mistake';
  END IF;

  UPDATE public.mistakes
     SET last_reviewed_at = now(),
         -- fixed 3-day nudge, not real spaced repetition — a real
         -- revision-scheduling feature replaces this later without a schema change.
         review_due_at = now() + interval '3 days'
   WHERE id = p_mistake_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_mistake_reviewed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_mistake_reviewed(uuid) TO authenticated, service_role;


-- submit_quiz_attempt, extended: identical to the baseline version except for
-- the one new IF/ELSE block that upserts into `mistakes` (marked below). Every
-- other line is preserved exactly.
CREATE OR REPLACE FUNCTION "public"."submit_quiz_attempt"("p_attempt_id" "uuid", "p_answers" "jsonb") RETURNS TABLE("score" integer, "max_score" integer, "correct_count" integer, "total_questions" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_attempt   public.quiz_attempts%ROWTYPE;
  v_quiz      public.quizzes%ROWTYPE;
  v_question  jsonb;
  v_ord       int;
  v_qid       text;
  v_given     text;
  v_given_idx int;
  v_correct   int;
  v_is_right  boolean;
  v_right     int := 0;
  v_total     int := 0;
  v_per_q     int;
  v_score     int;
  v_is_retake boolean;
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF v_attempt.student_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not your attempt';
  END IF;

  IF v_attempt.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Attempt already submitted';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  v_per_q := CASE WHEN v_quiz.type = 'daily' THEN 25 ELSE 8 END;

  -- has this student completed this quiz before?
  SELECT EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE quiz_id = v_attempt.quiz_id
      AND student_id = auth.uid()
      AND id <> p_attempt_id
      AND completed_at IS NOT NULL
  ) INTO v_is_retake;

  FOR v_question, v_ord IN
    SELECT elem, ord
    FROM jsonb_array_elements(v_quiz.questions) WITH ORDINALITY AS t(elem, ord)
  LOOP
    v_total := v_total + 1;
    v_qid := COALESCE(v_question ->> 'id', 'q_' || v_ord);
    v_correct := (v_question ->> 'correct')::int;

    v_given := p_answers ->> v_qid;
    v_given_idx := CASE v_given
                     WHEN 'A' THEN 0 WHEN 'B' THEN 1
                     WHEN 'C' THEN 2 WHEN 'D' THEN 3
                     ELSE NULL
                   END;

    v_is_right := v_given_idx IS NOT NULL AND v_given_idx = v_correct;
    IF v_is_right THEN
      v_right := v_right + 1;
    END IF;

    INSERT INTO public.quiz_question_results (
      student_id, quiz_attempt_id, quiz_id, question_id, question_text,
      student_answer, correct_answer, is_correct, selected_choice_index,
      question_number, quiz_type, quiz_subject, quiz_chapter
    ) VALUES (
      auth.uid(), p_attempt_id, v_attempt.quiz_id, v_qid,
      COALESCE(v_question ->> 'question', ''),
      v_given,
      (ARRAY['A','B','C','D'])[v_correct + 1],
      v_is_right, v_given_idx, v_ord,
      v_quiz.type::text, v_quiz.subject, v_quiz.chapter
    )
    ON CONFLICT (quiz_attempt_id, question_id) DO NOTHING;

    -- The error notebook tracks a student's current standing on this exact
    -- question, independent of the points anti-farming rule below: a retake
    -- still updates it, correct or not.
    IF v_is_right THEN
      UPDATE public.mistakes
         SET status = 'resolved', resolved_at = now()
       WHERE student_id = auth.uid()
         AND quiz_id = v_attempt.quiz_id
         AND question_id = v_qid
         AND status = 'active';
    ELSE
      INSERT INTO public.mistakes (
        student_id, quiz_id, question_id, quiz_subject, quiz_chapter, quiz_type,
        question_text, options, student_answer, correct_answer
      ) VALUES (
        auth.uid(), v_attempt.quiz_id, v_qid, v_quiz.subject, v_quiz.chapter, v_quiz.type::text,
        COALESCE(v_question ->> 'question', ''), v_question -> 'options', v_given,
        (ARRAY['A','B','C','D'])[v_correct + 1]
      )
      ON CONFLICT (student_id, quiz_id, question_id) DO UPDATE SET
        mistake_count    = public.mistakes.mistake_count + 1,
        last_mistaken_at = now(),
        status           = 'active',
        resolved_at      = NULL,
        question_text    = EXCLUDED.question_text,
        options          = EXCLUDED.options,
        student_answer   = EXCLUDED.student_answer,
        correct_answer   = EXCLUDED.correct_answer,
        quiz_subject     = EXCLUDED.quiz_subject,
        quiz_chapter     = EXCLUDED.quiz_chapter,
        quiz_type        = EXCLUDED.quiz_type;
    END IF;

    -- Points only on a first pass, and only for a correct answer. The amount
    -- is decided inside record_points_transaction, not here.
    IF v_is_right AND NOT v_is_retake THEN
      BEGIN
        PERFORM public.record_points_transaction(
          auth.uid(), v_per_q, 'quiz', v_attempt.quiz_id,
          'Quiz: ' || COALESCE(v_quiz.subject, '') || ' - Q' || v_ord,
          v_quiz.subject, v_quiz.chapter, v_quiz.type::text, v_qid
        );
      EXCEPTION WHEN unique_violation THEN
        -- points_transactions_unique_award already holds this award, so the
        -- student has been paid for this question. Skip it rather than abort
        -- the whole submission.
        NULL;
      END;
    END IF;
  END LOOP;

  v_score := v_right * v_per_q;

  UPDATE public.quiz_attempts
     SET answers      = p_answers,
         score        = v_score,
         completed_at = now(),
         submitted    = true
   WHERE id = p_attempt_id;

  -- The stored max_score is unreliable (UploadQuizDialog wrote n*8 even for
  -- daily quizzes, which score 25 each), so report the true ceiling.
  RETURN QUERY SELECT v_score, v_total * v_per_q, v_right, v_total;
END;
$$;

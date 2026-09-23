-- Question of the Day -- feature 4 of 5.
--
-- One question per student per day, chosen from that student's own learning
-- state (active mistakes, weak chapters, untouched material) rather than at
-- random, answered from the dashboard, and graded server-side into the same
-- mistakes / mastery / points machinery everything else feeds.
--
-- WHY THIS DOES NOT CALL submit_quiz_attempt. That function loops EVERY
-- question in the quiz and treats an unanswered one as wrong -- inserting a
-- `mistakes` row for it. Submitting one answer against a 20-question quiz
-- would manufacture 19 mistakes the student never saw. That behaviour is
-- correct for a real quiz (a skipped question IS a miss, and the exam
-- simulator now depends on it), so it stays untouched, and
-- submit_daily_question below performs the SAME three downstream writes in
-- the SAME shapes for its one question.
--
-- submit_quiz_attempt (20260919120000_mistakes_error_notebook.sql) is the
-- source of truth for those shapes. If its grading, its mistakes upsert or
-- its points call ever change, the block in submit_daily_question must be
-- changed to match. That duplication is deliberate: extracting a shared
-- helper would mean refactoring the single most load-bearing function in this
-- schema (every quiz, the whole simulator, ~40 security tests) to deduplicate
-- one comparison and one upsert.
--
-- Day boundary is 'Africa/Algiers', the convention established by
-- 20260921200000_study_streak.sql. Second feature to depend on it.

-- Single-question attempts are real attempts -- quiz_question_results.
-- quiz_attempt_id is NOT NULL, and mastery reads that table, so the answer
-- must land there. But useQuizStats computes averageScore as
-- score / quiz.max_score, so an 8-point one-question attempt against a
-- max_score of 100 would read as 8% and drag a student's displayed average
-- down every time they answered the daily question CORRECTLY. This column is
-- how the stats tell the two apart. Existing rows, the client insert in
-- Quizzes.tsx and start_exam_simulation all default to 'quiz' -- simulator
-- attempts genuinely are full attempts scored out of the quiz's max, so they
-- keep counting.
ALTER TABLE public.quiz_attempts
  ADD COLUMN source text DEFAULT 'quiz' NOT NULL;

ALTER TABLE public.quiz_attempts
  ADD CONSTRAINT quiz_attempts_source_check
    CHECK (source = ANY (ARRAY['quiz'::text, 'daily_question'::text]));


-- The assignment, the anti-repetition history, and the answer record, in one
-- row. The UNIQUE below is the daily PIN: without it the question would be
-- re-rolled on every page load, which would let a student refresh until they
-- got an easy one and would make "today's question" meaningless.
CREATE TABLE public.daily_questions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  assigned_date date NOT NULL,
  quiz_id uuid NOT NULL,
  question_id text NOT NULL,
  -- which branch of the selection scoring won, so the card can tell the
  -- student WHY they were given this one
  reason text NOT NULL,
  answered_at timestamp with time zone,
  is_correct boolean,
  student_answer text,
  quiz_attempt_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT daily_questions_reason_check
    CHECK (reason = ANY (ARRAY['repeated_mistake'::text, 'weak_chapter'::text,
                               'new_practice'::text, 'balanced'::text]))
);

ALTER TABLE ONLY public.daily_questions
  ADD CONSTRAINT daily_questions_pkey PRIMARY KEY (id);

-- NOT profiles(id) -- auth.uid() only ever matches profiles.user_id.
ALTER TABLE ONLY public.daily_questions
  ADD CONSTRAINT daily_questions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.daily_questions
  ADD CONSTRAINT daily_questions_quiz_id_fkey
    FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

-- The daily pin.
CREATE UNIQUE INDEX daily_questions_student_date_unique
  ON public.daily_questions USING btree (student_id, assigned_date);

-- The 30-day "don't serve this again" lookup.
CREATE INDEX idx_daily_questions_student_question
  ON public.daily_questions USING btree (student_id, question_id);

ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own daily questions" ON public.daily_questions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admins can view all daily questions" ON public.daily_questions
  FOR SELECT USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policy for anyone, admin included: both functions
-- below are SECURITY DEFINER and are the only writers -- the same shape
-- `mistakes` and `student_flashcard_progress` already use. A client INSERT
-- policy here would let a student assign themselves a question they already
-- know the answer to.
GRANT ALL ON TABLE public.daily_questions TO anon, authenticated, service_role;


-- get_or_create_daily_question: today's assignment for the CALLER, created on
-- first call. Takes NO arguments on purpose -- the student it serves is always
-- auth.uid(), so there is no id to tamper with and no way for a client to ask
-- for a particular question ("the client must not be allowed to say 'give me
-- a question from the answer I want'").
--
-- Returns the question text and options with the `correct` key STRIPPED,
-- mirroring the quizzes_public view. Students cannot read `quizzes` at all
-- (admin-only SELECT), so SECURITY DEFINER is what makes this readable, and
-- stripping the key is what keeps it safe.
CREATE OR REPLACE FUNCTION public.get_or_create_daily_question()
RETURNS TABLE(
  id uuid,
  quiz_id uuid,
  question_id text,
  question_text text,
  options jsonb,
  quiz_subject text,
  quiz_chapter text,
  reason text,
  answered_at timestamp with time zone,
  is_correct boolean,
  student_answer text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Africa/Algiers')::date;
  v_row   public.daily_questions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.daily_questions
   WHERE student_id = auth.uid() AND assigned_date = v_today;

  IF NOT FOUND THEN
    -- Score every question in the bank against this student's learning state.
    WITH candidates AS (
      SELECT q.id AS quiz_id,
             COALESCE(e.elem ->> 'id', 'q_' || e.ord) AS question_id,
             q.subject, q.chapter
        FROM public.quizzes q
        CROSS JOIN LATERAL jsonb_array_elements(q.questions) WITH ORDINALITY AS e(elem, ord)
    ),
    -- Chapters this student has attempted and is weak in (< 70% correct).
    -- Every column here is table-qualified on purpose: this function's
    -- RETURNS TABLE declares OUT parameters called quiz_subject, quiz_chapter
    -- and is_correct, so a bare reference is ambiguous between the OUT
    -- parameter and the column and PL/pgSQL refuses to run the query.
    weak AS (
      SELECT qr.quiz_subject AS w_subject, qr.quiz_chapter AS w_chapter
        FROM public.quiz_question_results qr
       WHERE qr.student_id = auth.uid() AND qr.quiz_chapter IS NOT NULL
       GROUP BY qr.quiz_subject, qr.quiz_chapter
      HAVING COUNT(*) FILTER (WHERE qr.is_correct) * 100 / NULLIF(COUNT(*), 0) < 70
    ),
    scored AS (
      SELECT c.*,
             CASE
               WHEN m.id IS NOT NULL THEN 100 + m.mistake_count
               WHEN w.w_chapter IS NOT NULL THEN 50
               WHEN r.seen IS NULL THEN 10
               ELSE 0
             END AS score,
             CASE
               WHEN m.id IS NOT NULL THEN 'repeated_mistake'
               WHEN w.w_chapter IS NOT NULL THEN 'weak_chapter'
               WHEN r.seen IS NULL THEN 'new_practice'
               ELSE 'balanced'
             END AS reason
        FROM candidates c
        LEFT JOIN public.mistakes m
               ON m.student_id = auth.uid() AND m.quiz_id = c.quiz_id
              AND m.question_id = c.question_id AND m.status = 'active'
        LEFT JOIN weak w
               ON w.w_subject = c.subject AND w.w_chapter = c.chapter
        LEFT JOIN LATERAL (
              SELECT 1 AS seen FROM public.quiz_question_results qr
               WHERE qr.student_id = auth.uid() AND qr.quiz_id = c.quiz_id
                 AND qr.question_id = c.question_id
               LIMIT 1
             ) r ON true
       -- nothing served to this student in the last 30 days
       WHERE NOT EXISTS (
              SELECT 1 FROM public.daily_questions d
               WHERE d.student_id = auth.uid()
                 AND d.quiz_id = c.quiz_id AND d.question_id = c.question_id
                 AND d.assigned_date > v_today - 30
             )
    )
    INSERT INTO public.daily_questions (student_id, assigned_date, quiz_id, question_id, reason)
    SELECT auth.uid(), v_today, s.quiz_id, s.question_id, s.reason
      FROM scored s
     ORDER BY s.score DESC, random()
     LIMIT 1
    RETURNING * INTO v_row;

    -- a brand-new deployment with no quiz content at all
    IF v_row.id IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT v_row.id, v_row.quiz_id, v_row.question_id,
         COALESCE(e.elem ->> 'question', ''),
         -- the answer key never leaves the server before submission
         COALESCE(e.elem -> 'options', '[]'::jsonb),
         q.subject, q.chapter,
         v_row.reason, v_row.answered_at, v_row.is_correct, v_row.student_answer
    FROM public.quizzes q
    CROSS JOIN LATERAL jsonb_array_elements(q.questions) WITH ORDINALITY AS e(elem, ord)
   WHERE q.id = v_row.quiz_id
     AND COALESCE(e.elem ->> 'id', 'q_' || e.ord) = v_row.question_id
   LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_daily_question() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_daily_question() TO authenticated, service_role;


-- submit_daily_question: grades TODAY's assignment for the caller. Takes only
-- the chosen letter -- the question itself comes from the stored assignment,
-- never from the request, so a client cannot answer a question it was not
-- given. The correct answer is returned only AFTER the answer is recorded.
CREATE OR REPLACE FUNCTION public.submit_daily_question(p_answer text)
RETURNS TABLE(is_correct boolean, correct_answer text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today      date := (now() AT TIME ZONE 'Africa/Algiers')::date;
  v_row        public.daily_questions%ROWTYPE;
  v_quiz       public.quizzes%ROWTYPE;
  v_question   jsonb;
  v_ord        int;
  v_correct    int;
  v_given_idx  int;
  v_is_right   boolean;
  v_letter     text;
  v_attempt_id uuid;
  v_next       int;
  v_per_q      int;
BEGIN
  IF p_answer IS NULL OR p_answer NOT IN ('A', 'B', 'C', 'D') THEN
    RAISE EXCEPTION 'Invalid answer: %', p_answer;
  END IF;

  SELECT * INTO v_row FROM public.daily_questions
   WHERE student_id = auth.uid() AND assigned_date = v_today;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No daily question assigned';
  END IF;
  -- one attempt, so no second helping of points and no answer-shopping
  IF v_row.answered_at IS NOT NULL THEN
    RAISE EXCEPTION 'Daily question already answered';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_row.quiz_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  SELECT e.elem, e.ord INTO v_question, v_ord
    FROM jsonb_array_elements(v_quiz.questions) WITH ORDINALITY AS e(elem, ord)
   WHERE COALESCE(e.elem ->> 'id', 'q_' || e.ord) = v_row.question_id
   LIMIT 1;
  IF v_question IS NULL THEN
    RAISE EXCEPTION 'Question no longer exists';
  END IF;

  v_correct := (v_question ->> 'correct')::int;
  v_given_idx := CASE p_answer WHEN 'A' THEN 0 WHEN 'B' THEN 1 WHEN 'C' THEN 2 WHEN 'D' THEN 3 END;
  v_is_right := v_given_idx = v_correct;
  v_letter := (ARRAY['A', 'B', 'C', 'D'])[v_correct + 1];
  v_per_q := CASE WHEN v_quiz.type = 'daily' THEN 25 ELSE 8 END;

  -- A real attempt row, tagged so quiz stats can exclude it (see the column's
  -- comment above): quiz_question_results.quiz_attempt_id is NOT NULL and
  -- mastery reads that table.
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_next
    FROM public.quiz_attempts WHERE quiz_id = v_row.quiz_id AND student_id = auth.uid();

  INSERT INTO public.quiz_attempts
    (student_id, quiz_id, score, answers, attempt_number, completed_at, submitted, source)
  VALUES
    (auth.uid(), v_row.quiz_id, CASE WHEN v_is_right THEN v_per_q ELSE 0 END,
     jsonb_build_object(v_row.question_id, p_answer), v_next, now(), true, 'daily_question')
  RETURNING id INTO v_attempt_id;

  -- ---- the three writes below mirror submit_quiz_attempt's per-question
  -- ---- block exactly; keep them in step with it.
  INSERT INTO public.quiz_question_results (
    student_id, quiz_attempt_id, quiz_id, question_id, question_text,
    student_answer, correct_answer, is_correct, selected_choice_index,
    question_number, quiz_type, quiz_subject, quiz_chapter
  ) VALUES (
    auth.uid(), v_attempt_id, v_row.quiz_id, v_row.question_id,
    COALESCE(v_question ->> 'question', ''), p_answer, v_letter, v_is_right,
    v_given_idx, v_ord, v_quiz.type::text, v_quiz.subject, v_quiz.chapter
  ) ON CONFLICT (quiz_attempt_id, question_id) DO NOTHING;

  IF v_is_right THEN
    UPDATE public.mistakes SET status = 'resolved', resolved_at = now()
     WHERE student_id = auth.uid() AND quiz_id = v_row.quiz_id
       AND question_id = v_row.question_id AND status = 'active';
  ELSE
    INSERT INTO public.mistakes (
      student_id, quiz_id, question_id, quiz_subject, quiz_chapter, quiz_type,
      question_text, options, student_answer, correct_answer
    ) VALUES (
      auth.uid(), v_row.quiz_id, v_row.question_id, v_quiz.subject, v_quiz.chapter,
      v_quiz.type::text, COALESCE(v_question ->> 'question', ''),
      v_question -> 'options', p_answer, v_letter
    ) ON CONFLICT (student_id, quiz_id, question_id) DO UPDATE SET
      mistake_count = public.mistakes.mistake_count + 1, last_mistaken_at = now(),
      status = 'active', resolved_at = NULL, question_text = EXCLUDED.question_text,
      options = EXCLUDED.options, student_answer = EXCLUDED.student_answer,
      correct_answer = EXCLUDED.correct_answer, quiz_subject = EXCLUDED.quiz_subject,
      quiz_chapter = EXCLUDED.quiz_chapter, quiz_type = EXCLUDED.quiz_type;
  END IF;

  IF v_is_right THEN
    -- Same ('quiz', quiz_id, question_id) key a real quiz award uses, so
    -- points_transactions_unique_award silently stops a second payout for a
    -- question this student already banked.
    BEGIN
      PERFORM public.record_points_transaction(
        auth.uid(), v_per_q, 'quiz', v_row.quiz_id,
        'Daily question: ' || COALESCE(v_quiz.subject, ''),
        v_quiz.subject, v_quiz.chapter, v_quiz.type::text, v_row.question_id
      );
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;

  UPDATE public.daily_questions
     SET answered_at = now(), is_correct = v_is_right,
         student_answer = p_answer, quiz_attempt_id = v_attempt_id
   WHERE daily_questions.id = v_row.id;

  RETURN QUERY SELECT v_is_right, v_letter;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_daily_question(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_daily_question(text) TO authenticated, service_role;

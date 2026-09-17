-- Server-side quiz grading.
--
-- Closes two problems at once.
--
-- 1. QUIZZES NEVER RECORDED AS COMPLETE. QuizTaking wrote only `answers` and
--    `score`, never `completed_at` or `submitted`, and 20250927120000 removed
--    the column default. Five separate queries filter on
--    `completed_at IS NOT NULL`, so the completed-quiz counts, the day streak,
--    quiz entries in recent activity and the admin "latest attempts" panel were
--    all permanently empty.
--
-- 2. GRADING HAPPENED IN THE BROWSER. `quizzes.questions` carries the `correct`
--    index for every question, the client compared against it, and the client
--    then wrote its own `score` and its own `is_correct` rows. A student could
--    read the answer key, PATCH `quiz_attempts.score`, or POST
--    `quiz_question_results` with `is_correct: true`. This is the "known gap"
--    that scripts/attack-suite.mjs has been reporting.

-- ---------------------------------------------------------- quizzes_public
-- Everything about a quiz except the answers. Students read this; only admins
-- can still see `correct`.
-- Runs with the OWNER's permissions (the Postgres default for a view), which
-- is what lets it read a table whose RLS is admin-only. Same escape hatch the
-- `leaderboard` view uses. SELECT is granted to `authenticated` only.
CREATE OR REPLACE VIEW public.quizzes_public AS
SELECT
  q.id,
  q.type,
  q.subject,
  q.chapter,
  q.date,
  q.max_score,
  q.created_at,
  COALESCE(
    (
      SELECT jsonb_agg(elem - 'correct' ORDER BY ord)
      FROM jsonb_array_elements(q.questions) WITH ORDINALITY AS t(elem, ord)
    ),
    '[]'::jsonb
  ) AS questions
FROM public.quizzes q;

GRANT SELECT ON public.quizzes_public TO authenticated;

-- The base table keeps the answer key; admins only.
DROP POLICY IF EXISTS "Authenticated users can view quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Admins can view quizzes" ON public.quizzes;

CREATE POLICY "Admins can view quizzes"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------ submit_quiz_attempt
-- The only thing allowed to write a score. Grades against the answer key
-- server-side, records completion, and banks the points.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_attempt_id uuid,
  p_answers jsonb
)
RETURNS TABLE (score integer, max_score integer, correct_count integer, total_questions integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

    -- Points only on a first pass, and only for a correct answer. The amount
    -- is decided inside record_points_transaction, not here.
    IF v_is_right AND NOT v_is_retake THEN
      PERFORM public.record_points_transaction(
        auth.uid(), v_per_q, 'quiz', v_attempt.quiz_id,
        'Quiz: ' || COALESCE(v_quiz.subject, '') || ' - Q' || v_ord,
        v_quiz.subject, v_quiz.chapter, v_quiz.type::text, v_qid
      );
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

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

-- ------------------------------------------------- remove the client writes
-- With grading server-side, the client has no reason to write either table.
DROP POLICY IF EXISTS "Students can update their attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can insert their quiz results" ON public.quiz_question_results;

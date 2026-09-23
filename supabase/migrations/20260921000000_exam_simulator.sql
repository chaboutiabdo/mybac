-- Exam Simulator — stage 5 of the learning-loop initiative (stage 1: error
-- notebook, 20260919120000; stage 2: chapter mastery, 20260919130000; stage
-- 3: flashcards, 20260919140000; stage 4: today's revision, no migration).
--
-- A timed, server-authoritative UI wrapper around taking an EXISTING
-- `quizzes` row -- not a new content type, not a second grading system.
-- quiz_type stays closed to daily/normal/practice; there is no 'exam' value
-- and this migration does not add one. A simulator session always wraps a
-- real quiz_attempts row, created and graded exactly the way Quizzes.tsx /
-- submit_quiz_attempt already do it.
--
-- The ONLY new trust surface is timing. quiz_attempts has never recorded a
-- start time and submit_quiz_attempt has never checked one -- the 30-minute
-- countdown in QuizTaking.tsx is a pure client prop. This table exists so a
-- simulated exam has a real, server-set deadline: expires_at is computed
-- once, at INSERT, from server time plus a server-computed duration, and is
-- never client-writable -- no INSERT/UPDATE policy at all, same shape as
-- `mistakes` / `student_flashcard_progress`.
--
-- v1 has no hard server-side cutoff: submit_exam_simulation grades whenever
-- the student actually submits, exactly like submit_quiz_attempt already
-- does for every other quiz. The client auto-submits at 0:00 on its own
-- countdown; nothing server-side depends on that happening.
-- ponytail: no expiry sweep / cron job -- an abandoned session just sits at
-- status='in_progress' forever, same as an abandoned quiz_attempts row does
-- today. Add a sweep only if a report ever needs "abandoned" vs "active".
--
-- REMINDER (a lesson paid for in an earlier stage): this project's bootstrap
-- runs `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL
-- ON FUNCTIONS TO anon` (baseline.sql) -- REVOKE ... FROM PUBLIC alone does
-- NOT block anon. Both functions below revoke FROM PUBLIC, anon explicitly.

CREATE TABLE public.exam_simulation_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  quiz_id uuid NOT NULL,
  quiz_attempt_id uuid NOT NULL,
  duration_minutes integer NOT NULL,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  -- the entire point of this table: computed once, server-side, inside
  -- start_exam_simulation -- never taken from the client, never updated.
  expires_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone,
  status text DEFAULT 'in_progress' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT exam_simulation_sessions_status_check
    CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text]))
);

ALTER TABLE ONLY public.exam_simulation_sessions
  ADD CONSTRAINT exam_simulation_sessions_pkey PRIMARY KEY (id);

-- NOT profiles(id) -- auth.uid() only ever matches profiles.user_id (same
-- note as mistakes / student_flashcard_progress).
ALTER TABLE ONLY public.exam_simulation_sessions
  ADD CONSTRAINT exam_simulation_sessions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.exam_simulation_sessions
  ADD CONSTRAINT exam_simulation_sessions_quiz_id_fkey
    FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.exam_simulation_sessions
  ADD CONSTRAINT exam_simulation_sessions_quiz_attempt_id_fkey
    FOREIGN KEY (quiz_attempt_id) REFERENCES public.quiz_attempts(id) ON DELETE CASCADE;

-- The natural key AND the concurrency guard: at most one in-progress session
-- per (student, quiz). start_exam_simulation SELECTs this first and reuses
-- whatever it finds -- same expires_at, unchanged -- so refreshing the page,
-- or opening a second tab, can never grant extra time. Once a session is
-- 'completed' it falls outside this index, so starting the same quiz again
-- opens a genuinely new attempt, exactly like clicking "start" again on
-- /quizzes does today.
CREATE UNIQUE INDEX exam_simulation_sessions_active_unique
  ON public.exam_simulation_sessions (student_id, quiz_id)
  WHERE (status = 'in_progress');

-- One session per attempt, enforced by the database, not trusted from the
-- function body.
CREATE UNIQUE INDEX exam_simulation_sessions_attempt_unique
  ON public.exam_simulation_sessions (quiz_attempt_id);

CREATE INDEX idx_exam_simulation_sessions_student_id
  ON public.exam_simulation_sessions USING btree (student_id);

ALTER TABLE public.exam_simulation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own simulator sessions" ON public.exam_simulation_sessions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admins can view all simulator sessions" ON public.exam_simulation_sessions
  FOR SELECT USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policy for anyone, admin included: every write
-- goes through the two SECURITY DEFINER functions below, exactly like
-- mistakes / student_flashcard_progress. GRANT ALL here is safe precisely
-- because RLS supplies no write policy to grant into.
GRANT ALL ON TABLE public.exam_simulation_sessions TO anon, authenticated, service_role;


-- start_exam_simulation: get-or-create. Returns the caller's one active
-- session for this quiz, creating it (plus the quiz_attempts row underneath,
-- in the exact shape Quizzes.tsx already inserts client-side) on first call.
-- Duration is derived from the quiz's own question count -- deliberately no
-- p_duration_minutes parameter: letting the client choose exam length is
-- low-risk, but there's nothing to validate if the number never crosses the
-- boundary at all. The multiplier below is the only tuning knob.
CREATE OR REPLACE FUNCTION public.start_exam_simulation(p_quiz_id uuid)
RETURNS public.exam_simulation_sessions
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session        public.exam_simulation_sessions%ROWTYPE;
  v_quiz           public.quizzes%ROWTYPE;
  v_question_count int;
  v_duration       int;
  v_attempt_id     uuid;
  v_next_number    int;
BEGIN
  -- reuse: someone already has this quiz open. Same row, same expires_at --
  -- this is what stops "refresh for a new hour" from working.
  SELECT * INTO v_session
    FROM public.exam_simulation_sessions
   WHERE student_id = auth.uid() AND quiz_id = p_quiz_id AND status = 'in_progress';
  IF FOUND THEN
    RETURN v_session;
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  v_question_count := jsonb_array_length(COALESCE(v_quiz.questions, '[]'::jsonb));
  IF v_question_count = 0 THEN
    RAISE EXCEPTION 'Quiz has no questions';
  END IF;
  v_duration := GREATEST(15, LEAST(120, v_question_count * 3));

  -- exactly the row shape Quizzes.tsx's startQuiz() inserts, and exactly
  -- what "Students can create attempts" already allows for a direct client
  -- insert -- done here instead so it can be paired with the session row in
  -- one transaction.
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_next_number
    FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND student_id = auth.uid();

  INSERT INTO public.quiz_attempts (student_id, quiz_id, score, answers, attempt_number)
  VALUES (auth.uid(), p_quiz_id, 0, '{}'::jsonb, v_next_number)
  RETURNING id INTO v_attempt_id;

  BEGIN
    INSERT INTO public.exam_simulation_sessions
      (student_id, quiz_id, quiz_attempt_id, duration_minutes, expires_at)
    VALUES
      (auth.uid(), p_quiz_id, v_attempt_id, v_duration, now() + make_interval(mins => v_duration))
    RETURNING * INTO v_session;
  EXCEPTION WHEN unique_violation THEN
    -- lost a race against a second concurrent start call (two tabs). The
    -- quiz_attempts row just inserted is an orphan; harmless, same as any
    -- abandoned attempt today. Return whichever session won the race.
    SELECT * INTO v_session
      FROM public.exam_simulation_sessions
     WHERE student_id = auth.uid() AND quiz_id = p_quiz_id AND status = 'in_progress';
  END;

  RETURN v_session;
END;
$$;

REVOKE ALL ON FUNCTION public.start_exam_simulation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_exam_simulation(uuid) TO authenticated, service_role;


-- submit_exam_simulation: thin wrapper, not a second grading path. Grades
-- through submit_quiz_attempt UNCHANGED (nested SECURITY DEFINER calls are
-- already this codebase's pattern -- submit_quiz_attempt itself calls
-- record_points_transaction the same way), then stamps the session
-- completed. One RPC, not a start/complete split: if the client's second
-- call were ever lost after the attempt is graded, the session would be
-- stuck 'in_progress' forever, and exam_simulation_sessions_active_unique
-- would then block that student from ever retaking the quiz. One function
-- makes both happen in the same transaction, or neither does.
CREATE OR REPLACE FUNCTION public.submit_exam_simulation(p_session_id uuid, p_answers jsonb)
RETURNS TABLE(score integer, max_score integer, correct_count integer, total_questions integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session public.exam_simulation_sessions%ROWTYPE;
  v_score   integer;
  v_max     integer;
  v_correct integer;
  v_total   integer;
BEGIN
  SELECT * INTO v_session FROM public.exam_simulation_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.student_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not your session';
  END IF;

  IF v_session.status = 'completed' THEN
    RAISE EXCEPTION 'Session already submitted';
  END IF;

  -- v1 has no hard cutoff: expired or not, this grades through the same
  -- door every other quiz submission uses.
  SELECT * INTO v_score, v_max, v_correct, v_total
    FROM public.submit_quiz_attempt(v_session.quiz_attempt_id, p_answers);

  UPDATE public.exam_simulation_sessions
     SET completed_at = now(), status = 'completed'
   WHERE id = p_session_id;

  RETURN QUERY SELECT v_score, v_max, v_correct, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_exam_simulation(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_exam_simulation(uuid, jsonb) TO authenticated, service_role;

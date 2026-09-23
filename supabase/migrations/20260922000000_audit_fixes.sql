-- Audit remediation -- fixes for defects found by a full adversarial review of
-- the five features added in 20260919120000 .. 20260921400000.
--
-- Ordered by severity. Each block names the defect it closes.

-- ═══════════════════════════════════════════════════ TIER 1 -- SECURITY ══

-- 1.1 CRITICAL. `quizzes_public` is an auto-updatable view owned by postgres
-- WITHOUT security_invoker, and `authenticated` held INSERT/UPDATE/DELETE/
-- TRUNCATE on it. Because base-table RLS on a non-security_invoker view is
-- evaluated as the VIEW OWNER -- and postgres owns `quizzes` and is not under
-- FORCE ROW LEVEL SECURITY -- the `Admins can update/delete quizzes` policies
-- were never evaluated. Verified with EXPLAIN as `authenticated`:
--     DELETE FROM quizzes_public  ->  Delete on quizzes -> Seq Scan  (no filter)
-- One PostgREST call would have deleted every quiz, and `quizzes` is the
-- parent of quiz_attempts, quiz_question_results, mistakes, daily_questions
-- and exam_simulation_sessions -- all ON DELETE CASCADE. Every student's
-- entire history, gone. `UPDATE quizzes_public SET max_score = 1` would also
-- have silently corrupted averageScore app-wide.
--
-- This predates the five features, but four of those five cascading children
-- are new, so we had widened the blast radius considerably.
-- The fix is the REVOKE alone. It is deliberately NOT `security_invoker`:
-- turning that on makes the view read `quizzes` as the CALLER, whose only
-- SELECT policy is is_admin(), so the quiz list breaks -- and "fixing" that
-- with a permissive SELECT policy on the base table would hand every student
-- the `correct` key directly, which is far worse than the hole being closed.
-- Reading through the view as its owner is exactly what keeps the answer key
-- behind the view's projection. Only the WRITE privileges were the danger.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.quizzes_public FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leaderboard FROM anon, authenticated;


-- 1.2 CRITICAL. Every migration header in this project warns about
-- `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON FUNCTIONS TO anon`. The same
-- bootstrap also does it for TABLES:
--     postgres | public | r | anon=arwdDxtm/postgres
-- so every table created by postgres in `public` is auto-granted full DML to
-- anon, and the `GRANT ALL ON TABLE ... TO anon` lines in the five feature
-- migrations are no-ops that merely restate it -- they read like decisions and
-- are decoration. Nothing is currently exposed because all 30 public tables
-- have RLS enabled, but TRUNCATE is NOT governed by RLS at all, and anon held
-- it on `mistakes` and `daily_questions`.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;


-- 1.3 `quiz_attempts.source` was client-settable. The column exists solely so
-- stats can exclude one-answer daily-question attempts, so a student could tag
-- their bad attempts 'daily_question' and hide them from completedQuizzes and
-- averageScore. This ALSO booby-traps the 2.1 fix below: without this clause,
-- adding `source = 'quiz'` to the retake probe would let a student tag every
-- attempt 'daily_question' so nothing ever looks like a retake, then farm each
-- quiz's points twice with the answers already in hand. The two must ship
-- together.
ALTER POLICY "Students can create attempts" ON public.quiz_attempts
  WITH CHECK (
    student_id = auth.uid()
    AND score = 0
    AND completed_at IS NULL
    AND NOT submitted
    AND source = 'quiz'
  );


-- 1.4 `video_progress.completed_at` was fully client-written (Videos.tsx sends
-- it from the browser) and get_study_stats()/get_weekly_report() treat it as
-- proof of study. A student could upsert 365 backdated rows and manufacture
-- any longest_streak / days_this_month they liked. Every OTHER streak source
-- is server-stamped.
--
-- Fixed by overwriting rather than by policy: an RLS WITH CHECK is evaluated
-- AFTER BEFORE-triggers, so "completed_at IS NULL" and a stamping trigger
-- cannot coexist. This makes whatever the client sends irrelevant.
--
-- NOTE, honestly: this closes BACKDATING, not self-attestation. `watched` is
-- still a client-set boolean, so a student can still claim to have finished a
-- video they did not watch -- bounded by the catalogue size, same as the
-- exam_progress booleans that pay 10 points each. The streak is self-attested
-- by design; see the audit notes.
CREATE OR REPLACE FUNCTION public.stamp_video_completed_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF COALESCE(NEW.watched, false) THEN
    NEW.completed_at := COALESCE(
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.completed_at END, now());
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_video_completed_at() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS stamp_video_completed_at ON public.video_progress;
CREATE TRIGGER stamp_video_completed_at
  BEFORE INSERT OR UPDATE ON public.video_progress
  FOR EACH ROW EXECUTE FUNCTION public.stamp_video_completed_at();


-- 1.5 The last function anon could still execute. Harmless (auth.uid() is
-- NULL for anon so it returns false) but it is the final survivor of the
-- REVOKE pattern every other function follows.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;


-- ═════════════════════════════════════ TIER 2 -- CORRECTNESS / INTEGRITY ══

-- 2.9 A trigger that would error on any UPDATE: update_updated_at_column()
-- sets NEW.updated_at, but quiz_question_results has no such column. Latent
-- only because both writers use ON CONFLICT DO NOTHING. The first backfill or
-- repair would have hit `record "new" has no field "updated_at"`.
DROP TRIGGER IF EXISTS update_quiz_question_results_updated_at ON public.quiz_question_results;


-- 2.5 quiz_question_results had NO foreign key on quiz_attempt_id (NOT NULL
-- but unconstrained) or student_id -- 37 of 47 rows were orphans, inflating
-- `attempted` in get_chapter_mastery() and questions_answered in
-- get_weekly_report() for five accounts. Clean, then constrain.
DELETE FROM public.quiz_question_results r
 WHERE NOT EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = r.quiz_attempt_id);

ALTER TABLE ONLY public.quiz_question_results
  ADD CONSTRAINT quiz_question_results_quiz_attempt_id_fkey
    FOREIGN KEY (quiz_attempt_id) REFERENCES public.quiz_attempts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.quiz_question_results
  ADD CONSTRAINT quiz_question_results_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.daily_questions
  ADD CONSTRAINT daily_questions_quiz_attempt_id_fkey
    FOREIGN KEY (quiz_attempt_id) REFERENCES public.quiz_attempts(id) ON DELETE SET NULL;


-- ═══════════════════════════════════════════════ TIER 3 -- PERFORMANCE ══

-- 3.2 get_study_stats() and get_weekly_report() both seq-scanned quiz_attempts
-- and video_progress: their only indexes lead with quiz_id / video_id, so
-- `WHERE student_id = X` could at best read an entire index. Both RPCs run on
-- every dashboard mount, and quiz_attempts now grows by a row per student per
-- day. timezone(text, timestamptz) is IMMUTABLE, so the date expression
-- becomes a cheap filter over a small range scan once the leading column is
-- right.
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_source_completed
  ON public.quiz_attempts USING btree (student_id, source, completed_at);

CREATE INDEX IF NOT EXISTS idx_video_progress_student_completed
  ON public.video_progress USING btree (student_id, completed_at);

CREATE INDEX IF NOT EXISTS idx_exam_progress_student
  ON public.exam_progress USING btree (student_id);

-- 3.3 The daily-question selector's "has this student already seen this
-- question" probe ran once per candidate question and had no usable index --
-- idx_quiz_question_results_mastery leads (student_id, quiz_subject,
-- quiz_chapter) but the predicate is (student_id, quiz_id, question_id), so it
-- heap-filtered the student's entire answer history per candidate.
CREATE INDEX IF NOT EXISTS idx_quiz_question_results_student_quiz_question
  ON public.quiz_question_results USING btree (student_id, quiz_id, question_id);

-- 2.5/20.x The index whose comment claimed to serve the 30-day no-repeat
-- lookup does not match that predicate (student_id, quiz_id, question_id,
-- assigned_date) and was never chosen by the planner. Replace it with one that
-- does.
DROP INDEX IF EXISTS public.idx_daily_questions_student_question;
CREATE INDEX IF NOT EXISTS idx_daily_questions_student_question_date
  ON public.daily_questions USING btree (student_id, quiz_id, question_id, assigned_date);


-- ══════════════════════════════════════ TIER 2 -- FUNCTION REPLACEMENTS ══

-- 2.1 + 2.2. Two surgical changes to submit_quiz_attempt; everything else is
-- byte-identical to 20260919120000.
--
-- 2.1: the retake probe counted ANY completed attempt on the quiz. Since
-- submit_daily_question now creates one, answering a single daily question
-- from quiz X meant that later sitting X properly paid ZERO points for every
-- correct answer. Same through the simulator. Now only real quiz attempts
-- count as a prior attempt. (Safe only because 1.3 above stops a student
-- mislabelling their own attempts.)
--
-- 2.2: a student could read their own simulator session's quiz_attempt_id,
-- navigate to /quiz/<that id> and submit it through this function, which knows
-- nothing about sessions. The attempt graded, the session stayed 'in_progress'
-- forever, and exam_simulation_sessions_active_unique then handed that dead,
-- expired session back from start_exam_simulation for ever after -- the
-- simulator became permanently unusable for that quiz. One guard, here, covers
-- every caller.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_attempt_id uuid, p_answers jsonb)
RETURNS TABLE(score integer, max_score integer, correct_count integer, total_questions integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;

  IF v_attempt.student_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not your attempt'; END IF;
  IF v_attempt.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Attempt already submitted'; END IF;

  -- 2.2: this attempt belongs to a live simulator session; it must be
  -- submitted through submit_exam_simulation so the session is closed too.
  IF EXISTS (
    SELECT 1 FROM public.exam_simulation_sessions s
     WHERE s.quiz_attempt_id = p_attempt_id AND s.status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'Use the exam simulator to submit this attempt';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  v_per_q := CASE WHEN v_quiz.type = 'daily' THEN 25 ELSE 8 END;

  SELECT EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE quiz_id = v_attempt.quiz_id AND student_id = auth.uid()
      AND id <> p_attempt_id AND completed_at IS NOT NULL
      -- 2.1: a one-question daily answer is not a prior attempt at the quiz
      AND source = 'quiz'
  ) INTO v_is_retake;

  FOR v_question, v_ord IN
    SELECT elem, ord FROM jsonb_array_elements(v_quiz.questions) WITH ORDINALITY AS t(elem, ord)
  LOOP
    v_total := v_total + 1;
    v_qid := COALESCE(v_question ->> 'id', 'q_' || v_ord);
    v_correct := (v_question ->> 'correct')::int;

    v_given := p_answers ->> v_qid;
    v_given_idx := CASE v_given WHEN 'A' THEN 0 WHEN 'B' THEN 1 WHEN 'C' THEN 2 WHEN 'D' THEN 3 ELSE NULL END;
    v_is_right := v_given_idx IS NOT NULL AND v_given_idx = v_correct;
    IF v_is_right THEN v_right := v_right + 1; END IF;

    INSERT INTO public.quiz_question_results (
      student_id, quiz_attempt_id, quiz_id, question_id, question_text,
      student_answer, correct_answer, is_correct, selected_choice_index,
      question_number, quiz_type, quiz_subject, quiz_chapter
    ) VALUES (
      auth.uid(), p_attempt_id, v_attempt.quiz_id, v_qid, COALESCE(v_question ->> 'question', ''),
      v_given, (ARRAY['A','B','C','D'])[v_correct + 1], v_is_right, v_given_idx, v_ord,
      v_quiz.type::text, v_quiz.subject, v_quiz.chapter
    ) ON CONFLICT (quiz_attempt_id, question_id) DO NOTHING;

    IF v_is_right THEN
      UPDATE public.mistakes SET status = 'resolved', resolved_at = now()
       WHERE student_id = auth.uid() AND quiz_id = v_attempt.quiz_id AND question_id = v_qid AND status = 'active';
    ELSE
      INSERT INTO public.mistakes (
        student_id, quiz_id, question_id, quiz_subject, quiz_chapter, quiz_type,
        question_text, options, student_answer, correct_answer
      ) VALUES (
        auth.uid(), v_attempt.quiz_id, v_qid, v_quiz.subject, v_quiz.chapter, v_quiz.type::text,
        COALESCE(v_question ->> 'question', ''), v_question -> 'options', v_given,
        (ARRAY['A','B','C','D'])[v_correct + 1]
      ) ON CONFLICT (student_id, quiz_id, question_id) DO UPDATE SET
        mistake_count = public.mistakes.mistake_count + 1, last_mistaken_at = now(),
        status = 'active', resolved_at = NULL, question_text = EXCLUDED.question_text,
        options = EXCLUDED.options, student_answer = EXCLUDED.student_answer,
        correct_answer = EXCLUDED.correct_answer, quiz_subject = EXCLUDED.quiz_subject,
        quiz_chapter = EXCLUDED.quiz_chapter, quiz_type = EXCLUDED.quiz_type;
    END IF;

    IF v_is_right AND NOT v_is_retake THEN
      BEGIN
        PERFORM public.record_points_transaction(
          auth.uid(), v_per_q, 'quiz', v_attempt.quiz_id,
          'Quiz: ' || COALESCE(v_quiz.subject, '') || ' - Q' || v_ord,
          v_quiz.subject, v_quiz.chapter, v_quiz.type::text, v_qid
        );
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END IF;
  END LOOP;

  v_score := v_right * v_per_q;
  UPDATE public.quiz_attempts SET answers = p_answers, score = v_score, completed_at = now(), submitted = true
   WHERE id = p_attempt_id;

  RETURN QUERY SELECT v_score, v_total * v_per_q, v_right, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated, service_role;


-- 2.11 start_exam_simulation's unique_violation handler wrapped only the
-- SESSION insert -- the quiz_attempts insert (with its unguarded
-- MAX(attempt_number)+1) sat above it, so a concurrent collision on
-- quiz_attempts_unique_attempt escaped uncaught, defeating the very handler
-- written to make two tabs safe. Both inserts now sit inside it.
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

  BEGIN
    SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_next_number
      FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND student_id = auth.uid();

    INSERT INTO public.quiz_attempts (student_id, quiz_id, score, answers, attempt_number)
    VALUES (auth.uid(), p_quiz_id, 0, '{}'::jsonb, v_next_number)
    RETURNING id INTO v_attempt_id;

    INSERT INTO public.exam_simulation_sessions
      (student_id, quiz_id, quiz_attempt_id, duration_minutes, expires_at)
    VALUES
      (auth.uid(), p_quiz_id, v_attempt_id, v_duration, now() + make_interval(mins => v_duration))
    RETURNING * INTO v_session;
  EXCEPTION WHEN unique_violation THEN
    -- lost a race against a second concurrent start (two tabs), on either the
    -- attempt_number counter or the one-active-session index. Return whichever
    -- session won; any orphaned attempt row is harmless, exactly like an
    -- abandoned attempt today.
    SELECT * INTO v_session
      FROM public.exam_simulation_sessions
     WHERE student_id = auth.uid() AND quiz_id = p_quiz_id AND status = 'in_progress';
  END;

  RETURN v_session;
END;
$$;

REVOKE ALL ON FUNCTION public.start_exam_simulation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_exam_simulation(uuid) TO authenticated, service_role;


-- 2.12 expires_at was enforced by nothing: the migration that created it
-- called it "a real, server-set deadline", but submit_exam_simulation never
-- read it, so a student could work the paper for three hours and be scored as
-- if they finished inside the limit. The deadline is now recorded as fact --
-- the submission is still accepted (rejecting it would lose real work over a
-- network hiccup), but lateness is returned so the results screen can say so.
-- Dropped first: adding an OUT parameter changes the return type, which
-- CREATE OR REPLACE cannot do.
DROP FUNCTION IF EXISTS public.submit_exam_simulation(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.submit_exam_simulation(p_session_id uuid, p_answers jsonb)
RETURNS TABLE(score integer, max_score integer, correct_count integer, total_questions integer, was_late boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session public.exam_simulation_sessions%ROWTYPE;
  v_score   integer;
  v_max     integer;
  v_correct integer;
  v_total   integer;
  v_late    boolean;
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

  v_late := now() > v_session.expires_at;

  -- Close the session BEFORE grading, not after: submit_quiz_attempt now
  -- refuses an attempt that belongs to an in_progress session (that guard is
  -- what stops a student grading it via /quiz/:id and bricking the session).
  -- This is all one transaction, so a grading failure still rolls the close
  -- back with it.
  UPDATE public.exam_simulation_sessions
     SET completed_at = now(), status = 'completed'
   WHERE id = p_session_id;

  SELECT * INTO v_score, v_max, v_correct, v_total
    FROM public.submit_quiz_attempt(v_session.quiz_attempt_id, p_answers);

  RETURN QUERY SELECT v_score, v_max, v_correct, v_total, v_late;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_exam_simulation(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_exam_simulation(uuid, jsonb) TO authenticated, service_role;


-- 2.4 + 2.7 + 2.8 + 3.3. get_or_create_daily_question:
--   2.4 the INSERT had no unique-violation handling, so two tabs on the
--       dashboard surfaced a raw duplicate-key error onto the card.
--   2.7 it never returned correct_answer, so answering wrong and refreshing
--       destroyed the right answer forever -- on the one feature whose entire
--       purpose is fixing repeated mistakes. Now returned, but ONLY once the
--       question has been answered.
--   2.8 with a bank smaller than the 30-day no-repeat window the candidate set
--       went empty and the function silently returned nothing, which the UI
--       could not tell apart from "no content exists". Now falls back to the
--       least-recently-served question.
--   3.3 ORDER BY ... random() forced a full sort of every question in the
--       bank; now the top-20 by score are taken first and one is sampled.
-- Dropped first: adding the correct_answer OUT parameter changes the return
-- type, which CREATE OR REPLACE cannot do.
DROP FUNCTION IF EXISTS public.get_or_create_daily_question();

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
  student_answer text,
  correct_answer text
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
    WITH candidates AS (
      SELECT q.id AS quiz_id,
             COALESCE(e.elem ->> 'id', 'q_' || e.ord) AS question_id,
             q.subject, q.chapter
        FROM public.quizzes q
        CROSS JOIN LATERAL jsonb_array_elements(q.questions) WITH ORDINALITY AS e(elem, ord)
    ),
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
             END AS reason,
             -- when was this last served to this student (NULL = never)
             (SELECT MAX(d.assigned_date) FROM public.daily_questions d
               WHERE d.student_id = auth.uid()
                 AND d.quiz_id = c.quiz_id AND d.question_id = c.question_id) AS last_served
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
    ),
    -- prefer anything not served in the last 30 days; if the bank is smaller
    -- than that window, fall back to whatever was served longest ago rather
    -- than returning nothing at all (2.8)
    ranked AS (
      SELECT s.*,
             (s.last_served IS NULL OR s.last_served <= v_today - 30) AS eligible
        FROM scored s
    ),
    best AS (
      SELECT * FROM ranked
       ORDER BY eligible DESC, score DESC, last_served ASC NULLS FIRST
       LIMIT 20
    )
    INSERT INTO public.daily_questions (student_id, assigned_date, quiz_id, question_id, reason)
    SELECT auth.uid(), v_today, b.quiz_id, b.question_id, b.reason
      FROM best b
     ORDER BY random()
     LIMIT 1
    ON CONFLICT (student_id, assigned_date) DO NOTHING
    RETURNING * INTO v_row;

    -- ON CONFLICT DO NOTHING means RETURNING yields nothing when a concurrent
    -- call won the race, so re-read rather than reporting "no question" (2.4).
    IF v_row.id IS NULL THEN
      SELECT * INTO v_row FROM public.daily_questions
       WHERE student_id = auth.uid() AND assigned_date = v_today;
    END IF;

    -- genuinely no quiz content in the database at all
    IF v_row.id IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT v_row.id, v_row.quiz_id, v_row.question_id,
         COALESCE(e.elem ->> 'question', ''),
         COALESCE(e.elem -> 'options', '[]'::jsonb),
         q.subject, q.chapter,
         v_row.reason, v_row.answered_at, v_row.is_correct, v_row.student_answer,
         -- the key is released only after the student has answered (2.7)
         CASE WHEN v_row.answered_at IS NOT NULL
              THEN (ARRAY['A','B','C','D'])[((e.elem ->> 'correct')::int) + 1]
         END
    FROM public.quizzes q
    CROSS JOIN LATERAL jsonb_array_elements(q.questions) WITH ORDINALITY AS e(elem, ord)
   WHERE q.id = v_row.quiz_id
     AND COALESCE(e.elem ->> 'id', 'q_' || e.ord) = v_row.question_id
   LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_daily_question() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_daily_question() TO authenticated, service_role;


-- 2.3 + 2.11. submit_daily_question's "already answered" guard was a
-- read-then-check with the stamping UPDATE nine statements later and no lock,
-- so two concurrent calls both passed: two attempts, two quiz_question_results
-- rows for one question (mastery inflation) and mistake_count bumped twice.
-- Replaced by an atomic claim -- the UPDATE itself is the guard and the lock.
-- The attempt insert also now handles the attempt_number collision.
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

  -- Atomic claim: whichever concurrent call gets here first takes the row and
  -- the lock; the loser's UPDATE matches nothing and it stops here.
  UPDATE public.daily_questions
     SET answered_at = now(), student_answer = p_answer
   WHERE student_id = auth.uid() AND assigned_date = v_today AND answered_at IS NULL
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No daily question assigned, or it was already answered';
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

  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_next
    FROM public.quiz_attempts WHERE quiz_id = v_row.quiz_id AND student_id = auth.uid();

  INSERT INTO public.quiz_attempts
    (student_id, quiz_id, score, answers, attempt_number, completed_at, submitted, source)
  VALUES
    (auth.uid(), v_row.quiz_id, CASE WHEN v_is_right THEN v_per_q ELSE 0 END,
     jsonb_build_object(v_row.question_id, p_answer), v_next, now(), true, 'daily_question')
  RETURNING id INTO v_attempt_id;

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
     SET is_correct = v_is_right, quiz_attempt_id = v_attempt_id
   WHERE daily_questions.id = v_row.id;

  RETURN QUERY SELECT v_is_right, v_letter;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_daily_question(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_daily_question(text) TO authenticated, service_role;


-- 2.6 + 3.4. get_weekly_report:
--   2.6 the original header claimed mistakes.last_mistaken_at was append-only
--       and therefore safe to compare week over week. It is NOT -- both
--       grading functions do `ON CONFLICT ... SET last_mistaken_at = now()`,
--       so missing a question again in a later week MOVES the row and silently
--       reduces the earlier week's total. That is precisely the flaw the same
--       header correctly identified for last_reviewed_at and refused to
--       compare on. mistakes_made is therefore current-week only now, like
--       flashcards_reviewed and mistakes_reviewed, and the previous-week
--       column is gone.
--       (It also never counted "mistakes made": it counts distinct questions
--       whose MOST RECENT miss falls in the window.)
--   3.4 the study-days CTE scanned the student's entire lifetime history to
--       answer a question about 14 days. Bounded now.
DROP FUNCTION IF EXISTS public.get_weekly_report(integer);

CREATE OR REPLACE FUNCTION public.get_weekly_report(p_weeks_ago integer DEFAULT 0)
RETURNS TABLE(
  week_start date,
  week_end date,
  prev_week_start date,
  prev_week_end date,
  questions_answered integer,
  questions_correct integer,
  lessons_completed integer,
  simulations_completed integer,
  study_days integer,
  prev_questions_answered integer,
  prev_questions_correct integer,
  prev_lessons_completed integer,
  prev_simulations_completed integer,
  prev_study_days integer,
  -- current week only: the columns behind these are last-write-wins, so a
  -- previous-week figure would silently drift as the student keeps studying
  flashcards_reviewed integer,
  mistakes_reviewed integer,
  mistakes_made integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH bounds AS (
  SELECT (date_trunc('week', (now() AT TIME ZONE 'Africa/Algiers')::date)::date
          - (LEAST(GREATEST(COALESCE(p_weeks_ago, 0), 0), 52) * 7)) AS this_start
),
w AS (
  SELECT this_start,
         this_start + 6 AS this_end,
         this_start - 7 AS prev_start,
         this_start - 1 AS prev_end
    FROM bounds
),
-- 3.4: bounded to the fortnight actually reported on
days AS (
  SELECT DISTINCT (a.completed_at AT TIME ZONE 'Africa/Algiers')::date AS d
    FROM public.quiz_attempts a, w
   WHERE a.student_id = auth.uid() AND a.completed_at IS NOT NULL
     AND (a.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.this_end
  UNION
  SELECT DISTINCT (m.last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.mistakes m, w
   WHERE m.student_id = auth.uid() AND m.last_reviewed_at IS NOT NULL
     AND (m.last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.this_end
  UNION
  SELECT DISTINCT (f.last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.student_flashcard_progress f, w
   WHERE f.student_id = auth.uid()
     AND (f.last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.this_end
  UNION
  SELECT DISTINCT (s.completed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.exam_simulation_sessions s, w
   WHERE s.student_id = auth.uid() AND s.completed_at IS NOT NULL
     AND (s.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.this_end
  UNION
  SELECT DISTINCT (v.completed_at AT TIME ZONE 'Africa/Algiers')::date
    FROM public.video_progress v, w
   WHERE v.student_id = auth.uid() AND v.completed_at IS NOT NULL
     AND (v.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.this_end
)
SELECT
  w.this_start, w.this_end, w.prev_start, w.prev_end,

  (SELECT COUNT(*)::int FROM public.quiz_question_results r
    WHERE r.student_id = auth.uid()
      AND (r.created_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.quiz_question_results r
    WHERE r.student_id = auth.uid() AND r.is_correct
      AND (r.created_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.video_progress v
    WHERE v.student_id = auth.uid() AND v.completed_at IS NOT NULL
      AND (v.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.exam_simulation_sessions s
    WHERE s.student_id = auth.uid() AND s.completed_at IS NOT NULL
      AND (s.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM days WHERE days.d BETWEEN w.this_start AND w.this_end),

  (SELECT COUNT(*)::int FROM public.quiz_question_results r
    WHERE r.student_id = auth.uid()
      AND (r.created_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM public.quiz_question_results r
    WHERE r.student_id = auth.uid() AND r.is_correct
      AND (r.created_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM public.video_progress v
    WHERE v.student_id = auth.uid() AND v.completed_at IS NOT NULL
      AND (v.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM public.exam_simulation_sessions s
    WHERE s.student_id = auth.uid() AND s.completed_at IS NOT NULL
      AND (s.completed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.prev_start AND w.prev_end),
  (SELECT COUNT(*)::int FROM days WHERE days.d BETWEEN w.prev_start AND w.prev_end),

  (SELECT COUNT(*)::int FROM public.student_flashcard_progress f
    WHERE f.student_id = auth.uid()
      AND (f.last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.mistakes m
    WHERE m.student_id = auth.uid() AND m.last_reviewed_at IS NOT NULL
      AND (m.last_reviewed_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end),
  (SELECT COUNT(*)::int FROM public.mistakes m
    WHERE m.student_id = auth.uid()
      AND (m.last_mistaken_at AT TIME ZONE 'Africa/Algiers')::date BETWEEN w.this_start AND w.this_end)
FROM w
$$;

REVOKE ALL ON FUNCTION public.get_weekly_report(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_report(integer) TO authenticated, service_role;

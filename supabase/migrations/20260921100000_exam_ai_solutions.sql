-- AI Exam Solver -- feature 2 of 5.
--
-- `exams` rows are PDF-only: `questions` is an integer DISPLAY COUNT, not
-- content, and nothing in the schema holds question text (contrast
-- `quizzes.questions`, which is jsonb). So "solve this exam" means sending the
-- PDF itself to Gemini as multimodal input -- by far the most expensive call
-- this project makes, on a free-tier key with no billing account attached.
--
-- SHARED CACHE, not per-student -- same reasoning as `flashcards`
-- (20260919140000): one exam's worked solution is identical for every student,
-- so a private copy per student would multiply AI cost for no benefit. One
-- real Gemini call per (exam, prompt_version), ever.
--
-- BUT, UNLIKE `flashcards`, THERE IS NO CLIENT SELECT POLICY -- not for
-- `authenticated`, not for `anon`. flashcards grants SELECT to every signed-in
-- student because STUDYING is free by spec. AI exam solutions are PREMIUM by
-- spec, and a SELECT policy here would be a total paywall bypass: a free
-- student would run
--     supabase.from('exam_ai_solutions').select('solution')
-- straight at PostgREST and read every cached solution ever generated, for
-- every exam, without once touching the premium-gated edge function. Every
-- read goes through gemini-chat, which enforces role IN ('premium','admin')
-- server-side BEFORE it looks at this cache. The exam PDF itself stays free
-- (baseline's "Students can view documents" is unchanged) -- premium buys the
-- explanation, not the paper.
--
-- Not a jsonb column on `exams`, which would need no new table at all: that
-- table is `FOR SELECT TO authenticated USING (true)`, Postgres RLS has no
-- column-level grants, and hiding one column would mean a view plus a policy
-- rewrite -- more work than a table with no policies.
--
-- REMINDER (the lesson every stage since 2 has repeated): baseline.sql runs
-- `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON FUNCTIONS TO anon`, so REVOKE
-- ... FROM PUBLIC alone does NOT block anon. This migration adds no functions,
-- so there is nothing to revoke here -- if you add one later, revoke FROM
-- PUBLIC, anon explicitly.

CREATE TABLE public.exam_ai_solutions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  exam_id uuid NOT NULL,
  -- the validated array gemini-chat parsed out of Gemini's JSON mode: one
  -- object per question, each with its ordered steps. jsonb, not normalised
  -- into rows, for the same reason `quizzes.questions` is jsonb -- it is read
  -- whole and never queried into.
  solution jsonb NOT NULL,
  -- which PDF this was built from. 'solution_grounded': the official corrige
  -- existed and the model explained IT. 'derived': only the paper existed and
  -- the model worked the answers out itself -- less reliable, and the page
  -- tells the student which one they are reading.
  source text NOT NULL,
  -- which model won the MODELS fallback loop, read from the response's
  -- modelVersion. Debug-only: when a solution is wrong, this is the first
  -- question anyone asks.
  model text,
  -- bump SOLVE_PROMPT_VERSION in gemini-chat when the prompt or the response
  -- schema changes: old rows stop matching, the next request is a cache miss,
  -- a fresh row is generated. No DELETE, no backfill, no downtime.
  prompt_version integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT exam_ai_solutions_source_check
    CHECK (source = ANY (ARRAY['solution_grounded'::text, 'derived'::text]))
);

ALTER TABLE ONLY public.exam_ai_solutions
  ADD CONSTRAINT exam_ai_solutions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exam_ai_solutions
  ADD CONSTRAINT exam_ai_solutions_exam_id_fkey
    FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

-- The cache key AND the concurrency guard AND the only index this table needs:
-- the one query is "this exam's solution at the current prompt version".
-- gemini-chat writes ON CONFLICT on exactly this pair, so two students hitting
-- an uncached exam at the same moment cannot both insert. Deliberately NOT
-- exam_simulator's catch-unique_violation-and-re-select: THAT function must
-- return the race winner's row unchanged because the timer is the whole point;
-- here both generations are equally valid, so last-writer-wins is correct --
-- and the same statement is what upgrades a stale 'derived' row once the
-- official corrige is finally uploaded.
CREATE UNIQUE INDEX exam_ai_solutions_exam_version_unique
  ON public.exam_ai_solutions USING btree (exam_id, prompt_version);

CREATE OR REPLACE TRIGGER update_exam_ai_solutions_updated_at
  BEFORE UPDATE ON public.exam_ai_solutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.exam_ai_solutions ENABLE ROW LEVEL SECURITY;

-- Admins, SELECT only: someone has to be able to look at a bad solution
-- without service-role credentials. No student policy of any kind -- see the
-- header. No INSERT/UPDATE/DELETE policy for anyone, admin included:
-- gemini-chat writes with the service role, which bypasses RLS entirely (the
-- same relationship generate_flashcards already has to `flashcards`).
CREATE POLICY "Admins can view AI exam solutions" ON public.exam_ai_solutions
  FOR SELECT USING (public.is_admin());

-- GRANT ALL is safe here precisely because RLS supplies no policy for
-- anon/authenticated to grant into -- same shape as exam_simulation_sessions.
GRANT ALL ON TABLE public.exam_ai_solutions TO anon, authenticated, service_role;


-- gemini-chat's per-user 60-calls-a-day ceiling is a COUNT over
-- ai_learning_conversations, so a mode that writes no row there is a mode with
-- no rate limit at all. solve_exam sends a whole PDF -- the most expensive call
-- this project makes -- and the cache above only bounds the SUCCESS path: a
-- malformed, truncated, or rejected Gemini response writes no cache row, so an
-- immediate retry spends the whole shared free quota again, and again,
-- deterministically (the same PDF truncates the same way every time), with
-- nothing counting. Widening this CHECK by one value is the entire fix.
ALTER TABLE public.ai_learning_conversations
  DROP CONSTRAINT IF EXISTS ai_learning_conversations_mode_check;

ALTER TABLE public.ai_learning_conversations
  ADD CONSTRAINT ai_learning_conversations_mode_check
    CHECK (mode = ANY (ARRAY['tutor'::text, 'explain_mistake'::text, 'solve_exam'::text]));

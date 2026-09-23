-- AI metering: make every mode countable against the daily ceiling.
--
-- The ceiling in gemini-chat counts rows in ai_learning_conversations. Two
-- things stopped that from working:
--
-- 1. `generate_flashcards` wrote no row at all, so it checked a quota it could
--    never consume -- the one mode with no effective limit. It now meters like
--    the others, which requires the mode CHECK to admit the value; without this
--    migration the insert fails the constraint, the function logs the error and
--    carries on, and the mode stays silently unmetered.
-- 2. tutor and explain_mistake logged only after a successful answer, so every
--    timeout and every 503 spent a real Gemini call for free. They now insert
--    before the call and update the row afterwards.
--
-- Nothing is deleted and no existing row changes: the old three values stay
-- valid, so rows written before this migration still satisfy the constraint.

ALTER TABLE public.ai_learning_conversations
  DROP CONSTRAINT IF EXISTS ai_learning_conversations_mode_check;

ALTER TABLE public.ai_learning_conversations
  ADD CONSTRAINT ai_learning_conversations_mode_check
  CHECK (mode = ANY (ARRAY[
    'tutor'::text,
    'explain_mistake'::text,
    'solve_exam'::text,
    'generate_flashcards'::text
  ]));

-- The ceiling query is `where user_id = ? and created_at >= ?`, and the two
-- separate single-column indexes made Postgres pick one and filter the rest.
-- It runs on every AI request, so it is the hottest read in the function.
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_created
  ON public.ai_learning_conversations USING btree (user_id, created_at DESC);

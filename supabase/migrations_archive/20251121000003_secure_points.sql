-- record_points_transaction is SECURITY DEFINER, EXECUTE was PUBLIC, and it
-- took p_student_id straight from the caller without ever comparing it to
-- auth.uid(). Being SECURITY DEFINER it also bypassed the WITH CHECK on
-- points_transactions, so any authenticated user could write any number of
-- points onto ANY account -- and the update_student_total_score trigger pushed
-- that straight into profiles.total_score (the leaderboard).
--
-- The signature is kept identical so the single call site
-- (src/hooks/useActivityTracking.ts:58) needs no change.

CREATE OR REPLACE FUNCTION public.record_points_transaction(
  p_student_id UUID,
  p_points INTEGER,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_source_description TEXT DEFAULT NULL,
  p_subject TEXT DEFAULT NULL,
  p_chapter TEXT DEFAULT NULL,
  p_quiz_type TEXT DEFAULT NULL,
  p_question_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transaction_id UUID;
BEGIN
  IF p_student_id IS NULL OR p_points IS NULL OR p_source_type IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters: student_id, points, and source_type are required';
  END IF;

  IF p_points <= 0 THEN
    RAISE EXCEPTION 'Points must be positive';
  END IF;

  -- the guard this function was missing
  IF p_student_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Cannot record points for another user';
  END IF;

  INSERT INTO public.points_transactions (
    student_id, points, source_type, source_id, source_description,
    subject, chapter, quiz_type, question_id
  ) VALUES (
    p_student_id, p_points, p_source_type, p_source_id, p_source_description,
    p_subject, p_chapter, p_quiz_type, p_question_id
  )
  RETURNING id INTO transaction_id;

  RETURN transaction_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_points_transaction(
  UUID, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_points_transaction(
  UUID, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

-- Guarding the RPC alone achieves nothing while students can INSERT into
-- points_transactions directly (20250926000000 granted exactly that), because
-- update_student_total_score recomputes total_score from the table on any
-- insert. Route all writes through the RPC above.
DROP POLICY IF EXISTS "Students can insert their own points transactions" ON public.points_transactions;

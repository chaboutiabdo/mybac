-- Add UPDATE policy for students to update their quiz attempts
-- This was missing and was causing "Failed to submit quiz" error
DROP POLICY IF EXISTS "Students can update their attempts" ON public.quiz_attempts;
CREATE POLICY "Students can update their attempts" ON public.quiz_attempts 
  FOR UPDATE USING (student_id = auth.uid()) 
  WITH CHECK (student_id = auth.uid());

-- Add UPDATE policy for admins to update all attempts
DROP POLICY IF EXISTS "Admins can update all attempts" ON public.quiz_attempts;
CREATE POLICY "Admins can update all attempts" ON public.quiz_attempts 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Ensure default for answers is an empty object, not an empty array
-- This aligns with how we're storing answers in the frontend (as objects/dictionaries)
ALTER TABLE public.quiz_attempts ALTER COLUMN answers SET DEFAULT '{}'::jsonb;

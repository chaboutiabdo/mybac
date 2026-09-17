-- Add submitted column to quiz_attempts table if it doesn't exist
ALTER TABLE public.quiz_attempts 
ADD COLUMN IF NOT EXISTS submitted BOOLEAN NOT NULL DEFAULT FALSE;

-- Add attempt_number if it doesn't exist
ALTER TABLE public.quiz_attempts 
ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1;

-- Update completed_at to allow NULL (remove default now())
-- First, we need to drop and recreate the column since it has a default
ALTER TABLE public.quiz_attempts
ALTER COLUMN completed_at DROP DEFAULT;

-- Make completed_at nullable
ALTER TABLE public.quiz_attempts
ALTER COLUMN completed_at DROP NOT NULL;

-- Create index IF NOT EXISTS for faster queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student ON public.quiz_attempts(quiz_id, student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted ON public.quiz_attempts(submitted);

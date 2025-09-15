-- Fix quiz_attempts table to allow multiple attempts per quiz
-- Drop the unique constraint that prevents multiple attempts
ALTER TABLE public.quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_quiz_id_student_id_key;

-- Create a composite unique constraint on quiz_id, student_id, and attempt number to allow multiple attempts
-- But first add an attempt_number column if it doesn't exist
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- Update existing records to set attempt_number = 1
UPDATE public.quiz_attempts SET attempt_number = 1 WHERE attempt_number IS NULL;

-- Make attempt_number NOT NULL
ALTER TABLE public.quiz_attempts ALTER COLUMN attempt_number SET NOT NULL;

-- Create new unique constraint allowing multiple attempts
ALTER TABLE public.quiz_attempts ADD CONSTRAINT quiz_attempts_unique_attempt 
UNIQUE (quiz_id, student_id, attempt_number);
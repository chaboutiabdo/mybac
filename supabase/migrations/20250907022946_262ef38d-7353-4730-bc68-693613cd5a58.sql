-- Create CSV upload functionality for quiz questions and make sessions work properly
-- First, let's create a quizzes table if it doesn't work correctly

-- Create a questions_import table for CSV uploads
CREATE TABLE IF NOT EXISTS public.questions_import (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  subject TEXT NOT NULL,
  chapter TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on questions_import
ALTER TABLE public.questions_import ENABLE ROW LEVEL SECURITY;

-- Create policies for questions_import
CREATE POLICY "Admins can manage questions_import" 
ON public.questions_import 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

-- Update scoring triggers to work correctly
-- Recreate the scoring function with proper logic
CREATE OR REPLACE FUNCTION public.calculate_user_score(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  video_score INTEGER := 0;
  exam_score INTEGER := 0;  
  daily_quiz_score INTEGER := 0;
  practice_quiz_score INTEGER := 0;
  booking_score INTEGER := 0;
  total_score INTEGER := 0;
BEGIN
  -- Video score: 5 points per watched video
  SELECT COALESCE(COUNT(*) * 5, 0) INTO video_score
  FROM video_progress 
  WHERE student_id = user_id_param AND watched = true;
  
  -- Exam score: 10 points per exam interaction (solution viewed or AI solved)
  SELECT COALESCE(COUNT(*) * 10, 0) INTO exam_score
  FROM exam_progress 
  WHERE student_id = user_id_param AND (viewed_solution = true OR solved_with_ai = true);
  
  -- Daily quiz score: 25 points per correct answer
  SELECT COALESCE(SUM(CASE WHEN qr.is_correct THEN 25 ELSE 0 END), 0) INTO daily_quiz_score
  FROM quiz_question_results qr
  JOIN quiz_attempts qa ON qr.quiz_attempt_id = qa.id
  JOIN quizzes q ON qa.quiz_id = q.id
  WHERE qr.student_id = user_id_param AND q.type = 'daily';
  
  -- Practice quiz score: 8 points per correct answer
  SELECT COALESCE(SUM(CASE WHEN qr.is_correct THEN 8 ELSE 0 END), 0) INTO practice_quiz_score
  FROM quiz_question_results qr
  JOIN quiz_attempts qa ON qr.quiz_attempt_id = qa.id
  JOIN quizzes q ON qa.quiz_id = q.id
  WHERE qr.student_id = user_id_param AND q.type = 'practice';
  
  -- Booking score: 70 points per alumni booking
  SELECT COALESCE(COUNT(*) * 70, 0) INTO booking_score
  FROM bookings 
  WHERE student_id = user_id_param;
  
  -- Calculate total
  total_score := video_score + exam_score + daily_quiz_score + practice_quiz_score + booking_score;
  
  -- Update user profile
  UPDATE profiles 
  SET total_score = total_score 
  WHERE user_id = user_id_param;
  
  RETURN total_score;
END;
$$;

-- Create triggers for automatic score updates
DROP TRIGGER IF EXISTS update_score_on_video_progress ON public.video_progress;
CREATE TRIGGER update_score_on_video_progress
  AFTER INSERT OR UPDATE ON public.video_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_score_trigger();

DROP TRIGGER IF EXISTS update_score_on_exam_progress ON public.exam_progress;
CREATE TRIGGER update_score_on_exam_progress
  AFTER INSERT OR UPDATE ON public.exam_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_score_trigger();

DROP TRIGGER IF EXISTS update_score_on_quiz_results ON public.quiz_question_results;
CREATE TRIGGER update_score_on_quiz_results
  AFTER INSERT ON public.quiz_question_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_score_trigger();

DROP TRIGGER IF EXISTS update_score_on_bookings ON public.bookings;
CREATE TRIGGER update_score_on_bookings
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_score_trigger();
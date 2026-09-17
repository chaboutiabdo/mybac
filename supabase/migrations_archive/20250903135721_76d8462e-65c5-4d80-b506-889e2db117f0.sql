-- Update scoring system with database triggers

-- Create function to calculate and update user scores
CREATE OR REPLACE FUNCTION public.calculate_user_score(user_id_param UUID)
RETURNS INTEGER
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

-- Create trigger function that calls the score calculation
CREATE OR REPLACE FUNCTION public.update_user_score_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle different table operations
  IF TG_TABLE_NAME = 'video_progress' THEN
    PERFORM public.calculate_user_score(NEW.student_id);
  ELSIF TG_TABLE_NAME = 'exam_progress' THEN
    PERFORM public.calculate_user_score(NEW.student_id);
  ELSIF TG_TABLE_NAME = 'quiz_question_results' THEN
    PERFORM public.calculate_user_score(NEW.student_id);
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    PERFORM public.calculate_user_score(NEW.student_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for automatic score updates
DROP TRIGGER IF EXISTS video_progress_score_trigger ON video_progress;
CREATE TRIGGER video_progress_score_trigger
  AFTER INSERT OR UPDATE ON video_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_user_score_trigger();

DROP TRIGGER IF EXISTS exam_progress_score_trigger ON exam_progress;  
CREATE TRIGGER exam_progress_score_trigger
  AFTER INSERT OR UPDATE ON exam_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_user_score_trigger();

DROP TRIGGER IF EXISTS quiz_results_score_trigger ON quiz_question_results;
CREATE TRIGGER quiz_results_score_trigger
  AFTER INSERT ON quiz_question_results  
  FOR EACH ROW EXECUTE FUNCTION public.update_user_score_trigger();
  
DROP TRIGGER IF EXISTS bookings_score_trigger ON bookings;
CREATE TRIGGER bookings_score_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_user_score_trigger();

-- Add avatar_url column to alumni table
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS avatar_url TEXT;
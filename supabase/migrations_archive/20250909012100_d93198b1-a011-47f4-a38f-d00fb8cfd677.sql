-- Fix the ambiguous column reference in calculate_user_score function
CREATE OR REPLACE FUNCTION public.calculate_user_score(user_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  video_score INTEGER := 0;
  exam_score INTEGER := 0;  
  daily_quiz_score INTEGER := 0;
  practice_quiz_score INTEGER := 0;
  booking_score INTEGER := 0;
  final_total_score INTEGER := 0;
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
  final_total_score := video_score + exam_score + daily_quiz_score + practice_quiz_score + booking_score;
  
  -- Update user profile with the new total score
  UPDATE profiles 
  SET total_score = final_total_score 
  WHERE user_id = user_id_param;
  
  RETURN final_total_score;
END;
$function$;
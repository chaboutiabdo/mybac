-- Update the calculate_user_score function to fix scoring
CREATE OR REPLACE FUNCTION calculate_user_score(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    total_score INTEGER := 0;
    video_score INTEGER := 0;
    exam_score INTEGER := 0;
    quiz_score INTEGER := 0;
    booking_score INTEGER := 0;
BEGIN
    -- Calculate video score (5 points per video watched)
    SELECT COUNT(*) * 5 INTO video_score
    FROM video_progress
    WHERE student_id = user_id_param AND watched = true;
    
    -- Calculate exam score (10 points per exam solved or solution viewed)
    SELECT COUNT(*) * 10 INTO exam_score
    FROM exam_progress
    WHERE student_id = user_id_param 
    AND (solved_with_ai = true OR viewed_solution = true);
    
    -- Calculate quiz score
    -- Daily quizzes: 25 points per correct answer
    -- Practice quizzes: 8 points per correct answer
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN q.type = 'daily' THEN 25
                WHEN q.type = 'practice' THEN 8
                ELSE 0
            END
        ), 0) INTO quiz_score
    FROM quiz_question_results qqr
    JOIN quiz_attempts qa ON qqr.quiz_attempt_id = qa.id
    JOIN quizzes q ON qa.quiz_id = q.id
    WHERE qqr.student_id = user_id_param AND qqr.is_correct = true;
    
    -- Calculate booking score (70 points per booking)
    SELECT COUNT(*) * 70 INTO booking_score
    FROM bookings
    WHERE student_id = user_id_param;
    
    total_score := video_score + exam_score + quiz_score + booking_score;
    
    -- Update the user's profile with the new score
    UPDATE profiles 
    SET total_score = total_score, updated_at = now()
    WHERE user_id = user_id_param;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update scores
DROP TRIGGER IF EXISTS update_score_on_video_progress ON video_progress;
CREATE TRIGGER update_score_on_video_progress
    AFTER INSERT OR UPDATE ON video_progress
    FOR EACH ROW
    WHEN (NEW.watched = true)
    EXECUTE FUNCTION trigger_update_user_score();

DROP TRIGGER IF EXISTS update_score_on_exam_progress ON exam_progress;
CREATE TRIGGER update_score_on_exam_progress
    AFTER INSERT OR UPDATE ON exam_progress
    FOR EACH ROW
    WHEN (NEW.solved_with_ai = true OR NEW.viewed_solution = true)
    EXECUTE FUNCTION trigger_update_user_score();

DROP TRIGGER IF EXISTS update_score_on_quiz_question_results ON quiz_question_results;
CREATE TRIGGER update_score_on_quiz_question_results
    AFTER INSERT ON quiz_question_results
    FOR EACH ROW
    WHEN (NEW.is_correct = true)
    EXECUTE FUNCTION trigger_update_user_score();

DROP TRIGGER IF EXISTS update_score_on_bookings ON bookings;
CREATE TRIGGER update_score_on_bookings
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_score();

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_update_user_score()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_user_score(NEW.student_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
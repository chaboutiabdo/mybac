-- Create triggers to automatically update scores using the existing function
DROP TRIGGER IF EXISTS trigger_update_score_video ON video_progress;
CREATE TRIGGER trigger_update_score_video
    AFTER INSERT OR UPDATE ON video_progress
    FOR EACH ROW
    WHEN (NEW.watched = true)
    EXECUTE FUNCTION update_user_score_trigger();

DROP TRIGGER IF EXISTS trigger_update_score_exam ON exam_progress;
CREATE TRIGGER trigger_update_score_exam
    AFTER INSERT OR UPDATE ON exam_progress
    FOR EACH ROW
    WHEN (NEW.solved_with_ai = true OR NEW.viewed_solution = true)
    EXECUTE FUNCTION update_user_score_trigger();

DROP TRIGGER IF EXISTS trigger_update_score_quiz ON quiz_question_results;
CREATE TRIGGER trigger_update_score_quiz
    AFTER INSERT ON quiz_question_results
    FOR EACH ROW
    WHEN (NEW.is_correct = true)
    EXECUTE FUNCTION update_user_score_trigger();

DROP TRIGGER IF EXISTS trigger_update_score_booking ON bookings;
CREATE TRIGGER trigger_update_score_booking
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_score_trigger();
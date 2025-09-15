import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useActivityTracking = () => {
  const { user } = useAuth();

  const trackQuizQuestion = async (
    quizAttemptId: string,
    questionId: string,
    questionText: string,
    studentAnswer: string,
    correctAnswer: string,
    isCorrect: boolean,
    timeSpent?: number
  ) => {
    if (!user) return;

    try {
      await supabase.from("quiz_question_results").insert({
        student_id: user.id,
        quiz_attempt_id: quizAttemptId,
        question_id: questionId,
        question_text: questionText,
        student_answer: studentAnswer,
        correct_answer: correctAnswer,
        is_correct: isCorrect,
        time_spent: timeSpent,
      });
    } catch (error) {
      console.error("Error tracking quiz question:", error);
    }
  };

  const trackVideoActivity = async (
    videoId: string,
    action: "started" | "paused" | "resumed" | "completed",
    videoTitle: string,
    subject: string,
    chapter?: string,
    position?: number,
    sessionId?: string
  ) => {
    if (!user) return;

    try {
      console.log('Tracking video activity:', { videoId, action, videoTitle, user: user.id });
      
      // Log the activity
      const { data: activityLog, error: activityError } = await supabase.from("video_activity_logs").insert({
        student_id: user.id,
        video_id: videoId,
        action,
        video_title: videoTitle,
        subject,
        chapter,
        position,
        session_id: sessionId,
      }).select().single();

      if (activityError) {
        console.error("Error logging video activity:", activityError);
      } else {
        console.log('Video activity logged successfully:', activityLog);
      }

      // If video started or completed, track video progress for scoring
      if (action === "started" || action === "completed") {
        console.log('Updating video progress for scoring...');
        
        // Use upsert with ON CONFLICT DO UPDATE to handle duplicates
        const { data: progressData, error: progressError } = await supabase.from("video_progress").upsert({
          student_id: user.id,
          video_id: videoId,
          watched: action === "completed",
          watch_time: position || 0,
          completed_at: action === "completed" ? new Date().toISOString() : null
        }, {
          onConflict: 'student_id,video_id'
        }).select().single();

        if (progressError) {
          console.error("Error updating video progress:", progressError);
        } else {
          console.log('Video progress updated:', progressData);
        }
      }
    } catch (error) {
      console.error("Error tracking video activity:", error);
    }
  };

  const trackExamActivity = async (
    examId: string,
    action: "viewed" | "downloaded" | "started_solving" | "completed",
    examTitle: string,
    subject: string,
    year: number,
    stream: string,
    difficulty?: string
  ) => {
    if (!user) return;

    try {
      console.log('Tracking exam activity:', { examId, action, examTitle, user: user.id });
      
      // Log the activity
      const { data: activityLog, error: activityError } = await supabase.from("exam_activity_logs").insert({
        student_id: user.id,
        exam_id: examId,
        action,
        exam_title: examTitle,
        subject,
        year,
        stream,
        difficulty,
      }).select().single();

      if (activityError) {
        console.error("Error logging exam activity:", activityError);
      } else {
        console.log('Exam activity logged successfully:', activityLog);
      }

      // Update exam progress for scoring based on action
      if (action === "viewed" || action === "downloaded" || action === "started_solving") {
        console.log('Updating exam progress for scoring...');
        
        const progressUpdate: any = {
          student_id: user.id,
          exam_id: examId,
        };

        if (action === "viewed") {
          progressUpdate.viewed_exam = true;
        } else if (action === "downloaded") {
          progressUpdate.viewed_solution = true;
        } else if (action === "started_solving") {
          progressUpdate.solved_with_ai = true;
        }

        const { data: progressData, error: progressError } = await supabase.from("exam_progress").upsert(progressUpdate, {
          onConflict: 'student_id,exam_id'
        }).select().single();
        
        if (progressError) {
          console.error("Error updating exam progress:", progressError);
        } else {
          console.log('Exam progress updated:', progressData);
        }
      }
    } catch (error) {
      console.error("Error tracking exam activity:", error);
    }
  };

  const trackStudentQuestion = async (
    questionText: string,
    topic?: string,
    subject?: string,
    contextType?: "quiz" | "video" | "exam" | "general",
    contextId?: string,
    aiResponse?: string
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.from("student_questions_log").insert({
        student_id: user.id,
        question_text: questionText,
        topic,
        subject,
        context_type: contextType,
        context_id: contextId,
        ai_response: aiResponse,
      }).select().single();

      return data;
    } catch (error) {
      console.error("Error tracking student question:", error);
      return null;
    }
  };

  const updateQuestionSatisfaction = async (
    questionId: string,
    satisfactionRating: number
  ) => {
    if (!user) return;

    try {
      await supabase
        .from("student_questions_log")
        .update({ satisfaction_rating: satisfactionRating })
        .eq("id", questionId)
        .eq("student_id", user.id);
    } catch (error) {
      console.error("Error updating question satisfaction:", error);
    }
  };

  return {
    trackQuizQuestion,
    trackVideoActivity,
    trackExamActivity,
    trackStudentQuestion,
    updateQuestionSatisfaction,
  };
};
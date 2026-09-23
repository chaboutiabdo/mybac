import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from '@/integrations/supabase/types';
import { useAuth } from "@/contexts/AuthContext";

export const useActivityTracking = () => {
  const { user } = useAuth();

  const trackVideoActivity = async (
    videoId: string,
    action: "started" | "paused" | "resumed" | "completed",
    videoTitle: string,
    subject: string,
    chapter?: string | null,
    position?: number | null,
    sessionId?: string | null
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

      // Only "completed" touches progress. Writing on "started" too meant
      // re-opening an already-watched video upserted watched:false and reset
      // it — and for premium videos the "completed" write never fires, so they
      // could never stay watched.
      if (action === "completed") {
        const { data: progressData, error: progressError } = await supabase.from("video_progress").upsert({
          student_id: user.id,
          video_id: videoId,
          watched: true,
          watch_time: position || 0,
          completed_at: new Date().toISOString()
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
    difficulty?: string | null
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
        
        const progressUpdate: TablesInsert<'exam_progress'> = {
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
    trackVideoActivity,
    trackExamActivity,
    trackStudentQuestion,
    updateQuestionSatisfaction,
  };
};
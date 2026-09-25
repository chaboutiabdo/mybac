import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Activity LOGS only (what the admin panel and the dashboard's weekly chart
 * show). Progress — video_progress, exam_progress — is written by the pages
 * that know the outcome (Videos.tsx, Exams.tsx, ExamSolution.tsx); this hook
 * used to write the same rows a second time.
 */
export const useActivityTracking = () => {
  const { user } = useAuth();

  const trackVideoActivity = async (
    videoId: string,
    action: "started" | "paused" | "resumed" | "completed",
    videoTitle: string,
    subject: string,
    chapter?: string | null
  ) => {
    if (!user) return;
    const { error } = await supabase.from("video_activity_logs").insert({
      student_id: user.id,
      video_id: videoId,
      action,
      video_title: videoTitle,
      subject,
      chapter,
    });
    if (error) console.error("Error logging video activity:", error);
  };

  const trackExamActivity = async (
    examId: string,
    action: "viewed" | "downloaded" | "started_solving" | "completed",
    examTitle: string,
    subject: string,
    year: number,
    stream: string
  ) => {
    if (!user) return;
    const { error } = await supabase.from("exam_activity_logs").insert({
      student_id: user.id,
      exam_id: examId,
      action,
      exam_title: examTitle,
      subject,
      year,
      stream,
    });
    if (error) console.error("Error logging exam activity:", error);
  };

  return { trackVideoActivity, trackExamActivity };
};

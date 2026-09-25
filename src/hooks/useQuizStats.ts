import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { dzKey } from "@/lib/bac";

// `questions` is a jsonb column, so it arrives typed as Json rather than an
// array; count it only when it really is one.
const questionCount = (questions: unknown): number =>
  Array.isArray(questions) ? questions.length : 0;

const isMath = (subject?: string | null) =>
  subject === "Math" || subject === "Mathematics" || subject?.toLowerCase() === "math";
const isPhysics = (subject?: string | null) => subject?.toLowerCase() === "physics";

const progress = (completed: number, total: number) => ({
  completed,
  total,
  percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
});

export interface QuizStats {
  completedQuizzes: number;
  averageScore: number;
  /** today's daily quiz (Algiers day); overallProgress and below are about it */
  todaysQuizId: string | null;
  overallProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  subjectProgress: {
    math: { completed: number; total: number; percentage: number };
    physics: { completed: number; total: number; percentage: number };
  };
  questionsRemaining: number;
  loading: boolean;
}

export const useQuizStats = () => {
  const [stats, setStats] = useState<QuizStats>({
    completedQuizzes: 0,
    averageScore: 0,
    todaysQuizId: null,
    overallProgress: { completed: 0, total: 0, percentage: 0 },
    subjectProgress: {
      math: { completed: 0, total: 0, percentage: 0 },
      physics: { completed: 0, total: 0, percentage: 0 },
    },
    questionsRemaining: 0,
    loading: true,
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchQuizStats();
    } else {
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  const fetchQuizStats = async () => {
    if (!user) return;

    try {
      setStats((prev) => ({ ...prev, loading: true }));

      // Students cannot read `quizzes` — it holds the answer key, and only
      // admins may select from it. This hook used to read it directly and
      // inner-join attempts and results to it, and an inner join to rows you
      // cannot see returns nothing: every stat below was 0 for every student.
      // quizzes_public carries all it needs, and each result row already
      // records its quiz's type and subject.
      const [{ data: attempts }, { data: correct }, { data: quizzes }] = await Promise.all([
        // source='quiz' only: a daily-question attempt holds ONE answer, so its
        // score (8) against the quiz's max_score (100) reads as 8% and would
        // drag averageScore down every time a student answered the daily
        // question correctly. Simulator attempts are genuine full attempts and
        // stay in.
        supabase
          .from("quiz_attempts")
          .select("quiz_id, score, completed_at")
          .eq("student_id", user.id)
          .eq("source", "quiz")
          .not("completed_at", "is", null),
        supabase
          .from("quiz_question_results")
          .select("quiz_id, question_id, quiz_subject")
          .eq("student_id", user.id)
          .eq("is_correct", true),
        supabase.from("quizzes_public").select("id, type, subject, date, questions, max_score"),
      ]);

      const quizById = new Map((quizzes ?? []).map((q) => [q.id, q]));

      const completedQuizzes = new Set((attempts ?? []).map((a) => a.quiz_id)).size;

      // average score as a percentage of each quiz's maximum
      const percentages = (attempts ?? []).map((a) => {
        const max = quizById.get(a.quiz_id)?.max_score || 1;
        return ((a.score || 0) / max) * 100;
      });
      const averageScore = percentages.length
        ? Math.round((percentages.reduce((sum, p) => sum + p, 0) / percentages.length) * 10) / 10
        : 0;

      // "اختبار اليوم" is today's daily quiz. It used to add up every daily
      // quiz ever published, and count a question again on every retake.
      const today = dzKey();
      const daily = (quizzes ?? []).filter((q) => q.type === "daily" && q.date === today);
      const todaysIds = new Set(daily.map((q) => q.id));
      const seen = new Set<string>();
      const dailyCorrect = (correct ?? []).filter((r) => {
        const key = `${r.quiz_id}:${r.question_id}`;
        if (!todaysIds.has(r.quiz_id) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const questionsIn = (list: typeof daily) => list.reduce((sum, q) => sum + questionCount(q.questions), 0);
      const totalQuestions = questionsIn(daily);

      setStats({
        completedQuizzes,
        averageScore,
        todaysQuizId: daily[0]?.id ?? null,
        overallProgress: progress(dailyCorrect.length, totalQuestions),
        subjectProgress: {
          math: progress(
            dailyCorrect.filter((r) => isMath(r.quiz_subject)).length,
            questionsIn(daily.filter((q) => isMath(q.subject)))
          ),
          physics: progress(
            dailyCorrect.filter((r) => isPhysics(r.quiz_subject)).length,
            questionsIn(daily.filter((q) => isPhysics(q.subject)))
          ),
        },
        questionsRemaining: Math.max(0, totalQuestions - dailyCorrect.length),
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching quiz stats:", error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  return stats;
};

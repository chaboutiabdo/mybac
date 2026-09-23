import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserScore } from "./useUserScore";

export interface DashboardStats {
  totalScore: number;
  completedQuizzes: number;
  videosWatched: number;
  examsSolved: number;
  loading: boolean;
}

const NO_COUNTS = { completedQuizzes: 0, videosWatched: 0, examsSolved: 0 };

export const useDashboardStats = (): DashboardStats => {
  const { user } = useAuth();
  const { score: totalScore, loading: scoreLoading } = useUserScore();
  const [counts, setCounts] = useState(NO_COUNTS);
  // The counts keep their own flag. Folding scoreLoading into this state read
  // it from a stale closure and combined it as `scoreLoading || prev.loading`,
  // which could never turn false: the cards showed "…" forever.
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCounts(NO_COUNTS);
      setCountsLoading(false);
      return;
    }

    let active = true;
    setCountsLoading(true);

    Promise.all([
      // completed quizzes. source='quiz' only: a daily-question attempt holds
      // one answer and is not a completed quiz — without this filter /home and
      // /profile showed different numbers under the identical Arabic label,
      // because useQuizStats does filter.
      supabase
        .from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('source', 'quiz')
        .not('completed_at', 'is', null),
      // videos watched
      supabase
        .from('video_progress')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('watched', true),
      // exams solved with AI or with the solution viewed
      supabase
        .from('exam_progress')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .or('solved_with_ai.eq.true,viewed_solution.eq.true'),
    ])
      .then(([quizzes, videos, exams]) => {
        if (!active) return;
        setCounts({
          completedQuizzes: quizzes.count ?? 0,
          videosWatched: videos.count ?? 0,
          examsSolved: exams.count ?? 0,
        });
      })
      .catch((error) => console.error('Error fetching dashboard stats:', error))
      .finally(() => {
        if (active) setCountsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  return { totalScore, ...counts, loading: countsLoading || scoreLoading };
};

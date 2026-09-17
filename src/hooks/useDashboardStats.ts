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

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalScore: 0,
    completedQuizzes: 0,
    videosWatched: 0,
    examsSolved: 0,
    loading: true,
  });
  const { user } = useAuth();
  const { score: userScore, loading: scoreLoading } = useUserScore();

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    } else {
      setStats({
        totalScore: 0,
        completedQuizzes: 0,
        videosWatched: 0,
        examsSolved: 0,
        loading: false,
      });
    }
  }, [user]);

  // Update total score when userScore changes
  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      totalScore: userScore,
      loading: scoreLoading || prev.loading,
    }));
  }, [userScore, scoreLoading]);

  const fetchDashboardStats = async () => {
    if (!user) return;

    setStats((prev) => ({ ...prev, loading: true }));

    try {
      // Fetch all stats in parallel
      const [quizAttemptsData, videoProgressData, examProgressData] = await Promise.all([
        // Completed Quizzes: Count quiz attempts that have been completed
        supabase
          .from('quiz_attempts')
          .select('id', { count: 'exact' })
          .eq('student_id', user.id)
          .not('completed_at', 'is', null),
        
        // Videos Watched: Count videos where watched = true
        supabase
          .from('video_progress')
          .select('id', { count: 'exact' })
          .eq('student_id', user.id)
          .eq('watched', true),
        
        // Exams Solved: Count exams where solved_with_ai = true or viewed_solution = true
        supabase
          .from('exam_progress')
          .select('id', { count: 'exact' })
          .eq('student_id', user.id)
          .or('solved_with_ai.eq.true,viewed_solution.eq.true')
      ]);

      setStats({
        totalScore: userScore,
        completedQuizzes: quizAttemptsData.count || 0,
        videosWatched: videoProgressData.count || 0,
        examsSolved: examProgressData.count || 0,
        loading: scoreLoading, // Only set to false if score is also loaded
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStats((prev) => ({
        ...prev,
        loading: scoreLoading, // Only set to false if score is also loaded
      }));
    }
  };

  return stats;
};


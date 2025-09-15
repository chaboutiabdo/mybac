import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useUserScore = () => {
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserScore();
    }
  }, [user]);

  const fetchUserScore = async () => {
    if (!user) return;

    try {
      // Manually calculate score to ensure accuracy
      const [videoData, examData, dailyQuizData, practiceQuizData, bookingData] = await Promise.all([
        supabase.from('video_progress').select('*').eq('student_id', user.id).eq('watched', true),
        supabase.from('exam_progress').select('*').eq('student_id', user.id),
        supabase.from('quiz_question_results')
          .select('*, quiz_attempts!inner(quiz_id, quizzes!inner(type))')
          .eq('student_id', user.id)
          .eq('is_correct', true)
          .eq('quiz_attempts.quizzes.type', 'daily'),
        supabase.from('quiz_question_results')
          .select('*, quiz_attempts!inner(quiz_id, quizzes!inner(type))')
          .eq('student_id', user.id)
          .eq('is_correct', true)
          .eq('quiz_attempts.quizzes.type', 'practice'),
        supabase.from('bookings').select('*').eq('student_id', user.id)
      ]);

      let totalScore = 0;

      // Video score: 5 points per watched video
      if (videoData.data) {
        totalScore += videoData.data.length * 5;
      }

      // Exam score: 10 points per exam interaction
      if (examData.data) {
        const examScore = examData.data.filter(exam => 
          exam.viewed_solution || exam.solved_with_ai
        ).length * 10;
        totalScore += examScore;
      }

      // Daily quiz score: 25 points per correct answer
      if (dailyQuizData.data) {
        totalScore += dailyQuizData.data.length * 25;
      }

      // Practice quiz score: 8 points per correct answer
      if (practiceQuizData.data) {
        totalScore += practiceQuizData.data.length * 8;
      }

      // Booking score: 70 points per alumni booking
      if (bookingData.data) {
        totalScore += bookingData.data.length * 70;
      }

      // Update the profile with calculated score
      await supabase
        .from('profiles')
        .update({ total_score: totalScore })
        .eq('user_id', user.id);

      setScore(totalScore);
    } catch (error) {
      console.error('Error fetching/calculating user score:', error);
      // Fallback to stored score
      try {
        const { data } = await supabase
          .from('profiles')
          .select('total_score')
          .eq('user_id', user.id)
          .single();
        setScore(data?.total_score || 0);
      } catch (fallbackError) {
        console.error('Error fetching fallback score:', fallbackError);
        setScore(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshScore = () => {
    if (user) {
      fetchUserScore();
    }
  };

  return { score, loading, refreshScore };
};
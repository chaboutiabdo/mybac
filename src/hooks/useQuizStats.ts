import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// `questions` is a jsonb column, so it arrives typed as Json rather than an
// array; count it only when it really is one.
const questionCount = (questions: unknown): number =>
  Array.isArray(questions) ? questions.length : 0;

export interface QuizStats {
  completedQuizzes: number;
  averageScore: number;
  pointsEarned: number;
  dayStreak: number;
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
    pointsEarned: 0,
    dayStreak: 0,
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

      // Fetch all quiz attempts with scores
      const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          score,
          completed_at,
          quiz_id,
          quizzes!inner(
            id,
            subject,
            type,
            questions,
            max_score
          )
        `)
        .eq('student_id', user.id)
        .not('completed_at', 'is', null);

      // Fetch quiz question results for points calculation
      const { data: questionResults } = await supabase
        .from('quiz_question_results')
        .select(`
          id,
          is_correct,
          quizzes!inner(type)
        `)
        .eq('student_id', user.id)
        .eq('is_correct', true);

      // Fetch all daily quizzes to calculate progress
      const { data: allDailyQuizzes } = await supabase
        .from('quizzes')
        .select('id, subject, questions')
        .eq('type', 'daily');

      // Calculate completed quizzes (unique quiz IDs)
      const uniqueCompletedQuizzes = new Set(
        quizAttempts?.map(attempt => attempt.quiz_id) || []
      );
      const completedQuizzes = uniqueCompletedQuizzes.size;

      // Calculate average score as percentage
      const scorePercentages = quizAttempts?.map(attempt => {
        const score = attempt.score || 0;
        const maxScore = attempt.quizzes?.max_score || 1;
        return maxScore > 0 ? (score / maxScore) * 100 : 0;
      }) || [];
      const averageScore = scorePercentages.length > 0
        ? Math.round((scorePercentages.reduce((sum, pct) => sum + pct, 0) / scorePercentages.length) * 10) / 10
        : 0;

      // Calculate points earned from quizzes
      let pointsEarned = 0;
      questionResults?.forEach(result => {
        const quizType = result.quizzes?.type;
        if (quizType === 'daily') {
          pointsEarned += 25;
        } else if (quizType === 'practice') {
          pointsEarned += 8;
        }
      });

      // Calculate day streak
      const dayStreak = calculateDayStreak(quizAttempts || []);

      // Calculate overall progress (daily quizzes only)
      const dailyAttempts = quizAttempts?.filter(
        attempt => attempt.quizzes?.type === 'daily'
      ) || [];

      // Count total questions in all daily quizzes
      const totalQuestions = allDailyQuizzes?.reduce(
        (sum, quiz) => sum + questionCount(quiz.questions), 0
      ) || 0;

      // Count completed questions (correctly answered from quiz_question_results)
      // We'll use allQuestionResults which we fetch later, but for now use questionResults
      const dailyQuestionResults = questionResults?.filter(
        result => result.quizzes?.type === 'daily'
      ) || [];
      const completedQuestions = dailyQuestionResults.length;

      // Calculate subject-specific progress
      // Get all question results with quiz and subject info for daily quizzes
      const { data: allQuestionResults } = await supabase
        .from('quiz_question_results')
        .select(`
          id,
          is_correct,
          quizzes!inner(
            type,
            subject
          )
        `)
        .eq('student_id', user.id)
        .eq('quizzes.type', 'daily');

      // Update completed questions count with all daily question results (only correct answers)
      const actualCompletedQuestions = allQuestionResults?.filter(r => r.is_correct).length || 0;

      const mathQuizzes = allDailyQuizzes?.filter(q => 
        q.subject === 'Math' || q.subject === 'Mathematics' || q.subject?.toLowerCase() === 'math'
      ) || [];
      const physicsQuizzes = allDailyQuizzes?.filter(q => 
        q.subject === 'Physics' || q.subject?.toLowerCase() === 'physics'
      ) || [];

      const mathTotal = mathQuizzes.reduce((sum, q) => sum + questionCount(q.questions), 0);
      const physicsTotal = physicsQuizzes.reduce((sum, q) => sum + questionCount(q.questions), 0);

      // Count questions answered correctly by subject
      const mathQuestionsCompleted = allQuestionResults?.filter(
        result => {
          const subject = result.quizzes?.subject;
          return result.is_correct && (
            subject === 'Math' || 
            subject === 'Mathematics' || 
            subject?.toLowerCase() === 'math'
          );
        }
      ).length || 0;

      const physicsQuestionsCompleted = allQuestionResults?.filter(
        result => {
          const subject = result.quizzes?.subject;
          return result.is_correct && (
            subject === 'Physics' || 
            subject?.toLowerCase() === 'physics'
          );
        }
      ).length || 0;

      const questionsRemaining = Math.max(0, totalQuestions - actualCompletedQuestions);

      setStats({
        completedQuizzes,
        averageScore,
        pointsEarned,
        dayStreak,
        overallProgress: {
          completed: actualCompletedQuestions,
          total: totalQuestions,
          percentage: totalQuestions > 0 ? Math.round((actualCompletedQuestions / totalQuestions) * 100) : 0,
        },
        subjectProgress: {
          math: {
            completed: mathQuestionsCompleted,
            total: mathTotal,
            percentage: mathTotal > 0 ? Math.round((mathQuestionsCompleted / mathTotal) * 100) : 0,
          },
          physics: {
            completed: physicsQuestionsCompleted,
            total: physicsTotal,
            percentage: physicsTotal > 0 ? Math.round((physicsQuestionsCompleted / physicsTotal) * 100) : 0,
          },
        },
        questionsRemaining,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching quiz stats:', error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  const calculateDayStreak = (attempts: { completed_at: string | null }[]): number => {
    if (!attempts || attempts.length === 0) return 0;

    // Get unique dates from completed attempts
    const dates = attempts
      .map(attempt => {
        if (!attempt.completed_at) return null;
        const date = new Date(attempt.completed_at);
        return date.toDateString();
      })
      .filter((date): date is string => date !== null);

    const uniqueDates = Array.from(new Set(dates)).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    if (uniqueDates.length === 0) return 0;

    // Check consecutive days starting from today
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < uniqueDates.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const checkDateString = checkDate.toDateString();

      if (uniqueDates.includes(checkDateString)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  return stats;
};


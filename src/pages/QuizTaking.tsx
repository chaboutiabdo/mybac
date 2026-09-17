import { useState, useEffect } from "react";
import { Loading } from "@/components/ui/states";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle, Loader2 } from "lucide-react";
import Navigation from "@/components/layout/Navigation";

type QuizAttempt = Tables<'quiz_attempts'>;
type Quiz = Tables<'quizzes'>;

interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number;
  points: number;
}

const QuizTaking = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const { trackQuizQuestion } = useActivityTracking();

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId || !user) {
      navigate('/quizzes');
      return;
    }
    fetchQuizAttempt();
  }, [attemptId, user]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleSubmitQuiz();
    }
  }, [timeLeft]);

  const fetchQuizAttempt = async () => {
    if (!attemptId) return;

    try {
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('student_id', user!.id)
        .single();

      if (attemptError) throw attemptError;
      setAttempt(attemptData as QuizAttempt);

      const { data: quizData, error: quizError } = await supabase
        .from('quizzes_public')
        .select('*')
        .eq('id', attemptData.quiz_id)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData as Quiz);
      setQuestions(Array.isArray(quizData.questions) ? (quizData.questions as unknown as Question[]) : []);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error("Error", { description: "Failed to load quiz" });
      navigate('/quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    if (answeredQuestions[questionId]) return; // Prevent changing answer after selection
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Mark question as answered
    setAnsweredQuestions(prev => ({
      ...prev,
      [questionId]: true
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting || !attemptId) return;

    if (attempt?.completed_at) {
      toast.error("سبق إرسال هذا الاختبار");
      return;
    }
    setIsSubmitting(true);

    try {
      // The database grades against the answer key, records completion and
      // banks the points. The browser no longer computes or writes the score.
      const { data, error } = await supabase.rpc('submit_quiz_attempt', {
        p_attempt_id: attemptId,
        p_answers: selectedAnswers,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      toast.success("تم إرسال الاختبار", {
        description: `نتيجتك: ${result?.correct_count ?? 0} من ${result?.total_questions ?? 0} — ${result?.score ?? 0} نقطة`,
      });

      navigate('/quizzes');
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error("تعذّر إرسال الاختبار", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Loading />
    );
  }

  if (!quiz || !questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Quiz not found or has no questions.</p>
            <Button onClick={() => navigate('/quizzes')} className="mt-4">
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm('Are you sure you want to leave? Your progress will be lost.')) {
                navigate('/quizzes');
              }
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quizzes
          </Button>
          
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timeLeft)}
            </Badge>
            <Badge variant="outline">
              {currentQuestionIndex + 1} of {questions.length}
            </Badge>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-base text-muted-foreground mb-2">
            <span>{quiz.subject} - {quiz.chapter || 'General'}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">
              Question {currentQuestionIndex + 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl mb-4">{currentQuestion.question}</p>
            
            <div className="space-y-3">
              {currentQuestion.options.map((optionText, index) => {
                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                const isSelected = selectedAnswers[currentQuestion.id] === optionLetter;
                const isAnswered = answeredQuestions[currentQuestion.id];
                const isCorrect = index === currentQuestion.correct;
                const selectedIndex = ['A', 'B', 'C', 'D'].indexOf(selectedAnswers[currentQuestion.id] || '');
                const isWrongSelection = isAnswered && isSelected && !isCorrect;
                const isCorrectAnswer = isAnswered && isCorrect;
                
                let buttonClass = 'w-full text-start p-4 rounded-md border transition-colors ';
                if (isAnswered) {
                  if (isCorrectAnswer) {
                    buttonClass += 'border-green-500 bg-success-light dark:bg-green-900/20';
                  } else if (isWrongSelection) {
                    buttonClass += 'border-red-500 bg-destructive-light dark:bg-red-900/20';
                  } else {
                    buttonClass += 'border-border bg-card-raised/60';
                  }
                } else {
                  buttonClass += isSelected 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50 cursor-pointer';
                }
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(currentQuestion.id, optionLetter)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                        isAnswered 
                          ? isCorrectAnswer 
                            ? 'border-green-500 bg-success-light0 text-primary-foreground'
                            : isWrongSelection
                            ? 'border-red-500 bg-destructive-light0 text-primary-foreground'
                            : 'border-muted-foreground'
                          : isSelected 
                            ? 'border-primary bg-primary text-primary-foreground' 
                            : 'border-muted-foreground'
                      }`}>
                        {optionLetter}
                      </div>
                      <span className={
                        isAnswered 
                          ? isCorrectAnswer 
                            ? 'text-success dark:text-green-300 font-medium'
                            : isWrongSelection
                            ? 'text-destructive dark:text-destructive'
                            : ''
                          : ''
                      }>
                        {optionText}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="me-2 h-4 w-4" />
                    Submit Quiz
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
                disabled={!answeredQuestions[currentQuestion.id]}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTaking;
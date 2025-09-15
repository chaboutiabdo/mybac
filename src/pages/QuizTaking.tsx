import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle } from "lucide-react";
import Navigation from "@/components/layout/Navigation";

interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  answers: any[];
  attempt_number: number;
}

interface Quiz {
  id: string;
  subject: string;
  chapter?: string;
  questions: any[];
  max_score: number;
  type: string;
}

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
  const { toast } = useToast();
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
        .from('quizzes')
        .select('*')
        .eq('id', attemptData.quiz_id)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData as Quiz);
      setQuestions(Array.isArray(quizData.questions) ? (quizData.questions as unknown as Question[]) : []);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz",
        variant: "destructive",
      });
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

  const calculateScore = () => {
    let correctAnswers = 0;
    questions.forEach((question) => {
      const selectedIndex = ['A', 'B', 'C', 'D'].indexOf(selectedAnswers[question.id] || '');
      if (selectedIndex === question.correct) {
        correctAnswers++;
      }
    });
    
    const pointsPerQuestion = quiz?.type === 'daily' ? 25 : 8;
    return correctAnswers * pointsPerQuestion;
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const finalScore = calculateScore();
      
      // Check if this is a retake (not the first attempt)
      const { data: previousAttempts } = await supabase
        .from('quiz_attempts')
        .select('completed_at')
        .eq('quiz_id', attempt?.quiz_id)
        .eq('student_id', user!.id)
        .not('completed_at', 'is', null)
        .neq('id', attemptId);
      
      const isRetake = previousAttempts && previousAttempts.length > 0;
      const scoreToRecord = isRetake ? 0 : finalScore; // Don't record score for retakes
      
      // Update quiz attempt
      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          score: scoreToRecord,
          answers: selectedAnswers,
          completed_at: new Date().toISOString()
        })
        .eq('id', attemptId);

      if (updateError) throw updateError;

      // Track individual question results
      for (const question of questions) {
        const studentAnswer = selectedAnswers[question.id] || '';
        const selectedIndex = ['A', 'B', 'C', 'D'].indexOf(studentAnswer);
        const isCorrect = selectedIndex === question.correct;
        const correctAnswer = ['A', 'B', 'C', 'D'][question.correct];
        
        await trackQuizQuestion(
          attemptId!,
          question.id,
          question.question,
          studentAnswer,
          correctAnswer,
          isCorrect
        );
      }

      toast({
        title: "Quiz completed!",
        description: isRetake 
          ? `Practice completed! Actual score: ${finalScore}/${quiz?.max_score || 100} (No points awarded for retakes)`
          : `Your score: ${finalScore}/${quiz?.max_score || 100}`,
      });

      navigate('/quizzes');
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to submit quiz",
        variant: "destructive",
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
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
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
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
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>{quiz.subject} - {quiz.chapter || 'General'}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              Question {currentQuestionIndex + 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg mb-4">{currentQuestion.question}</p>
            
            <div className="space-y-3">
              {currentQuestion.options.map((optionText, index) => {
                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                const isSelected = selectedAnswers[currentQuestion.id] === optionLetter;
                const isAnswered = answeredQuestions[currentQuestion.id];
                const isCorrect = index === currentQuestion.correct;
                const selectedIndex = ['A', 'B', 'C', 'D'].indexOf(selectedAnswers[currentQuestion.id] || '');
                const isWrongSelection = isAnswered && isSelected && !isCorrect;
                const isCorrectAnswer = isAnswered && isCorrect;
                
                let buttonClass = 'w-full text-left p-4 rounded-lg border transition-colors ';
                if (isAnswered) {
                  if (isCorrectAnswer) {
                    buttonClass += 'border-green-500 bg-green-100 dark:bg-green-900/20';
                  } else if (isWrongSelection) {
                    buttonClass += 'border-red-500 bg-red-100 dark:bg-red-900/20';
                  } else {
                    buttonClass += 'border-border bg-muted/50';
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
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isAnswered 
                          ? isCorrectAnswer 
                            ? 'border-green-500 bg-green-500 text-white'
                            : isWrongSelection
                            ? 'border-red-500 bg-red-500 text-white'
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
                            ? 'text-green-700 dark:text-green-300 font-medium'
                            : isWrongSelection
                            ? 'text-red-700 dark:text-red-300'
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
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
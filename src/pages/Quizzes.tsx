import Navigation from "@/components/layout/Navigation";
import { Loading } from "@/components/ui/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Clock, 
  Trophy, 
  Target, 
  PlayCircle,
  CheckCircle,
  Calendar,
  TrendingUp
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuizStats } from "@/hooks/useQuizStats";

type Quiz = Tables<'quizzes'>;

// `questions` is a jsonb column: typed Json, and nullable. Dereferencing
// .length directly crashed the whole quiz list on a quiz with no questions.
const questionCount = (questions: Quiz['questions']): number =>
  Array.isArray(questions) ? questions.length : 0;

const Quizzes = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { trackQuizQuestion } = useActivityTracking();
  const navigate = useNavigate();
  const [practiceQuizzes, setPracticeQuizzes] = useState<Quiz[]>([]);
  const [dailyQuizzes, setDailyQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const quizStats = useQuizStats();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const quizzes = (data || []) as Quiz[];
      setPracticeQuizzes(quizzes.filter(quiz => quiz.type === 'practice'));
      setDailyQuizzes(quizzes.filter(quiz => quiz.type === 'daily'));
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error("Error", { description: "Failed to load quizzes" });
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (quiz: Quiz) => {
    if (!user) {
      toast.error("Login required", { description: "Please login to take quizzes" });
      return;
    }

    try {
      // Check if quiz was already completed (by checking if previous attempts have answers)
      const { data: allAttempts } = await supabase
        .from('quiz_attempts')
        .select('answers')
        .eq('quiz_id', quiz.id)
        .eq('student_id', user.id);

      const hasCompletedBefore = allAttempts?.some(attempt => 
        attempt.answers && Object.keys(attempt.answers).length > 0
      );
      
      if (hasCompletedBefore) {
        toast.success("Retaking Quiz", { description: "You can practice this quiz again, but no additional score will be awarded." });
      }

      // Check for existing attempts to determine attempt number
      const { data: existingAttempts } = await supabase
        .from('quiz_attempts')
        .select('attempt_number')
        .eq('quiz_id', quiz.id)
        .eq('student_id', user.id)
        .order('attempt_number', { ascending: false })
        .limit(1);

      const nextAttemptNumber = existingAttempts && existingAttempts.length > 0 
        ? existingAttempts[0].attempt_number + 1 
        : 1;

      // Create quiz attempt
      const { data: attempt, error } = await supabase
        .from('quiz_attempts')
        .insert({
          student_id: user.id,
          quiz_id: quiz.id,
          score: 0,
          answers: {},
          attempt_number: nextAttemptNumber
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Quiz started", { description: `Starting ${quiz.subject} quiz with ${questionCount(quiz.questions)} questions` });

      // Navigate to the quiz taking page
      navigate(`/quiz/${attempt.id}`);
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast.error("Error", { description: "Failed to start quiz" });
    }
  };
  
  return (
    <div className="pattern-field min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="font-display text-[34px] font-bold tracking-tight">{t("quizCenter")}</h1>
            <p className="text-muted-foreground">
              {t("quizCenterDescription")}
            </p>
          </div>

          {/* Daily Quiz Progress */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {t("todaysQuiz")}
                </CardTitle>
                <Badge className="bg-accent text-accent-foreground">
                  {t("dailyChallenge")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {quizStats.loading ? (
                <Loading />
              ) : (
                <>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-base">
                        <span>{t("overallProgress")}</span>
                        <span className="font-medium">
                          {quizStats.overallProgress.completed}/{quizStats.overallProgress.total}
                        </span>
                      </div>
                      <Progress value={quizStats.overallProgress.percentage} className="h-3" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-base">
                        <span>{t("mathQuestions")}</span>
                        <span className="font-medium">
                          {quizStats.subjectProgress.math.completed}/{quizStats.subjectProgress.math.total}
                        </span>
                      </div>
                      <Progress value={quizStats.subjectProgress.math.percentage} className="h-3" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-base">
                        <span>{t("physicsQuestions")}</span>
                        <span className="font-medium">
                          {quizStats.subjectProgress.physics.completed}/{quizStats.subjectProgress.physics.total}
                        </span>
                      </div>
                      <Progress value={quizStats.subjectProgress.physics.percentage} className="h-3" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-base text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{quizStats.questionsRemaining} {t("questionsRemaining")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        <span>{t("maxPoints")}</span>
                      </div>
                    </div>
                    <Button variant="hero" size="lg">
                      <PlayCircle className="me-2 h-4 w-4" />
                      {t("continueQuiz")}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quiz Categories */}
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="daily">{t("dailyQuizzes")}</TabsTrigger>
              <TabsTrigger value="practice">{t("practiceQuizzes")}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="daily" className="space-y-6">
              {loading ? (
                <Loading />
              ) : dailyQuizzes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No daily quizzes available yet.</p>
                </div>
              ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dailyQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl">{quiz.subject}</CardTitle>
                      <p className="text-base text-muted-foreground">{quiz.chapter || "General Topics"}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-base">
                        <span>{questionCount(quiz.questions)} {t("questions")}</span>
                        <Badge variant="default">Daily</Badge>
                      </div>
                      <div className="flex items-center justify-between text-base">
                        <span>Max Score: {quiz.max_score} pts</span>
                        <span>25 pts per question</span>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => startQuiz(quiz)}
                      >
                        <Brain className="me-2 h-4 w-4" />
                        {t("startQuiz")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              )}

              {/* Weekly Stats */}
              <Card className="">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-secondary" />
                    {t("weeklyPerformance")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {quizStats.loading ? (
                    <Loading />
                  ) : (
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="text-center space-y-1">
                        <p className="text-3xl font-bold text-primary">{quizStats.completedQuizzes}</p>
                        <p className="text-base text-muted-foreground">{t("quizzesCompleted")}</p>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-3xl font-bold text-secondary">
                          {quizStats.averageScore > 0 ? `${Math.round(quizStats.averageScore)}%` : '0%'}
                        </p>
                        <p className="text-base text-muted-foreground">{t("averageScore")}</p>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-3xl font-bold text-accent">+{quizStats.pointsEarned}</p>
                        <p className="text-base text-muted-foreground">{t("weeklyPointsEarned")}</p>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-3xl font-bold text-warning">{quizStats.dayStreak}</p>
                        <p className="text-base text-muted-foreground">{t("dayStreak")}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="practice" className="space-y-6">
              {loading ? (
                <Loading />
              ) : practiceQuizzes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No practice quizzes available yet.</p>
                </div>
              ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {practiceQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl">{quiz.subject}</CardTitle>
                      <p className="text-base text-muted-foreground">{quiz.chapter || "General Topics"}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-base">
                        <span>{questionCount(quiz.questions)} {t("questions")}</span>
                        <Badge variant="outline">Practice</Badge>
                      </div>
                      <div className="flex items-center justify-between text-base">
                        <span>Max Score: {quiz.max_score} pts</span>
                        <span>8 pts per question</span>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => startQuiz(quiz)}
                      >
                        <Brain className="me-2 h-4 w-4" />
                        {t("startQuiz")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Quizzes;
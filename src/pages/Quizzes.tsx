import Navigation from "@/components/layout/Navigation";
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
import { useAuth } from "@/contexts/AuthContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Quiz {
  id: string;
  subject: string;
  chapter?: string;
  type: 'daily' | 'practice';
  questions: any[];
  max_score: number;
  date: string;
}

const Quizzes = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { trackQuizQuestion } = useActivityTracking();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [practiceQuizzes, setPracticeQuizzes] = useState<Quiz[]>([]);
  const [dailyQuizzes, setDailyQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

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
      toast({
        title: "Error",
        description: "Failed to load quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (quiz: Quiz) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to take quizzes",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if quiz was already completed for scoring purposes
      const { data: completedAttempts } = await supabase
        .from('quiz_attempts')
        .select('completed_at, attempt_number')
        .eq('quiz_id', quiz.id)
        .eq('student_id', user.id)
        .not('completed_at', 'is', null);

      const hasCompletedBefore = completedAttempts && completedAttempts.length > 0;
      
      if (hasCompletedBefore) {
        toast({
          title: "Retaking Quiz",
          description: "You can practice this quiz again, but no additional score will be awarded.",
          variant: "default",
        });
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
          answers: [],
          attempt_number: nextAttemptNumber
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Quiz started",
        description: `Starting ${quiz.subject} quiz with ${quiz.questions.length} questions`,
      });

      // Navigate to the quiz taking page
      navigate(`/quiz/${attempt.id}`);
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to start quiz",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
      <Navigation />
      
      <div className="container py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{t("quizCenter")}</h1>
            <p className="text-muted-foreground">
              {t("quizCenterDescription")}
            </p>
          </div>

          {/* Daily Quiz Progress */}
          <Card className="gradient-card border-primary/20">
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
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("overallProgress")}</span>
                    <span className="font-medium">12/20</span>
                  </div>
                  <Progress value={60} className="h-3" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("mathQuestions")}</span>
                    <span className="font-medium">6/10</span>
                  </div>
                  <Progress value={60} className="h-3" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("physicsQuestions")}</span>
                    <span className="font-medium">6/10</span>
                  </div>
                  <Progress value={60} className="h-3" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>8 {t("questionsRemaining")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <span>{t("maxPoints")}</span>
                  </div>
                </div>
                <Button variant="hero" size="lg">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {t("continueQuiz")}
                </Button>
              </div>
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
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : dailyQuizzes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No daily quizzes available yet.</p>
                </div>
              ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dailyQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="gradient-card hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{quiz.subject}</CardTitle>
                      <p className="text-sm text-muted-foreground">{quiz.chapter || "General Topics"}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>{quiz.questions.length} {t("questions")}</span>
                        <Badge variant="default">Daily</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Max Score: {quiz.max_score} pts</span>
                        <span>25 pts per question</span>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => startQuiz(quiz)}
                      >
                        <Brain className="mr-2 h-4 w-4" />
                        {t("startQuiz")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              )}

              {/* Weekly Stats */}
              <Card className="gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-secondary" />
                    {t("weeklyPerformance")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="text-center space-y-1">
                      <p className="text-2xl font-bold text-primary">6/7</p>
                      <p className="text-sm text-muted-foreground">{t("quizzesCompleted")}</p>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-2xl font-bold text-secondary">82%</p>
                      <p className="text-sm text-muted-foreground">{t("averageScore")}</p>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-2xl font-bold text-accent">+420</p>
                      <p className="text-sm text-muted-foreground">{t("weeklyPointsEarned")}</p>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-2xl font-bold text-warning">12</p>
                      <p className="text-sm text-muted-foreground">{t("dayStreak")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="practice" className="space-y-6">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : practiceQuizzes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No practice quizzes available yet.</p>
                </div>
              ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {practiceQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="gradient-card hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{quiz.subject}</CardTitle>
                      <p className="text-sm text-muted-foreground">{quiz.chapter || "General Topics"}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>{quiz.questions.length} {t("questions")}</span>
                        <Badge variant="outline">Practice</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Max Score: {quiz.max_score} pts</span>
                        <span>8 pts per question</span>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => startQuiz(quiz)}
                      >
                        <Brain className="mr-2 h-4 w-4" />
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
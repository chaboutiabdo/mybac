import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  FileText, 
  PlayCircle, 
  Users, 
  Clock,
  ArrowRight,
  BookOpen,
  Target
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const QuickActions = () => {
  const { t, isRTL } = useLanguage();
  
  return (
    <div className={`grid gap-6 md:grid-cols-2 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Daily Quiz */}
      <Card className="gradient-card hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {t("dailyQuiz")}
            </CardTitle>
            <Badge variant="secondary" className="bg-primary-light text-primary">
              {t("today")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("progress")}</span>
              <span className="font-medium">12/20 {t("questions")}</span>
            </div>
            <Progress value={60} className="h-2" />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>8 {t("questionsRemaining")}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span>{t("math")}: 6/10</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning"></div>
              <span>{t("physics")}: 6/10</span>
            </div>
          </div>

          <Link to="/quizzes">
            <Button className="w-full" variant="default">
              {t("continueQuiz")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recommended Study */}
      <Card className="gradient-card hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            {t("recommendedForYou")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <PlayCircle className="h-4 w-4 text-accent" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t("limitsAndContinuity")}</p>
                <p className="text-xs text-muted-foreground">{t("mathChapter3")}</p>
              </div>
              <Badge variant="outline" className="text-xs">15 {t("min")}</Badge>
            </div>
            
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <FileText className="h-4 w-4 text-secondary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t("bac2023MathExam")}</p>
                <p className="text-xs text-muted-foreground">{t("practiceTest")}</p>
              </div>
              <Badge variant="outline" className="text-xs">2 {t("hrs")}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link to="/videos">
              <Button variant="outline" size="sm" className="w-full">
                <BookOpen className="mr-1 h-3 w-3" />
                {t("study")}
              </Button>
            </Link>
            <Link to="/exams">
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="mr-1 h-3 w-3" />
                {t("practice")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="gradient-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-secondary" />
            {t("recentActivity")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="flex-1">{t("completedPhysicsQuiz")}</span>
              <span className="text-muted-foreground">2{t("hoursAgo")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="flex-1">{t("watchedDerivativesVideo")}</span>
              <span className="text-muted-foreground">5{t("hoursAgo")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <span className="flex-1">{t("solved2022BacExam")}</span>
              <span className="text-muted-foreground">1{t("daysAgo")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alumni Spotlight */}
      <Card className="gradient-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-warning" />
            {t("alumniSpotlight")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-secondary flex items-center justify-center">
              <span className="text-white font-semibold text-sm">LM</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Leila Mammeri</p>
              <p className="text-xs text-muted-foreground">{t("bacScore")}: 17.5 • {t("medicineStudent")}</p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground italic">
            {t("alumniQuote")}
          </p>
          
          <Link to="/alumni">
            <Button variant="outline" size="sm" className="w-full">
              <Users className="mr-2 h-3 w-3" />
              {t("connectWithAlumni")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickActions;
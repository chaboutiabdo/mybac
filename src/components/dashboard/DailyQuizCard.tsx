import { Link } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuizStats } from "@/hooks/useQuizStats";

/**
 * Today's quiz. Split out of the old QuickActions, which rendered three cards
 * into a two-column grid so the third always orphaned.
 *
 * Every figure here is real, from useQuizStats.
 */
const DailyQuizCard = () => {
  const stats = useQuizStats();

  const subjects = [
    { label: "الرياضيات", data: stats.subjectProgress.math },
    { label: "الفيزياء", data: stats.subjectProgress.physics },
  ];

  return (
    <Card className="edge-gold h-full">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
        <CardTitle className="flex items-center gap-2.5 font-display text-xl">
          <Brain className="h-5 w-5 text-accent" strokeWidth={1.6} aria-hidden />
          اختبار اليوم
        </CardTitle>
        <Badge variant="warning">اليوم</Badge>
      </CardHeader>

      <CardContent className="flex h-full flex-col gap-5 p-5">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-base text-muted-foreground">التقدّم الكلّي</span>
            <span className="font-display text-2xl font-bold tabular">
              {stats.overallProgress.completed}
              <span className="text-lg font-normal text-muted-foreground">
                {" "}/ {stats.overallProgress.total}
              </span>
            </span>
          </div>
          <Progress
            value={stats.overallProgress.percentage}
            className="mt-3 h-2.5 animate-progress"
          />
          <p className="mt-2.5 text-sm text-muted-foreground tabular">
            بقي {stats.questionsRemaining} سؤالًا · 25 نقطة للسؤال
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {subjects.map((s) => (
            <div key={s.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold tabular">
                  {s.data.completed}/{s.data.total}
                </span>
              </div>
              <Progress value={s.data.percentage} className="mt-2 h-1.5 animate-progress" />
            </div>
          ))}
        </div>

        <Link to="/quizzes" className="mt-auto block">
          <Button variant="gold" size="lg" className="w-full">
            ابدأ الاختبار
            <ArrowLeft className="ms-1 h-4 w-4" aria-hidden />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default DailyQuizCard;

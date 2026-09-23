import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CircleHelp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { QuizStats } from "@/hooks/useQuizStats";

/**
 * Today's quiz as a mint tone card. Takes the stats from the page, which
 * reads useQuizStats once for every widget. `action` replaces the default
 * link to /quizzes (on the quizzes page itself it starts the quiz).
 */
const DailyQuizCard = ({ stats, action }: { stats: QuizStats; action?: ReactNode }) => {
  const subjects = [
    { label: "الرياضيات", data: stats.subjectProgress.math },
    { label: "الفيزياء", data: stats.subjectProgress.physics },
  ];
  const none = stats.overallProgress.total === 0;

  return (
    <article className="flex h-full flex-col gap-5 rounded-card bg-tone-mint p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          اختبار اليوم
        </Badge>
        <Badge variant="default" className="tabular">25 نقطة للسؤال</Badge>
      </div>

      {none ? (
        <p className="text-lg font-medium leading-snug">لم يُنشر اختبار اليوم بعد. عُد لاحقاً.</p>
      ) : (
        <>
          <div>
            <p className="flex items-baseline gap-2">
              <span className="tabular text-[40px] font-semibold leading-none">
                {stats.overallProgress.completed}
              </span>
              <span className="tabular text-lg text-foreground/60">/ {stats.overallProgress.total}</span>
            </p>
            <Progress value={stats.overallProgress.percentage} className="mt-3 h-2.5 bg-card-raised/60 animate-progress" />
            <p className="mt-2 text-[15px] text-foreground/70">بقي {stats.questionsRemaining} سؤالاً</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {subjects.map((s) => (
              <div key={s.label} className="rounded-2xl bg-card-raised/70 p-3">
                <div className="flex items-baseline justify-between text-[15px]">
                  <span>{s.label}</span>
                  <span className="tabular font-semibold">
                    {s.data.completed}/{s.data.total}
                  </span>
                </div>
                <Progress value={s.data.percentage} className="mt-2 h-1.5 animate-progress" />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-auto">
        {action ?? (
          <Button asChild size="lg" className="w-full">
            <Link to="/quizzes">
              {none ? "تدرّب على اختبار سابق" : "ابدأ الاختبار"}
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
};

export default DailyQuizCard;

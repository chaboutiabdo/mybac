import { Flame, Target } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { ErrorState } from "@/components/ui/states";
import { DAILY_GOAL_TARGET, type StudyStats } from "@/hooks/useStudyStreak";

/**
 * Streak + today's goal.
 *
 * Takes its data as props rather than calling the hooks itself: Dashboard
 * already holds both, and this component calling them again meant four extra
 * network round-trips per dashboard load (useStudyStreak once, useTodaysRevision
 * three queries) with no cache in this app to absorb them. Same shape as
 * `<DailyQuizCard stats={quizStats} />`.
 *
 * The goal's denominator comes from the revision queue, not from SQL: "what is
 * due today" has exactly one definition in this app, and a second server-side
 * implementation of it would be free to drift.
 */
const StreakCard = ({
  stats,
  queueLength,
}: {
  stats: StudyStats;
  queueLength: number;
}) => {
  const { currentStreak, daysThisMonth, tasksCompletedToday, loading, error, refetch } = stats;

  if (loading) return null;
  // Previously this returned null on error too, so a failed RPC was
  // indistinguishable from an empty account and the card just vanished.
  if (error) return <ErrorState title="تعذّر تحميل سلسلة أيامك" description={error} onRetry={refetch} />;

  const goalTotal = Math.min(DAILY_GOAL_TARGET, tasksCompletedToday + queueLength);
  const goalDone = Math.min(tasksCompletedToday, goalTotal);
  const goalMet = goalTotal > 0 && goalDone >= goalTotal;
  // a brand-new account has nothing due because it has no history, which is
  // not the same as being caught up
  const neverStudied = daysThisMonth === 0 && currentStreak === 0;

  return (
    <section className="rounded-card bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tone-peach">
          <Flame className="h-5 w-5" fill="currentColor" strokeWidth={0} aria-hidden />
        </span>
        <div className="min-w-0">
          {currentStreak > 0 ? (
            <>
              <p className="text-[19px] font-medium leading-none">
                <span className="tabular">{currentStreak}</span> يوم متتالي
              </p>
              <p className="mt-1.5 text-[13px] leading-none text-muted-foreground">من الدراسة المتواصلة</p>
            </>
          ) : (
            <p className="text-[15px] font-medium leading-snug">ابدأ أول يوم دراسة لك اليوم 🔥</p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[13px] font-medium">
            <Target className="h-3.5 w-3.5" aria-hidden />
            هدف اليوم
          </span>
          {goalTotal > 0 ? (
            <span className="tabular text-[13px] text-muted-foreground">
              {goalDone} من {goalTotal}
            </span>
          ) : null}
        </div>

        {goalTotal === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">
            {neverStudied
              ? "ابدأ بحل اختبار، وسنبني لك خطة مراجعة."
              : "لا يوجد ما يستحق المراجعة اليوم — أنت محدّث."}
          </p>
        ) : (
          <>
            <Progress value={(goalDone / goalTotal) * 100} className="mt-2.5 h-2" />
            {goalMet ? <p className="mt-2 text-[13px] font-medium text-success">أكملت هدف اليوم 🎉</p> : null}
          </>
        )}
      </div>
      {/* Longest streak / days-this-month used to repeat here too — Profile's
          "تقدّمك في التعلّم" list already shows both, word for word. */}
    </section>
  );
};

export default StreakCard;

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * The mockup's weekly bar chart: one stacked bar per day for the last seven
 * days, today last. The mockup counts hours; the app doesn't track study time,
 * so the bars count what the student actually did — quizzes finished, videos
 * finished and exam papers opened.
 */

type Kind = "quiz" | "video" | "exam";

const KINDS: { kind: Kind; label: string; tone: string; strong: string }[] = [
  { kind: "quiz", label: "اختبارات", tone: "bg-tone-pink", strong: "bg-tone-pink-strong" },
  { kind: "video", label: "دروس", tone: "bg-tone-lav", strong: "bg-tone-lav-strong" },
  { kind: "exam", label: "مواضيع", tone: "bg-tone-peach", strong: "bg-tone-peach-strong" },
];

const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

type Day = { date: Date } & Record<Kind, number>;

const WeeklyActivity = () => {
  const { user } = useAuth();
  const [days, setDays] = useState<Day[] | null>(null);

  useEffect(() => {
    if (!user) return;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const since = start.toISOString();
    let active = true;

    Promise.all([
      // source='quiz': a one-answer daily question is not a quiz and must not
      // draw a quiz bar on this chart
      supabase.from("quiz_attempts").select("completed_at").eq("student_id", user.id)
        .eq("source", "quiz").gte("completed_at", since),
      supabase
        .from("video_activity_logs")
        .select("created_at")
        .eq("student_id", user.id)
        .eq("action", "completed")
        .gte("created_at", since),
      supabase.from("exam_activity_logs").select("created_at").eq("student_id", user.id).gte("created_at", since),
    ]).then(([quizzes, videos, exams]) => {
      if (!active) return;
      const buckets: Day[] = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        return { date, quiz: 0, video: 0, exam: 0 };
      });
      const add = (iso: string | null, kind: Kind) => {
        if (!iso) return;
        const i = Math.floor((new Date(iso).getTime() - start.getTime()) / 86_400_000);
        if (i >= 0 && i < 7) buckets[i][kind]++;
      };
      quizzes.data?.forEach((r) => add(r.completed_at, "quiz"));
      videos.data?.forEach((r) => add(r.created_at, "video"));
      exams.data?.forEach((r) => add(r.created_at, "exam"));
      setDays(buckets);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const totalOf = (d: Day) => d.quiz + d.video + d.exam;
  const week = days?.reduce((sum, d) => sum + totalOf(d), 0) ?? 0;
  const peak = Math.max(1, ...(days ?? []).map(totalOf));

  return (
    <section className="rounded-card bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground">النشاط الأسبوعي</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="tabular text-[26px] font-semibold leading-none">{days ? week : "…"}</span>
            <span className="text-[13px] text-muted-foreground">نشاطاً</span>
          </p>
        </div>
        <span className="rounded-full bg-card-raised px-3 py-1.5 text-[13px] text-muted-foreground">آخر 7 أيام</span>
      </div>

      <div className="mt-5 flex h-[140px] items-end justify-between gap-1.5">
        {(days ?? Array.from({ length: 7 }, () => null)).map((day, i) => {
          const today = i === 6;
          const total = day ? totalOf(day) : 0;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-[100px] w-full flex-col justify-end rounded-[12px]",
                  today && "bg-card-raised p-[4px] shadow-soft"
                )}
              >
                {total === 0 ? (
                  <div className="h-1.5 rounded-full bg-muted" />
                ) : (
                  <div className="flex flex-col gap-[3px]" style={{ height: `${(total / peak) * 100}%` }}>
                    {KINDS.map(({ kind, tone, strong }) =>
                      day && day[kind] > 0 ? (
                        <div
                          key={kind}
                          className={cn("min-h-[4px] rounded-[6px] first:rounded-t-[8px]", today ? strong : tone)}
                          style={{ flexGrow: day[kind] }}
                        />
                      ) : null
                    )}
                  </div>
                )}
              </div>
              {/* axis labels run small: seven weekday names share 300px */}
              <span className={cn("whitespace-nowrap text-[12px]", today ? "font-medium text-foreground" : "text-muted-foreground")}>
                {today ? "اليوم" : day ? WEEKDAYS[day.date.getDay()] : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        {KINDS.map((k) => (
          <span key={k.kind} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-full", k.tone)} />
            {k.label}
          </span>
        ))}
      </div>
    </section>
  );
};

export default WeeklyActivity;

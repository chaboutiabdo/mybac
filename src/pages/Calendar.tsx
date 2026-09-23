import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, GraduationCap, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";

import BacCountdown from "@/components/dashboard/BacCountdown";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ErrorState, Loading } from "@/components/ui/states";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BAC_DATE, BAC_SESSION_LABEL, chapterLabel, formatDateDZ, subjectLabel, subjectTone, TONE_BG } from "@/lib/bac";
import { cn, errorMessage } from "@/lib/utils";

/**
 * The automatic revision calendar: the student types nothing in. Every marked
 * day comes from a due date the app already keeps — mistakes.review_due_at and
 * student_flashcard_progress.next_review_at — plus their own past activity and
 * the one fixed deadline, BAC_DATE.
 *
 * Honest about its horizon: mark_mistake_reviewed bumps +3 days and
 * record_flashcard_review +1/+3/+7, so nothing in the schema can schedule
 * further out than a week. The grid is not padded to look busy; the backlog
 * banner and the caption carry the page instead.
 */

/* Latin-digit Algiers day keys ("2026-09-22"). 20260921200000_study_streak.sql
   makes Africa/Algiers the app's day boundary and says later features must
   reuse it — WeeklyActivity buckets in browser-local time and already
   disagrees with the streak, so don't copy that. en-CA with explicit 2-digit
   options is YYYY-MM-DD in every ICU build, and the strings sort
   chronologically. */
const DZ = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Algiers",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dzKey = (value: string | number | Date) => DZ.format(new Date(value));

const MONTH_LABEL = new Intl.DateTimeFormat("ar-DZ-u-nu-latn", {
  month: "long",
  year: "numeric",
  timeZone: "Africa/Algiers",
});

/** Noon Algiers, so a day key renders as the same day in every browser zone. */
const dayLabel = (key: string) => formatDateDZ(key + "T12:00:00+01:00");

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => y + "-" + pad(m + 1) + "-" + pad(d);

/* Sunday-first, matching WeeklyActivity's array and the Algerian school week
   (الأحد→الخميس). CLDR's ar-DZ says Saturday; this follows the app instead —
   one constant to flip if that is ever the wrong call. The narrow forms exist
   because a 360px phone gives each column ~40px and "الأربعاء" does not fit. */
const WEEKDAYS = [
  { full: "الأحد", narrow: "ح" },
  { full: "الاثنين", narrow: "ن" },
  { full: "الثلاثاء", narrow: "ث" },
  { full: "الأربعاء", narrow: "ر" },
  { full: "الخميس", narrow: "خ" },
  { full: "الجمعة", narrow: "ج" },
  { full: "السبت", narrow: "س" },
];

const BAC_KEY = dzKey(BAC_DATE);

interface DueItem {
  id: string;
  subject: string | null;
  chapter: string | null;
  title: string;
}

interface DayInfo {
  due: DueItem[];
  active: boolean;
}

interface CalendarData {
  days: Map<string, DayInfo>;
  /** Overdue and never-reviewed items — they belong to today, not to the past. */
  backlog: DueItem[];
  neverReviewed: number;
  /** Furthest day that actually has something scheduled. */
  horizon: string | null;
}

const EMPTY_DAY: DayInfo = { due: [], active: false };

type MistakeRow = {
  id: string;
  review_due_at: string | null;
  last_reviewed_at: string | null;
  quiz_subject: string | null;
  quiz_chapter: string | null;
  question_text: string;
};

// student_flashcard_progress -> flashcards is a to-one FK, so PostgREST embeds
// it singular — the same shape useTodaysRevision.ts:19-22 documents.
type ProgressRow = {
  id: string;
  next_review_at: string;
  last_reviewed_at: string | null;
  flashcards: { front: string; subject: string | null; chapter: string | null } | null;
};

const Calendar = () => {
  const { user } = useAuth();
  const todayKey = dzKey(Date.now());

  const [cursor, setCursor] = useState(() => {
    const [y, m] = todayKey.split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [selected, setSelected] = useState(todayKey);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Everything at once, bucketed client-side: the forward horizon is a week
      // and the history is small, so month changes cost zero round-trips.
      const [mistakes, progress, attempts, daily] = await Promise.all([
        supabase
          .from("mistakes")
          .select("id, review_due_at, last_reviewed_at, quiz_subject, quiz_chapter, question_text")
          .eq("student_id", user.id)
          .eq("status", "active")
          .order("review_due_at", { ascending: true, nullsFirst: true })
          .limit(200),
        supabase
          .from("student_flashcard_progress")
          .select("id, next_review_at, last_reviewed_at, flashcards(front, subject, chapter)")
          .eq("student_id", user.id)
          .order("next_review_at", { ascending: true })
          .limit(200),
        // No source filter: get_study_stats counts every completed attempt, and
        // filtering here would make the calendar disagree with the streak.
        supabase
          .from("quiz_attempts")
          .select("id, completed_at")
          .eq("student_id", user.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1000),
        supabase
          .from("daily_questions")
          .select("assigned_date, answered_at")
          .eq("student_id", user.id)
          .not("answered_at", "is", null),
      ]);

      for (const res of [mistakes, progress, attempts, daily]) {
        if (res.error) throw res.error;
      }

      const days = new Map<string, DayInfo>();
      const touch = (key: string) => {
        let day = days.get(key);
        if (!day) {
          day = { due: [], active: false };
          days.set(key, day);
        }
        return day;
      };
      const backlog: DueItem[] = [];
      let neverReviewed = 0;
      let horizon: string | null = null;

      const schedule = (dueAt: string | null, item: DueItem) => {
        // review_due_at is NULL until a mistake is reviewed once — that means
        // "never reviewed, always due", not "no due date"
        // (useTodaysRevision.ts:24-26 is the authority).
        if (!dueAt) {
          backlog.push(item);
          neverReviewed += 1;
          return;
        }
        const key = dzKey(dueAt);
        // Overdue rolls onto today. Painting it on a day the student can no
        // longer act on reads as a broken calendar.
        if (key < todayKey) {
          backlog.push(item);
          return;
        }
        touch(key).due.push(item);
        if (!horizon || key > horizon) horizon = key;
      };

      for (const row of (mistakes.data ?? []) as MistakeRow[]) {
        schedule(row.review_due_at, {
          id: "m-" + row.id,
          subject: row.quiz_subject,
          chapter: row.quiz_chapter,
          title: row.question_text,
        });
        if (row.last_reviewed_at) touch(dzKey(row.last_reviewed_at)).active = true;
      }

      for (const row of (progress.data ?? []) as unknown as ProgressRow[]) {
        schedule(row.next_review_at, {
          id: "f-" + row.id,
          subject: row.flashcards?.subject ?? null,
          chapter: row.flashcards?.chapter ?? null,
          title: row.flashcards?.front ?? "بطاقة",
        });
        if (row.last_reviewed_at) touch(dzKey(row.last_reviewed_at)).active = true;
      }

      for (const row of attempts.data ?? []) {
        if (row.completed_at) touch(dzKey(row.completed_at)).active = true;
      }
      // assigned_date is a SQL date and arrives as "2026-09-22" — use it as the
      // key verbatim; new Date() on it would parse as UTC midnight.
      for (const row of daily.data ?? []) {
        if (row.assigned_date) touch(row.assigned_date).active = true;
      }

      setData({ days, backlog, neverReviewed, horizon });
    } catch (err) {
      console.error("Error loading calendar:", err);
      setError(errorMessage(err, "تعذّر تحميل التقويم"));
    } finally {
      setLoading(false);
    }
  }, [user, todayKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Leading blanks put the 1st under its weekday; trailing blanks close the
  // last row, as every grid in this app does. Built from UTC so the browser's
  // own zone can never shift a cell.
  const cells = useMemo(() => {
    const lead = new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay();
    const length = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= length; d += 1) out.push(keyOf(cursor.y, cursor.m, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const isCurrentMonth = todayKey.startsWith(cursor.y + "-" + pad(cursor.m + 1));
  const monthLabel = MONTH_LABEL.format(new Date(Date.UTC(cursor.y, cursor.m, 15)));

  const goToday = () => {
    const [y, m] = todayKey.split("-").map(Number);
    setCursor({ y, m: m - 1 });
    setSelected(todayKey);
  };
  // Functional update, not a read of `cursor`: React batches, so two quick
  // chevron taps in one tick would otherwise both step from the same month
  // and the second would be swallowed.
  const step = (delta: number) =>
    setCursor((c) => {
      const next = new Date(Date.UTC(c.y, c.m + delta, 1));
      return { y: next.getUTCFullYear(), m: next.getUTCMonth() };
    });

  const backlog = data?.backlog ?? [];
  const selectedDay = data?.days.get(selected) ?? EMPTY_DAY;
  const selectedBacklog = selected === todayKey ? backlog : [];

  return (
    <div className="space-y-6">
      <PageHeader title="التقويم" subtitle="مواعيد مراجعتك، تُحجز تلقائياً من أخطائك وبطاقاتك">
        <BacCountdown />
      </PageHeader>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState description={error} onRetry={fetchAll} />
      ) : (
        <>
          {backlog.length > 0 ? (
            <Link
              to="/revision"
              className="flex items-center justify-between gap-4 rounded-card bg-tone-mint p-5 shadow-soft transition-colors hover:bg-tone-mint-strong"
            >
              <span className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-card-raised/70 backdrop-blur">
                  <ListChecks className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </span>
                <span>
                  <span className="block text-[19px] font-medium">
                    <span className="tabular">{backlog.length}</span> عنصراً بانتظار مراجعتك
                  </span>
                  <span className="mt-1 block text-[13px] text-foreground/70">
                    {data && data.neverReviewed > 0 ? (
                      <>
                        منها <span className="tabular">{data.neverReviewed}</span> لم تراجعها من قبل
                      </>
                    ) : (
                      "تجاوزت موعدها — ابدأ من الأقدم"
                    )}
                  </span>
                </span>
              </span>
              <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden />
            </Link>
          ) : null}

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-card bg-card p-3 shadow-soft sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[19px] font-medium">{monthLabel}</h2>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={goToday} disabled={isCurrentMonth}>
                    اليوم
                  </Button>
                  {/* RTL: the first child lands on the right, and earlier is to
                      the right — so prev points right, next points left. */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="الشهر السابق"
                    onClick={() => step(-1)}
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="الشهر التالي"
                    onClick={() => step(1)}
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                  </Button>
                </div>
              </div>

              {/* dir="rtl" is on <html>, so grid column 1 is the rightmost and
                  الأحد lands on the right by itself. Reversing the array on top
                  of that is the classic double-flip. */}
              <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEKDAYS.map((w) => (
                  <span key={w.full} className="pb-1 text-center text-[13px] leading-none text-muted-foreground">
                    <span className="sm:hidden">{w.narrow}</span>
                    <span className="hidden sm:inline">{w.full}</span>
                  </span>
                ))}
                {cells.map((key, i) => {
                  if (!key) return <span key={"pad-" + i} aria-hidden />;
                  const day = data?.days.get(key) ?? EMPTY_DAY;
                  const isToday = key === todayKey;
                  const isBac = key === BAC_KEY;
                  const count = day.due.length + (isToday ? backlog.length : 0);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(key)}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={dayLabel(key) + (count > 0 ? " — " + count + " عنصراً مستحقاً" : "")}
                      className={cn(
                        "flex h-14 flex-col items-center justify-center gap-1.5 rounded-2xl transition-colors sm:h-16 xl:h-20",
                        key === selected && "ring-2 ring-ring",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isBac
                            ? "bg-tone-peach-strong"
                            : count > 0
                              ? "bg-card-raised"
                              : "bg-muted/50 hover:bg-card-raised"
                      )}
                    >
                      <span className="tabular text-[15px] leading-none">{Number(key.slice(8))}</span>
                      <span className="flex h-1.5 items-center gap-1">
                        {isBac ? (
                          <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        ) : (
                          <>
                            {day.due.slice(0, 3).map((item) => (
                              <span
                                key={item.id}
                                className={cn("h-1.5 w-1.5 rounded-full", TONE_BG[subjectTone(item.subject)])}
                              />
                            ))}
                            {day.due.length === 0 && day.active ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
                            ) : null}
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
                {data?.horizon ? (
                  <>جدولك محجوز حتى {dayLabel(data.horizon)} — كل مراجعة تحجز الموعد التالي تلقائياً.</>
                ) : (
                  <>لا مواعيد قادمة بعد. راجع عنصراً واحداً وسيحجز التقويم موعده التالي.</>
                )}
              </p>
            </section>

            <section className="rounded-card bg-card p-5 shadow-soft">
              <h2 className="text-[19px] font-medium">{selected === todayKey ? "اليوم" : dayLabel(selected)}</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {selected === BAC_KEY ? BAC_SESSION_LABEL : selected === todayKey ? dayLabel(selected) : null}
              </p>

              {selectedBacklog.length > 0 ? (
                <>
                  <p className="mt-5 text-[13px] font-medium text-muted-foreground">متأخرة</p>
                  <ul className="mt-2 space-y-2">
                    {selectedBacklog.slice(0, 6).map((item) => (
                      <DueRow key={item.id} item={item} />
                    ))}
                  </ul>
                </>
              ) : null}

              {selectedDay.due.length > 0 ? (
                <>
                  <p className="mt-5 text-[13px] font-medium text-muted-foreground">مبرمج</p>
                  <ul className="mt-2 space-y-2">
                    {selectedDay.due.slice(0, 6).map((item) => (
                      <DueRow key={item.id} item={item} />
                    ))}
                  </ul>
                </>
              ) : null}

              {selectedBacklog.length === 0 && selectedDay.due.length === 0 ? (
                <p className="mt-5 text-[15px] text-muted-foreground">
                  {selectedDay.active ? "راجعت في هذا اليوم — لا شيء مبرمج." : "لا شيء مبرمج في هذا اليوم."}
                </p>
              ) : null}

              {selected === todayKey && selectedBacklog.length + selectedDay.due.length > 0 ? (
                <Button asChild size="lg" className="mt-5 w-full">
                  <Link to="/revision">
                    ابدأ المراجعة
                    <ChevronLeft className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                  </Link>
                </Button>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-tone-lav" aria-hidden />
                  مستحق
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" aria-hidden />
                  نشاط سابق
                </span>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

const DueRow = ({ item }: { item: DueItem }) => (
  <li className="flex items-start gap-3 rounded-2xl bg-card-raised p-3">
    <span
      className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", TONE_BG[subjectTone(item.subject)])}
      aria-hidden
    />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[13px] text-muted-foreground">
        {subjectLabel(item.subject)}
        {item.chapter ? " · " + chapterLabel(item.chapter) : ""}
      </span>
      <span className="mt-0.5 block truncate text-[15px]">{item.title}</span>
    </span>
  </li>
);

export default Calendar;

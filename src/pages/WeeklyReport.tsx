import { Link } from "react-router-dom";
import { BookOpen, CircleHelp, Flame, Layers, Target, Timer, TrendingDown, TrendingUp } from "lucide-react";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { useChapterMastery } from "@/hooks/useChapterMastery";
import { useWeeklyReport, type ComparableMetric } from "@/hooks/useWeeklyReport";
import { subjectLabel } from "@/lib/bac";
import { cn } from "@/lib/utils";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-DZ", { day: "numeric", month: "long" });

/**
 * A change chip. Never colour alone (accessibility): every one carries an
 * arrow glyph and a word, so it reads the same to someone who can't
 * distinguish the two tones.
 */
const Delta = ({ delta, invert = false }: { delta: number | null; invert?: boolean }) => {
  if (delta === null || delta === 0) return null;
  const up = delta > 0;
  // for mistakes, fewer is better — invert which direction reads as good
  const good = invert ? !up : up;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px]",
        good ? "bg-success/15 text-success" : "bg-destructive-light text-destructive"
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />}
      <span dir="ltr">{up ? "+" : ""}{delta}</span>
      <span>{up ? "أكثر" : "أقل"}</span>
    </span>
  );
};

const Tile = ({
  icon: Icon,
  label,
  metric,
  invert,
}: {
  icon: typeof CircleHelp;
  label: string;
  metric: ComparableMetric | number;
  invert?: boolean;
}) => {
  const value = typeof metric === "number" ? metric : metric.value;
  const delta = typeof metric === "number" ? null : metric.delta;
  return (
    <div className="rounded-card bg-card p-4 shadow-soft">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card-raised">
        <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </span>
      <p className="tabular mt-3 text-[26px] font-semibold leading-none">{value}</p>
      <p className="mt-1.5 text-[13px] text-muted-foreground">{label}</p>
      <div className="mt-2">
        <Delta delta={delta} invert={invert} />
      </div>
    </div>
  );
};

const WeeklyReport = () => {
  const { report, loading, error } = useWeeklyReport();
  const mastery = useChapterMastery();

  if (loading) return <Loading full />;
  if (error || !report) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <PageHeader title="تقرير الأسبوع" />
        <ErrorState title="تعذّر تحميل التقرير" description={error ?? undefined} />
      </div>
    );
  }

  // The app's single definition of weak/strong, from useChapterMastery — this
  // page used to take the bottom floor(touched/2) with no threshold, which
  // flagged a 92% chapter as needing review and left a student with one weak
  // chapter with no guidance at all.
  const weak = mastery.weakChapters.slice(0, 3);
  const strong = mastery.strongChapters.slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="تقرير الأسبوع" subtitle={`${fmtDate(report.weekStart)} — ${fmtDate(report.weekEnd)}`} />

      {report.isEmpty ? (
        <EmptyState
          icon={Target}
          title="لا توجد بيانات كافية لهذا الأسبوع بعد"
          description="ابدأ بحل بعض الأسئلة أو مراجعة بطاقاتك، وسيظهر تقريرك هنا."
          action={
            <Button asChild>
              <Link to="/revision">ابدأ المراجعة</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section>
            <h2 className="text-[15px] font-medium">ملخّص النشاط</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Tile icon={CircleHelp} label="سؤالاً أجبت عنه" metric={report.questions} />
              <Tile icon={Layers} label="بطاقة راجعتها" metric={report.flashcardsReviewed} />
              <Tile icon={Target} label="خطأ راجعته" metric={report.mistakesReviewed} />
              <Tile icon={BookOpen} label="درساً أكملته" metric={report.lessons} />
              <Tile icon={Timer} label="محاكاة أنهيتها" metric={report.simulations} />
              <Tile icon={Flame} label="يوم دراسة" metric={report.studyDays} />
            </div>
          </section>

          <section className="rounded-card bg-card p-5 shadow-soft">
            <h2 className="text-[15px] font-medium">دقّة إجاباتك</h2>
            {report.accuracyPct === null ? (
              <p className="mt-2 text-[13px] text-muted-foreground">لم تجب عن أي سؤال هذا الأسبوع.</p>
            ) : (
              <>
                <p className="mt-2 flex items-baseline gap-2">
                  <span dir="ltr" className="tabular text-[34px] font-semibold leading-none">
                    {report.accuracyPct}%
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    من <span className="tabular">{report.questions.value}</span> سؤالاً
                  </span>
                </p>
                {report.accuracyDeltaPoints === null ? (
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    لا توجد بيانات كافية للمقارنة بالأسبوع الماضي.
                  </p>
                ) : report.accuracyDeltaPoints === 0 ? (
                  <p className="mt-2 text-[13px] text-muted-foreground">نفس دقّة الأسبوع الماضي.</p>
                ) : (
                  <p
                    className={cn(
                      "tabular mt-2 flex items-center gap-1.5 text-[13px]",
                      report.accuracyDeltaPoints > 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {report.accuracyDeltaPoints > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {/* percentage POINTS — an accuracy move from 68% to 74% is
                        +6 points, not +6%. */}
                    <span dir="ltr">
                      {report.accuracyDeltaPoints > 0 ? "+" : ""}
                      {report.accuracyDeltaPoints}
                    </span>
                    <span>نقطة مئوية مقارنة بالأسبوع الماضي</span>
                  </p>
                )}
              </>
            )}
          </section>

          {/* No week-over-week delta here, deliberately: mistakes.last_mistaken_at
              is overwritten on every repeat miss, so last week's figure shrinks
              retroactively as the student keeps studying. The label says exactly
              what the number is instead of implying a trend it can't support. */}
          <section className="rounded-card bg-card p-5 shadow-soft">
            <h2 className="text-[15px] font-medium">أخطاؤك هذا الأسبوع</h2>
            <p className="mt-2 flex items-center gap-3">
              <span className="tabular text-[26px] font-semibold leading-none">{report.mistakesMade}</span>
              <span className="text-[13px] text-muted-foreground">سؤالاً أخطأت فيه</span>
            </p>
          </section>

          {weak.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <section>
                <h2 className="text-[15px] font-medium">تحتاج إلى مراجعة</h2>
                <div className="mt-3 space-y-2">
                  {weak.map((c) => (
                    <div
                      key={`${c.subject}:${c.chapter}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-destructive-light px-4 py-2.5 text-[14px]"
                    >
                      <span className="min-w-0 truncate">
                        {subjectLabel(c.subject)} · {c.label}
                      </span>
                      <span dir="ltr" className="tabular shrink-0 font-semibold text-destructive">
                        {c.masteryPct}%
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h2 className="text-[15px] font-medium">نقاط قوتك</h2>
                <div className="mt-3 space-y-2">
                  {strong.map((c) => (
                    <div
                      key={`${c.subject}:${c.chapter}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-success/10 px-4 py-2.5 text-[14px]"
                    >
                      <span className="min-w-0 truncate">
                        {subjectLabel(c.subject)} · {c.label}
                      </span>
                      <span dir="ltr" className="tabular shrink-0 font-semibold text-success">
                        {c.masteryPct}%
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {weak.length > 0 ? (
            <section className="rounded-card bg-tone-mint p-5 shadow-soft">
              <h2 className="text-[15px] font-medium">ركّز هذا الأسبوع على</h2>
              <ol className="mt-3 space-y-2">
                {weak.map((c, i) => (
                  <li key={`${c.subject}:${c.chapter}`} className="flex items-center gap-3 text-[15px]">
                    <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card-raised/70 text-[13px] font-medium">
                      {i + 1}
                    </span>
                    {subjectLabel(c.subject)} · {c.label}
                  </li>
                ))}
              </ol>
              <Button className="mt-4" asChild>
                <Link to="/revision">ابدأ المراجعة</Link>
              </Button>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
};

export default WeeklyReport;

import { Link, Navigate } from "react-router-dom";
import { Award, BookOpen, ChevronLeft, Coins, Flame, GraduationCap, Settings, TrendingUp } from "lucide-react";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { useAuth } from "@/contexts/AuthContext";
import { useChapterMastery } from "@/hooks/useChapterMastery";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useQuizStats } from "@/hooks/useQuizStats";
import { useStudyStreak } from "@/hooks/useStudyStreak";
import { useUserRank } from "@/hooks/useUserRank";
import { useWeeklyReport } from "@/hooks/useWeeklyReport";
import { COEFFICIENTS, TONE_BG, streamLabel, streamTone, subjectLabel, subjectTone, type Tone } from "@/lib/bac";
import { cn } from "@/lib/utils";

/** Compact "this week" summary + link to the full report — same numbers
 *  WeeklyReportCard used to show on the dashboard, just relocated here. */
const WeeklyReportSummary = () => {
  const { report, loading, error } = useWeeklyReport();

  if (loading) return <Loading label="جارٍ تحميل تقرير الأسبوع…" />;
  if (error) return <ErrorState description={error} />;
  if (!report || report.isEmpty) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="لا نشاط هذا الأسبوع بعد"
        description="أجب عن سؤال أو حل بطاقة ليظهر تقرير أسبوعك هنا."
      />
    );
  }

  return (
    <Link
      to="/weekly-report"
      className="flex items-center justify-between gap-4 rounded-2xl bg-card-raised p-4 transition-colors hover:bg-card-raised/70"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tone-lav">
          <TrendingUp className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="text-[15px] font-medium">
          <span className="tabular">{report.questions.value}</span> سؤالاً هذا الأسبوع
          {report.accuracyPct !== null ? (
            <>
              {" · "}
              <span dir="ltr" className="tabular">{report.accuracyPct}%</span> دقّة
            </>
          ) : null}
        </span>
      </span>
      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2.4} aria-hidden />
    </Link>
  );
};

const ROLE_LABEL: Record<string, string> = { admin: "مدير", premium: "طالب مميّز", student: "طالب" };

const Profile = () => {
  const { profile } = useAuth();
  const stats = useDashboardStats();
  const { averageScore } = useQuizStats();
  const { currentStreak, longestStreak, daysThisMonth } = useStudyStreak();
  const rank = useUserRank();
  const mastery = useChapterMastery();

  if (!profile) return <Navigate to="/" replace />;

  const fmt = (n: number) => n.toLocaleString("ar-DZ");
  // averageScore is a percentage; the BAC is marked out of 20
  const mark = averageScore ? (averageScore / 5).toFixed(2).replace(/\.?0+$/, "") : null;
  const coefficients = profile.stream ? COEFFICIENTS[profile.stream] : undefined;
  const initials = profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  const tiles: { icon: typeof Coins; label: string; value: string; tone: Tone }[] = [
    { icon: Coins, label: "مجموع النقاط", value: fmt(stats.totalScore), tone: "peach" },
    { icon: Award, label: "المرتبة", value: rank === null ? "—" : `#${rank}`, tone: "lav" },
    { icon: Flame, label: "أيام متتالية", value: fmt(currentStreak), tone: "pink" },
    // "14.2 / 20" reorders to "20 / 14.2" inside RTL text — a slash between two
    // numbers resolves right-to-left. The Arabic connector is immune, and it is
    // what QuizTaking/ExamSimulatorTaking already use.
    { icon: GraduationCap, label: "المعدّل", value: mark ? `${mark} من 20` : "—", tone: "mint" },
  ];

  const progress = [
    { label: "اختبارات مكتملة", value: stats.completedQuizzes },
    { label: "مواضيع محلولة", value: stats.examsSolved },
    { label: "دروس مشاهَدة", value: stats.videosWatched },
    { label: "أطول سلسلة أيام", value: longestStreak },
    { label: "أيام دراسة هذا الشهر", value: daysThisMonth },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="ملفّي">
        <Button asChild variant="secondary">
          <Link to="/settings">
            <Settings aria-hidden />
            الإعدادات
          </Link>
        </Button>
      </PageHeader>

      <section className="flex flex-wrap items-center gap-5 rounded-card bg-card p-6 shadow-soft">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-tone-lav via-tone-pink to-tone-peach text-2xl font-medium text-foreground/70 ring-4 ring-card-raised">
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-medium">{profile.name}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary px-3 py-1 text-[13px] text-primary-foreground">
              {ROLE_LABEL[profile.role] ?? "طالب"}
            </span>
            {profile.stream && (
              <span className={cn("rounded-full px-3 py-1 text-[13px]", TONE_BG[streamTone(profile.stream)])}>
                {streamLabel(profile.stream)}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-card bg-card p-5 shadow-soft">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", TONE_BG[tile.tone])}>
              <tile.icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            </span>
            <p className="tabular mt-4 text-[28px] font-semibold leading-none">{tile.value}</p>
            <p className="mt-2 text-[15px] text-muted-foreground">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-card bg-card p-5 shadow-soft">
          <h2 className="text-lg font-medium">تقدّمك في التعلّم</h2>
          <ul className="mt-4 space-y-2">
            {progress.map((row) => (
              <li key={row.label} className="flex items-center justify-between rounded-2xl bg-card-raised px-4 py-3">
                <span className="text-base text-muted-foreground">{row.label}</span>
                <span className="tabular text-lg font-semibold">{fmt(row.value)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-card bg-card p-5 shadow-soft">
          <h2 className="text-lg font-medium">المعاملات{profile.stream ? ` — ${streamLabel(profile.stream)}` : ""}</h2>
          {/* real information a BAC student actually looks up */}
          {coefficients ? (
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {Object.entries(coefficients).map(([subject, coef]) => (
                <li key={subject} className="flex items-center justify-between gap-2 rounded-2xl bg-card-raised px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-[15px]">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TONE_BG[subjectTone(subject)])} />
                    <span className="truncate">{subjectLabel(subject)}</span>
                  </span>
                  <span className="tabular text-base font-semibold">{coef}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="mt-4"
              icon={BookOpen}
              title="لم تحدّد شعبتك بعد"
              description="اختر شعبتك من الإعدادات لعرض معاملات موادّك."
              action={
                <Button asChild variant="secondary">
                  <Link to="/settings">اذهب إلى الإعدادات</Link>
                </Button>
              }
            />
          )}
        </section>
      </div>

      <section className="rounded-card bg-card p-5 shadow-soft">
        <h2 className="text-lg font-medium">مستوى إتقانك</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          النسبة محسوبة من إجاباتك الصحيحة في كل فصل، وتنخفض قليلاً لكل خطأ لم تصحّحه بعد.
        </p>

        {mastery.loading ? (
          <Loading className="mt-4" label="جارٍ حساب مستوى إتقانك…" />
        ) : mastery.error ? (
          <ErrorState className="mt-4" description={mastery.error} />
        ) : (
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {mastery.subjects.map((s) => (
              <div key={s.subject}>
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-[15px] font-medium">
                    <span className={cn("h-2.5 w-2.5 rounded-full", TONE_BG[subjectTone(s.subject)])} />
                    {s.label}
                  </h3>
                  <span className="tabular text-[13px] text-muted-foreground">
                    {s.overallPct === null ? "لم تبدأ بعد" : `${s.overallPct}%`}
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {s.chapters.map((c) => (
                    <li key={c.chapter}>
                      <Link
                        to="/videos"
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors",
                          c.hasData
                            ? "bg-card-raised hover:bg-card-raised/70"
                            : "border border-dashed border-border text-muted-foreground hover:border-foreground/30"
                        )}
                      >
                        <span className="min-w-0 truncate text-[14px]">{c.label}</span>
                        {c.hasData ? (
                          <span className="flex shrink-0 items-center gap-2">
                            <Progress value={c.masteryPct} className="h-1.5 w-16" />
                            <span className="tabular w-10 text-end text-[14px] font-semibold">{c.masteryPct}%</span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-[13px]">لم تُختبر بعد</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-card bg-card p-5 shadow-soft">
        <h2 className="text-lg font-medium">تقرير الأسبوع</h2>
        <div className="mt-4">
          <WeeklyReportSummary />
        </div>
      </section>
    </div>
  );
};

export default Profile;

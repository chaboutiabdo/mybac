import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, BookOpen, Award, Flame, Settings, GraduationCap } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import UserProfile from "@/components/dashboard/UserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useQuizStats } from "@/hooks/useQuizStats";
import { useUserRank } from "@/hooks/useUserRank";
import { Link, Navigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/states";
import { COEFFICIENTS, streamLabel, subjectLabel } from "@/lib/bac";

const Profile = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const stats = useDashboardStats();
  const { dayStreak, averageScore } = useQuizStats();
  const rank = useUserRank();

  if (!profile) return <Navigate to="/" replace />;

  const fmt = (n: number) => n.toLocaleString("ar-DZ");
  // averageScore is a percentage; the BAC is marked out of 20.
  const mark = averageScore ? (averageScore / 5).toFixed(2).replace(/\.?0+$/, "") : null;
  const coefficients = profile.stream ? COEFFICIENTS[profile.stream] : undefined;

  const tiles = [
    { icon: Trophy, label: t("totalScore"), value: fmt(stats.totalScore), tone: "text-accent" },
    { icon: Award, label: t("rank"), value: rank === null ? "—" : `#${rank}`, tone: "text-muted-foreground" },
    { icon: Flame, label: t("dayStreak"), value: fmt(dayStreak), tone: "text-accent" },
    { icon: GraduationCap, label: "المعدّل", value: mark ? `${mark} / 20` : "—", tone: "text-success" },
  ];

  const progress = [
    { label: t("quizzesCompleted"), value: stats.completedQuizzes },
    { label: t("examsSolved"), value: stats.examsSolved },
    { label: t("videosWatched"), value: stats.videosWatched },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-7">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <UserProfile />
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 me-2" />
                {t("settings")}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {tiles.map((tile) => (
              <Card key={tile.label}>
                <CardContent className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{tile.label}</span>
                    <tile.icon className={`h-4 w-4 ${tile.tone}`} strokeWidth={1.6} aria-hidden />
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight tabular">{tile.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-base font-semibold">{t("learningProgress")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {progress.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0"
                  >
                    <span className="text-base text-muted-foreground">{row.label}</span>
                    <span className="text-base font-semibold tabular">{fmt(row.value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="text-base font-semibold">
                  المعاملات — {streamLabel(profile.stream)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Replaces four hard-coded fake achievements. Coefficients are
                    real information a BAC student actually looks up. */}
                {coefficients ? (
                  Object.entries(coefficients).map(([subject, coef]) => (
                    <div
                      key={subject}
                      className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-0"
                    >
                      <span className="text-base text-muted-foreground">{subjectLabel(subject)}</span>
                      <span className="text-base font-semibold tabular">{coef}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title="لم تحدّد شعبتك بعد"
                    description="اختر شعبتك من الإعدادات لعرض معاملات موادّك."
                    action={
                      <Link to="/settings">
                        <Button variant="outline" size="sm">اذهب إلى الإعدادات</Button>
                      </Link>
                    }
                    className="border-0"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;

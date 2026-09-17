import { useEffect, useMemo } from "react";
import { BookOpen, Video, FileText, Trophy } from "lucide-react";

import Navigation from "@/components/layout/Navigation";
import StatsCard from "@/components/dashboard/StatsCard";
import DailyQuizCard from "@/components/dashboard/DailyQuizCard";
import RecentActivityCard from "@/components/dashboard/RecentActivityCard";
import Leaderboard from "@/components/dashboard/Leaderboard";
import AdviceTips from "@/components/dashboard/AdviceTips";
import BacCountdown from "@/components/dashboard/BacCountdown";
import AdminAdvice from "@/components/AdminAdvice";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { streamLabel } from "@/lib/bac";

/**
 * Balanced 2×2. Every row closes — nothing orphans into a half-width slot the
 * way the old three-cards-in-a-two-column-grid did.
 *
 *   ┌──────────── hero ────────────┐
 *   ├────┬────┬────┬────┤  4 stats
 *   ├─────────┬─────────┤  quiz | leaderboard
 *   ├─────────┴─────────┤  activity | tips
 */
const Dashboard = () => {
  const { user, profile } = useAuth();
  const { trackStudentQuestion } = useActivityTracking();
  const dashboardStats = useDashboardStats();

  useEffect(() => {
    if (user) {
      trackStudentQuestion("User visited dashboard", "navigation", "general", "general");
    }
  }, [user, trackStudentQuestion]);

  const stats = useMemo(
    () => [
      {
        title: "مجموع النقاط",
        value: dashboardStats.loading ? "…" : dashboardStats.totalScore,
        icon: Trophy,
        variant: "accent" as const,
      },
      {
        title: "اختبارات مكتملة",
        value: dashboardStats.loading ? "…" : dashboardStats.completedQuizzes,
        icon: BookOpen,
        variant: "default" as const,
      },
      {
        title: "دروس مشاهَدة",
        value: dashboardStats.loading ? "…" : dashboardStats.videosWatched,
        icon: Video,
        variant: "success" as const,
      },
      {
        title: "امتحانات محلولة",
        value: dashboardStats.loading ? "…" : dashboardStats.examsSolved,
        icon: FileText,
        variant: "default" as const,
      },
    ],
    [dashboardStats]
  );

  const firstName = profile?.name?.split(" ")[0];

  return (
    <div className="pattern-field min-h-screen bg-background">
      <Navigation />

      <main className="container space-y-6 py-8">
        {/* ── row 1: hero, full width ─────────────────────────────── */}
        <section className="hero-vignette edge-gold surface-raised relative overflow-hidden rounded-lg border">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-8 px-7 py-8">
            <div>
              <h1 className="font-display text-[34px] font-bold leading-tight">
                {firstName ? `مرحبًا، ${firstName}` : "لوحة التحكم"}
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {profile?.stream ? streamLabel(profile.stream) : "تتبّع تقدّمك وإنجازاتك"}
              </p>
            </div>
            <BacCountdown />
          </div>
        </section>

        <AdminAdvice />

        {/* ── row 2: four equal stat tiles ────────────────────────── */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </section>

        {/* ── row 3: today's quiz | leaderboard ───────────────────── */}
        <section className="grid items-stretch gap-5 lg:grid-cols-2">
          <DailyQuizCard />
          <Leaderboard />
        </section>

        {/* ── row 4: recent activity | daily tips ─────────────────── */}
        <section className="grid items-stretch gap-5 lg:grid-cols-2">
          <RecentActivityCard />
          <AdviceTips />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

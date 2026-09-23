import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/utils";

/**
 * The daily-goal ceiling. Not a settings row: this app has no settings table,
 * and its tunables are top-level constants by convention (MAX_QUEUE_SIZE and
 * WEAK_THRESHOLD live the same way in useTodaysRevision.ts, BAC_DATE in
 * lib/bac.ts).
 *
 * It is a CEILING, not a target: the real goal is min(this, what's actually
 * due today), so a student with three pending tasks gets a reachable 3, not a
 * fake 10 — and a student with a fifty-item backlog gets a day's work, not a
 * wall.
 */
export const DAILY_GOAL_TARGET = 10;

export interface StudyStats {
  currentStreak: number;
  longestStreak: number;
  daysThisMonth: number;
  /** Mistakes + flashcards this student reviewed today (Africa/Algiers). */
  tasksCompletedToday: number;
  loading: boolean;
  error: string | null;
  /** Re-reads the stats. Needed because answering the daily question or
   *  finishing a revision task creates a study day server-side, and without
   *  this the streak sat stale until a full reload. */
  refetch: () => void;
}

/**
 * Server-authoritative study streak. Replaces useQuizStats' old
 * calculateDayStreak(), which counted only quizzes, bucketed days in whatever
 * timezone the browser happened to be in, and was recomputed client-side on
 * every mount. get_study_stats() derives everything from activity that already
 * exists, in Africa/Algiers — see 20260921200000_study_streak.sql.
 */
export function useStudyStreak(): StudyStats {
  const { user } = useAuth();
  const [stats, setStats] = useState<Omit<StudyStats, "loading" | "error" | "refetch">>({
    currentStreak: 0,
    longestStreak: 0,
    daysThisMonth: 0,
    tasksCompletedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_study_stats");
      if (rpcError) throw rpcError;
      // RETURNS TABLE(...) arrives as a one-row array
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setStats({
          currentStreak: row.current_streak ?? 0,
          longestStreak: row.longest_streak ?? 0,
          daysThisMonth: row.days_this_month ?? 0,
          tasksCompletedToday: row.tasks_completed_today ?? 0,
        });
      }
    } catch (err) {
      console.error("Error fetching study stats:", err);
      setError(errorMessage(err, "تعذّر تحميل أيام دراستك"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { ...stats, loading, error, refetch: fetchStats };
}

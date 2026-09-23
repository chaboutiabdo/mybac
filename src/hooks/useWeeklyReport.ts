import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/utils";

/** A metric that can honestly be compared with last week. */
export interface ComparableMetric {
  value: number;
  /** null when last week has no data to compare against. */
  delta: number | null;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  questions: ComparableMetric;
  lessons: ComparableMetric;
  simulations: ComparableMetric;
  studyDays: ComparableMetric;
  /** Current week only — the underlying columns are last-write-wins, so a
   *  previous-week figure would silently drift as the student keeps studying.
   *  `mistakesMade` is in this group too: `mistakes.last_mistaken_at` is
   *  overwritten on every repeat miss, so a week-over-week delta would be
   *  fiction. It also counts distinct questions whose LATEST miss falls in the
   *  window, not misses. */
  flashcardsReviewed: number;
  mistakesReviewed: number;
  mistakesMade: number;
  /** Rounded percentage, or null when nothing was answered. */
  accuracyPct: number | null;
  /** Change in PERCENTAGE POINTS, not percent. null when last week had no questions. */
  accuracyDeltaPoints: number | null;
  /** True when the week has no recorded activity at all. */
  isEmpty: boolean;
  /** True when last week has enough data for any comparison to be meaningful. */
  hasComparison: boolean;
}

const pct = (correct: number, answered: number): number | null =>
  answered > 0 ? Math.round((correct / answered) * 100) : null;

export function useWeeklyReport(weeksAgo = 0) {
  const { user } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A generation counter rather than a per-effect `cancelled` flag, so the
  // same stale-response guard still holds when refetch() is called by hand:
  // stepping back a week must never be overwritten by the previous week's
  // reply landing late.
  const runId = useRef(0);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const id = ++runId.current;
    const cancelled = () => id !== runId.current;

    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_weekly_report", {
        p_weeks_ago: weeksAgo,
      });
      if (rpcError) throw rpcError;
      const r = Array.isArray(data) ? data[0] : data;
      if (cancelled() || !r) return;

      // Every "is this comparable" decision lives here, not in JSX: a metric
      // only carries a delta when last week actually had something to
      // compare against, so the UI can never imply a +74 improvement from an
      // empty week.
      const prevHasData =
        (r.prev_questions_answered ?? 0) > 0 ||
        (r.prev_lessons_completed ?? 0) > 0 ||
        (r.prev_simulations_completed ?? 0) > 0 ||
        (r.prev_study_days ?? 0) > 0;

      const cmp = (now: number, prev: number): ComparableMetric => ({
        value: now,
        delta: prevHasData ? now - prev : null,
      });

      const thisPct = pct(r.questions_correct ?? 0, r.questions_answered ?? 0);
      const prevPct = pct(r.prev_questions_correct ?? 0, r.prev_questions_answered ?? 0);

      setReport({
        weekStart: r.week_start,
        weekEnd: r.week_end,
        questions: cmp(r.questions_answered ?? 0, r.prev_questions_answered ?? 0),
        lessons: cmp(r.lessons_completed ?? 0, r.prev_lessons_completed ?? 0),
        simulations: cmp(r.simulations_completed ?? 0, r.prev_simulations_completed ?? 0),
        studyDays: cmp(r.study_days ?? 0, r.prev_study_days ?? 0),
        flashcardsReviewed: r.flashcards_reviewed ?? 0,
        mistakesReviewed: r.mistakes_reviewed ?? 0,
        mistakesMade: r.mistakes_made ?? 0,
        accuracyPct: thisPct,
        // percentage POINTS: 68% -> 74% is +6 points, never "+6%"
        accuracyDeltaPoints: thisPct !== null && prevPct !== null ? thisPct - prevPct : null,
        isEmpty:
          (r.questions_answered ?? 0) === 0 &&
          (r.lessons_completed ?? 0) === 0 &&
          (r.simulations_completed ?? 0) === 0 &&
          (r.flashcards_reviewed ?? 0) === 0 &&
          (r.mistakes_reviewed ?? 0) === 0,
        hasComparison: prevHasData,
      });
    } catch (err) {
      console.error("Error loading the weekly report:", err);
      if (!cancelled()) setError(errorMessage(err, "تعذّر تحميل تقرير الأسبوع"));
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, [user, weeksAgo]);

  useEffect(() => {
    load();
  }, [load]);

  return { report, loading, error, refetch: load };
}

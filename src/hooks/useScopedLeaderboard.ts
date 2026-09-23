import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/utils";

export type LeaderboardScope = "all" | "school" | "city";

export interface LeaderboardEntry {
  // nullable because the "all" scope reads the `leaderboard` view, which
  // drops NOT NULL — the school/city RPCs never actually return null here
  id: string | null;
  name: string | null;
  score: number | null;
}

/**
 * One hook for all three "أفضل الطلاب" tabs. "all" reads the existing global
 * `leaderboard` view (unchanged); "school"/"city" call the two new RPCs,
 * which derive scope from auth.uid() server-side — nothing client-supplied
 * could point them at another student's school or city.
 *
 * Rank is derived client-side by finding the caller's own row, exactly like
 * useUserRank.ts already does for the global list — a second server round
 * trip for "and what's my rank" would be redundant with the list we already
 * have.
 */
export function useScopedLeaderboard(scope: LeaderboardScope) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setRows(null);
    setError(null);

    (async () => {
      const result =
        scope === "all"
          ? await supabase.from("leaderboard").select("id, name, total_score").limit(100)
          : await supabase.rpc(scope === "school" ? "get_school_leaderboard" : "get_city_leaderboard");
      if (!active) return;

      if (result.error) {
        console.error(`Error fetching ${scope} leaderboard:`, result.error);
        setError(errorMessage(result.error, "تعذّر تحميل الترتيب"));
        setRows([]);
        return;
      }
      setRows((result.data ?? []).map((e) => ({ id: e.id, name: e.name, score: e.total_score })));
    })();

    return () => {
      active = false;
    };
  }, [scope]);

  const myRank = useMemo(() => {
    if (!rows || !profile) return null;
    const index = rows.findIndex((r) => r.id === profile.id);
    return index === -1 ? null : index + 1;
  }, [rows, profile]);

  return { rows, myRank, loading: rows === null && !error, error };
}

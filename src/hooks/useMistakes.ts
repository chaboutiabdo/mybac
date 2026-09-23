import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { errorMessage } from "@/lib/utils";

export type Mistake = Tables<"mistakes">;
export type MistakeStatusFilter = "active" | "resolved" | "all";

export function useMistakes({ status = "active", subject }: { status?: MistakeStatusFilter; subject?: string | null } = {}) {
  const { user } = useAuth();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMistakes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("mistakes").select("*").eq("student_id", user.id);
      if (status !== "all") query = query.eq("status", status);
      if (subject) query = query.eq("quiz_subject", subject);
      const { data, error: fetchError } = await query
        .order("last_mistaken_at", { ascending: false })
        .limit(100);
      if (fetchError) throw fetchError;
      setMistakes(data ?? []);
    } catch (err) {
      console.error("Error fetching mistakes:", err);
      setError(errorMessage(err, "تعذّر تحميل الأخطاء"));
    } finally {
      setLoading(false);
    }
  }, [user, status, subject]);

  useEffect(() => {
    fetchMistakes();
  }, [fetchMistakes]);

  const markReviewed = useCallback(async (mistakeId: string) => {
    const { error: rpcError } = await supabase.rpc("mark_mistake_reviewed", { p_mistake_id: mistakeId });
    if (rpcError) throw rpcError;
    // review_due_at must move too, not just last_reviewed_at: the server bumps
    // it by 3 days, and useTodaysRevision filters the queue on it. Patching
    // only one left a just-reviewed mistake still "due" locally, so anything
    // reading queue.length after a review (StreakCard's goal) double-counted it.
    const reviewedAt = new Date();
    const dueAt = new Date(reviewedAt.getTime() + 3 * 86_400_000);
    setMistakes((prev) =>
      prev.map((m) =>
        m.id === mistakeId
          ? { ...m, last_reviewed_at: reviewedAt.toISOString(), review_due_at: dueAt.toISOString() }
          : m
      )
    );
  }, []);

  return { mistakes, loading, error, refetch: fetchMistakes, markReviewed };
}

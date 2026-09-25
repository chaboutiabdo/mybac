import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { errorMessage } from "@/lib/utils";

export type Flashcard = Tables<"flashcards">;
export type FlashcardProgress = Tables<"student_flashcard_progress">;
export type FlashcardWithProgress = Flashcard & { student_flashcard_progress: FlashcardProgress[] };
// Hand-declared, not derived from generated types: Postgres CHECK constraints
// on a `text` column/arg don't reach supabase-js's codegen (same reason
// useMistakes.ts hand-declares MistakeStatusFilter instead of deriving it).
export type RecallRating = "hard" | "medium" | "easy";

// A student's whole deck is at most 16 chapters x 10 cards; the cap is a
// guard, not a page size.
const MAX_CARDS = 200;

export function useFlashcards({ subject, chapter }: { subject: string | null; chapter: string }) {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<FlashcardWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlashcards = useCallback(async () => {
    if (!user) {
      setFlashcards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Every deck is private (20260924000000_personal_ai.sql). The explicit
      // owner filter is not redundant with RLS: an admin's policy reaches every
      // student's cards, and their own study screen must show only theirs.
      // subject/chapter are both optional: no subject = the student's whole
      // deck ("الكل"), a subject with no chapter = that subject's cards.
      //
      // One round trip: student_flashcard_progress rides along embedded. A
      // card can only be reviewed by its owner (record_flashcard_review), so
      // the embed is the caller's own row — 0 or 1.
      let query = supabase
        .from("flashcards")
        .select("*, student_flashcard_progress(*)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      if (subject) query = query.eq("subject", subject);
      if (chapter) query = query.eq("chapter", chapter);
      const { data, error: fetchError } = await query.limit(MAX_CARDS);
      if (fetchError) throw fetchError;
      setFlashcards((data ?? []) as FlashcardWithProgress[]);
    } catch (err) {
      console.error("Error fetching flashcards:", err);
      setError(errorMessage(err, "تعذّر تحميل البطاقات"));
    } finally {
      setLoading(false);
    }
  }, [user, subject, chapter]);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  const recordReview = useCallback(async (flashcardId: string, rating: RecallRating) => {
    const { data, error: rpcError } = await supabase.rpc("record_flashcard_review", {
      p_flashcard_id: flashcardId,
      p_recall_rating: rating,
    });
    if (rpcError) throw rpcError;
    setFlashcards((prev) =>
      prev.map((card) =>
        card.id === flashcardId ? { ...card, student_flashcard_progress: [data as FlashcardProgress] } : card
      )
    );
  }, []);

  /**
   * Deletes the student's own cards in one chapter (and, by cascade, their
   * review history), so a full chapter can be generated again. Returns how
   * many went.
   */
  const deleteChapter = useCallback(
    async (deckSubject: string, deckChapter: string) => {
      if (!user) return 0;
      const { data, error: deleteError } = await supabase
        .from("flashcards")
        .delete()
        .eq("owner_id", user.id)
        .eq("subject", deckSubject)
        .eq("chapter", deckChapter)
        .select("id");
      if (deleteError) throw deleteError;
      await fetchFlashcards();
      return data?.length ?? 0;
    },
    [user, fetchFlashcards]
  );

  return { flashcards, loading, error, refetch: fetchFlashcards, recordReview, deleteChapter };
}

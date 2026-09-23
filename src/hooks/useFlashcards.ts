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

// A study session is a few dozen cards. Without a cap, "الكل" selects every
// row in the table, which is how 40 junk cards reached the page at once.
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
      // subject/chapter are both optional filters, not a required pair:
      // no subject = every card in the app ("الكل"), a subject with no
      // chapter = every card in that subject.
      //
      // One round trip: student_flashcard_progress rides along embedded.
      // RLS on that table (student_id = auth.uid()) already narrows the
      // embed to the caller's own row per card — 0 or 1, never another
      // student's — so no extra .eq() on the embed is needed.
      let query = supabase
        .from("flashcards")
        .select("*, student_flashcard_progress(*)")
        .order("created_at", { ascending: true });
      if (subject) query = query.eq("subject", subject);
      if (chapter) query = query.eq("chapter", chapter);
      // With no subject this is "every card in the database". A study session
      // is a few dozen cards, so the cap costs nothing and stops one bad batch
      // from dragging the whole deck into the page.
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

  return { flashcards, loading, error, refetch: fetchFlashcards, recordReview };
}

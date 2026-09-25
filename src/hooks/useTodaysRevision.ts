import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMistakes, type Mistake } from "@/hooks/useMistakes";
import { useChapterMastery, type ChapterMastery } from "@/hooks/useChapterMastery";
import type { Flashcard, FlashcardProgress, FlashcardWithProgress, RecallRating } from "@/hooks/useFlashcards";
import { errorMessage } from "@/lib/utils";

const MAX_QUEUE_SIZE = 12;
// WEAK_THRESHOLD deliberately does NOT live here any more — useChapterMastery
// owns the one definition of "weak", because three copies had drifted apart.
const MAX_WEAK_CHAPTERS = 3;
const RATING_RANK: Record<RecallRating, number> = { hard: 0, medium: 1, easy: 2 };

export type RevisionTask =
  | { type: "mistake"; mistake: Mistake }
  | { type: "flashcard"; card: FlashcardWithProgress };

// student_flashcard_progress -> flashcards is a to-one FK (flashcard_id references
// flashcards.id, a primary key), so PostgREST embeds it singular -- opposite of
// useFlashcards.ts's flashcards -> student_flashcard_progress[] direction.
type DueProgressRow = FlashcardProgress & { flashcards: Flashcard };

// review_due_at is NULL until a mistake is reviewed once (mark_mistake_reviewed is the
// only writer). NULL means "never reviewed" -- always due, sorts first as most urgent.
const mistakeDueTime = (m: Mistake) => (m.review_due_at ? new Date(m.review_due_at).getTime() : -Infinity);

export function useTodaysRevision() {
  const { user } = useAuth();
  const {
    mistakes,
    loading: mistakesLoading,
    error: mistakesError,
    refetch: refetchMistakes,
    markReviewed: markMistakeReviewed,
  } = useMistakes({ status: "active" });
  const mastery = useChapterMastery();
  // pulled out so refetch below can depend on the stable callback rather than
  // on `mastery`, which is a fresh object on every render
  const refetchMastery = mastery.refetch;

  const [dueCards, setDueCards] = useState<FlashcardWithProgress[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);

  const fetchDueCards = useCallback(async () => {
    if (!user) return;
    setCardsLoading(true);
    setCardsError(null);
    try {
      const { data, error } = await supabase
        .from("student_flashcard_progress")
        .select("*, flashcards(*)")
        .eq("student_id", user.id)
        .lte("next_review_at", new Date().toISOString())
        .order("next_review_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      // A row whose card the student can no longer see (deleted, or no longer
      // theirs) embeds null; spreading it would hand the study card undefined
      // text. Such a row is simply not due any more.
      const rows = ((data ?? []) as DueProgressRow[]).filter((r) => r.flashcards);
      setDueCards(
        rows.map(({ flashcards: cardData, ...progress }) => ({
          ...cardData,
          student_flashcard_progress: [progress],
        }))
      );
    } catch (err) {
      console.error("Error fetching due flashcards:", err);
      setCardsError(errorMessage(err, "تعذّر تحميل البطاقات المستحقة"));
    } finally {
      setCardsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  const queue = useMemo<RevisionTask[]>(() => {
    const sortedMistakes: RevisionTask[] = mistakes
      .filter((m) => mistakeDueTime(m) <= Date.now())
      .sort((a, b) => mistakeDueTime(a) - mistakeDueTime(b) || b.mistake_count - a.mistake_count)
      .map((mistake) => ({ type: "mistake", mistake }));

    const sortedCards: RevisionTask[] = [...dueCards]
      .sort((a, b) => {
        const ra = RATING_RANK[a.student_flashcard_progress[0]?.recall_rating as RecallRating] ?? 0;
        const rb = RATING_RANK[b.student_flashcard_progress[0]?.recall_rating as RecallRating] ?? 0;
        if (ra !== rb) return ra - rb;
        const na = a.student_flashcard_progress[0]?.next_review_at ?? "";
        const nb = b.student_flashcard_progress[0]?.next_review_at ?? "";
        return na.localeCompare(nb);
      })
      .map((card) => ({ type: "flashcard", card }));

    // Mistakes concatenated first always win the cap: a real exam mistake outranks a
    // flashcard. On a heavy-mistake day, due flashcards can be fully crowded out of
    // today's session -- accepted, not a bug.
    return [...sortedMistakes, ...sortedCards].slice(0, MAX_QUEUE_SIZE);
  }, [mistakes, dueCards]);

  // useChapterMastery now owns the weak/strong rule (WEAK_THRESHOLD lives
  // there) so /revision, /weekly-report and the simulator results can't
  // disagree about which chapters need work.
  const weakChapters = useMemo<ChapterMastery[]>(
    () => (mastery.loading || mastery.error ? [] : mastery.weakChapters.slice(0, MAX_WEAK_CHAPTERS)),
    [mastery.weakChapters, mastery.loading, mastery.error]
  );

  const recordFlashcardReview = useCallback(async (flashcardId: string, rating: RecallRating) => {
    const { error } = await supabase.rpc("record_flashcard_review", {
      p_flashcard_id: flashcardId,
      p_recall_rating: rating,
    });
    if (error) throw error;
  }, []);

  // Mastery is refreshed here too: this hook owns the instance Dashboard hands
  // to MasteryWidget, so a caller that refetches the queue after an answer was
  // otherwise left with a mastery percentage from before that answer.
  const refetch = useCallback(() => {
    refetchMistakes();
    fetchDueCards();
    refetchMastery();
  }, [refetchMistakes, fetchDueCards, refetchMastery]);

  return {
    queue,
    loading: mistakesLoading || cardsLoading,
    // mastery.error was previously swallowed entirely, so /revision
    // silently dropped its weak-chapters section on an RPC failure
    error: mistakesError || cardsError || mastery.error,
    refetch,
    weakChapters,
    // exposed so Dashboard can hand it to MasteryWidget instead of that
    // component fetching get_chapter_mastery a second time
    mastery,
    markMistakeReviewed,
    recordFlashcardReview,
  };
}

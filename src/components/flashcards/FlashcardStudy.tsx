import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AnswerText } from "@/components/ai/AnswerText";
import { Button } from "@/components/ui/button";
import type { FlashcardWithProgress, RecallRating } from "@/hooks/useFlashcards";
import { cn } from "@/lib/utils";

const RATINGS: { value: RecallRating; label: string; emoji: string }[] = [
  { value: "hard", label: "صعب", emoji: "😵" },
  { value: "medium", label: "متوسط", emoji: "🤔" },
  { value: "easy", label: "سهل", emoji: "😊" },
];

/** front -> "أظهر الإجابة" reveal -> back + rating, the same click-to-reveal
 * shape MistakeCard.tsx already uses — no CSS flip. */
export default function FlashcardStudy({
  card,
  onRate,
}: {
  card: FlashcardWithProgress;
  onRate: (flashcardId: string, rating: RecallRating) => Promise<void>;
}) {
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState<RecallRating | null>(null);

  const progress = card.student_flashcard_progress[0] ?? null;

  const handleRate = async (value: RecallRating) => {
    setRating(value);
    try {
      await onRate(card.id, value);
    } catch {
      toast.error("تعذّر تسجيل تقييمك، حاول مرة أخرى");
      setRating(null);
    }
  };

  return (
    <article className="rounded-card bg-card-raised p-6 shadow-soft">
      {card.concept ? <span className="rounded-full bg-card px-3 py-1.5 text-[13px]">{card.concept}</span> : null}

      <div className="mt-4 text-lg font-medium leading-snug">
        <AnswerText content={card.front} />
      </div>

      {!revealed ? (
        <Button className="mt-5" onClick={() => setRevealed(true)}>
          أظهر الإجابة
        </Button>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-card p-4">
            <AnswerText content={card.back} />
          </div>

          <div className="flex flex-wrap gap-2">
            {RATINGS.map((r) => (
              <Button
                key={r.value}
                variant="outline"
                size="sm"
                disabled={rating !== null}
                onClick={() => handleRate(r.value)}
                className={cn(rating === r.value && "opacity-60")}
              >
                {rating === r.value ? <Loader2 className="animate-spin" aria-hidden /> : <span aria-hidden>{r.emoji}</span>}
                {r.label}
              </Button>
            ))}
          </div>

          {progress ? (
            <p className="tabular text-[13px] text-muted-foreground">
              راجعتها {progress.review_count} {progress.review_count === 1 ? "مرة" : "مرات"}
            </p>
          ) : null}
        </div>
      )}
    </article>
  );
}

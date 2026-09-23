import { useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks } from "lucide-react";

import FlashcardStudy from "@/components/flashcards/FlashcardStudy";
import MistakeCard from "@/components/mistakes/MistakeCard";
import PageHeader from "@/components/layout/PageHeader";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import type { RecallRating } from "@/hooks/useFlashcards";
import { useTodaysRevision } from "@/hooks/useTodaysRevision";
import { subjectLabel } from "@/lib/bac";

const Revision = () => {
  const [sessionIndex, setSessionIndex] = useState(0);
  const { queue, loading, error, refetch, weakChapters, markMistakeReviewed, recordFlashcardReview } =
    useTodaysRevision();

  const task = queue[sessionIndex];
  const sessionDone = queue.length > 0 && !task;

  const handleMistakeReviewed = async (id: string) => {
    await markMistakeReviewed(id);
    setSessionIndex((i) => i + 1);
  };

  const handleFlashcardRate = async (flashcardId: string, rating: RecallRating) => {
    await recordFlashcardReview(flashcardId, rating);
    setSessionIndex((i) => i + 1);
  };

  return (
    <div className="space-y-8">
      <PageHeader title="مراجعة اليوم" subtitle="أخطاؤك وبطاقاتك المستحقة، في جلسة واحدة قصيرة" />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState description={error} onRetry={refetch} />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="لا يوجد ما يستحق المراجعة اليوم"
          description="عد لاحقاً عندما تستحق أخطاء أو بطاقات جديدة المراجعة."
        />
      ) : sessionDone ? (
        <EmptyState icon={ListChecks} title="أحسنت! أنهيت مراجعة اليوم" />
      ) : (
        <div>
          <p className="tabular text-center text-[13px] text-muted-foreground">
            {sessionIndex + 1} من {queue.length}
          </p>
          <div className="mt-3">
            {task.type === "mistake" ? (
              <MistakeCard key={task.mistake.id} mistake={task.mistake} onMarkReviewed={handleMistakeReviewed} />
            ) : (
              <FlashcardStudy key={task.card.id} card={task.card} onRate={handleFlashcardRate} />
            )}
          </div>
        </div>
      )}

      {weakChapters.length > 0 ? (
        <section>
          <h2 className="text-[15px] font-medium">فصول تحتاج تركيزاً أكبر</h2>
          <div className="mt-3 space-y-2">
            {weakChapters.map((c) => (
              <Link
                key={`${c.subject}:${c.chapter}`}
                to="/quizzes"
                className="flex items-center justify-between gap-3 rounded-2xl bg-card-raised px-4 py-3 shadow-soft transition-colors hover:bg-card-raised/70"
              >
                <span className="min-w-0 truncate text-[14px]">
                  {subjectLabel(c.subject)} · {c.label}
                </span>
                <span dir="ltr" className="tabular shrink-0 text-[14px] font-semibold">{c.masteryPct}%</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default Revision;

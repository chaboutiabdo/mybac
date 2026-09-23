import { useState } from "react";
import { Layers, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import FilterPills, { SUBJECT_OPTIONS } from "@/components/FilterPills";
import FlashcardStudy from "@/components/flashcards/FlashcardStudy";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { useFlashcards, type RecallRating } from "@/hooks/useFlashcards";
import { useGenerateFlashcards } from "@/hooks/useGenerateFlashcards";
import { useSubscription } from "@/hooks/useSubscription";
import { chapterLabel, chaptersFor, subjectLabel } from "@/lib/bac";

// Radix Select can't take an empty-string item value (that's reserved for
// "no selection"), so "every chapter in this subject" needs its own sentinel
// — same pattern as NO_SCHOOL in the admin Students page.
const ALL_CHAPTERS = "all";

const Flashcards = () => {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const [subject, setSubject] = useState<string | null>(null);
  const [chapter, setChapter] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionIndex, setSessionIndex] = useState(0);

  const { flashcards, loading, error, refetch, recordReview } = useFlashcards({ subject, chapter });
  const { generate, loading: generating } = useGenerateFlashcards();

  const pickSubject = (s: string | null) => {
    setSubject(s);
    setChapter("");
    setSessionActive(false);
    setSessionIndex(0);
  };

  const pickChapter = (c: string) => {
    setChapter(c);
    setSessionActive(false);
    setSessionIndex(0);
  };

  // Generating needs one exact chapter to target — browsing "الكل" or a
  // whole subject has nothing specific enough to generate for.
  const canGenerate = Boolean(subject) && Boolean(chapter);

  const handleGenerate = async () => {
    // repeated, not just `if (!canGenerate) return` -- TS narrows subject/
    // chapter to non-null from this exact shape, not from a derived boolean
    if (!subject || !chapter) return;
    // Visible to everyone, functionally gated: studying is free, generating
    // isn't. Not a hard-disabled button — a toast explains why, then hands
    // the student to /pricing, matching how ProtectedRoute explains a
    // premium wall instead of a silent redirect.
    if (!isPremium) {
      toast.error("توليد بطاقات جديدة ميزة مميّزة", {
        description: "الدراسة مجانية للجميع، لكن توليد بطاقات جديدة يتطلب اشتراكاً مميّزاً.",
      });
      navigate("/pricing");
      return;
    }
    try {
      const created = await generate(subject, chapter);
      toast.success(created.length ? `تمت إضافة ${created.length} بطاقة جديدة` : "لا حاجة لبطاقات جديدة الآن");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر توليد بطاقات جديدة");
    }
  };

  const handleRate = async (flashcardId: string, rating: RecallRating) => {
    await recordReview(flashcardId, rating);
    setSessionIndex((i) => i + 1);
  };

  const currentCard = flashcards[sessionIndex];
  const sessionDone = sessionActive && flashcards.length > 0 && !currentCard;
  // What to call the current scope in Arabic copy below — never chapterLabel
  // on an empty chapter, which silently renders as blank text rather than
  // "—" (chapterLabel only falls back to "—" for null/undefined, not "").
  const scopeLabel = subject && chapter ? chapterLabel(chapter) : subject ? subjectLabel(subject) : "كل المواد";

  return (
    <div className="space-y-8">
      <PageHeader title="البطاقات التعليمية" subtitle="راجع المفاهيم بسرعة، بطاقة بعد بطاقة" />

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="space-y-4 rounded-card bg-card p-5 shadow-soft">
            <h2 className="text-lg font-medium">اختر الفصل</h2>
            <FilterPills label="المادة" wrap options={SUBJECT_OPTIONS} value={subject} onChange={pickSubject} />
            <Select
              value={chapter || ALL_CHAPTERS}
              onValueChange={(v) => pickChapter(v === ALL_CHAPTERS ? "" : v)}
              disabled={!subject}
            >
              <SelectTrigger className="h-12 rounded-full" aria-label="الفصل">
                <SelectValue placeholder={subject ? "اختر الفصل" : "اختر المادة أولاً"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CHAPTERS}>كل الفصول</SelectItem>
                {chaptersFor(subject).map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        </aside>

        <section className="rounded-card bg-card p-6 shadow-soft">
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState description={error} onRetry={refetch} />
          ) : flashcards.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="لا توجد بطاقات هنا بعد"
              description={
                canGenerate
                  ? `كن أول من يولّد بطاقات مراجعة لفصل ${scopeLabel}.`
                  : "اختر مادة ثم فصلاً محدداً لتوليد بطاقات جديدة."
              }
              action={
                canGenerate ? (
                  <Button onClick={handleGenerate} disabled={generating}>
                    <Sparkles aria-hidden />
                    {generating ? "جارٍ التوليد…" : "ولّد بطاقات جديدة"}
                  </Button>
                ) : undefined
              }
            />
          ) : !sessionActive ? (
            <div className="py-6 text-center">
              <p className="text-lg font-medium">
                <span className="tabular">{flashcards.length}</span> بطاقة في {scopeLabel}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => {
                    setSessionIndex(0);
                    setSessionActive(true);
                  }}
                >
                  ابدأ المراجعة
                </Button>
                {canGenerate ? (
                  <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                    <Sparkles aria-hidden />
                    {generating ? "جارٍ التوليد…" : "ولّد بطاقات جديدة"}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : sessionDone ? (
            <EmptyState
              icon={Layers}
              title="أحسنت! أنهيت هذه المراجعة"
              description={canGenerate ? "يمكنك إعادة المراجعة أو توليد بطاقات إضافية." : "يمكنك إعادة المراجعة."}
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" onClick={() => setSessionIndex(0)}>
                    <RotateCcw aria-hidden />
                    من جديد
                  </Button>
                  {canGenerate ? (
                    <Button onClick={handleGenerate} disabled={generating}>
                      <Sparkles aria-hidden />
                      {generating ? "جارٍ التوليد…" : "ولّد بطاقات جديدة"}
                    </Button>
                  ) : null}
                </div>
              }
            />
          ) : (
            <div>
              <p className="tabular text-center text-[13px] text-muted-foreground">
                بطاقة {sessionIndex + 1} من {flashcards.length}
              </p>
              <div className="mt-3">
                <FlashcardStudy key={currentCard.id} card={currentCard} onRate={handleRate} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Flashcards;

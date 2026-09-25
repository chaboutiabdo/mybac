import { useState } from "react";
import { Layers, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import FilterPills, { SUBJECT_OPTIONS } from "@/components/FilterPills";
import FlashcardStudy from "@/components/flashcards/FlashcardStudy";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { useFlashcards, type RecallRating } from "@/hooks/useFlashcards";
import { useGenerateFlashcards } from "@/hooks/useGenerateFlashcards";
import { chapterLabel, chaptersFor, subjectLabel } from "@/lib/bac";
import { errorMessage } from "@/lib/utils";

// Radix Select can't take an empty-string item value (that's reserved for
// "no selection"), so "every chapter in this subject" needs its own sentinel
// — same pattern as NO_SCHOOL in the admin Students page.
const ALL_CHAPTERS = "all";

// The route is premium (App.tsx): every deck is private, and only premium
// students can generate one, so there is no free-student branch here.
const Flashcards = () => {
  const [subject, setSubject] = useState<string | null>(null);
  const [chapter, setChapter] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const { flashcards, loading, error, refetch, recordReview, deleteChapter } = useFlashcards({ subject, chapter });
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
    try {
      const created = await generate(subject, chapter);
      toast.success(created.length ? `تمت إضافة ${created.length} بطاقة جديدة` : "لا حاجة لبطاقات جديدة الآن");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر توليد بطاقات جديدة");
    }
  };

  // A chapter holds at most 10 of the student's cards; clearing it is how
  // they get a fresh batch built from their latest mistakes.
  const handleDeleteChapter = async () => {
    if (!subject || !chapter) return;
    if (!window.confirm(`حذف بطاقاتك في فصل ${chapterLabel(chapter)}؟\nسيُحذف معها سجل مراجعتك لها.`)) return;
    setDeleting(true);
    try {
      const n = await deleteChapter(subject, chapter);
      setSessionActive(false);
      setSessionIndex(0);
      toast.success(`حُذفت ${n} بطاقة`);
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر حذف البطاقات"));
    } finally {
      setDeleting(false);
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
      <PageHeader title="البطاقات التعليمية" subtitle="بطاقاتك وحدك، يولّدها الذكاء الاصطناعي من أخطائك ومستواك" />

      {/* grid-cols-1: the implicit auto column grows to its widest card */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
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
                  ? `ولّد بطاقات مبنية على أخطائك ومستواك في ${scopeLabel}.`
                  : "اختر مادة ثم فصلاً محدداً لتوليد بطاقاتك."
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
                  <Button variant="outline" onClick={handleGenerate} disabled={generating || deleting}>
                    <Sparkles aria-hidden />
                    {generating ? "جارٍ التوليد…" : "ولّد بطاقات جديدة"}
                  </Button>
                ) : null}
              </div>
              {canGenerate ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-muted-foreground"
                  onClick={handleDeleteChapter}
                  disabled={deleting || generating}
                >
                  <Trash2 aria-hidden />
                  {deleting ? "جارٍ الحذف…" : "احذف بطاقات هذا الفصل"}
                </Button>
              ) : null}
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

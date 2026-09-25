import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AnswerText } from "@/components/ai/AnswerText";
import { Button } from "@/components/ui/button";
import { useExplainMistake } from "@/hooks/useExplainMistake";
import { useSubscription } from "@/hooks/useSubscription";
import type { Mistake } from "@/hooks/useMistakes";
import { TONE_BG, chapterLabel, subjectLabel, subjectTone } from "@/lib/bac";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];
const ARABIC_LETTERS = ["أ", "ب", "ج", "د"];

export default function MistakeCard({
  mistake,
  onMarkReviewed,
}: {
  mistake: Mistake;
  onMarkReviewed: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const { explain, loading: explaining } = useExplainMistake();
  const { isPremium } = useSubscription();
  const navigate = useNavigate();

  const options = Array.isArray(mistake.options) ? (mistake.options as string[]) : [];

  const handleExplain = async () => {
    // /mistakes and /revision are free routes, and this was the only AI action
    // in the app with no client-side gate: a free student waited for a spinner
    // and then got the server's 403 as a toast. Same upsell as the "solve with
    // AI" button on /exams.
    if (!isPremium) {
      toast.error("شرح الأخطاء بالذكاء الاصطناعي ميزة مميّزة", {
        description: "اشترك للحصول على شرح مفصّل لكل خطأ.",
      });
      navigate("/pricing");
      return;
    }
    setExpanded(true);
    if (explanation) return;
    try {
      setExplanation(await explain(mistake.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الحصول على شرح");
    }
  };

  const handleMarkReviewed = async () => {
    setMarking(true);
    try {
      await onMarkReviewed(mistake.id);
      toast.success("تمت المراجعة");
    } catch {
      toast.error("تعذّر تسجيل المراجعة");
    } finally {
      setMarking(false);
    }
  };

  return (
    <article className={cn("rounded-card p-5 shadow-soft", TONE_BG[subjectTone(mistake.quiz_subject)])}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-card-raised/70 px-3 py-1.5 text-[13px] backdrop-blur">
          {subjectLabel(mistake.quiz_subject)}
          {mistake.quiz_chapter ? ` · ${chapterLabel(mistake.quiz_chapter)}` : ""}
        </span>
        {mistake.mistake_count > 1 ? (
          <span className="tabular rounded-full bg-destructive-light px-3 py-1.5 text-[13px] text-destructive">
            أخطأت {mistake.mistake_count} مرات
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 text-lg font-medium leading-snug">{mistake.question_text}</h3>

      {options.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-[15px]">
          {options.map((opt, i) => {
            const letter = LETTERS[i];
            const isCorrect = letter === mistake.correct_answer;
            const isChosen = letter === mistake.student_answer;
            return (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2",
                  isCorrect && "bg-success/15 text-success",
                  isChosen && !isCorrect && "bg-destructive-light text-destructive"
                )}
              >
                {/* Not colour alone: on the two screens whose whole job is
                    learning from an error, a red/green-blind student could not
                    tell the right answer from their wrong one. */}
                {isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                ) : isChosen ? (
                  <XCircle className="h-4 w-4 shrink-0" aria-hidden />
                ) : null}
                {isCorrect || isChosen ? (
                  <span className="sr-only">{isCorrect ? "الإجابة الصحيحة" : "إجابتك الخاطئة"}</span>
                ) : null}
                <span className="font-medium">{ARABIC_LETTERS[i]})</span>
                {opt}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={handleExplain} disabled={explaining}>
          {explaining ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          اشرح لي هذا الخطأ
        </Button>
        {mistake.status === "active" ? (
          <Button variant="outline" size="sm" onClick={handleMarkReviewed} disabled={marking}>
            <CheckCircle2 aria-hidden />
            فهمت، تمت المراجعة
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-4 rounded-2xl bg-card-raised p-4">
          {explaining && !explanation ? (
            <p className="text-sm text-muted-foreground">جارٍ توليد الشرح…</p>
          ) : explanation ? (
            <AnswerText content={explanation} />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

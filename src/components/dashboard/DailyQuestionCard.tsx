import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleHelp, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AnswerText } from "@/components/ai/AnswerText";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { useDailyQuestion, type DailyQuestionReason } from "@/hooks/useDailyQuestion";
import { chapterLabel, subjectLabel } from "@/lib/bac";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];
const ARABIC_LETTERS = ["أ", "ب", "ج", "د"];

/** Why this question, in the student's words. */
const REASON_TEXT: Record<DailyQuestionReason, string> = {
  repeated_mistake: "اخترناه لك لأنك أخطأت فيه من قبل — هذه فرصة لتصحيحه.",
  weak_chapter: "بناءً على أدائك الأخير، هذا الفصل يحتاج إلى تركيز أكبر.",
  new_practice: "سؤال جديد لم تجرّبه بعد، لتوسيع تغطيتك للمنهج.",
  balanced: "تدريب متوازن للحفاظ على مستواك.",
};

const DailyQuestionCard = ({ onAnswered }: { onAnswered?: () => void }) => {
  const { question, result, loading, submitting, error, submit } = useDailyQuestion();
  const [chosen, setChosen] = useState<string | null>(null);

  if (loading) return null;
  // An RPC failure is NOT the same as "no content yet" — returning null for
  // both made a network blip look like a normal, empty dashboard.
  if (error) return <ErrorState title="تعذّر تحميل سؤال اليوم" description={error} />;
  if (!question) return null;

  const answered = Boolean(question.answeredAt);
  const isCorrect = result?.isCorrect ?? question.isCorrect;
  // from this session's submit, or from the server on a later page load
  const correctAnswer = result?.correctAnswer ?? question.correctAnswer;
  const letterLabel = (letter: string | null) =>
    letter ? ARABIC_LETTERS[LETTERS.indexOf(letter)] ?? letter : null;

  const handleSubmit = async () => {
    if (!chosen) return;
    try {
      await submit(chosen);
      // the answer just became a study day and possibly a new mistake — let
      // the dashboard refresh the streak/goal that would otherwise sit stale
      onAnswered?.();
    } catch (err) {
      toast.error("تعذّر إرسال إجابتك", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <section className="rounded-card bg-tone-sage p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card-raised/70 px-3 py-1.5 text-[13px] backdrop-blur">
          <CircleHelp className="h-3.5 w-3.5" aria-hidden />
          سؤال اليوم
        </span>
        <span className="rounded-full bg-card-raised/70 px-3 py-1.5 text-[13px] backdrop-blur">
          {subjectLabel(question.subject)}
          {question.chapter ? ` · ${chapterLabel(question.chapter)}` : ""}
        </span>
      </div>

      {!answered ? (
        <p className="mt-4 text-[13px] text-foreground/70">{REASON_TEXT[question.reason]}</p>
      ) : null}

      <div className="mt-3 text-[19px] font-medium leading-snug">
        <AnswerText content={question.questionText} />
      </div>

      {answered ? (
        <div className="mt-5 space-y-3">
          <p
            className={cn(
              "flex items-center gap-2 text-[15px] font-medium",
              isCorrect ? "text-success" : "text-destructive"
            )}
          >
            {isCorrect ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <XCircle className="h-5 w-5" aria-hidden />}
            {isCorrect ? "إجابة صحيحة! أحسنت." : "إجابة خاطئة"}
          </p>

          {!isCorrect ? (
            <div className="space-y-1 text-[15px]">
              {question.studentAnswer ? (
                <p className="text-foreground/70">
                  إجابتك: <span className="font-medium">{letterLabel(question.studentAnswer)}</span>
                </p>
              ) : null}
              {correctAnswer ? (
                <p>
                  الإجابة الصحيحة: <span className="font-medium">{letterLabel(correctAnswer)}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {!isCorrect ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/mistakes">راجع أخطائي</Link>
            </Button>
          ) : null}

          <p className="text-[13px] text-foreground/70">عد غداً لسؤال جديد.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-2" role="radiogroup" aria-label="الإجابات">
            {question.options.map((option, index) => {
              const letter = LETTERS[index];
              const selected = chosen === letter;
              return (
                <button
                  key={index}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setChosen(letter)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl p-3 text-start text-[15px] shadow-soft transition-colors",
                    selected ? "bg-primary text-primary-foreground" : "bg-card-raised/70 hover:bg-card-raised"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-medium",
                      selected ? "bg-primary-foreground/15" : "bg-card"
                    )}
                  >
                    {ARABIC_LETTERS[index]}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          <Button className="mt-4" onClick={handleSubmit} disabled={!chosen || submitting}>
            {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
            تأكيد الإجابة
          </Button>
        </>
      )}
    </section>
  );
};

export default DailyQuestionCard;

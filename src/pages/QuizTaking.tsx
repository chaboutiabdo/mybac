import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState, Loading } from "@/components/ui/states";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { TONE_BG, chapterLabel, subjectLabel, subjectTone } from "@/lib/bac";
import { cn } from "@/lib/utils";

type QuizAttempt = Tables<"quiz_attempts">;
type Quiz = Tables<"quizzes">;

/**
 * A question as `quizzes_public` serves it: the answer key is stripped, so the
 * browser cannot tell right from wrong. It used to try, compare against an
 * undefined `correct`, and paint every chosen answer red. Grading happens in
 * the database on submit (`submit_quiz_attempt`), which returns the score.
 */
interface Question {
  id: string;
  question: string;
  options: string[];
}

const LETTERS = ["A", "B", "C", "D"];
const ARABIC_LETTERS = ["أ", "ب", "ج", "د"];

const QuizTaking = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId || !user) {
      navigate("/quizzes");
      return;
    }
    fetchQuizAttempt();
  }, [attemptId, user]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
    handleSubmitQuiz();
  }, [timeLeft]);

  const fetchQuizAttempt = async () => {
    if (!attemptId) return;

    try {
      const { data: attemptData, error: attemptError } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("id", attemptId)
        .eq("student_id", user!.id)
        .single();
      if (attemptError) throw attemptError;
      setAttempt(attemptData as QuizAttempt);

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes_public")
        .select("*")
        .eq("id", attemptData.quiz_id)
        .single();
      if (quizError) throw quizError;
      setQuiz(quizData as Quiz);
      const raw = Array.isArray(quizData.questions) ? (quizData.questions as unknown as Question[]) : [];
      // key answers exactly as submit_quiz_attempt reads them: the question's
      // id, or "q_<position>" when it has none
      setQuestions(raw.map((q, i) => ({ ...q, id: q.id ?? `q_${i + 1}` })));
    } catch (error) {
      console.error("Error fetching quiz:", error);
      toast.error("تعذّر تحميل الاختبار");
      navigate("/quizzes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting || !attemptId) return;

    if (attempt?.completed_at) {
      toast.error("سبق إرسال هذا الاختبار");
      return;
    }
    setIsSubmitting(true);

    try {
      // The database grades against the answer key, records completion and
      // banks the points. The browser never computes or writes the score.
      const { data, error } = await supabase.rpc("submit_quiz_attempt", {
        p_attempt_id: attemptId,
        p_answers: selectedAnswers,
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      toast.success("تم إرسال الاختبار", {
        description: `نتيجتك: ${result?.correct_count ?? 0} من ${result?.total_questions ?? 0} — ${result?.score ?? 0} نقطة`,
      });
      navigate("/quizzes");
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("تعذّر إرسال الاختبار", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  if (loading) return <Loading full />;

  if (!quiz || !questions.length) {
    return (
      <EmptyState
        title="الاختبار غير موجود أو لا يحتوي على أسئلة"
        action={<Button onClick={() => navigate("/quizzes")}>العودة إلى الاختبارات</Button>}
      />
    );
  }

  const question = questions[current];
  const chosen = selectedAnswers[question.id];
  const last = current === questions.length - 1;
  const answered = Object.keys(selectedAnswers).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => {
            if (confirm("هل تريد مغادرة الاختبار؟ ستضيع إجاباتك.")) navigate("/quizzes");
          }}
        >
          <ArrowRight aria-hidden />
          العودة إلى الاختبارات
        </Button>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "tabular flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] font-medium",
              timeLeft < 120 ? "bg-destructive-light text-destructive" : "bg-primary text-primary-foreground"
            )}
          >
            <Clock className="h-4 w-4" aria-hidden />
            {formatTime(timeLeft)}
          </span>
          <span className="tabular rounded-full bg-card px-3 py-1.5 text-[15px] shadow-soft">
            {current + 1} من {questions.length}
          </span>
        </div>
      </div>

      <section className={cn("rounded-card p-6 shadow-soft", TONE_BG[subjectTone(quiz.subject)])}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-card-raised/70 px-3 py-1.5 text-[13px] backdrop-blur">
            {subjectLabel(quiz.subject)} · {quiz.chapter ? chapterLabel(quiz.chapter) : "مراجعة عامة"}
          </span>
          <span className="tabular text-[13px] text-foreground/70">
            أجبت عن {answered} من {questions.length}
          </span>
        </div>
        {/* how much is ANSWERED, matching the label directly above it — not the
            cursor position, which sits in the header chip. Those disagreed:
            opening a quiz showed an untouched question under a bar that was
            already part-filled, and a one-question quiz showed 100%. */}
        <Progress value={(answered / questions.length) * 100} className="mt-4 h-2 bg-card-raised/60" />
        <p className="mt-6 text-[13px] text-foreground/70">السؤال {current + 1}</p>
        <h1 className="mt-1 text-[24px] font-medium leading-snug">{question.question}</h1>
      </section>

      <div className="space-y-3" role="radiogroup" aria-label="الإجابات">
        {question.options.map((option, index) => {
          const letter = LETTERS[index];
          const selected = chosen === letter;
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSelectedAnswers((prev) => ({ ...prev, [question.id]: letter }))}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl p-4 text-start text-lg shadow-soft transition-colors",
                selected ? "bg-primary text-primary-foreground" : "bg-card-raised hover:bg-card"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-medium",
                  selected ? "bg-primary-foreground/15" : "bg-muted"
                )}
              >
                {ARABIC_LETTERS[index]}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setCurrent((i) => i - 1)} disabled={current === 0}>
          السابق
        </Button>
        {last ? (
          <Button onClick={handleSubmitQuiz} disabled={isSubmitting || !chosen} className="min-w-[140px]">
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <CheckCircle2 aria-hidden />
                إرسال الاختبار
              </>
            )}
          </Button>
        ) : (
          <Button onClick={() => setCurrent((i) => i + 1)} disabled={!chosen}>
            التالي
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizTaking;

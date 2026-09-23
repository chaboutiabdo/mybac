import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState, Loading } from "@/components/ui/states";
import { useChapterMastery } from "@/hooks/useChapterMastery";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { TONE_BG, chapterLabel, subjectLabel, subjectTone } from "@/lib/bac";
import { cn } from "@/lib/utils";

type Session = Tables<"exam_simulation_sessions">;
type Quiz = Tables<"quizzes">;

/** A question as `quizzes_public` serves it: the answer key is stripped, grading
 * happens server-side. Same shape QuizTaking.tsx uses. */
interface Question {
  id: string;
  question: string;
  options: string[];
}

interface Result {
  score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
}

const LETTERS = ["A", "B", "C", "D"];
const ARABIC_LETTERS = ["أ", "ب", "ج", "د"];

const answersKey = (quizId: string) => `exam-sim:${quizId}:answers`;

const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Mounted only after grading actually returns a result -- useChapterMastery()
 * fetches once on mount with no refetch, so hoisting it to the parent would
 * render the pre-exam mastery snapshot instead of this attempt's real one. */
const SimulatorMastery = () => {
  const { weakChapters, strongChapters, loading } = useChapterMastery();
  if (loading) return null;

  // Single app-wide definition (useChapterMastery), not a positional slice:
  // ranking condemned the better of two chapters even at 92%.
  const weak = weakChapters.slice(0, 3);
  const strong = strongChapters.slice(0, 3);
  if (weak.length === 0 && strong.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section>
        <h3 className="text-[15px] font-medium">نقاط القوة</h3>
        <div className="mt-3 space-y-2">
          {strong.map((c) => (
            <div key={`${c.subject}:${c.chapter}`} className="flex items-center justify-between rounded-2xl bg-success/10 px-4 py-2.5 text-[14px]">
              <span className="min-w-0 truncate">{subjectLabel(c.subject)} · {c.label}</span>
              <span dir="ltr" className="tabular shrink-0 font-semibold text-success">{c.masteryPct}%</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-[15px] font-medium">تحتاج إلى مراجعة</h3>
        <div className="mt-3 space-y-2">
          {weak.map((c) => (
            <div key={`${c.subject}:${c.chapter}`} className="flex items-center justify-between rounded-2xl bg-destructive-light px-4 py-2.5 text-[14px]">
              <span className="min-w-0 truncate">{subjectLabel(c.subject)} · {c.label}</span>
              <span dir="ltr" className="tabular shrink-0 font-semibold text-destructive">{c.masteryPct}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const ExamSimulatorTaking = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [answeredAtSubmit, setAnsweredAtSubmit] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!quizId || !user) {
      navigate("/exam-simulator");
      return;
    }

    (async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.rpc("start_exam_simulation", {
          p_quiz_id: quizId,
        });
        if (sessionError) throw sessionError;
        setSession(sessionData as Session);

        const { data: quizData, error: quizError } = await supabase
          .from("quizzes_public")
          .select("*")
          .eq("id", quizId)
          .single();
        if (quizError) throw quizError;
        setQuiz(quizData as Quiz);

        const raw = Array.isArray(quizData.questions) ? (quizData.questions as unknown as Question[]) : [];
        // key answers exactly as submit_quiz_attempt reads them
        setQuestions(raw.map((q, i) => ({ ...q, id: q.id ?? `q_${i + 1}` })));

        try {
          const saved = localStorage.getItem(answersKey(quizId));
          if (saved) setSelectedAnswers(JSON.parse(saved));
        } catch {
          // localStorage unavailable or corrupted -- start with empty answers
        }
      } catch (error) {
        console.error("Error starting simulator session:", error);
        toast.error("تعذّر بدء المحاكاة", {
          description: error instanceof Error ? error.message : undefined,
        });
        navigate("/exam-simulator");
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId, user, navigate]);

  // Persist answers as the student picks them -- never a trust boundary
  // (grading is 100% server-side), just cheap resume-after-refresh cover.
  useEffect(() => {
    if (!quizId || loading) return;
    try {
      localStorage.setItem(answersKey(quizId), JSON.stringify(selectedAnswers));
    } catch {
      // storage full/unavailable -- answers just won't survive a refresh
    }
  }, [quizId, selectedAnswers, loading]);

  const handleSubmit = async () => {
    if (submittedRef.current || !session) return;
    submittedRef.current = true;
    setSubmitting(true);

    const answeredCount = Object.keys(selectedAnswers).length;
    const elapsed = Math.max(0, Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000));

    try {
      const { data, error } = await supabase.rpc("submit_exam_simulation", {
        p_session_id: session.id,
        p_answers: selectedAnswers,
      });
      if (error) throw error;

      const parsed = (Array.isArray(data) ? data[0] : data) as Result;
      setResult(parsed);
      setAnsweredAtSubmit(answeredCount);
      setElapsedSeconds(elapsed);
      try {
        localStorage.removeItem(answersKey(quizId!));
      } catch {
        // best-effort cleanup only
      }
    } catch (error) {
      console.error("Error submitting simulation:", error);
      toast.error("تعذّر إرسال المحاكاة", {
        description: error instanceof Error ? error.message : undefined,
      });
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  // Countdown recomputed from the server-set deadline every tick -- never a
  // local decrement, so a throttled/backgrounded tab can't drift the display.
  useEffect(() => {
    if (!session || result) return;
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(session.expires_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) handleSubmit();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, result]);

  if (loading) return <Loading full />;

  if (!quiz || !questions.length || !session) {
    return (
      <EmptyState
        title="تعذّر تحميل هذه المحاكاة"
        action={<Button onClick={() => navigate("/exam-simulator")}>العودة إلى المحاكي</Button>}
      />
    );
  }

  if (result) {
    const wrong = Math.max(0, answeredAtSubmit - result.correct_count);
    const skipped = Math.max(0, result.total_questions - answeredAtSubmit);
    const stats = [
      { label: "صحيحة", value: result.correct_count, tone: "text-success" },
      { label: "خاطئة", value: wrong, tone: "text-destructive" },
      { label: "متروكة", value: skipped, tone: "text-muted-foreground" },
    ];

    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <section className={cn("rounded-card p-6 text-center shadow-soft", TONE_BG[subjectTone(quiz.subject)])}>
          <p className="text-[15px] text-foreground/70">نتيجتك</p>
          <p className="mt-2 text-[40px] font-semibold leading-none">
            <span dir="ltr" className="tabular">{result.score}</span> من{" "}
            <span dir="ltr" className="tabular">{result.max_score}</span>
          </p>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-foreground/70">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            <span dir="ltr" className="tabular">{formatClock(elapsedSeconds)}</span>
          </p>
        </section>

        <section className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-card p-4 text-center shadow-soft">
              <p className={cn("tabular text-[28px] font-semibold", s.tone)}>{s.value}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </section>

        <SimulatorMastery />

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => navigate("/exam-simulator")}>
            <RotateCcw aria-hidden />
            محاكاة أخرى
          </Button>
          <Button onClick={() => navigate("/mistakes")}>راجع نقاط ضعفي</Button>
        </div>
      </div>
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
            if (confirm("هل تريد مغادرة المحاكاة؟ يبقى وقتك يعمل حتى تعود.")) navigate("/exam-simulator");
          }}
        >
          <ArrowRight aria-hidden />
          العودة
        </Button>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "tabular flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] font-medium",
              secondsLeft < 120 ? "bg-destructive-light text-destructive" : "bg-primary text-primary-foreground"
            )}
          >
            <Clock className="h-4 w-4" aria-hidden />
            <span dir="ltr">{formatClock(secondsLeft)}</span>
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
        {/* answered, not cursor position — see the same note in QuizTaking */}
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

      {/* Unlike QuizTaking.tsx, neither button requires an answer first: a real
          exam lets you leave a question blank and move on, and the results
          screen's "skipped" count only means something if that's possible. */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setCurrent((i) => i - 1)} disabled={current === 0}>
          السابق
        </Button>
        {last ? (
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-[140px]">
            {submitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <CheckCircle2 aria-hidden />
                إرسال الاختبار
              </>
            )}
          </Button>
        ) : (
          <Button onClick={() => setCurrent((i) => i + 1)}>التالي</Button>
        )}
      </div>
    </div>
  );
};

export default ExamSimulatorTaking;

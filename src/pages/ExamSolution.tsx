import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, FileText, Lightbulb, Loader2, MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AnswerText } from "@/components/ai/AnswerText";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useExamSolution } from "@/hooks/useExamSolution";
import { supabase } from "@/integrations/supabase/client";
import { invokeAI, PENDING_ANSWER } from "@/lib/ai";
import { TONE_BG, streamLabel, subjectLabel, subjectTone } from "@/lib/bac";
import { openStoredFile } from "@/lib/files";
import { cn, errorMessage } from "@/lib/utils";

type HelpTurn = { question: string; answer: string };

/** Which solved question a help turn belongs to. Keep in step with gemini-chat's exam_help. */
const refOf = (index: number, questionNumber: string) => `${index}|${questionNumber}`;

/**
 * "Ask the AI about this question": the student's own questions on one solved
 * question, answered with its steps as context and saved for them alone. The
 * same question asked again comes back from their saved answers, free.
 */
function QuestionHelp({
  examId,
  index,
  questionNumber,
  saved,
  onAnswered,
}: {
  examId: string;
  index: number;
  questionNumber: string;
  saved: HelpTurn[];
  onAnswered: (turn: HelpTurn, cached: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);

  const ask = async () => {
    const q = draft.trim();
    if (!q || asking) return;
    setAsking(true);
    try {
      const res = await invokeAI<{ answer?: string; cached?: boolean }>({
        mode: "exam_help",
        exam_id: examId,
        question_index: index,
        question_number: questionNumber,
        question: q,
      });
      if (!res?.answer) throw new Error("تعذّر توليد إجابة، جرّب صياغة أخرى.");
      onAnswered({ question: q, answer: res.answer }, Boolean(res.cached));
      setDraft("");
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر الحصول على الإجابة، حاول مرة أخرى."));
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="rounded-card bg-card p-5 shadow-soft">
      <h3 className="flex items-center gap-1.5 text-[15px] font-medium">
        <MessageCircleQuestion className="h-4 w-4" aria-hidden />
        اسأل عن هذا السؤال
      </h3>
      <p className="mt-1 text-[13px] text-muted-foreground">أسئلتك وإجاباتها محفوظة لك وحدك.</p>

      {saved.length > 0 && (
        <div className="mt-4 space-y-4">
          {saved.map((turn, i) => (
            <div key={i} className="space-y-2">
              <p className="whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-base text-primary-foreground">
                {turn.question}
              </p>
              <div className="rounded-2xl bg-card-raised px-4 py-3">
                <AnswerText content={turn.answer} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          placeholder="مثلاً: لماذا ضربنا في 2 في الخطوة 3؟"
          aria-label="سؤالك عن هذا السؤال"
          disabled={asking}
          className="min-h-[56px] flex-1 resize-none text-base"
        />
        <Button onClick={ask} disabled={!draft.trim() || asking} aria-label="أرسل" className="h-auto w-12 rounded-2xl">
          {asking ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </section>
  );
}

const ExamSolution = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackExamActivity } = useActivityTracking();
  const { data, loading, error, refetch } = useExamSolution(examId);
  const [current, setCurrent] = useState(0);
  const trackedRef = useRef(false);
  const [help, setHelp] = useState<Record<string, HelpTurn[]>>({});

  // This student's saved questions on this paper, grouped by solved question.
  // The explicit user filter matters: an admin's RLS reaches everyone's rows.
  useEffect(() => {
    if (!data || !user) return;
    let cancelled = false;
    supabase
      .from("ai_learning_conversations")
      .select("question_text, answer_text, question_ref")
      .eq("user_id", user.id)
      .eq("mode", "exam_help")
      .eq("exam_id", data.exam.id)
      .neq("answer_text", PENDING_ANSWER)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data: rows, error: helpError }) => {
        if (cancelled) return;
        if (helpError) console.error("Error loading saved questions:", helpError);
        const grouped: Record<string, HelpTurn[]> = {};
        for (const r of rows ?? []) {
          if (!r.question_ref || !r.question_text || !r.answer_text) continue;
          (grouped[r.question_ref] ??= []).push({ question: r.question_text, answer: r.answer_text });
        }
        setHelp(grouped);
      });
    return () => {
      cancelled = true;
    };
  }, [data, user]);

  // Credit the student only once a real solution actually rendered — NOT on the
  // click back in Exams.tsx. /exams is free-tier, so firing there would mark a
  // free student who then gets bounced to /pricing as having solved the exam,
  // and bank them the 10 points handle_exam_points awards. Every field comes
  // from the edge function's response, so there is no second `exams` query.
  useEffect(() => {
    if (!data || !user || trackedRef.current) return;
    trackedRef.current = true;
    const e = data.exam;
    trackExamActivity(e.id, "started_solving", e.title, e.subject, e.year, e.stream);
    supabase
      .from("exam_progress")
      .upsert({ student_id: user.id, exam_id: e.id, solved_with_ai: true }, { onConflict: "student_id,exam_id" })
      .then(({ error: upsertError }) => {
        if (upsertError) console.error("Error marking exam solved with AI:", upsertError);
      });
  }, [data, user, trackExamActivity]);

  const backButton = (
    <Button variant="ghost" onClick={() => navigate("/exams")}>
      <ArrowRight aria-hidden />
      العودة إلى المواضيع
    </Button>
  );

  // First generation reads a whole PDF and, when Google is busy, can take two
  // minutes of retries — an unlabelled spinner here reads as a hang.
  if (loading) return <Loading full label="جارٍ تحليل الموضوع… قد يستغرق هذا دقيقتين" />;

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        {backButton}
        <ErrorState title="تعذّر توليد الحل" description={error} onRetry={refetch} />
      </div>
    );
  }

  if (!data || data.solution.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        {backButton}
        <EmptyState icon={FileText} title="لا يوجد حل لعرضه لهذا الموضوع" />
      </div>
    );
  }

  const { exam, solution, source } = data;
  const question = solution[current];
  const last = current === solution.length - 1;
  const grounded = source === "solution_grounded";
  const ref = refOf(current, question.question_number);

  const openPaper = (path: string) =>
    openStoredFile(path).catch((err) => {
      console.error("Error opening the paper:", err);
      toast.error("تعذّر فتح الملف، حاول مرة أخرى");
    });

  const addHelp = (turn: HelpTurn, cached: boolean) => {
    if (cached) toast.info("سبق أن سألت هذا — هذه إجابتك المحفوظة");
    setHelp((prev) => {
      const list = prev[ref] ?? [];
      // a cached answer is usually already on screen
      if (cached && list.some((t) => t.answer === turn.answer)) return prev;
      return { ...prev, [ref]: [...list, turn] };
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`${subjectLabel(exam.subject)} ${exam.year}`}
        subtitle={streamLabel(exam.stream)}
      >
        {backButton}
      </PageHeader>

      {/* Always visible, never a footnote: the spec requires this to be clearly
          distinguishable from the official solution. The derived case gets the
          destructive tone on purpose — the model solved it unaided there. */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl px-4 py-3 text-[13px]",
          grounded ? "bg-card-raised text-foreground/80" : "bg-destructive-light text-destructive"
        )}
      >
        {grounded ? (
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <p>
          {grounded
            ? "شرح بالذكاء الاصطناعي، مبني على الحل الرسمي لهذا الموضوع. ليس الحل الرسمي نفسه — يمكنك فتحه من صفحة المواضيع."
            : "شرح بالذكاء الاصطناعي، استنتجه النموذج من الموضوع نفسه لأن الحل الرسمي غير متوفر. قد يحتوي على أخطاء — راجعه مع أستاذك."}
        </p>
      </div>

      <section className={cn("rounded-card p-6 shadow-soft", TONE_BG[subjectTone(exam.subject)])}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-card-raised/70 px-3 py-1.5 text-[13px] backdrop-blur">
            {question.question_number}
          </span>
          <span className="tabular text-[13px] text-foreground/70">
            {current + 1} من {solution.length}
          </span>
        </div>
        <h2 className="mt-4 text-[22px] font-medium leading-snug">
          <AnswerText content={question.title} />
        </h2>
      </section>

      {/* The solution was written from the official corrigé, which doesn't
          restate the question; extract_questions copies it from the paper. */}
      {question.question_text || exam.exam_url ? (
        <section className="rounded-card bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[15px] font-medium">نص السؤال</h3>
            {exam.exam_url ? (
              <Button variant="secondary" size="sm" onClick={() => openPaper(exam.exam_url as string)}>
                <FileText aria-hidden />
                افتح ورقة الموضوع
              </Button>
            ) : null}
          </div>
          {question.question_text ? (
            <>
              <div className="mt-3">
                <AnswerText content={question.question_text} />
              </div>
              {question.exercise_text ? (
                <details className="mt-3 rounded-2xl bg-card-raised px-4 py-3">
                  <summary className="cursor-pointer text-[15px] font-medium">نص التمرين كاملاً</summary>
                  <div className="mt-2">
                    <AnswerText content={question.exercise_text} />
                  </div>
                </details>
              ) : null}
              <p className="mt-3 text-[13px] text-muted-foreground">
                منقول آلياً من ورقة الموضوع — الأشكال والجداول في الورقة الأصلية.
              </p>
            </>
          ) : (
            <p className="mt-2 text-[15px] text-muted-foreground">نص هذا السؤال غير متوفر بعد — افتح ورقة الموضوع.</p>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-[15px] font-medium">الحل خطوة بخطوة</h3>
        {question.steps.map((step, i) => (
          <article key={i} className="flex gap-3 rounded-2xl bg-card p-4 shadow-soft">
            <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-medium text-primary-foreground">
              {step.step ?? i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <AnswerText content={step.explanation} />
              {step.formula ? (
                <div className="mt-2 rounded-xl bg-card-raised p-3">
                  <AnswerText content={step.formula} />
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-card bg-success/10 p-5 shadow-soft">
        <h3 className="text-[13px] font-medium text-success">النتيجة النهائية</h3>
        <div className="mt-2 text-lg font-medium">
          <AnswerText content={question.final_answer} />
        </div>
      </section>

      <section className="rounded-card bg-card p-5 shadow-soft">
        <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden />
          الفكرة الأساسية
        </h3>
        <div className="mt-2">
          <AnswerText content={question.key_concept} />
        </div>
      </section>

      {question.common_mistake ? (
        <section className="rounded-card bg-destructive-light p-5 shadow-soft">
          <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            خطأ شائع
          </h3>
          <div className="mt-2">
            <AnswerText content={question.common_mistake} />
          </div>
        </section>
      ) : null}

      {question.memory_tip ? (
        <section className="rounded-card bg-tone-mint p-5 shadow-soft">
          <h3 className="text-[13px] font-medium">تذكّر هذا</h3>
          <div className="mt-2">
            <AnswerText content={question.memory_tip} />
          </div>
        </section>
      ) : null}

      <QuestionHelp
        key={ref}
        examId={exam.id}
        index={current}
        questionNumber={question.question_number}
        saved={help[ref] ?? []}
        onAnswered={addHelp}
      />

      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setCurrent((i) => i - 1)} disabled={current === 0}>
          السابق
        </Button>
        <Button onClick={() => setCurrent((i) => i + 1)} disabled={last}>
          التالي
        </Button>
      </div>
    </div>
  );
};

export default ExamSolution;

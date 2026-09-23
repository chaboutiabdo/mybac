import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, FileText, Lightbulb, Sparkles } from "lucide-react";

import { AnswerText } from "@/components/ai/AnswerText";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useExamSolution } from "@/hooks/useExamSolution";
import { supabase } from "@/integrations/supabase/client";
import { TONE_BG, streamLabel, subjectLabel, subjectTone } from "@/lib/bac";
import { cn } from "@/lib/utils";

const ExamSolution = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackExamActivity } = useActivityTracking();
  const { data, loading, error, refetch } = useExamSolution(examId);
  const [current, setCurrent] = useState(0);
  const trackedRef = useRef(false);

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

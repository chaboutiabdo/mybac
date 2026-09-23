import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Timer } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState, Loading } from "@/components/ui/states";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { TONE_BG, chapterLabel, subjectLabel, subjectTone } from "@/lib/bac";
import { cn } from "@/lib/utils";

type Quiz = Tables<"quizzes">;

// Same guard as Quizzes.tsx: `questions` is a nullable jsonb column.
const questionCount = (questions: Quiz["questions"]): number =>
  Array.isArray(questions) ? questions.length : 0;

// Mirrors start_exam_simulation's own duration formula exactly, so the card
// shown here matches the real countdown the student is about to commit to.
const estimatedMinutes = (count: number) => Math.max(15, Math.min(120, count * 3));

const ExamSimulator = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // quizzes_public strips the answer key; grading happens server-side
    supabase
      .from("quizzes_public")
      .select("*")
      .eq("type", "practice")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching simulator quizzes:", error);
          toast.error("تعذّر تحميل قائمة المحاكاة");
        }
        const withQuestions = ((data ?? []) as Quiz[]).filter((q) => questionCount(q.questions) > 0);
        setQuizzes(withQuestions);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader title="محاكي البكالوريا" subtitle="اختبر نفسك بوقت محدد، كأنه يوم الامتحان الحقيقي" />

      {loading ? (
        <Loading />
      ) : quizzes.length === 0 ? (
        <EmptyState icon={Timer} title="لا توجد اختبارات تدريبية متاحة للمحاكاة بعد" />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {quizzes.map((quiz, i) => {
            const count = questionCount(quiz.questions);
            return (
              <article
                key={quiz.id}
                className={cn(
                  "flex flex-col rounded-card p-5 shadow-soft",
                  TONE_BG[subjectTone(quiz.subject)],
                  quizzes.length % 2 === 1 && i === quizzes.length - 1 && "md:col-span-2"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-card-raised/70 px-3 py-1.5 text-[13px] backdrop-blur">
                    {subjectLabel(quiz.subject)}
                  </span>
                  <span className="tabular flex items-center gap-1.5 rounded-full bg-card-raised/70 px-3 py-1.5 text-[13px] backdrop-blur">
                    <Timer className="h-3.5 w-3.5" aria-hidden />
                    {estimatedMinutes(count)} دقيقة
                  </span>
                </div>
                <h3 className="mt-8 text-[22px] font-medium leading-snug">
                  {quiz.chapter ? chapterLabel(quiz.chapter) : "مراجعة عامة"}
                </h3>
                <p className="tabular mt-1 text-[15px] text-foreground/70">{count} أسئلة</p>
                <Button className="mt-5 self-start" onClick={() => navigate(`/exam-simulator/${quiz.id}`)}>
                  ابدأ المحاكاة
                  <ArrowLeft aria-hidden />
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExamSimulator;

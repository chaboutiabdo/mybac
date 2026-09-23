import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookX, CircleHelp, Flame, Target, Trophy, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import DailyQuizCard from "@/components/dashboard/DailyQuizCard";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState, Loading } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useQuizStats } from "@/hooks/useQuizStats";
import { useStudyStreak } from "@/hooks/useStudyStreak";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { TONE_BG, chapterLabel, subjectLabel, subjectTone } from "@/lib/bac";
import { cn } from "@/lib/utils";

type Quiz = Tables<"quizzes">;

// `questions` is a jsonb column: typed Json, and nullable. Dereferencing
// .length directly crashed the whole quiz list on a quiz with no questions.
const questionCount = (questions: Quiz["questions"]): number =>
  Array.isArray(questions) ? questions.length : 0;

/** Points per correct answer, as the server awards them (record_points_transaction). */
const POINTS = { daily: 25, practice: 8 } as const;

const QuizGrid = ({ quizzes, onStart }: { quizzes: Quiz[]; onStart: (quiz: Quiz) => void }) => (
  <div className="grid gap-5 md:grid-cols-2">
    {quizzes.map((quiz, i) => {
      const daily = quiz.type === "daily";
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
            <span
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px]",
                daily ? "bg-primary text-primary-foreground" : "bg-card-raised/70 backdrop-blur"
              )}
            >
              {daily ? "يومي" : "تدريب"}
            </span>
          </div>
          <h3 className="mt-8 text-[22px] font-medium leading-snug">
            {quiz.chapter ? chapterLabel(quiz.chapter) : "مراجعة عامة"}
          </h3>
          <p className="tabular mt-1 text-[15px] text-foreground/70">
            {questionCount(quiz.questions)} أسئلة · {POINTS[daily ? "daily" : "practice"]} نقطة لكل إجابة صحيحة
          </p>
          <Button className="mt-5 self-start" onClick={() => onStart(quiz)}>
            ابدأ الاختبار
            <ArrowLeft aria-hidden />
          </Button>
        </article>
      );
    })}
  </div>
);

const Quizzes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [practiceQuizzes, setPracticeQuizzes] = useState<Quiz[]>([]);
  const [dailyQuizzes, setDailyQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const quizStats = useQuizStats();
  const { currentStreak } = useStudyStreak();

  useEffect(() => {
    // quizzes_public strips the answer key; grading happens server-side
    supabase
      .from("quizzes_public")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching quizzes:", error);
          toast.error("تعذّر تحميل الاختبارات");
        }
        const quizzes = (data ?? []) as Quiz[];
        setPracticeQuizzes(quizzes.filter((q) => q.type === "practice"));
        setDailyQuizzes(quizzes.filter((q) => q.type === "daily"));
        setLoading(false);
      });
  }, []);

  const startQuiz = async (quiz: Quiz) => {
    if (!user) {
      toast.error("سجّل الدخول لبدء الاختبارات");
      return;
    }

    try {
      // Every source, because attempt_number must not collide with a daily
      // question's attempt on the same quiz (quiz_attempts_unique_attempt).
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("answers, attempt_number, source")
        .eq("quiz_id", quiz.id)
        .eq("student_id", user.id)
        .order("attempt_number", { ascending: false });

      // ...but only a REAL prior attempt makes this a retake. A daily question
      // drawn from this quiz left a one-answer attempt behind, and counting it
      // told students their first ever go at a quiz was a no-points retry.
      const priorRealAttempt = attempts?.some(
        (a) => a.source === "quiz" && a.answers && Object.keys(a.answers).length > 0
      );
      if (priorRealAttempt) {
        toast("إعادة المحاولة", { description: "يمكنك إعادة هذا الاختبار للتدريب، دون احتساب نقاط إضافية." });
      }

      const { data: attempt, error } = await supabase
        .from("quiz_attempts")
        .insert({
          student_id: user.id,
          quiz_id: quiz.id,
          score: 0,
          answers: {},
          attempt_number: (attempts?.[0]?.attempt_number ?? 0) + 1,
        })
        .select()
        .single();

      if (error) throw error;
      navigate(`/quiz/${attempt.id}`);
    } catch (error) {
      console.error("Error starting quiz:", error);
      toast.error("تعذّر بدء الاختبار");
    }
  };

  const weekly = [
    { label: "اختبارات مكتملة", value: String(quizStats.completedQuizzes), icon: Target, tone: "bg-tone-mint" },
    { label: "متوسط النتيجة", value: `${Math.round(quizStats.averageScore)}%`, icon: TrendingUp, tone: "bg-tone-lav" },
    { label: "مجموع النقاط", value: `+${quizStats.pointsEarned}`, icon: Trophy, tone: "bg-tone-peach" },
    { label: "أيام متتالية", value: String(currentStreak), icon: Flame, tone: "bg-tone-pink" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="مركز الاختبارات" subtitle="اختبار يومي مصحّح فوراً، واختبارات تدريبية حسب الفصول">
        <Button variant="outline" asChild>
          <Link to="/mistakes">
            <BookX aria-hidden />
            أخطائي
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <DailyQuizCard
          stats={quizStats}
          action={
            <Button
              size="lg"
              className="w-full"
              disabled={dailyQuizzes.length === 0}
              onClick={() => dailyQuizzes[0] && startQuiz(dailyQuizzes[0])}
            >
              ابدأ اختبار اليوم
              <ArrowLeft aria-hidden />
            </Button>
          }
        />

        <section className="rounded-card bg-card p-5 shadow-soft">
          {/* these are all-time figures from useQuizStats; the genuinely
              weekly ones live on /weekly-report */}
          <h2 className="text-lg font-medium">أداؤك الإجمالي</h2>
          {quizStats.loading ? (
            <Loading />
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {weekly.map((w) => (
                <div key={w.label} className="flex items-center gap-3 rounded-2xl bg-card-raised p-4">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", w.tone)}>
                    <w.icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                  </span>
                  <div>
                    {/* ltr, or "+25" and "50%" come out as "25+" and "%50" in RTL */}
                    <p dir="ltr" className="tabular text-end text-[22px] font-semibold leading-none">{w.value}</p>
                    <p className="mt-1.5 text-[13px] leading-none text-muted-foreground">{w.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="daily">الاختبارات اليومية</TabsTrigger>
          <TabsTrigger value="practice">اختبارات تدريبية</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-5">
          {loading ? (
            <Loading />
          ) : dailyQuizzes.length === 0 ? (
            <EmptyState icon={CircleHelp} title="لا يوجد اختبار يومي بعد" description="يُنشر اختبار جديد كل يوم." />
          ) : (
            <QuizGrid quizzes={dailyQuizzes} onStart={startQuiz} />
          )}
        </TabsContent>

        <TabsContent value="practice" className="mt-5">
          {loading ? (
            <Loading />
          ) : practiceQuizzes.length === 0 ? (
            <EmptyState icon={CircleHelp} title="لا توجد اختبارات تدريبية بعد" />
          ) : (
            <QuizGrid quizzes={practiceQuizzes} onStart={startQuiz} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Quizzes;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, FileText, Play } from "lucide-react";

import AdminAdvice from "@/components/AdminAdvice";
import AdviceTips from "@/components/dashboard/AdviceTips";
import BacCountdown from "@/components/dashboard/BacCountdown";
import DailyQuestionCard from "@/components/dashboard/DailyQuestionCard";
import DailyQuizCard from "@/components/dashboard/DailyQuizCard";
import Leaderboard from "@/components/dashboard/Leaderboard";
import ProfileCard from "@/components/dashboard/ProfileCard";
import StreakCard from "@/components/dashboard/StreakCard";
import FilterPills, { STREAM_OPTIONS } from "@/components/FilterPills";
import WeeklyActivity from "@/components/dashboard/WeeklyActivity";
import { EmptyState } from "@/components/ui/states";
import { useQuizStats } from "@/hooks/useQuizStats";
import { useStudyStreak } from "@/hooks/useStudyStreak";
import { useTodaysRevision } from "@/hooks/useTodaysRevision";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  MATH_CHAPTERS,
  PHYSICS_CHAPTERS,
  TONE_BG,
  chapterLabel,
  difficultyLabel,
  streamLabel,
  subjectLabel,
  subjectTone,
} from "@/lib/bac";
import { cn } from "@/lib/utils";

/**
 * The owner's mockup (THE SMART Dashboard.html), on real data:
 *
 *   main                                   | profile column
 *   hero + countdown chip                  | profile card
 *   stream pills → latest papers (2×2)     | streak + goal
 *   featured lesson                        | my subjects
 *   admin message · daily quiz | top five  | tips
 *
 * The mockup's star ratings, "N students solved it" and friends have no data
 * behind them, so they are not shown. Practice modes (quizzes, simulator,
 * flashcards, mistakes) and progress detail (mastery breakdown, weekly
 * activity, weekly report) moved to /practice and /profile — seeing them all
 * stacked here was the original complaint.
 */

type Paper = Pick<
  Tables<"exams">,
  "id" | "title" | "subject" | "stream" | "year" | "difficulty" | "solution_url" | "questions"
>;

const PaperCard = ({ paper, wide }: { paper: Paper; wide: boolean }) => (
  <article
    className={cn(
      "flex flex-col rounded-card p-5 shadow-soft",
      TONE_BG[subjectTone(paper.subject)],
      // an odd last card spans the row, so no row is left half empty
      wide && "sm:col-span-2"
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="rounded-full bg-card-raised/70 px-3 py-1.5 text-[13px] backdrop-blur">
        {streamLabel(paper.stream)}
      </span>
      {paper.difficulty && (
        <span className="rounded-full bg-card-raised/70 px-2.5 py-1.5 text-[13px] backdrop-blur">
          {difficultyLabel(paper.difficulty)}
        </span>
      )}
    </div>

    <h3 className="mt-10 text-[22px] font-medium leading-[1.35]">
      {subjectLabel(paper.subject)} <span className="tabular font-normal">{paper.year}</span>
      <br />
      {/* the title repeats subject and year, so the second line says what's inside */}
      <span className="text-foreground/75">{paper.solution_url ? "الموضوع مع الحل الرسمي" : "الموضوع الرسمي"}</span>
    </h3>

    <div className="mt-4 flex items-center justify-between">
      <p className="text-[13px] text-foreground/70">
        {paper.questions ? <span className="tabular">{paper.questions} تمارين</span> : "بكالوريا جزائرية"}
      </p>
      <Link
        to="/exams"
        aria-label={`افتح ${paper.title}`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.4} aria-hidden />
      </Link>
    </div>
  </article>
);

const FeaturedLesson = () => {
  const [video, setVideo] = useState<Pick<Tables<"videos">, "title" | "chapter" | "duration"> | null>(null);

  useEffect(() => {
    supabase
      .from("videos")
      .select("title, chapter, duration")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setVideo(data));
  }, []);

  if (!video) return null;
  const minutes = video.duration ? Math.floor(video.duration / 60) : null;

  return (
    <section>
      <h2 className="text-[15px] font-medium">الدرس المميز</h2>
      <Link
        to="/videos"
        className="mt-4 flex items-center justify-between gap-5 rounded-card bg-tone-peach p-5 shadow-soft transition-colors hover:bg-tone-peach-strong"
      >
        <span className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-card-raised/70 backdrop-blur">
            <Play className="h-5 w-5" fill="currentColor" strokeWidth={0} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="inline-flex rounded-full bg-card-raised/70 px-2.5 py-1 text-[13px]">
              فيديو{video.chapter ? ` — ${chapterLabel(video.chapter)}` : ""}
            </span>
            <span className="mt-1.5 block truncate text-[19px] font-medium">{video.title}</span>
          </span>
        </span>
        {minutes !== null && video.duration !== null && (
          <span className="hidden shrink-0 text-center sm:block">
            <span className="block text-[13px] text-foreground/70">المدة</span>
            <span className="tabular block text-[20px] font-semibold">
              {minutes}:{String(video.duration % 60).padStart(2, "0")}
            </span>
          </span>
        )}
      </Link>
    </section>
  );
};

const MySubjects = () => {
  const subjects = [
    { value: "Math", chapters: MATH_CHAPTERS.length },
    { value: "Physics", chapters: PHYSICS_CHAPTERS.length },
  ];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-medium">موادّي</h2>
        <Link to="/videos" className="text-[13px] text-muted-foreground hover:text-foreground">
          الكل
        </Link>
      </div>
      <div className="space-y-3">
        {subjects.map((s) => (
          <Link
            key={s.value}
            to="/videos"
            className={cn("block rounded-[22px] p-4 shadow-soft", TONE_BG[subjectTone(s.value)])}
          >
            <span className="inline-flex rounded-full bg-card-raised/70 px-2.5 py-1 text-[13px] backdrop-blur">
              {subjectLabel(s.value)}
            </span>
            <span className="mt-5 block text-base font-medium leading-snug">
              <span className="tabular">{s.chapters}</span> فصول بترتيب المنهاج الرسمي
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const quizStats = useQuizStats();
  // Hoisted, not called inside each widget: with no query cache in this app,
  // StreakCard calling these itself meant four duplicate round-trips per load
  // (and get_chapter_mastery fired three times). Passed down as props instead.
  const studyStats = useStudyStreak();
  // Only its queue length is read now (StreakCard's goal denominator) — the
  // big "N items waiting" banner moved to /practice, where the rest of the
  // practice modes live.
  const revision = useTodaysRevision();
  const [stream, setStream] = useState<string | null>(null);
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [paperCount, setPaperCount] = useState(0);

  useEffect(() => {
    let active = true;
    let query = supabase
      .from("exams")
      .select("id, title, subject, stream, year, difficulty, solution_url, questions", { count: "exact" })
      .order("year", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4);
    if (stream) query = query.eq("stream", stream);

    query.then(({ data, count }) => {
      if (!active) return;
      setPapers(data ?? []);
      setPaperCount(count ?? 0);
    });
    return () => {
      active = false;
    };
  }, [stream]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <h1 className="text-[48px] font-light leading-[1.05] tracking-tight sm:text-[64px] xl:text-[76px]">
            استثمر في
            <br />
            مستقبلك
          </h1>
          <div className="sm:mt-3">
            <BacCountdown />
          </div>
        </div>

        {/* Answering moves the streak and the revision queue together, so both
            refresh — refreshing only one left the dashboard disagreeing with
            itself. Chapter mastery and the weekly report no longer live here,
            so they don't need refreshing from this page any more. */}
        <DailyQuestionCard
          onAnswered={() => {
            studyStats.refetch();
            revision.refetch();
          }}
        />

        <FilterPills label="الشعبة" options={STREAM_OPTIONS} value={stream} onChange={setStream} />

        <section>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[15px] font-medium">آخر المواضيع</h2>
              <span className="text-[13px] text-muted-foreground">
                <span className="tabular">{paperCount}</span> موضوعاً
              </span>
            </div>
            <Link to="/exams" className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
              عرض الكل
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {papers === null ? null : papers.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={FileText}
              title="لا توجد مواضيع لهذه الشعبة بعد"
              description="اختر شعبة أخرى أو تصفّح كل المواضيع."
            />
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {papers.map((paper, i) => (
                <PaperCard key={paper.id} paper={paper} wide={papers.length % 2 === 1 && i === papers.length - 1} />
              ))}
            </div>
          )}
        </section>

        <FeaturedLesson />

        <AdminAdvice />

        <section className="grid items-stretch gap-5 lg:grid-cols-2">
          <DailyQuizCard stats={quizStats} />
          <Leaderboard />
        </section>
      </div>

      <aside className="space-y-5">
        <ProfileCard streak={studyStats.currentStreak} />
        <StreakCard stats={studyStats} queueLength={revision.queue.length} />
        <WeeklyActivity />
        <MySubjects />
        <AdviceTips />
      </aside>
    </div>
  );
};

export default Dashboard;

import { BookX, ChevronLeft, Crown, Layers, ListChecks, Timer, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import PageHeader from "@/components/layout/PageHeader";
import { useTodaysRevision } from "@/hooks/useTodaysRevision";
import { TONE_BG, type Tone } from "@/lib/bac";
import { cn } from "@/lib/utils";

/**
 * The hub for practice modes other than quizzes, which has its own rail icon
 * (the owner's call — round 1 folded it in here, round 2 gave it back its own
 * spot). Absorbs what used to be three home-page tiles (simulator, flashcards,
 * mistakes) plus a permanent way into /revision.
 *
 * Same visual language as everywhere else — TONE_BG pastels, the exact tile
 * markup MySubjects used — nothing new introduced.
 */

const FeaturedRevision = () => {
  const { queue, weakChapters, loading } = useTodaysRevision();
  if (loading || queue.length === 0) return null;

  return (
    <Link
      to="/revision"
      className="flex items-center justify-between gap-4 rounded-card bg-tone-mint p-5 shadow-soft transition-colors hover:bg-tone-mint-strong"
    >
      <span className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-card-raised/70 backdrop-blur">
          <ListChecks className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </span>
        <span>
          <span className="block text-[19px] font-medium">
            <span className="tabular">{queue.length}</span> عنصر بانتظار مراجعتك اليوم
          </span>
          {weakChapters.length > 0 ? (
            <span className="mt-1 block text-[13px] text-foreground/70">بما فيها فصول تحتاج تركيزاً أكبر</span>
          ) : null}
        </span>
      </span>
      <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden />
    </Link>
  );
};

interface Tile {
  to: string;
  tone: Tone;
  icon: LucideIcon;
  label: string;
  premium: boolean;
  title: string;
  meta: string;
}

const TILES: Tile[] = [
  {
    to: "/exam-simulator",
    tone: "sky",
    icon: Timer,
    label: "محاكي البكالوريا",
    premium: true,
    title: "جرّب اختباراً بوقت محدد كأنه يوم الامتحان",
    meta: "اختر مادة وابدأ العد التنازلي",
  },
  {
    to: "/flashcards",
    tone: "mint",
    icon: Layers,
    label: "البطاقات التعليمية",
    premium: false,
    title: "راجع المفاهيم ببطاقات سريعة",
    meta: "مجاني للجميع",
  },
  {
    to: "/mistakes",
    tone: "pink",
    icon: BookX,
    label: "أخطائي",
    premium: false,
    title: "راجع أسئلتك الخاطئة مع شرح بالذكاء الاصطناعي",
    meta: "مجاني للجميع",
  },
  {
    to: "/revision",
    tone: "peach",
    icon: ListChecks,
    label: "مراجعتي",
    premium: false,
    title: "أخطاؤك وبطاقاتك المستحقة، في جلسة واحدة قصيرة",
    meta: "مجاني للجميع",
  },
];

const PracticeTile = ({ tile }: { tile: Tile }) => (
  <Link to={tile.to} className={cn("block rounded-[22px] p-4 shadow-soft", TONE_BG[tile.tone])}>
    <span className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-card-raised/70 px-2.5 py-1 text-[13px] backdrop-blur">
        <tile.icon className="h-3 w-3" aria-hidden />
        {tile.label}
      </span>
      {tile.premium ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[13px] text-primary-foreground">
          <Crown className="h-3 w-3 text-tone-peach" aria-hidden />
          مميّز
        </span>
      ) : null}
    </span>
    <span className="mt-5 block text-base font-medium leading-snug">{tile.title}</span>
    <span className="mt-2.5 flex items-center justify-between">
      <span className="text-[13px] text-foreground/70">{tile.meta}</span>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
      </span>
    </span>
  </Link>
);

const Practice = () => (
  <div className="space-y-6">
    <PageHeader title="التدريب" subtitle="محاكاة الامتحان، بطاقات تعليمية، مراجعة أخطائك ومراجعتك اليومية" />
    <FeaturedRevision />
    <div className="grid gap-5 sm:grid-cols-2">
      {TILES.map((tile) => (
        <PracticeTile key={tile.to} tile={tile} />
      ))}
    </div>
  </div>
);

export default Practice;

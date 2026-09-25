import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { CalendarClock, Check, Flame, NotebookPen, Sparkles, X } from "lucide-react";

import { EXAM_YEARS, TONE_BG, type Tone } from "@/lib/bac";
import { cn } from "@/lib/utils";

import { Reveal, useInView, useReducedMotion } from "./motion";

/**
 * The five feature stories, alternating sides like the reference. Each mock
 * is the product's own UI in miniature, drawn in HTML/SVG so it can move —
 * and every number in the copy is a real one (see the plan's copy checks).
 */

const TONES: Tone[] = ["lav", "pink", "mint", "peach", "sky", "sage"];
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** A headline's accent words, in the serif the owner chose. */
export const Accent = ({ children }: { children: ReactNode }) => (
  <em className="font-accent text-[1.06em] font-bold not-italic">{children}</em>
);

function Story({
  n,
  title,
  flip = false,
  mock,
  children,
}: {
  n: number;
  title: ReactNode;
  flip?: boolean;
  mock: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-20">
      {/* each column slides in from its own side */}
      <Reveal from={flip ? "end" : "start"} className={cn(flip && "lg:order-2")}>
        <span className="tabular flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
          {n}
        </span>
        <h3 className="mt-5 text-balance text-[32px] font-light leading-[1.2] tracking-tight sm:text-[40px]">{title}</h3>
        <div className="mt-5 space-y-3 text-lg leading-[1.95] text-muted-foreground">{children}</div>
      </Reveal>
      <Reveal from={flip ? "start" : "end"} delay={120} className={cn(flip && "lg:order-1")}>
        {mock}
      </Reveal>
    </div>
  );
}

const MockCard = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn("rounded-card bg-card p-5 shadow-pop sm:p-6", className)}>{children}</div>
);

/* ─────────────────────────────────────────────── 1. the archive */

function ArchiveMock() {
  return (
    <MockCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[15px] font-medium">أرشيف المواضيع</span>
        <div className="flex gap-2 text-[13px]">
          <span className="rounded-full bg-tone-lav px-3 py-1">الرياضيات</span>
          <span className="rounded-full bg-tone-pink px-3 py-1">الفيزياء</span>
        </div>
      </div>
      {/* 19 sessions + one summary tile: 20, so every row closes at 4 or 5 columns */}
      <div className="mt-5 grid grid-cols-4 gap-2.5 sm:grid-cols-5">
        {EXAM_YEARS.map((year, i) => (
          <div key={year} className={cn("pop rounded-2xl p-3", TONE_BG[TONES[i % TONES.length]])} style={d(i * 45)}>
            <p className="tabular text-lg font-semibold leading-none">{year}</p>
            <p className="mt-1.5 text-[13px] text-foreground/70">6 مواضيع</p>
          </div>
        ))}
        <div className="pop flex flex-col justify-center rounded-2xl bg-primary p-3 text-primary-foreground" style={d(EXAM_YEARS.length * 45)}>
          <p className="tabular text-lg font-semibold leading-none">114</p>
          <p className="mt-1.5 text-[13px] opacity-80">بحلولها</p>
        </div>
      </div>
    </MockCard>
  );
}

/* ─────────────────────────────────────────────── 2. mistakes */

function MistakeMock() {
  return (
    <MockCard>
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-card-raised px-3 py-1 text-[13px]">سؤال اليوم · الرياضيات</span>
        <span className="text-[13px] text-muted-foreground">الاشتقاقية</span>
      </div>
      <p className="mt-4 text-lg font-medium">
        مشتقة الدالة{" "}
        <span dir="ltr" className="inline-block italic">
          f(x) = ln(3x² + 1)
        </span>{" "}
        هي:
      </p>
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center gap-3 rounded-2xl bg-tone-pink p-3.5">
          <X className="h-4 w-4 shrink-0" aria-hidden />
          <span dir="ltr" className="flex-1 text-start">6x · ln(3x² + 1)</span>
          <span className="text-[13px]">إجابتك</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-tone-mint p-3.5">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          <span dir="ltr" className="flex-1 text-start">6x / (3x² + 1)</span>
          <span className="text-[13px]">الصحيحة</span>
        </div>
      </div>

      <div className="pop mt-5 rounded-2xl bg-card-raised p-4 shadow-soft" style={d(700)}>
        <p className="flex items-center gap-2 text-[15px] font-medium">
          <NotebookPen className="h-4 w-4" aria-hidden />
          أُضيف إلى دفتر أخطائك
        </p>
        {/* the real schedule: a reviewed mistake is due again 3 days later */}
        <div className="mt-4 flex items-center gap-3 text-[13px]">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-tone-pink-strong" />
            اليوم
          </span>
          <svg viewBox="0 0 200 8" className="h-2 flex-1" preserveAspectRatio="none" aria-hidden>
            <line x1="200" y1="4" x2="0" y2="4" className="draw" stroke="hsl(var(--foreground) / .35)" strokeWidth="2" strokeDasharray="200" style={{ "--len": 200, "--d": "900ms" } as CSSProperties} />
          </svg>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" aria-hidden />
            يعود بعد 3 أيام
          </span>
        </div>
      </div>
    </MockCard>
  );
}

/* ─────────────────────────────────────────────── 3. flashcards */

const RATINGS = [
  { label: "صعبة", next: "بعد يوم", tone: "bg-tone-pink" },
  { label: "متوسطة", next: "بعد 3 أيام", tone: "bg-tone-peach" },
  { label: "سهلة", next: "بعد أسبوع", tone: "bg-tone-mint" },
];

function FlashcardMock() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <MockCard>
        <span className="rounded-full bg-tone-lav px-3 py-1 text-[13px]">الدوال الأسية</span>
        <p className="mt-5 text-lg font-medium">ما مشتقة الدالة</p>
        <p dir="ltr" className="mt-1 text-end text-xl italic">
          x ↦ e<sup>u(x)</sup>
        </p>
        <div className="mt-4 rounded-2xl bg-card-raised p-3.5">
          <p className="text-[13px] text-muted-foreground">الإجابة</p>
          <p dir="ltr" className="mt-1 text-end text-lg italic">
            u′(x) · e<sup>u(x)</sup>
          </p>
        </div>
        <p className="mt-4 text-[13px] text-muted-foreground">كم كانت صعبة؟</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {RATINGS.map((r) => (
            <div key={r.label} className={cn("rounded-2xl px-2 py-2.5 text-center", r.tone)}>
              <p className="text-[15px] font-medium">{r.label}</p>
              <p className="tabular text-[13px] text-foreground/70">{r.next}</p>
            </div>
          ))}
        </div>
      </MockCard>
      <MockCard className="flex flex-col">
        <p className="text-[15px] font-medium">بطاقاتك في الذاكرة</p>
        {/* 24 cells, 4 x 6: a card fading is one close to being forgotten */}
        <div className="mt-4 grid flex-1 grid-cols-4 gap-2">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className={cn("memory-cell aspect-square rounded-xl", TONE_BG[TONES[(i * 5) % TONES.length]])}
              style={d(((i * 7) % 24) * 290)}
            />
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">تبهت البطاقة حين تقترب من النسيان، وتعود حين تراجعها.</p>
      </MockCard>
    </div>
  );
}

/* ─────────────────────────────────────────────── 4. the AI tutor */

function TutorMock() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setAnswered(true);
      return;
    }
    const id = window.setTimeout(() => setAnswered(true), 2200);
    return () => window.clearTimeout(id);
  }, [inView, reduced]);

  return (
    <div ref={ref}>
      <MockCard className="space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tone-peach">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-medium leading-tight">المعلّم الذكي</p>
            <p className="text-[13px] text-muted-foreground">النهايات والمستقيمات المقاربة</p>
          </div>
        </div>
        <div className="ms-auto max-w-[85%] rounded-3xl bg-primary px-4 py-3 text-primary-foreground">
          <p className="text-[15px] leading-relaxed">لماذا نضرب في المرافق لحساب هذه النهاية؟</p>
          <p dir="ltr" className="mt-1 text-end italic opacity-90">
            lim<sub>x→0</sub> (√(x+1) − 1) / x
          </p>
        </div>
        {answered ? (
          <div className="step-in max-w-[92%] rounded-3xl bg-card-raised px-4 py-3 shadow-soft">
            {/* inline-block isolates each formula: a plain LTR span was reordered by the Arabic around it */}
            <p className="text-[15px] leading-[1.9]">
              لأن التعويض المباشر يعطي حالة عدم تعيين <span dir="ltr" className="inline-block">0/0</span>. نضرب البسط والمقام في المرافق{" "}
              <span dir="ltr" className="inline-block italic">√(x+1) + 1</span> فيختفي الجذر من البسط:
            </p>
            <p dir="ltr" className="mt-2 rounded-xl bg-card px-3 py-2 text-center italic">
              (√(x+1) − 1)(√(x+1) + 1) = x
            </p>
            <p className="mt-2 text-[15px] leading-[1.9]">
              فتصبح النهاية <span dir="ltr" className="inline-block italic">1 / (√1 + 1) = 1/2</span>.
            </p>
          </div>
        ) : (
          <div className="flex w-fit items-center gap-1.5 rounded-3xl bg-card-raised px-4 py-3.5 shadow-soft" aria-label="يكتب الإجابة">
            {[0, 150, 300].map((delay) => (
              <span key={delay} className="typing-dot h-2 w-2 rounded-full bg-foreground/60" style={d(delay)} />
            ))}
          </div>
        )}
      </MockCard>
    </div>
  );
}

/* ─────────────────────────────────────────────── 5. readiness */

// a half circle of radius 80 around (100, 100)
const ARC = Math.PI * 80;
const LEVEL = 68;

function ReadinessMock() {
  const bars = [35, 55, 20, 70, 60, 85, 75];
  return (
    <MockCard>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[15px] font-medium">مستواك في فصل النهايات</p>
          <svg viewBox="0 0 200 120" className="mt-2 w-full" role="img" aria-label={`${LEVEL}%`}>
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--card-raised))" strokeWidth="16" strokeLinecap="round" />
            {/* the arc fills from the left end, like the needle */}
            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="hsl(var(--tone-lav-strong))"
              strokeWidth="16"
              strokeLinecap="round"
              className="gauge-arc"
              style={{ "--len": ARC, "--off": ARC * (1 - LEVEL / 100) } as CSSProperties}
            />
            <g className="needle" style={{ "--angle": `${-90 + (LEVEL / 100) * 180}deg` } as CSSProperties}>
              <line x1="100" y1="100" x2="100" y2="36" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />
            </g>
            <circle cx="100" cy="100" r="7" fill="hsl(var(--foreground))" />
          </svg>
          <p className="tabular -mt-1 text-center text-3xl font-semibold">{LEVEL}%</p>
        </div>
        <div className="flex flex-col">
          <p className="text-[15px] font-medium">نشاطك هذا الأسبوع</p>
          <div className="mt-3 flex h-28 flex-1 items-end gap-2">
            {bars.map((h, i) => (
              <span key={i} className="grow-bar flex-1 rounded-t-lg bg-tone-mint-strong" style={{ height: `${h}%`, ...d(400 + i * 90) }} />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[13px]">
            <Flame className="h-4 w-4" aria-hidden />
            <span className="tabular">7</span> أيام متتالية
          </p>
        </div>
      </div>
      <div className="pop mt-5 flex items-center justify-between gap-3 rounded-2xl bg-tone-peach p-3.5" style={d(1400)}>
        <span className="text-[15px]">راجع أولاً: المتتاليات العددية</span>
        <span className="tabular rounded-full bg-card-raised/80 px-2.5 py-1 text-[13px]">41%</span>
      </div>
    </MockCard>
  );
}

/* ─────────────────────────────────────────────── the stories */

export default function FeatureStories() {
  return (
    <div className="space-y-28 lg:space-y-36">
      <Story n={1} title={<>كل مواضيع البكالوريا منذ 2008، <Accent>بحلولها الرسمية</Accent></>} mock={<ArchiveMock />}>
        <p>
          من دورة 2008 إلى دورة 2026: مواضيع <mark className="marker lav">الرياضيات والفيزياء</mark> للشعب العلمية الثلاث، كل موضوع مع{" "}
          <mark className="marker">حلّه الرسمي</mark>.
        </p>
        <p>
          تصفّح حسب السنة والمادة والشعبة، وافتح أي موضوع <mark className="marker mint">مجاناً</mark>.
        </p>
      </Story>

      <Story n={2} flip title={<>لا يبقى <Accent>خطأ</Accent> دون تفسير</>} mock={<MistakeMock />}>
        <p>
          كل إجابة خاطئة في الاختبارات أو في سؤال اليوم تُحفظ في <mark className="marker pink">دفتر أخطائك</mark> مع الإجابة الصحيحة.
        </p>
        <p>
          اطلب شرحها من المعلّم الذكي، ثم تعود إليك <mark className="marker">بعد ثلاثة أيام</mark> لتراجعها، حتى لا تتكرر يوم الامتحان.
        </p>
      </Story>

      <Story n={3} title={<>ما تحفظه <Accent>يبقى</Accent> حتى يوم الامتحان</>} mock={<FlashcardMock />}>
        <p>
          حوّل أي فصل إلى <mark className="marker lav">بطاقات مراجعة</mark>. بعد كل بطاقة تقول كم كانت صعبة، فتعود إليك{" "}
          <mark className="marker">قبل أن تنساها</mark>.
        </p>
        <p>بعد يوم إن كانت صعبة، وثلاثة أيام إن كانت متوسطة، وأسبوع إن كانت سهلة.</p>
      </Story>

      <Story n={4} flip title={<>اسأل <Accent>كما تسأل أستاذك</Accent></>} mock={<TutorMock />}>
        <p>
          المعلّم الذكي يجيب بالعربية مع <mark className="marker sky">الوحدات بالفرنسية</mark>، كما تُكتب في ورقة الامتحان.
        </p>
        <p>
          يعرف <mark className="marker">شعبتك وأين تخطئ</mark> ليكيّف شرحه معك، ومحادثتك في كل فصل <mark className="marker mint">محفوظة لك وحدك</mark>.
        </p>
      </Story>

      <Story n={5} title={<>تعرف دائماً <Accent>إن كنت جاهزاً</Accent></>} mock={<ReadinessMock />}>
        <p>
          قبل الامتحان لا مكان لسؤال «هل راجعت بما يكفي؟». ترى بوضوح <mark className="marker lav">مستواك في كل فصل</mark>، وسلسلة أيام مراجعتك،{" "}
          <mark className="marker">وتقريرك الأسبوعي</mark>.
        </p>
        <p>
          وتعرف ما يجب أن <mark className="marker pink">تراجعه أولاً</mark>، فتقضي ساعاتك الأخيرة حيث تنفع.
        </p>
      </Story>
    </div>
  );
}

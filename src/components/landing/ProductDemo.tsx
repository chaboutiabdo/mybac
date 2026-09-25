import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AlertTriangle, CheckCircle2, FileText, MousePointer2 } from "lucide-react";

import { AnswerText } from "@/components/ai/AnswerText";
import { cn } from "@/lib/utils";

import { useInView, useReducedMotion } from "./motion";

/**
 * The self-playing demo: the AI solution page in miniature, with two real
 * questions copied from the stored solutions (Math, Technique Mathématiques
 * 2026, exercise 4 question 2; Physics, Mathématiques 2025, exercise 1
 * question 2 — both checked step by step). Lazy-loaded by the landing page:
 * it is the only part that needs KaTeX.
 */

type DemoQuestion = {
  tab: string;
  paper: string;
  number: string;
  exercise: string;
  question: string;
  steps: { explanation: string; formula: string }[];
  final: string;
  mistake: string;
};

const DEMO: DemoQuestion[] = [
  {
    tab: "الرياضيات · 2026",
    paper: "الرياضيات · تقني رياضي · بكالوريا 2026",
    number: "التمرين الرابع - السؤال 2",
    exercise: String.raw`\( f \) الدالة المعرفة على \( \mathbb{R} \) بـ: \( f(x) = 1 + (1 - x - x^2)e^{-x} \)`,
    question: String.raw`2) أ) بيّن أنه: من أجل كل \( x \) من \( \mathbb{R} \) ، \( f'(x) = (x^2 - x - 2)e^{-x} \) ب) استنتج اتجاه تغير الدالة f ثم شكّل جدول تغيراتها.`,
    steps: [
      {
        explanation: String.raw`نحسب مشتقة الدالة \( f \) باستخدام قواعد اشتقاق الدوال المركبة والجداء، ثم نبسّط.`,
        formula: String.raw`\[ f'(x) = (x^2 - x - 2)e^{-x} \]`,
      },
      {
        explanation: "بما أن الدالة الأسية موجبة دائماً، فإن إشارة المشتقة من إشارة كثير الحدود من الدرجة الثانية.",
        formula: String.raw`\[ x^2 - x - 2 = 0 \implies x_1 = -1 , x_2 = 2 \]`,
      },
      {
        explanation: "ننظّم النتائج في جدول التغيرات: الدالة متناقصة بين الجذرين ومتزايدة خارجهما.",
        formula: String.raw`\[ f'(x) > 0 \iff x \in ]-\infty, -1[ \cup ]2, +\infty[ \]`,
      },
    ],
    final: String.raw`الدالة متزايدة على \( ]-\infty, -1] \) و \( [2, +\infty[ \) ومتناقصة على \( [-1, 2] \).`,
    mistake: String.raw`إهمال إشارة الناقص عند اشتقاق الدالة المركبة \( e^{-x} \).`,
  },
  {
    tab: "الفيزياء · 2025",
    paper: "الفيزياء · رياضيات · بكالوريا 2025",
    number: "التمرين الأول - السؤال 2",
    exercise: String.raw`ينزلق جسم صلب (S) كتلته \( m \) على مستوي مائل يصنع مع المستوي الأفقي زاوية \( \alpha = 30^\circ \)، ويخضع أثناء حركته لاحتكاكات تُكافئ قوة \( \vec{f} \) شدتها ثابتة ومعاكسة لجهة الحركة.`,
    question: String.raw`2. بتطبيق القانون الثاني لنيوتن، بيّن أنّ المعادلة التفاضلية التي تحققها \( v_G(t) \) سرعة مركز عطالة الجسم (S) تُكتب على الشكل: \( \frac{dv_G(t)}{dt} = g \cdot \sin \alpha - \frac{f}{m} \)`,
    steps: [
      {
        explanation: "نطبق القانون الثاني لنيوتن على مركز عطالة الجسم في المرجع السطحي الأرضي.",
        formula: String.raw`\[ \sum \vec{F}_{ext} = m\vec{a}_G \Rightarrow \vec{P} + \vec{R} + \vec{f} = m\vec{a}_G \]`,
      },
      {
        explanation: String.raw`بالإسقاط على محور الحركة الموازي للمستوى والموجه نحو الأسفل، نجد مركبة الثقل هي \( P \sin \alpha \).`,
        formula: String.raw`\[ P \sin \alpha - f = m \frac{dv}{dt} \]`,
      },
      {
        explanation: String.raw`بما أن \( P = mg \)، نعوّض ونقسم على الكتلة \( m \) للحصول على المعادلة المطلوبة.`,
        formula: String.raw`\[ \frac{dv}{dt} = g \cdot \sin \alpha - \frac{f}{m} \]`,
      },
    ],
    final: String.raw`المعادلة التفاضلية هي \( \frac{dv}{dt} = g \cdot \sin \alpha - \frac{f}{m} \).`,
    mistake: "الخطأ في تحديد زاوية الميل عند إسقاط مركبة الثقل واستخدام cos بدلاً من sin.",
  },
];

// the step that appears at each moment of a tab's run, in ms
const STEP_AT = [700, 1900, 3100];
const RESULT_AT = 4300;
const TAB_MS = 10_000;

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function Panel({ q, animate }: { q: DemoQuestion; animate: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-tone-lav px-3 py-1.5 text-[13px]">{q.number}</span>
          <span className="text-[13px] text-muted-foreground">{q.paper}</span>
        </div>
        <section className="rounded-3xl bg-card-raised p-5 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[15px] font-medium">نص السؤال</h4>
            <span className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[13px]">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              افتح ورقة الموضوع
            </span>
          </div>
          <div className="mt-3 text-[15px]">
            <AnswerText content={q.question} />
          </div>
          <div className="mt-3 rounded-2xl bg-card px-4 py-3 text-[15px] text-foreground/80">
            <p className="mb-1 text-[13px] font-medium text-muted-foreground">نص التمرين</p>
            <AnswerText content={q.exercise} />
          </div>
        </section>
        <div className={cn("rounded-3xl bg-success/10 p-4", animate && "step-in")} style={d(RESULT_AT)}>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            النتيجة النهائية
          </p>
          <div className="mt-1.5 text-[15px] font-medium">
            <AnswerText content={q.final} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[15px] font-medium">الحل خطوة بخطوة</h4>
        {q.steps.map((s, i) => (
          <article
            key={i}
            className={cn("flex gap-3 rounded-3xl bg-card-raised p-4 shadow-soft", animate && "step-in")}
            style={d(STEP_AT[i] ?? 0)}
          >
            <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-medium text-primary-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 text-[15px]">
              <AnswerText content={s.explanation} />
              <div className="mt-2 rounded-2xl bg-card px-3 py-1">
                <AnswerText content={s.formula} />
              </div>
            </div>
          </article>
        ))}
        <div className={cn("flex gap-2.5 rounded-3xl bg-destructive-light p-4 text-destructive", animate && "step-in")} style={d(RESULT_AT + 700)}>
          <AlertTriangle className="mt-1 h-4 w-4 shrink-0" aria-hidden />
          <div className="text-[15px]">
            <p className="text-[13px] font-medium">خطأ شائع</p>
            <AnswerText content={q.mistake} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDemo() {
  const [rootRef, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  // the cursor rests, invisible, in the far corner and glides out to click
  const [cursor, setCursor] = useState({ x: 0, y: 0, shown: false });
  const [ripple, setRipple] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timers = useRef<number[]>([]);

  const restPoint = () => {
    const box = boxRef.current?.getBoundingClientRect();
    return { x: 48, y: (box?.height ?? 400) - 72 };
  };

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const playing = inView && !reduced;
  useEffect(() => {
    if (playing) setCursor({ ...restPoint(), shown: false });
  }, [playing]);

  const select = (i: number) => {
    clearTimers();
    setCursor({ ...restPoint(), shown: false });
    setActive(i);
    setRun((r) => r + 1);
  };

  // At the end of a tab's run the cursor glides to the next tab and clicks it.
  const onRunEnd = () => {
    const next = (active + 1) % DEMO.length;
    const box = boxRef.current?.getBoundingClientRect();
    const tab = tabRefs.current[next]?.getBoundingClientRect();
    if (!box || !tab) return select(next);
    setCursor({ x: tab.left - box.left + tab.width / 2, y: tab.top - box.top + tab.height / 2, shown: true });
    timers.current.push(
      window.setTimeout(() => setRipple((n) => n + 1), 950),
      window.setTimeout(() => {
        setActive(next);
        setRun((r) => r + 1);
      }, 1150),
      window.setTimeout(() => setCursor({ ...restPoint(), shown: false }), 1900),
    );
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-paused={paused ? "" : undefined}
    >
      <div ref={boxRef} className="relative overflow-hidden rounded-[32px] bg-card p-4 shadow-pop sm:p-6">
        <div role="tablist" aria-label="أمثلة من حلول المواضيع" className="flex flex-wrap gap-2">
          {DEMO.map((q, i) => (
            <button
              key={q.tab}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`demo-tab-${i}`}
              aria-selected={i === active}
              aria-controls="demo-panel"
              onClick={() => select(i)}
              className={cn(
                "relative overflow-hidden rounded-full px-5 py-2.5 text-[15px] font-medium transition-colors",
                i === active ? "bg-primary text-primary-foreground" : "bg-card-raised text-foreground hover:bg-card-raised/70",
              )}
            >
              {q.tab}
              {i === active && playing ? (
                <span
                  key={run}
                  aria-hidden
                  className="tab-progress absolute inset-x-0 bottom-0 h-[3px] bg-tone-peach"
                  style={{ "--dur": `${TAB_MS}ms` } as CSSProperties}
                  onAnimationEnd={onRunEnd}
                />
              ) : null}
            </button>
          ))}
        </div>

        {/* both panels share one grid cell, so the card is always as tall as the taller one */}
        <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${active}`} className="mt-5 grid grid-cols-1">
          {DEMO.map((q, i) => (
            <div
              key={i === active ? `on-${run}` : `off-${i}`}
              className={cn("[grid-area:1/1]", i !== active && "invisible")}
              aria-hidden={i !== active}
            >
              <Panel q={q} animate={i === active && playing} />
            </div>
          ))}
        </div>

        {playing ? (
          <div
            aria-hidden
            className="demo-cursor pointer-events-none absolute left-0 top-0 z-10"
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)`, opacity: cursor.shown ? 1 : 0 }}
          >
            <span key={ripple} className={cn("absolute -left-5 -top-5 h-10 w-10 rounded-full bg-tone-lav-strong", ripple ? "ripple" : "opacity-0")} />
            <MousePointer2 className="relative h-6 w-6 fill-primary text-card-raised drop-shadow" strokeWidth={1.5} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

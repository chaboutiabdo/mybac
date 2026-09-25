import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Crown, FileText, Flame, Menu, NotebookPen, Plus, School, UserRound, X } from "lucide-react";

import FeatureStories, { Accent } from "@/components/landing/FeatureStories";
import { CountUp, Floaters, Marquee, Reveal, RotatingWord, useInView, useReducedMotion } from "@/components/landing/motion";
import "@/components/landing/landing.css";
import { Button } from "@/components/ui/button";
import { BAC_SESSION_LABEL, EXAM_YEARS, MATH_CHAPTERS, PHYSICS_CHAPTERS, TONE_BG, daysUntilBac, type Tone } from "@/lib/bac";
import { cn } from "@/lib/utils";

/*
 * The public landing page, rebuilt in the manner of the reference the owner
 * chose (recorpsmed.com): a long product story with motion, in THE SMART's own
 * colours. Every number and claim is a real one — 114 papers (19 sessions x 6),
 * 924 solved questions, 16 chapters, the Ministry's 51.57% — and the free /
 * premium split follows the route gating in App.tsx.
 */

// the only part that needs KaTeX; loaded after the first paint
const loadDemo = () => import("@/components/landing/ProductDemo");
const ProductDemo = lazy(loadDemo);

const NAV = [
  { id: "features", label: "المميزات" },
  { id: "demo", label: "كيف يعمل" },
  { id: "pricing", label: "الأسعار" },
  { id: "faq", label: "الأسئلة" },
];

const TONES: Tone[] = ["lav", "pink", "mint", "peach", "sky", "sage"];
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

/* ───────────────────────────────────────────────────────── shared bits */

function SectionHead({ eyebrow, title, children, center = false }: { eyebrow: string; title: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <Reveal className={cn("max-w-3xl", center && "mx-auto text-center")}>
      <p className={cn("flex items-center gap-2 text-[13px] font-medium tracking-wide text-muted-foreground", center && "justify-center")}>
        <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance text-[36px] font-light leading-[1.15] tracking-tight sm:text-[52px]">{title}</h2>
      {children ? <div className="mt-5 space-y-3 text-lg leading-[1.95] text-muted-foreground">{children}</div> : null}
    </Reveal>
  );
}

/** The reference's organic section edges, in the cream of the app's panels. */
const Wave = ({ flip = false }: { flip?: boolean }) => (
  <svg viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden className={cn("block h-8 w-full text-card sm:h-12", flip && "rotate-180")}>
    <path fill="currentColor" d="M0 48 C 220 12 460 0 720 20 S 1210 46 1440 10 L 1440 48 Z" />
  </svg>
);

/* ───────────────────────────────────────────────────────── header */

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    scrollToId(id);
    setOpen(false);
  };

  return (
    <header className="landing-header sticky top-0 z-50" data-scrolled={scrolled || open ? "" : undefined}>
      <div className="mx-auto flex h-[76px] max-w-[1320px] items-center gap-8 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-10 w-10" aria-hidden />
          <span className="text-xl font-semibold tracking-tight">THE SMART</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="أقسام الصفحة">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className="rounded-full px-4 py-2 text-base text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/login">تسجيل الدخول</Link>
          </Button>
          <Button asChild>
            <Link to="/login">ابدأ مجاناً</Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="القائمة" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open ? (
        <nav className="mx-4 mb-3 flex flex-col rounded-3xl bg-card p-2 shadow-pop md:hidden" aria-label="أقسام الصفحة">
          {NAV.map((item) => (
            <button key={item.id} onClick={() => go(item.id)} className="flex h-11 items-center rounded-2xl px-4 text-base hover:bg-card-raised">
              {item.label}
            </button>
          ))}
          <Link to="/login" className="flex h-11 items-center rounded-2xl px-4 text-base hover:bg-card-raised sm:hidden">
            تسجيل الدخول
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

/* ───────────────────────────────────────────────────────── hero */

function HeroMock({ days }: { days: number }) {
  return (
    <div className="relative mx-auto w-full max-w-[560px] py-6 sm:py-10">
      <Floaters
        shapes={[
          { className: "-top-2 left-6 h-9 w-9 bg-tone-lav-strong", rotate: 12 },
          { className: "top-24 -left-3 h-5 w-5 bg-tone-peach-strong", delay: 1200, rotate: -8, duration: 11 },
          { className: "bottom-2 right-16 h-7 w-7 bg-tone-mint-strong", delay: 600, rotate: 20, duration: 16 },
        ]}
      />
      {/* the tilt sits on an inner box: the entrance animates `transform` too */}
      <div className="rise" style={d(250)}>
        <div className="relative rounded-[30px] bg-card p-4 shadow-pop sm:p-5" style={{ transform: "perspective(1600px) rotateY(-9deg) rotateX(5deg)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-medium">لوحتك اليوم</span>
            <span className="rounded-full bg-card-raised px-3 py-1 text-[13px]">
              {BAC_SESSION_LABEL} · <span className="tabular">{days}</span> يوماً
            </span>
          </div>
          {/* the question of the day, as on the dashboard (a real seeded question) */}
          <div className="mt-4 rounded-3xl bg-tone-mint p-4">
            <p className="text-[13px] text-foreground/70">سؤال اليوم · الرياضيات · النهايات</p>
            <p className="mt-2 text-lg font-medium leading-relaxed">
              ما نهاية{" "}
              <span dir="ltr" className="inline-block italic">
                (x² − 1)/(x − 1)
              </span>{" "}
              عندما يؤول x إلى 1؟
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["0", "1", "2", "غير معرّفة"].map((opt) => (
                <div
                  key={opt}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-[15px]",
                    opt === "2" ? "bg-primary text-primary-foreground" : "bg-card-raised/80",
                  )}
                >
                  <span className="tabular">{opt}</span>
                  {opt === "2" ? <Check className="h-4 w-4" aria-hidden /> : null}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-tone-peach p-4">
              <Flame className="h-5 w-5" aria-hidden />
              <p className="mt-3 text-[15px]">
                <span className="tabular text-2xl font-semibold">7</span> أيام متتالية
              </p>
            </div>
            <div className="rounded-3xl bg-tone-lav p-4">
              <p className="text-[13px] text-foreground/70">النهايات</p>
              <p className="tabular mt-1 text-2xl font-semibold">68%</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-card-raised/70">
                <div className="h-full w-[68%] rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="rise absolute -right-2 top-0 flex items-center gap-2 rounded-2xl bg-tone-sky px-3.5 py-2.5 text-[13px] shadow-pop sm:-right-8 sm:top-4" style={d(700)}>
        <FileText className="h-4 w-4" aria-hidden />
        بكالوريا 2026 · محلولة خطوة بخطوة
      </div>
      <div className="rise absolute -left-2 bottom-0 flex items-center gap-2 rounded-2xl bg-tone-pink px-3.5 py-2.5 text-[13px] shadow-pop sm:-left-6 sm:bottom-4" style={d(950)}>
        <NotebookPen className="h-4 w-4" aria-hidden />
        خطأ جديد · يعود بعد 3 أيام
      </div>
    </div>
  );
}

function Hero({ days }: { days: number }) {
  return (
    <section className="relative mx-auto grid grid-cols-1 max-w-[1320px] items-center gap-12 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
      <div className="hero-copy relative ps-6 sm:ps-8">
        <span aria-hidden className="hero-trace absolute inset-y-2 start-0 w-[2px] rounded-full bg-foreground/15" />
        <span className="rise inline-flex items-center gap-2.5 rounded-full bg-card px-4 py-2 text-[15px] shadow-soft" style={d(0)}>
          <span className="live-dot h-2 w-2 rounded-full bg-tone-mint-strong" />
          {BAC_SESSION_LABEL} · بقي <span className="tabular font-semibold">{days}</span> يوماً
        </span>
        <h1 aria-label="انجح في البكالوريا" className="mt-7 text-[52px] font-light leading-[1.1] tracking-tight sm:text-[72px] xl:text-[88px]">
          <span aria-hidden className="rise block" style={d(120)}>
            انجح في
          </span>
          {/* Amiri's tall letters (lam-alif) need the extra line height */}
          <span aria-hidden className="rise block leading-[1.35]" style={d(240)}>
            <RotatingWord words={["البكالوريا", "الرياضيات", "الفيزياء", "شعبتك"]} className="font-accent text-[1.12em] font-bold" />
          </span>
        </h1>
        <p className="rise mt-7 max-w-xl text-lg leading-[2] text-muted-foreground" style={d(380)}>
          THE SMART يتكيّف مع طريقتك في المراجعة ليرفع <mark className="marker" style={{ "--md": "0.9s" } as CSSProperties}>حظوظك في النجاح</mark>:
          مواضيع البكالوريا الحقيقية بحلولها، شرح <mark className="marker lav" style={{ "--md": "1.1s" } as CSSProperties}>خطوة بخطوة</mark>، ومعلّم ذكي{" "}
          <mark className="marker mint" style={{ "--md": "1.3s" } as CSSProperties}>يعرف أين تخطئ</mark>.
        </p>
        <div className="rise mt-9 flex flex-wrap gap-3" style={d(520)}>
          <Button asChild size="xl">
            <Link to="/login">ابدأ مجاناً</Link>
          </Button>
          <Button size="xl" variant="secondary" className="shadow-soft" onClick={() => scrollToId("demo")}>
            شاهد كيف يعمل
            <ArrowLeft aria-hidden />
          </Button>
        </div>
        <p className="rise mt-4 text-[15px] text-muted-foreground" style={d(620)}>
          بدون بطاقة بنكية · كل المواضيع وحلولها الرسمية مجاناً
        </p>
      </div>
      <HeroMock days={days} />
    </section>
  );
}

/* ───────────────────────────────────────────────────────── the statistic */

function PassRateDial() {
  // 20 cells round a dial; 10 filled is the 51.57% pass rate, rounded down
  const cells = Array.from({ length: 20 }, (_, i) => {
    const a = (-90 + i * 18) * (Math.PI / 180);
    return { x: 150 + 118 * Math.cos(a), y: 150 + 118 * Math.sin(a), filled: i < 10 };
  });
  return (
    <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-[360px]" role="img" aria-label="نسبة النجاح 51.57%">
      <circle cx="150" cy="150" r="142" fill="hsl(var(--card-raised))" />
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x - 14}
          y={c.y - 14}
          width="28"
          height="28"
          rx="9"
          className="pebble"
          style={d(i * 70)}
          fill={c.filled ? "hsl(var(--foreground))" : "hsl(var(--tone-lav))"}
          transform={`rotate(${i * 18} ${c.x} ${c.y})`}
        />
      ))}
    </svg>
  );
}

function Statistic() {
  return (
    <section aria-labelledby="stat-h">
      <Wave />
      <div className="bg-card">
        <div className="mx-auto grid grid-cols-1 max-w-[1320px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <Reveal from="pop" className="relative">
            <PassRateDial />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[44px] font-semibold leading-none tracking-tight sm:text-[56px]">
                <CountUp to={51.57} decimals={2} suffix="%" />
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">نسبة النجاح · جوان 2025</p>
            </div>
          </Reveal>
          <Reveal from="end" delay={120}>
            <p className="flex items-center gap-2 text-[13px] font-medium tracking-wide text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
              الواقع
            </p>
            <h2 id="stat-h" className="mt-4 text-balance text-[36px] font-light leading-[1.15] tracking-tight sm:text-[52px]">
              قرابة <Accent>نصف</Accent> المترشحين لم ينجحوا
            </h2>
            <div className="mt-5 space-y-4 text-lg leading-[1.95] text-muted-foreground">
              <p>
                نسبة النجاح الوطنية للمتمدرسين في بكالوريا جوان 2025 كانت <span className="tabular font-medium text-foreground">51.57%</span>
                <sup>*</sup>.
              </p>
              <p>
                ليس الجهد ما ينقص أغلبهم، بل <mark className="marker">الطريقة</mark>.
              </p>
              <p>
                بنفس ساعات المراجعة، الفرق في <mark className="marker lav">كيف تراجع</mark>: ماذا تحلّ، ومتى تعيده، وأين تخطئ. مهارة تُتعلَّم، ولا يعلّمها لك أحد.
              </p>
              <p className="text-foreground">THE SMART وُجد ليعلّمك كيف تراجع.</p>
            </div>
            <Button size="lg" className="mt-8" onClick={() => scrollToId("method")}>
              اكتشف الطريقة
              <ArrowLeft aria-hidden />
            </Button>
            <p className="mt-6 text-[13px] text-muted-foreground">
              * وزارة التربية الوطنية، عبر{" "}
              <a
                href="https://www.aps.dz/ar/sante-science-technologie/183670-2025-57-51"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground"
              >
                وكالة الأنباء الجزائرية
              </a>
              ، جويلية 2025.
            </p>
          </Reveal>
        </div>
      </div>
      <Wave flip />
    </section>
  );
}

/* ───────────────────────────────────────────────────────── the method loop */

const LOOP = [
  { title: "تدرّب", body: "سؤال اليوم والاختبارات", tone: "bg-tone-mint" },
  { title: "أخطئ", body: "دفتر الأخطاء يحفظ كل خطأ", tone: "bg-tone-pink" },
  { title: "راجع", body: "البطاقات والتقويم في وقتها", tone: "bg-tone-peach" },
  { title: "أتقن", body: "مستواك في كل فصل", tone: "bg-tone-lav" },
  { title: "جرّب", body: "امتحان تجريبي بالتوقيت", tone: "bg-tone-sky" },
];

function MethodLoop() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % LOOP.length), 2400);
    return () => window.clearInterval(id);
  }, [inView, reduced]);

  // five stations round a ring, starting at the top and going the reading way (counterclockwise)
  const at = (i: number) => {
    const a = (-90 - i * 72) * (Math.PI / 180);
    return { left: `${50 + 40 * Math.cos(a)}%`, top: `${50 + 40 * Math.sin(a)}%` };
  };

  return (
    <div ref={ref}>
      {/* phones: the same loop as a list */}
      <ol className="grid grid-cols-1 gap-3 md:hidden">
        {LOOP.map((s, i) => (
          <li key={s.title} className={cn("flex items-center gap-4 rounded-3xl p-4 transition-colors", i === active ? "bg-primary text-primary-foreground" : s.tone)}>
            <span className="tabular flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card-raised/80 font-semibold text-foreground">{i + 1}</span>
            <div>
              <p className="text-lg font-medium">{s.title}</p>
              <p className={cn("text-[15px]", i === active ? "opacity-80" : "text-foreground/70")}>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Reveal from="pop" className="relative mx-auto hidden aspect-square w-full max-w-[560px] md:block">
        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden>
          <circle cx="200" cy="200" r="160" fill="none" stroke="hsl(var(--foreground) / 0.08)" strokeWidth="2" />
          <circle
            cx="200"
            cy="200"
            r="160"
            fill="none"
            stroke="hsl(var(--foreground) / 0.45)"
            strokeWidth="2"
            strokeLinecap="round"
            className="draw"
            style={{ "--len": 1006, "--d": "200ms" } as CSSProperties}
            transform="rotate(-90 200 200) scale(1 -1) translate(0 -400)"
          />
        </svg>
        <div className="absolute inset-[30%] flex flex-col items-center justify-center text-center">
          <p className="font-accent text-3xl font-bold">حلقة المراجعة</p>
          <p className="mt-2 text-[15px] text-muted-foreground">كل خطوة تغذّي التي بعدها</p>
        </div>
        {LOOP.map((s, i) => (
          <div
            key={s.title}
            className={cn(
              "absolute w-[168px] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-4 text-center shadow-soft transition-colors duration-500",
              i === active ? "bg-primary text-primary-foreground" : s.tone,
            )}
            style={at(i)}
          >
            <span className="tabular mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-card-raised/80 text-[15px] font-semibold text-foreground">{i + 1}</span>
            <p className="mt-2 text-lg font-medium">{s.title}</p>
            <p className={cn("mt-0.5 text-[13px] leading-snug", i === active ? "opacity-80" : "text-foreground/70")}>{s.body}</p>
          </div>
        ))}
      </Reveal>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── numbers over a mosaic */

function Mosaic() {
  // Rounded "pebbles": a jittered grid of quads, shrunk toward their centres
  // and stroked round in their own colour. A fixed seed keeps it stable.
  const cells = useMemo(() => {
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = 12;
    const rows = 4;
    const w = 1440 / cols;
    const h = 360 / rows;
    const pts = Array.from({ length: rows + 1 }, (_, r) =>
      Array.from({ length: cols + 1 }, (_, c) => ({
        x: c * w + (c > 0 && c < cols ? (rnd() - 0.5) * w * 0.5 : 0),
        y: r * h + (r > 0 && r < rows ? (rnd() - 0.5) * h * 0.5 : 0),
      })),
    );
    const out: { points: string; tone: Tone; delay: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const quad = [pts[r][c], pts[r][c + 1], pts[r + 1][c + 1], pts[r + 1][c]];
        const cx = quad.reduce((s, p) => s + p.x, 0) / 4;
        const cy = quad.reduce((s, p) => s + p.y, 0) / 4;
        const points = quad.map((p) => `${cx + (p.x - cx) * 0.78},${cy + (p.y - cy) * 0.78}`).join(" ");
        out.push({ points, tone: TONES[Math.floor(rnd() * TONES.length)], delay: Math.floor(rnd() * 900) });
      }
    }
    return out;
  }, []);

  return (
    <svg viewBox="0 0 1440 360" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      {cells.map((cell, i) => (
        <polygon
          key={i}
          points={cell.points}
          className="pebble"
          style={d(cell.delay)}
          fill={`hsl(var(--tone-${cell.tone}))`}
          stroke={`hsl(var(--tone-${cell.tone}))`}
          strokeWidth="22"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

const NUMBERS = [
  { to: 114, label: "موضوع بكالوريا بحلوله الرسمية" },
  { to: 924, label: "سؤالاً محلولاً خطوة بخطوة" },
  { to: 19, label: "دورة، من 2008 إلى 2026" },
  { to: 16, label: "فصلاً في الرياضيات والفيزياء" },
];

function Numbers() {
  return (
    <Reveal as="section" labelledBy="numbers-h" className="relative overflow-hidden bg-card py-20 sm:py-28">
      <Mosaic />
      <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-[32px] bg-card-raised/90 p-6 shadow-pop backdrop-blur sm:p-10">
          <h2 id="numbers-h" className="text-center text-[30px] font-light tracking-tight sm:text-[40px]">
            المحتوى المتوفّر <Accent>اليوم</Accent>
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {NUMBERS.map((n) => (
              <div key={n.label} className="rounded-3xl bg-card p-5 text-center">
                <p className="text-[40px] font-semibold leading-none tracking-tight sm:text-[48px]">
                  <CountUp to={n.to} />
                </p>
                <p className="mt-3 text-[15px] text-muted-foreground">{n.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[13px] text-muted-foreground">أرقام المحتوى المتوفّر على المنصة في 25 سبتمبر 2026.</p>
        </div>
      </div>
    </Reveal>
  );
}

/* ───────────────────────────────────────────────────────── audiences, ribbons */

function Audiences() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Reveal from="start" className="flex flex-col rounded-card bg-tone-lav p-7 shadow-soft sm:p-9">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card-raised/80">
          <UserRound className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="mt-8 text-[28px] font-medium">طالب</h3>
        <p className="mt-3 text-[17px] leading-[1.9] text-foreground/80">
          تبدأ مجاناً: كل المواضيع وحلولها الرسمية، سؤال اليوم، دفتر الأخطاء، التقويم والتقرير الأسبوعي. ومع العرض المميّز: الحلول خطوة بخطوة، المعلّم الذكي،
          البطاقات والامتحان التجريبي.
        </p>
        <Button asChild size="lg" className="mt-8 self-start">
          <Link to="/login">ابدأ مجاناً</Link>
        </Button>
      </Reveal>
      <Reveal from="end" delay={120} className="flex flex-col rounded-card bg-tone-sky p-7 shadow-soft sm:p-9">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card-raised/80">
          <School className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="mt-8 text-[28px] font-medium">ثانوية</h3>
        <p className="mt-3 text-[17px] leading-[1.9] text-foreground/80">
          حسابات جماعية لطلابكم، ترتيب خاص بثانويتكم، تقارير تقدّم لكل طالب، واشتراك يناسب عددهم.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-8 self-start bg-card-raised">
          <Link to="/pricing">اطلب عرض المؤسسات</Link>
        </Button>
      </Reveal>
    </div>
  );
}

const Chip = ({ children, tone }: { children: ReactNode; tone: Tone }) => (
  <span dir="rtl" className={cn("whitespace-nowrap rounded-full px-5 py-2.5 text-[15px]", TONE_BG[tone])}>
    {children}
  </span>
);

function Ribbons() {
  return (
    <div className="space-y-3">
      <Marquee duration={70}>
        {[...MATH_CHAPTERS.map((c) => ({ ...c, tone: "lav" as Tone })), ...PHYSICS_CHAPTERS.map((c) => ({ ...c, tone: "pink" as Tone }))].map((c) => (
          <Chip key={c.value} tone={c.tone}>
            {c.label}
          </Chip>
        ))}
      </Marquee>
      <Marquee duration={55} reverse>
        {EXAM_YEARS.map((year, i) => (
          <Chip key={year} tone={TONES[(i + 2) % TONES.length]}>
            بكالوريا <span className="tabular">{year}</span>
          </Chip>
        ))}
      </Marquee>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── pricing */

const PLANS = [
  {
    name: "المجاني",
    price: "0",
    unit: "دج",
    note: "للأبد",
    tone: "bg-card",
    items: ["كل مواضيع البكالوريا وحلولها الرسمية", "سؤال اليوم", "دفتر الأخطاء والمراجعة", "التقويم والتقرير الأسبوعي", "ترتيب الطلاب", "الدروس المجانية"],
    cta: { label: "ابدأ الآن", to: "/login" },
  },
  {
    name: "المميّز",
    price: "700",
    unit: "دج / شهر",
    note: "يُلغى في أي وقت",
    tone: "bg-tone-peach",
    featured: true,
    items: ["كل ما في المجاني", "حلول المواضيع خطوة بخطوة", "المعلّم الذكي", "البطاقات بالمراجعة في وقتها", "كل الاختبارات والامتحان التجريبي", "الدروس المميّزة"],
    cta: { label: "اشترك", to: "/pricing" },
  },
  {
    name: "المؤسسات",
    price: "للثانويات",
    unit: "",
    note: "حسب عدد الطلاب",
    tone: "bg-tone-sky",
    items: ["حسابات طلابية جماعية", "ترتيب خاص بالثانوية", "تقارير تقدّم للطلاب", "اشتراكات حسب الحاجة"],
    cta: { label: "قدّم طلباً", to: "/pricing" },
  },
];

function Pricing() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {PLANS.map((plan, i) => (
        <Reveal key={plan.name} delay={i * 120} className={cn("flex flex-col rounded-card p-6 shadow-soft sm:p-7", plan.tone)}>
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">{plan.name}</span>
            {plan.featured ? (
              <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[13px] text-primary-foreground">
                <Crown className="h-3.5 w-3.5 text-tone-peach" aria-hidden />
                الأكثر طلباً
              </span>
            ) : null}
          </div>
          <p className="mt-5 flex items-baseline gap-2">
            <span className={cn("font-semibold leading-none tracking-tight", /\d/.test(plan.price) ? "tabular text-[48px]" : "text-[36px]")}>{plan.price}</span>
            {plan.unit ? <span className="text-lg text-foreground/70">{plan.unit}</span> : null}
          </p>
          <p className="mt-1 text-[15px] text-foreground/70">{plan.note}</p>
          <ul className="mb-7 mt-5 space-y-2.5">
            {plan.items.map((item) => (
              <li key={item} className="flex gap-2.5 text-[15px]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-card-raised/80">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" variant={plan.featured ? "default" : "secondary"} className={cn("mt-auto w-full", !plan.featured && "bg-card-raised")}>
            <Link to={plan.cta.to}>{plan.cta.label}</Link>
          </Button>
        </Reveal>
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── FAQ */

const FAQ = [
  {
    q: "ما هي THE SMART؟",
    a: "منصة جزائرية للتحضير لشهادة البكالوريا: مواضيع الدورات من 2008 إلى 2026 بحلولها الرسمية، حلول خطوة بخطوة بالذكاء الاصطناعي، سؤال يومي، دفتر أخطاء ومراجعة في وقتها، ومعلّم ذكي يجيب بالعربية.",
  },
  {
    q: "هل المنصة مجانية؟",
    a: "التسجيل مجاني ويمنحك كل المواضيع وحلولها الرسمية، سؤال اليوم، دفتر الأخطاء، التقويم والتقرير الأسبوعي. العرض المميّز (700 دج شهرياً) يفتح الحلول خطوة بخطوة، المعلّم الذكي، البطاقات، الاختبارات والامتحان التجريبي.",
  },
  {
    q: "لأي شعبة ولأي مواد؟",
    a: "المحتوى المتوفّر اليوم في الرياضيات والفيزياء لشعب العلوم التجريبية والرياضيات والتقني رياضي، مطابقاً لمنهاج البكالوريا الجزائري.",
  },
  {
    q: "كيف تُكتب حلول الذكاء الاصطناعي؟",
    a: "كل حل مبني على الحل الرسمي للموضوع: يشرحه الذكاء الاصطناعي خطوة بخطوة مع نص السؤال والنتيجة والخطأ الشائع. يبقى شرحاً مساعداً وليس الحل الرسمي نفسه، والحل الرسمي متاح لك دائماً. وإن لم تفهم خطوة، اسأل عنها مباشرة.",
  },
  {
    q: "هل تعمل على الهاتف؟",
    a: "نعم، من المتصفح على الهاتف والحاسوب واللوحة، دون تثبيت أي تطبيق.",
  },
  {
    q: "كيف أدفع الاشتراك؟",
    a: "عبر بريد الجزائر (CCP) أو التحويل البنكي: ترسل الإيصال من صفحة الأسعار ويُفعَّل حسابك خلال 24 ساعة.",
  },
  {
    q: "هل يمكن لثانويتي الانضمام؟",
    a: "نعم. عرض المؤسسات يمنح حسابات جماعية للطلاب، ترتيباً خاصاً بالثانوية وتقارير تقدّم. قدّموا طلباً من صفحة الأسعار.",
  },
];

function Faq() {
  return (
    <div className="divide-y divide-border rounded-card bg-card px-5 shadow-soft sm:px-8">
      {FAQ.map((item) => (
        <details key={item.q} className="faq group py-2">
          <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl py-4 text-lg font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {item.q}
            <span className="faq-plus flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-raised">
              <Plus className="h-4 w-4" aria-hidden />
            </span>
          </summary>
          <p className="faq-body pb-5 text-[17px] leading-[1.95] text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── page */

const LandingPage = () => {
  const days = daysUntilBac();

  // fetch the demo's chunk (KaTeX) right after the first paint, not on scroll
  useEffect(() => {
    const id = window.setTimeout(() => void loadDemo(), 1200);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="landing min-h-screen overflow-x-clip">
      <Header />
      <main>
        <Hero days={days} />

        <Statistic />

        <section id="method" className="mx-auto grid grid-cols-1 max-w-[1320px] scroll-mt-24 items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-32">
          <SectionHead eyebrow="الطريقة" title={<>طريقة، لا مجرّد <Accent>محتوى</Accent></>}>
            <p>
              كل ما تفعله على المنصة يغذّي ما بعده: <mark className="marker mint">سؤال اليوم</mark> يكشف أخطاءك، والأخطاء تتحوّل إلى{" "}
              <mark className="marker pink">مراجعات في وقتها</mark>، والمراجعات ترفع <mark className="marker lav">مستواك في كل فصل</mark>، حتى تجرّب امتحاناً كاملاً
              بالتوقيت.
            </p>
          </SectionHead>
          <MethodLoop />
        </section>

        <section id="demo" className="scroll-mt-24">
          <Wave />
          <div className="bg-card py-20 lg:py-28">
            <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
              <SectionHead center eyebrow="جرّبه بعينك" title={<>حلّ موضوع بكالوريا <Accent>خطوة بخطوة</Accent></>}>
                <p>
                  حلول مبنية على <mark className="marker">الحل الرسمي</mark> لكل موضوع، مع نص السؤال والخطوات والنتيجة، والخطأ الذي يقع فيه أغلب الطلاب. ثم اسأل عن
                  أي خطوة لم تفهمها.
                </p>
              </SectionHead>
              <Reveal className="mt-12" delay={150}>
                <Suspense fallback={<div className="min-h-[1400px] rounded-[32px] bg-card-raised/60 lg:min-h-[640px]" />}>
                  <ProductDemo />
                </Suspense>
              </Reveal>
            </div>
          </div>
          <Wave flip />
        </section>

        <section id="features" className="mx-auto max-w-[1320px] scroll-mt-24 px-4 py-24 sm:px-6 lg:py-32">
          <SectionHead center eyebrow="المميزات" title={<>كل ما تحتاجه، <Accent>من أول درس إلى يوم الامتحان</Accent></>} />
          <div className="mt-20">
            <FeatureStories />
          </div>
        </section>

        <Numbers />

        <section className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 lg:py-32">
          <SectionHead eyebrow="لمن" title={<>طالب أو ثانوية: <Accent>لكلٍّ مساحته</Accent></>} />
          <div className="mt-12">
            <Audiences />
          </div>
        </section>

        <section aria-labelledby="ribbons-h" className="pb-24 lg:pb-32">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
            <SectionHead center eyebrow="المنهاج كاملاً" title={<span id="ribbons-h">كل فصول المنهاج، <Accent>كل الدورات</Accent></span>} />
          </div>
          <div className="mt-12">
            <Ribbons />
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-[1320px] scroll-mt-24 px-4 pb-24 sm:px-6 lg:pb-32">
          <SectionHead eyebrow="الأسعار" title={<>سعر واحد، <Accent>واضح</Accent></>}>
            <p>
              ابدأ مجاناً واشترك متى شئت. الدفع عبر <strong className="font-semibold text-foreground">بريد الجزائر (CCP)</strong> أو التحويل البنكي: ترسل الإيصال
              ويُفعَّل حسابك خلال 24 ساعة.
            </p>
          </SectionHead>
          <div className="mt-12">
            <Pricing />
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] px-4 pb-24 sm:px-6 lg:pb-32">
          <Reveal from="pop" className="relative overflow-hidden rounded-[36px] bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 sm:py-20">
            <Floaters
              shapes={[
                { className: "left-[8%] top-10 h-12 w-12 bg-tone-lav opacity-80", rotate: 14 },
                { className: "right-[10%] top-16 h-8 w-8 bg-tone-peach opacity-80", delay: 900, rotate: -10 },
                { className: "bottom-10 left-[22%] h-6 w-6 bg-tone-mint opacity-80", delay: 400, duration: 12 },
                { className: "bottom-12 right-[20%] h-10 w-10 bg-tone-pink opacity-70", delay: 1500, rotate: 24, duration: 17 },
              ]}
            />
            <p className="relative text-[15px] opacity-80">{BAC_SESSION_LABEL}</p>
            <p className="relative mt-4 text-[80px] font-semibold leading-none tracking-tight sm:text-[112px]">
              <CountUp to={days} duration={1800} />
            </p>
            <p className="relative mt-2 text-lg opacity-80">يوماً على البكالوريا</p>
            <h2 className="relative mx-auto mt-8 max-w-2xl text-balance text-[34px] font-light leading-[1.2] sm:text-[48px]">
              جاهز لـ<Accent>يوم الامتحان</Accent>؟
            </h2>
            <div className="relative mt-9 flex flex-wrap justify-center gap-3">
              <Button asChild size="xl" variant="secondary" className="bg-card-raised text-foreground hover:bg-card">
                <Link to="/login">ابدأ مجاناً</Link>
              </Button>
              <Button asChild size="xl" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/login">لديّ حساب</Link>
              </Button>
            </div>
          </Reveal>
        </section>

        <section id="faq" className="mx-auto grid grid-cols-1 max-w-[1320px] scroll-mt-24 gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:pb-32">
          <SectionHead eyebrow="أسئلة" title={<>أسئلة <Accent>شائعة</Accent></>}>
            <p>الإجابات القصيرة عن أكثر ما يُسأل.</p>
          </SectionHead>
          <Reveal delay={120}>
            <Faq />
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid grid-cols-1 max-w-[1320px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/favicon.svg" alt="" className="h-9 w-9" aria-hidden />
              <span className="text-lg font-semibold tracking-tight">THE SMART</span>
            </Link>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">منصة التحضير لبكالوريا الجزائر، مطابقة للمنهاج الرسمي.</p>
          </div>
          <nav aria-label="روابط" className="grid grid-cols-2 gap-2 text-[15px] text-muted-foreground">
            {NAV.map((item) => (
              <button key={item.id} onClick={() => scrollToId(item.id)} className="w-fit hover:text-foreground">
                {item.label}
              </button>
            ))}
            <Link to="/login" className="w-fit hover:text-foreground">
              تسجيل الدخول
            </Link>
            <Link to="/pricing" className="w-fit hover:text-foreground">
              عرض المؤسسات
            </Link>
          </nav>
          <div className="space-y-2 text-[15px] text-muted-foreground">
            <p className="text-foreground">اتصل بنا</p>
            <p dir="ltr" className="text-end">
              <a href="tel:+213798834763" className="tabular hover:text-foreground">
                0798 83 47 63
              </a>
            </p>
            <p dir="ltr" className="text-end">
              <a href="mailto:a.chabouti@esi-sba.dz" className="hover:text-foreground">
                a.chabouti@esi-sba.dz
              </a>
            </p>
          </div>
        </div>
        <p className="tabular border-t border-border py-6 text-center text-[13px] text-muted-foreground">© 2026 THE SMART — الجزائر</p>
      </footer>
    </div>
  );
};

export default LandingPage;

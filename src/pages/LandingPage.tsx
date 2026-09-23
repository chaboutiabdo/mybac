import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Crown, FileText, Menu, PlayCircle, Sparkles, X } from "lucide-react";

import FilterPills, { STREAM_OPTIONS } from "@/components/FilterPills";
import { Button } from "@/components/ui/button";
import { TONE_BG, type Tone } from "@/lib/bac";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "features", label: "المميزات" },
  { id: "pricing", label: "الأسعار" },
  { id: "contact", label: "اتصل بنا" },
];

const FEATURES: { icon: typeof FileText; title: string; body: string; tone: Tone }[] = [
  {
    icon: FileText,
    title: "142 موضوع بكالوريا",
    body: "من 2008 إلى 2025، الدورتان العادية والاستدراكية، مع الحلول النموذجية.",
    tone: "pink",
  },
  {
    icon: Check,
    title: "اختبار يومي مصحّح",
    body: "اثنا عشر سؤالًا كل يوم، تصحيح فوري، ونقاط تُضاف إلى ترتيبك.",
    tone: "mint",
  },
  {
    icon: PlayCircle,
    title: "دروس حسب الفصول",
    body: "عشرة فصول في الرياضيات وستة في الفيزياء، بترتيب المنهاج الرسمي.",
    tone: "lav",
  },
  {
    icon: Sparkles,
    title: "أستاذ بالذكاء الاصطناعي",
    body: "يشرح بالعربية مع الوحدات بالفرنسية، تمامًا كما تُكتب في ورقة الامتحان.",
    tone: "peach",
  },
];

const FREE = ["كل مواضيع البكالوريا والحلول", "الاختبار اليومي", "الدروس المجانية"];

const PREMIUM = [
  "كل ما في العرض المجاني",
  "الأستاذ بالذكاء الاصطناعي",
  "اختبارات تدريب غير محدودة",
  "الدروس المميّزة وملخّص شهري لتقدّمك",
];

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center gap-8 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-10 w-10" aria-hidden />
            <span className="text-xl font-semibold tracking-tight">THE SMART</span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
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
              <Link to="/login">ابدأ مجانًا</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="القائمة"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <nav className="mx-4 mb-3 flex flex-col rounded-3xl bg-card p-2 shadow-pop md:hidden">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="flex h-11 items-center rounded-2xl px-4 text-base hover:bg-card-raised"
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-[1320px] space-y-24 px-4 pb-16 pt-10 sm:px-6 lg:pt-16">
        {/* ------------------------------------------------------------ hero */}
        <section className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-[15px] shadow-soft">
              <span className="h-2 w-2 rounded-full bg-tone-mint-strong" />
              مطابق لمنهاج البكالوريا الجزائري
            </span>
            {/* balanced so no word is left alone on the last line */}
            <h1 className="mt-6 text-balance text-[48px] font-light leading-[1.08] tracking-tight sm:text-[64px] xl:text-[76px]">
              راجع للبكالوريا بالمواضيع التي تُطرح فعلًا
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-[1.85] text-muted-foreground">
              مواضيع بكالوريا من 2008 إلى 2025 مع حلولها، اختبار يومي مصحّح فورًا، ودروس مصوّرة تتبع الفصول
              الرسمية للرياضيات والفيزياء.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="xl">
                <Link to="/login">ابدأ مجانًا</Link>
              </Button>
              <Button size="xl" variant="secondary" className="shadow-soft" onClick={() => scrollTo("features")}>
                شاهد ما تحصل عليه
                <ArrowLeft aria-hidden />
              </Button>
            </div>
            <p className="mt-4 text-[15px] text-muted-foreground">لا حاجة لبطاقة بنكية · الاختبار اليومي مجاني للأبد</p>
          </div>

          {/* the product itself, not a decorative circle */}
          <div className="rounded-card bg-tone-lav p-5 shadow-pop">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-card-raised/70 px-3 py-1.5 text-[13px] backdrop-blur">
                الاختبار اليومي — الرياضيات
              </span>
              <span className="tabular rounded-full bg-primary px-3 py-1.5 text-[13px] text-primary-foreground">21:34</span>
            </div>
            <p className="tabular mt-8 text-[13px] text-foreground/70">السؤال 5 من 12</p>
            <p className="mt-1 text-xl font-medium leading-relaxed">
              ما هي مشتقة الدالة{" "}
              <span dir="ltr" className="inline-block italic">
                f(x) = ln(3x² + 1)
              </span>{" "}
              ؟
            </p>
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center gap-3 rounded-2xl bg-primary p-3.5 text-primary-foreground">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 text-sm">
                  أ
                </span>
                <span dir="ltr" className="flex-1 text-start font-medium">
                  f ′(x) = 6x / (3x² + 1)
                </span>
                <Check className="h-4 w-4 shrink-0" aria-hidden />
              </div>
              {["f ′(x) = 6x · ln(3x² + 1)", "f ′(x) = 1 / (3x² + 1)"].map((opt, i) => (
                <div key={opt} className="flex items-center gap-3 rounded-2xl bg-card-raised/80 p-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                    {["ب", "ج"][i]}
                  </span>
                  <span dir="ltr" className="flex-1 text-start">
                    {opt}
                  </span>
                </div>
              ))}
            </div>
            <p className="tabular mt-4 text-[15px] font-medium">+25 نقطة</p>
          </div>
        </section>

        {/* --------------------------------------------------------- streams */}
        <section>
          <h2 className="text-[15px] font-medium">لكل الشعب الست</h2>
          <div className="mt-4">
            <FilterPills label="الشعب" options={STREAM_OPTIONS} />
          </div>
        </section>

        {/* -------------------------------------------------------- features */}
        <section id="features" className="scroll-mt-24">
          <h2 className="text-[40px] font-light tracking-tight sm:text-[52px]">ما الذي تحصل عليه</h2>
          <p className="mt-2 text-lg text-muted-foreground">أربع أدوات، كلّها مبنية على المنهاج الرسمي — لا محتوى عام مترجم.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((f) => (
              <article key={f.title} className={cn("rounded-card p-5 shadow-soft", TONE_BG[f.tone])}>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card-raised/70 backdrop-blur">
                  <f.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </span>
                <h3 className="mt-10 text-[22px] font-medium leading-snug">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.8] text-foreground/75">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------------- pricing */}
        <section id="pricing" className="grid scroll-mt-24 gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <h2 className="text-[40px] font-light tracking-tight sm:text-[52px]">سعر واحد، واضح</h2>
            <p className="mt-3 text-lg leading-[1.85] text-muted-foreground">
              ابدأ مجانًا واشترك متى شئت. الدفع عبر <strong className="font-semibold text-foreground">بريد الجزائر (CCP)</strong>{" "}
              أو التحويل البنكي — ترسل الإيصال ويُفعَّل حسابك خلال 24 ساعة.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { name: "المجاني", price: "0", unit: "دج", note: "للأبد", items: FREE, primary: false },
              { name: "المميّز", price: "700", unit: "دج / شهر", note: "يُلغى في أي وقت", items: PREMIUM, primary: true },
            ].map((plan) => (
              <article
                key={plan.name}
                className={cn("flex flex-col rounded-card p-6 shadow-soft", plan.primary ? "bg-tone-peach" : "bg-card")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">{plan.name}</span>
                  {plan.primary && (
                    <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[13px] text-primary-foreground">
                      <Crown className="h-3.5 w-3.5 text-tone-peach" aria-hidden />
                      الأكثر طلبًا
                    </span>
                  )}
                </div>
                <p className="mt-5 flex items-baseline gap-2">
                  <span className="tabular text-[48px] font-semibold leading-none tracking-tight">{plan.price}</span>
                  <span className="text-lg text-foreground/70">{plan.unit}</span>
                </p>
                <p className="mt-1 text-[15px] text-foreground/70">{plan.note}</p>
                <ul className="mb-6 mt-5 space-y-2.5">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[15px]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-card-raised/80">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button asChild size="lg" variant={plan.primary ? "default" : "secondary"} className={cn("mt-auto w-full", !plan.primary && "bg-card-raised")}>
                  <Link to={plan.primary ? "/pricing" : "/login"}>{plan.primary ? "اشترك" : "ابدأ الآن"}</Link>
                </Button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer id="contact" className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-8 sm:px-6">
        <span className="tabular text-[15px] text-muted-foreground">© 2026 THE SMART — الجزائر العاصمة</span>
        <span className="text-[15px] text-muted-foreground" dir="ltr">
          <a href="tel:+213798834763" className="tabular hover:text-foreground">0798 83 47 63</a>
          <span className="mx-2">·</span>
          <a href="mailto:a.chabouti@esi-sba.dz" className="hover:text-foreground">a.chabouti@esi-sba.dz</a>
        </span>
      </footer>
    </div>
  );
};

export default LandingPage;

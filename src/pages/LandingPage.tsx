import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  FileText,
  Menu,
  PlayCircle,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "features", label: "المميزات" },
  { id: "pricing", label: "الأسعار" },
  { id: "contact", label: "اتصل بنا" },
];

const FEATURES = [
  {
    icon: FileText,
    title: "142 موضوع بكالوريا",
    body: "من 2008 إلى 2025، الدورتان العادية والاستدراكية، مع الحلول النموذجية.",
  },
  {
    icon: Check,
    title: "اختبار يومي مصحّح",
    body: "اثنا عشر سؤالًا كل يوم، تصحيح فوري، ونقاط تُضاف إلى ترتيبك.",
  },
  {
    icon: PlayCircle,
    title: "دروس حسب الفصول",
    body: "عشرة فصول في الرياضيات وستة في الفيزياء، بترتيب المنهاج الرسمي.",
  },
  {
    icon: Sparkles,
    title: "أستاذ بالذكاء الاصطناعي",
    body: "يشرح بالعربية مع الوحدات بالفرنسية، تمامًا كما تُكتب في ورقة الامتحان.",
  },
];

const FREE = [
  "كل مواضيع البكالوريا والحلول",
  "الاختبار اليومي",
  "الدروس المجانية",
];

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
    <div className="pattern-field min-h-screen bg-background">
      {/* ---------------------------------------------------------- header */}
      <header className="sticky top-0 z-50 border-b border-border-gold/30 bg-gradient-to-b from-card-raised to-card shadow-raised">
        <div className="container flex h-[72px] items-center gap-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-9 w-9" aria-hidden />
            <span className="font-display text-xl font-bold tracking-tight">THE SMART</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-base text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2.5">
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">تسجيل الدخول</Button>
            </Link>
            <Link to="/login">
              <Button size="sm">ابدأ مجانًا</Button>
            </Link>
            {/* The old hamburger rendered but had no state and opened nothing. */}
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
          <div className="border-t border-border bg-card md:hidden">
            <nav className="container flex flex-col py-2">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="flex h-11 items-center text-base text-muted-foreground"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="hero-vignette relative border-b border-border-gold/25 bg-gradient-to-b from-card-raised/70 to-background">
        <div className="container relative z-10 grid items-center gap-14 py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center rounded-full border border-border-gold/50 bg-accent-light px-4 py-1.5 text-sm font-medium text-accent">
              مطابق لمنهاج البكالوريا الجزائري
            </span>
            <h1 className="mt-6 font-display text-[44px] font-bold leading-[1.28] tracking-tight text-pretty md:text-[58px]">
              راجع للبكالوريا بالمواضيع التي
              <br className="hidden sm:block" /> تُطرح فعلًا في الامتحان
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-[1.85] text-muted-foreground">
              مواضيع بكالوريا من 2008 إلى 2025 مع حلولها، اختبار يومي مصحّح فورًا،
              ودروس مصوّرة تتبع الفصول الرسمية للرياضيات والفيزياء.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link to="/login">
                <Button size="xl" variant="gold">ابدأ مجانًا</Button>
              </Link>
              <Button size="xl" variant="outline" onClick={() => scrollTo("features")}>
                شاهد ما تحصل عليه
                <ArrowLeft className="ms-2 h-4 w-4" aria-hidden />
              </Button>
            </div>
            <p className="mt-3.5 text-[15px] text-muted-foreground">
              لا حاجة لبطاقة بنكية · الاختبار اليومي مجاني للأبد
            </p>
          </div>

          {/* The product itself, not a decorative circle. */}
          <Card className="edge-gold overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-surface-deep/70 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="ms-2 text-[13px] text-muted-foreground">
                الاختبار اليومي — الرياضيات
              </span>
            </div>
            <CardContent className="p-5">
              <p className="text-[13px] text-muted-foreground tabular">السؤال 5 من 12</p>
              <p className="mt-1.5 text-[17px] font-semibold leading-relaxed">
                ما هي مشتقة الدالة{" "}
                <span dir="ltr" className="inline-block italic">f(x) = ln(3x² + 1)</span> ؟
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-3 rounded-md border border-success/25 bg-success-light px-3 py-2.5 text-[15px]">
                  <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-sm bg-success text-[13px] font-semibold text-success-foreground">
                    أ
                  </span>
                  <span dir="ltr" className="flex-1 font-medium">f ′(x) = 6x / (3x² + 1)</span>
                  <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
                </div>
                {["f ′(x) = 6x · ln(3x² + 1)", "f ′(x) = 1 / (3x² + 1)"].map((opt, i) => (
                  <div
                    key={opt}
                    className="flex items-center gap-3 rounded-md border border-input px-3 py-2.5 text-[15px] text-muted-foreground"
                  >
                    <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-sm border border-input text-[13px] font-semibold">
                      {["ب", "ج"][i]}
                    </span>
                    <span dir="ltr">{opt}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground tabular">
                <span>+25 نقطة</span>
                <span>21:34 متبقية</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* -------------------------------------------------------- features */}
      <section id="features" className="border-b border-border">
        <div className="container py-14">
          <h2 className="font-display text-[32px] font-bold tracking-tight">ما الذي تحصل عليه</h2>
          <p className="mt-1.5 text-base text-muted-foreground">
            أربع أدوات، كلّها مبنية على المنهاج الرسمي — لا محتوى عام مترجم.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardContent className="p-5">
                  <f.icon className="h-5 w-5 text-primary" strokeWidth={1.5} aria-hidden />
                  <h3 className="mt-3.5 text-[17px] font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.8] text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- pricing */}
      <section id="pricing" className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="container grid gap-12 py-14 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <h2 className="font-display text-[32px] font-bold tracking-tight">سعر واحد، واضح</h2>
            <p className="mt-2.5 text-base leading-[1.85] text-muted-foreground">
              ابدأ مجانًا واشترك متى شئت. الدفع عبر{" "}
              <strong className="font-semibold text-foreground">بريد الجزائر (CCP)</strong>{" "}
              أو التحويل البنكي — ترسل الإيصال ويُفعَّل حسابك خلال 24 ساعة.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "المجاني", price: "0", unit: "دج", note: "للأبد", items: FREE, primary: false },
              { name: "المميّز", price: "700", unit: "دج / شهر", note: "يُلغى في أي وقت", items: PREMIUM, primary: true },
            ].map((plan) => (
              <Card key={plan.name} className={cn("relative", plan.primary && "edge-gold")}>
                {plan.primary && (
                  <span className="absolute -top-3 start-5 rounded-full bg-accent px-3 py-1 text-[13px] font-semibold text-accent-foreground">
                    الأكثر طلبًا
                  </span>
                )}
                <CardContent className="p-5">
                  <p className="text-base font-semibold">{plan.name}</p>
                  <p className="mt-3 font-display text-[40px] font-bold tracking-tight tabular">
                    {plan.price}
                    <span className="text-[17px] font-normal text-muted-foreground"> {plan.unit}</span>
                  </p>
                  <p className="mb-4 mt-0.5 text-sm text-muted-foreground">{plan.note}</p>
                  <ul className="space-y-2.5">
                    {plan.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[15px] text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link to={plan.primary ? "/pricing" : "/login"} className="mt-5 block">
                    <Button variant={plan.primary ? "gold" : "outline"} size="lg" className="w-full">
                      {plan.primary ? "اشترك" : "ابدأ الآن"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- footer */}
      <footer id="contact" className="container flex flex-wrap items-center justify-between gap-4 py-8">
        <span className="text-[15px] text-muted-foreground tabular">
          © 2026 THE SMART — الجزائر العاصمة
        </span>
        {/* Marked placeholders: the app shipped `+213 XXX XXX XXX`. */}
        <span className="text-[15px] text-muted-foreground">
          <span className="border-b border-dashed border-warning/60 bg-warning-light px-1 text-warning">
            [رقم الهاتف]
          </span>
          <span className="mx-2">·</span>
          <span className="border-b border-dashed border-warning/60 bg-warning-light px-1 text-warning">
            [البريد الإلكتروني]
          </span>
        </span>
      </footer>
    </div>
  );
};

export default LandingPage;

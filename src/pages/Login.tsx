import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn, signUp, user, profile } = useAuth();

  const selectedPlan = sessionStorage.getItem("selectedPlan");

  if (user && profile) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn(email, password);
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, name, phone, selectedPlan ?? undefined);
    if (!error) sessionStorage.removeItem("selectedPlan");
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error("أدخل بريدك الإلكتروني", { description: "اكتب البريد المرتبط بحسابك أولًا." });
      return;
    }

    setResettingPassword(true);
    setResetEmailSent(false);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResettingPassword(false);

    if (error) {
      toast.error("تعذّر الإرسال", { description: error.message });
      return;
    }

    setResetEmailSent(true);
    toast.success("تم إرسال الرابط", { description: "تحقّق من بريدك لتعيين كلمة مرور جديدة." });
  };

  const facts = [
    { value: "142", label: "موضوع بكالوريا" },
    { value: "2008", label: "أقدم دورة متوفّرة" },
    { value: "16", label: "فصلًا مغطّى" },
    { value: "700", label: "دج شهريًا للمميّز", accent: true },
  ];

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-9 w-9" aria-hidden />
            <span className="font-display text-[22px] font-bold tracking-tight">THE SMART</span>
          </div>

          <h1 className="font-display text-[34px] font-bold tracking-tight">أهلًا بعودتك</h1>
          <p className="mt-1.5 text-base text-muted-foreground">
            سجّل الدخول لمتابعة تحضيرك للبكالوريا.
          </p>

          <Tabs defaultValue="login" className="mt-6 w-full">
            <TabsList>
              <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="signup">حساب جديد</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline disabled:opacity-60"
                      onClick={handlePasswordReset}
                      disabled={resettingPassword || loading}
                    >
                      {resettingPassword ? "جارٍ الإرسال…" : "نسيت كلمة المرور؟"}
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  {resetEmailSent && (
                    <p className="text-sm text-success">تم إرسال الرابط إلى بريدك.</p>
                  )}
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name">الاسم الكامل</Label>
                  <Input
                    id="signup-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-phone">رقم الهاتف</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    dir="ltr"
                    placeholder="+213 555 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    dir="ltr"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">كلمة المرور</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <p className="text-sm text-muted-foreground">6 أحرف على الأقل.</p>
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "جارٍ إنشاء الحساب…" : "إنشاء حساب مجاني"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* brand panel */}
      <div className="pattern-field hero-vignette relative hidden flex-col justify-center gap-10 border-s border-border-gold/25 bg-gradient-to-br from-card-raised via-card to-surface-deep px-12 py-14 lg:flex">
        <div>
          <p className="relative z-10 text-sm font-semibold tracking-[0.14em] text-accent">
            منصة التحضير للبكالوريا
          </p>
          <h2 className="relative z-10 mt-4 font-display text-[40px] font-bold leading-[1.45] tracking-tight">
            كل مواضيع البكالوريا،
            <br />
            وكل حلولها، في مكان واحد.
          </h2>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border-gold/30 bg-border-gold/20">
          {facts.map((f) => (
            <div key={f.label} className="bg-card px-5 py-5">
              <div
                className={`text-2xl font-bold tabular ${
                  f.accent ? "text-accent" : "text-primary-foreground"
                }`}
              >
                {f.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{f.label}</div>
            </div>
          ))}
        </div>

        <blockquote className="relative z-10 border-s-2 border-accent ps-5">
          <p className="text-[17px] leading-[1.9] text-foreground/90">
            «ركّز على فهم المفاهيم لا على الحفظ فقط — البكالوريا تختبر مهارات التفكير لديك.»
          </p>
          <footer className="mt-3 text-sm text-muted-foreground">
            نصيحة من خرّيجي الدفعات السابقة
          </footer>
        </blockquote>
      </div>
    </div>
  );
};

export default Login;

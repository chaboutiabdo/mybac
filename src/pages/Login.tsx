import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { passwordProblem } from "@/lib/utils";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("login");
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
    const problem = passwordProblem(password);
    if (problem) {
      toast.error("كلمة المرور ضعيفة", { description: problem });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, name, phone, selectedPlan ?? undefined, city);
    if (!error) sessionStorage.removeItem("selectedPlan");
    // the email is shared by both forms, so the sign-in form is ready to go
    if (error?.code === "user_already_exists") setTab("login");
    setLoading(false);
  };

  // The free Supabase mailer only delivers to the owner's own team, so a reset
  // email would never reach a student. Until a real SMTP service is set up,
  // resets go through the owner by hand.
  const handlePasswordReset = () => {
    toast.info("استعادة كلمة المرور", {
      description: "راسلنا من بريدك المسجّل على a.chabouti@esi-sba.dz وسنعيد تعيين كلمة المرور لك.",
      duration: 10000,
    });
  };

  const facts = [
    { value: "114", label: "موضوع بكالوريا", tone: "bg-tone-pink" },
    { value: "2008", label: "أقدم دورة متوفّرة", tone: "bg-tone-mint" },
    { value: "16", label: "فصلًا مغطّى", tone: "bg-tone-lav" },
    { value: "700", label: "دج شهريًا للمميّز", tone: "bg-tone-peach" },
  ];

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-10 w-10" aria-hidden />
            <span className="text-[22px] font-semibold tracking-tight">THE SMART</span>
          </div>

          <h1 className="text-[44px] font-light leading-tight tracking-tight">أهلًا بعودتك</h1>
          <p className="mt-2 text-base text-muted-foreground">
            سجّل الدخول لمتابعة تحضيرك للبكالوريا.
          </p>

          <Tabs value={tab} onValueChange={setTab} className="mt-8 w-full">
            <TabsList className="w-full">
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
                      disabled={loading}
                    >
                      نسيت كلمة المرور؟
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
                  <Label htmlFor="signup-city">مدينتك (اختياري)</Label>
                  <Input
                    id="signup-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="مثال: وهران"
                    disabled={loading}
                  />
                  <p className="text-sm text-muted-foreground">
                    لمقارنة ترتيبك مع طلاب مدينتك في «أفضل الطلاب».
                  </p>
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
                    minLength={8}
                  />
                  <p className="text-sm text-muted-foreground">8 أحرف على الأقل، حروف وأرقام.</p>
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
      <div className="m-4 hidden flex-col justify-center gap-10 rounded-[32px] bg-card px-12 py-14 shadow-soft lg:flex">
        <div>
          <span className="inline-flex rounded-full bg-card-raised px-4 py-1.5 text-[15px]">منصة التحضير للبكالوريا</span>
          <h2 className="mt-5 text-[48px] font-light leading-[1.15] tracking-tight">
            كل مواضيع البكالوريا، وكل حلولها، في مكان واحد.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {facts.map((f) => (
            <div key={f.label} className={`rounded-3xl px-5 py-5 ${f.tone}`}>
              <div className="tabular text-[32px] font-semibold leading-none">{f.value}</div>
              <div className="mt-2 text-[15px] text-foreground/75">{f.label}</div>
            </div>
          ))}
        </div>

        <blockquote className="rounded-3xl bg-card-raised p-5">
          <p className="text-[17px] leading-[1.9]">
            «ركّز على فهم المفاهيم لا على الحفظ فقط — البكالوريا تختبر مهارات التفكير لديك.»
          </p>
          <footer className="mt-3 text-[15px] text-muted-foreground">نصيحة من خرّيجي الدفعات السابقة</footer>
        </blockquote>
      </div>
    </div>
  );
};

export default Login;

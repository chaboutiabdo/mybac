import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { passwordProblem } from "@/lib/utils";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fromRecoveryLink, setFromRecoveryLink] = useState(false);
  const navigate = useNavigate();

  // This page used to change the password of whatever session happened to be
  // live, so anyone sitting at an already-signed-in browser could take the
  // account over. supabase-js parses the emailed recovery token on load and
  // fires PASSWORD_RECOVERY; only that session may set a new password here.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setFromRecoveryLink(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromRecoveryLink) {
      toast.error("افتح الرابط من بريدك", {
        description: "لتغيير كلمة المرور اطلب رابطًا جديدًا من صفحة الدخول.",
      });
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      toast.error("كلمة المرور ضعيفة", { description: problem });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين", { description: "أكّد كلمة المرور الجديدة." });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error("تعذّر تغيير كلمة المرور", { description: error.message });
      return;
    }

    toast.success("تم تحديث كلمة المرور", { description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة." });
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">تعيين كلمة مرور جديدة</CardTitle>
          <CardDescription>
            اكتب كلمة المرور الجديدة. تعمل هذه الصفحة فقط من رابط الاستعادة المرسل إلى بريدك.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="8 أحرف على الأقل، حروف وأرقام"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="أعد كتابة كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !fromRecoveryLink}>
              {loading ? "جارٍ التحديث…" : "تحديث كلمة المرور"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground mt-4">
            Didn&apos;t open this page from the email link? Please request a new reset link from the login page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;


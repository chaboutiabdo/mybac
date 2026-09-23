import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, User } from "lucide-react";
import { toast } from "sonner";

import { STREAMS } from "@/lib/bac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, passwordProblem } from "@/lib/utils";

/**
 * Account settings.
 *
 * The notifications, appearance and language cards used to live here as local
 * state that was never read or persisted — the switches did nothing, the dark
 * mode toggle pointed at a theme that no longer exists, and the language select
 * was not wired to LanguageContext. They are gone, along with a "Download my
 * data" button that had no handler.
 */
const Settings = () => {
  const { profile, signOut, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [stream, setStream] = useState("");
  const [city, setCity] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
      setStream(profile.stream ?? "");
      setCity(profile.city ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        // No `email` here. profiles.email is account identity — the admin
        // roster shows it and a premium receipt is bound to it — so the
        // database pins it, and a confirmed auth.updateUser below is the only
        // thing that may change it. A trigger mirrors it back.
        .update({
          name,
          stream: stream || null,
          city: city.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) {
          toast.error("تعذّر تحديث البريد", {
            description: "حُفظت بقيّة البيانات. أكّد بريدك الحالي أولًا.",
          });
        }
      }

      // used to be a full window.location.reload()
      await refreshProfile();
      toast.success("تم حفظ التغييرات");
    } catch (error) {
      toast.error("تعذّر الحفظ", { description: errorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const problem = passwordProblem(newPassword);
    if (problem) {
      toast.error("كلمة المرور ضعيفة", { description: problem });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("تم تحديث كلمة المرور");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordDialogOpen(false);
    } catch (error) {
      toast.error("تعذّر تغيير كلمة المرور", { description: errorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
        <div className="mx-auto max-w-2xl space-y-6">
          <PageHeader title="الإعدادات" subtitle="بيانات حسابك وكلمة المرور." />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tone-lav">
                  <User className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                </span>
                معلومات الحساب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  تغيير البريد يتطلّب تأكيدًا من بريدك الحالي.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stream">الشعبة</Label>
                <Select value={stream} onValueChange={setStream}>
                  <SelectTrigger id="stream">
                    <SelectValue placeholder="اختر شعبتك" />
                  </SelectTrigger>
                  <SelectContent>
                    {STREAMS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  تُستعمل لعرض معاملات موادّك وتصفية المحتوى.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">مدينتك</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: وهران" />
                <p className="text-sm text-muted-foreground">
                  لمقارنة ترتيبك مع طلاب مدينتك في «أفضل الطلاب».
                </p>
              </div>

              <Button onClick={handleSave} disabled={isLoading} size="lg">
                {isLoading ? "جارٍ الحفظ…" : "حفظ التغييرات"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tone-peach">
                  <Shield className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                </span>
                الأمان
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-card-raised">تغيير كلمة المرور</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تغيير كلمة المرور</DialogTitle>
                    <DialogDescription>
                      اختر كلمة مرور جديدة من 8 أحرف على الأقل، فيها حروف لاتينية وأرقام.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="ghost"
                      onClick={() => setIsPasswordDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button onClick={handleChangePassword} disabled={isLoading}>
                      {isLoading ? "جارٍ التحديث…" : "تحديث"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                <LogOut className="me-2 h-4 w-4" aria-hidden />
                تسجيل الخروج
              </Button>
            </CardContent>
          </Card>
        </div>
  );
};

export default Settings;

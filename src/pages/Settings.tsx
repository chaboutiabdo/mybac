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
import Navigation from "@/components/layout/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/utils";

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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
      setStream(profile.stream ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          email,
          stream: stream || null,
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
    if (newPassword.length < 6) {
      toast.error("كلمة المرور قصيرة", { description: "6 أحرف على الأقل." });
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
    <div className="pattern-field min-h-screen bg-background">
      <Navigation />

      <main className="container py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="font-display text-[34px] font-bold tracking-tight">الإعدادات</h1>
            <p className="mt-1 text-lg text-muted-foreground">
              بيانات حسابك وكلمة المرور.
            </p>
          </div>

          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2.5 font-display text-xl">
                <User className="h-5 w-5 text-accent" strokeWidth={1.6} aria-hidden />
                معلومات الحساب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
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

              <Button onClick={handleSave} disabled={isLoading} size="lg">
                {isLoading ? "جارٍ الحفظ…" : "حفظ التغييرات"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2.5 font-display text-xl">
                <Shield className="h-5 w-5 text-accent" strokeWidth={1.6} aria-hidden />
                الأمان
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 p-6">
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">تغيير كلمة المرور</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تغيير كلمة المرور</DialogTitle>
                    <DialogDescription>
                      اختر كلمة مرور جديدة من 6 أحرف على الأقل.
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
      </main>
    </div>
  );
};

export default Settings;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const emptySchoolForm = () => ({ name: "", email: "", phone: "", school: "", city: "", studentCount: "", message: "" });

const Pricing = () => {
  const { profile } = useAuth();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    phone: "",
    message: "",
  });
  // a double click used to file the same receipt twice
  const [submitting, setSubmitting] = useState(false);

  // Institutions inquiry — a school's own staff, not a signed-in student, so
  // this collects its own name/email rather than reading `profile`.
  const [isSchoolDialogOpen, setIsSchoolDialogOpen] = useState(false);
  const [schoolForm, setSchoolForm] = useState(emptySchoolForm());
  const [schoolSubmitting, setSchoolSubmitting] = useState(false);

  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolSubmitting(true);
    try {
      // support_requests carries every request type under one `type` column —
      // the school-specific fields are composed into `message` rather than
      // adding new columns for a single request type.
      const details = [
        `الثانوية: ${schoolForm.school}`,
        schoolForm.city ? `المدينة: ${schoolForm.city}` : null,
        schoolForm.studentCount ? `عدد الطلاب التقديري: ${schoolForm.studentCount}` : null,
        "",
        schoolForm.message,
      ]
        .filter((line) => line !== null)
        .join("\n");

      const { error } = await supabase.from("support_requests").insert([
        {
          name: schoolForm.name,
          email: schoolForm.email,
          phone: schoolForm.phone,
          message: details,
          type: "school_inquiry",
        },
      ]);
      if (error) throw error;

      toast.success("تم إرسال طلبكم بنجاح", { description: "سنتواصل معكم في أقرب وقت ممكن." });
      setIsSchoolDialogOpen(false);
      setSchoolForm(emptySchoolForm());
    } catch (error) {
      toast.error("حدث خطأ", { description: "يرجى المحاولة مرة أخرى لاحقاً" });
    } finally {
      setSchoolSubmitting(false);
    }
  };

  const handlePremiumSubscription = () => {
    setIsPaymentDialogOpen(true);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    try {
      // name and email come from the account, and the database stamps
      // requester_id, so the admin's approval upgrades exactly this account
      const { error } = await supabase.from("support_requests").insert([
        {
          name: profile.name,
          email: profile.email,
          phone: contactForm.phone,
          message: contactForm.message,
          type: "premium_subscription",
        },
      ]);

      if (error) throw error;

      toast.success("تم إرسال الرسالة بنجاح", { description: "سنقوم بالرد عليك في أقرب وقت ممكن لتأكيد اشتراكك المميز." });

      setIsContactDialogOpen(false);
      setContactForm({
        phone: "",
        message: "",
      });
    } catch (error) {
      toast.error("حدث خطأ", { description: "يرجى المحاولة مرة أخرى لاحقاً" });
    } finally {
      setSubmitting(false);
    }
  };

  const plans = [
    {
      name: "العرض المجاني",
      price: "0",
      unit: "دج",
      note: "للأبد",
      tone: "bg-card",
      features: ["الدروس المجانية", "كل مواضيع البكالوريا وحلولها", "الاختبار اليومي"],
      action: (
        <Button asChild size="lg" variant="secondary" className="w-full bg-card-raised">
          <Link to="/login">سجّل مجانًا</Link>
        </Button>
      ),
    },
    {
      name: "العرض المميّز",
      price: "700",
      unit: "دج / شهر",
      note: "يُلغى في أي وقت",
      tone: "bg-tone-peach",
      popular: true,
      features: [
        "جميع مزايا العرض المجاني",
        "المعلّم الذكي",
        "كل الاختبارات التدريبية",
        "الدروس المميّزة",
        "ملخص شهري لتقدّمك",
        "فرصة الفوز بجوائز عند التواجد ضمن أفضل الطلاب",
      ],
      action: (
        <Button size="lg" className="w-full" onClick={handlePremiumSubscription}>
          اشترك الآن
        </Button>
      ),
    },
    {
      name: "عرض المؤسسات",
      price: "للمدارس",
      note: "قدّم طلبًا للاستفادة",
      tone: "bg-tone-sky",
      features: [
        "عرض خاص بالمدارس والمؤسسات التعليمية",
        "تجهيز حسابات طلابية جماعية",
        "تقارير تقدّم للطلاب",
        "اشتراكات مخصّصة حسب الحاجة",
      ],
      action: (
        <Button size="lg" variant="secondary" className="w-full bg-card-raised/80" onClick={() => setIsSchoolDialogOpen(true)}>
          تواصل معنا
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link to="/" className="mb-10 flex w-fit items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-10 w-10" aria-hidden />
          <span className="text-xl font-semibold tracking-tight">THE SMART</span>
        </Link>

        <div className="mb-10 text-center">
          <h1 className="text-[44px] font-light tracking-tight sm:text-[56px]">خطط الاشتراك</h1>
          <p className="mt-2 text-lg text-muted-foreground">اختر الخطة المناسبة لك واستمتع بتجربة تعليمية متميزة</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`flex flex-col rounded-card p-6 shadow-soft ${plan.tone}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">{plan.name}</span>
                {plan.popular && (
                  <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[13px] text-primary-foreground">
                    <Crown className="h-3.5 w-3.5 text-tone-peach" aria-hidden />
                    الأكثر طلبًا
                  </span>
                )}
              </div>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="tabular text-[44px] font-semibold leading-none tracking-tight">{plan.price}</span>
                {plan.unit && <span className="text-lg text-foreground/70">{plan.unit}</span>}
              </p>
              <p className="mt-1 text-[15px] text-foreground/70">{plan.note}</p>
              <ul className="mb-6 mt-5 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-[15px]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-card-raised/80">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">{plan.action}</div>
            </article>
          ))}
        </div>

        {/* Payment Instructions Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعليمات الدفع - 700 دج</DialogTitle>
              <DialogDescription>
                لتفعيل اشتراكك المميز، يرجى اتباع الخطوات التالية:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-2xl bg-tone-lav/60 p-4">
                <h3 className="font-semibold mb-2">طريقة الدفع:</h3>
                {/* No real account number yet (the owner will supply the CCP /
                    BaridiMob details); until then students ask first. */}
                <p className="text-base">
                  أرسل طلب اشتراك عبر الزر أدناه، وسنتواصل معك برقم الحساب (بريد الجزائر CCP أو بريدي موب) لتحويل
                  مبلغ 700 دج.
                </p>
              </div>
              <div className="rounded-2xl bg-warning-light p-4">
                <p className="text-base text-warning">
                  <strong>ملاحظة:</strong>بعد إتمام عملية الدفع، سيتم تفعيل حسابك المميز خلال 24
                  ساعة. إذا لم يتم التفعيل، يرجى التواصل معنا عبر النموذج أدناه.
                </p>
              </div>
              <div className="flex gap-2">
                {profile ? (
                  <Button
                    onClick={() => {
                      setIsPaymentDialogOpen(false);
                      setIsContactDialogOpen(true);
                    }}
                    className="flex-1"
                  >
                    أرسل إيصال الدفع
                  </Button>
                ) : (
                  // a receipt has to belong to an account, or there is nothing to upgrade
                  <Button asChild className="flex-1">
                    <Link to="/login">سجّل الدخول لإرسال الإيصال</Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                  className="flex-1"
                >
                  موافق
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Contact Form Dialog */}
        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إرسال إيصال الدفع</DialogTitle>
              <DialogDescription>
                سيُفعَّل الاشتراك المميز على حسابك{" "}
                <span dir="ltr">{profile?.email}</span> بعد التحقق من الدفع
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <Input
                placeholder="رقم الهاتف"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                required
              />
              <Textarea
                placeholder="تفاصيل عملية الدفع (رقم الإيصال، تاريخ الدفع، إلخ...)"
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                required
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                إرسال
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Institutions inquiry — anyone, no account required */}
        <Dialog open={isSchoolDialogOpen} onOpenChange={setIsSchoolDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>عرض المؤسسات</DialogTitle>
              <DialogDescription>أخبرونا عن ثانويتكم، وسنتواصل معكم لتفعيل الحسابات الجماعية.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSchoolSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="school-name">الاسم الكامل</Label>
                  <Input
                    id="school-name"
                    value={schoolForm.name}
                    onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="school-institution">اسم الثانوية</Label>
                  <Input
                    id="school-institution"
                    value={schoolForm.school}
                    onChange={(e) => setSchoolForm({ ...schoolForm, school: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="school-email">البريد الإلكتروني</Label>
                  <Input
                    id="school-email"
                    type="email"
                    value={schoolForm.email}
                    onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="school-phone">رقم الهاتف</Label>
                  <Input
                    id="school-phone"
                    value={schoolForm.phone}
                    onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="school-city">المدينة</Label>
                  <Input
                    id="school-city"
                    value={schoolForm.city}
                    onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="school-count">عدد الطلاب التقديري</Label>
                  <Input
                    id="school-count"
                    inputMode="numeric"
                    value={schoolForm.studentCount}
                    onChange={(e) => setSchoolForm({ ...schoolForm, studentCount: e.target.value })}
                  />
                </div>
              </div>
              <Textarea
                placeholder="تفاصيل إضافية (اختياري)"
                value={schoolForm.message}
                onChange={(e) => setSchoolForm({ ...schoolForm, message: e.target.value })}
              />
              <Button type="submit" className="w-full" disabled={schoolSubmitting}>
                إرسال الطلب
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Pricing;

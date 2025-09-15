import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handlePremiumSubscription = () => {
    setIsPaymentDialogOpen(true);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('support_requests')
        .insert([{
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone,
          message: contactForm.message,
          type: 'premium_subscription'
        }]);

      if (error) throw error;

      toast({
        title: "تم إرسال الرسالة بنجاح",
        description: "سنقوم بالرد عليك في أقرب وقت ممكن لتأكيد اشتراكك المميز.",
      });

      setIsContactDialogOpen(false);
      setContactForm({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (error) {
      toast({
        title: "حدث خطأ",
        description: "يرجى المحاولة مرة أخرى لاحقاً",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold">خطط الاشتراك</h1>
          <p className="text-muted-foreground text-lg">اختر الخطة المناسبة لك واستمتع بتجربة تعليمية متميزة</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <Card className="hover:scale-105 transition-all duration-300 border-primary/10">
            <CardHeader>
              <CardTitle className="text-2xl text-center">🎓 العرض المجاني</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">مجاني</div>
                <p className="text-muted-foreground">ابدأ الآن</p>
              </div>
              <ul className="space-y-2 text-right">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>الوصول إلى صفحة الفيديوهات (المجانية فقط)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>الوصول إلى صفحة الامتحانات</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>الوصول إلى صفحة المتفوقين / الخريجين (عرض الملفات فقط)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>الوصول إلى قسم الاختبارات اليومية (Daily Quiz) فقط</span>
                </li>
              </ul>
              <Link to="/login" className="block mt-6">
                <Button className="w-full">سجّل مجانًا</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="hover:scale-105 transition-all duration-300 border-primary/50 shadow-lg relative">
            <Badge className="absolute -top-2 right-4 bg-primary text-white">الأكثر طلباً</Badge>
            <CardHeader>
              <CardTitle className="text-2xl text-center">💳 عرض 700 دج / شهريًا</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">700 دج / شهر</div>
                <p className="text-muted-foreground">الأكثر طلبًا</p>
              </div>
              <ul className="space-y-2 text-right">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>جميع مزايا العرض المجاني</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>الوصول إلى صفحة "تعلّم مع الذكاء الاصطناعي"</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>الوصول الكامل إلى صفحة الاختبارات والـ Quizzes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>حلّ الامتحانات بمساعدة الذكاء الاصطناعي</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>ملخص شهري شامل لتقدمك</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>فرصة الفوز بـ جوائز عند التواجد ضمن أفضل الطلاب</span>
                </li>
              </ul>
              <Button className="w-full mt-6" onClick={handlePremiumSubscription}>
                اشترك الآن
              </Button>
            </CardContent>
          </Card>

          {/* Schools Plan */}
          <Card className="hover:scale-105 transition-all duration-300 border-secondary/10">
            <CardHeader>
              <CardTitle className="text-2xl text-center">🏅 عرض (Schools Offer)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary">للمؤسسات والفرق المدرسية</div>
                <p className="text-muted-foreground">قدم طلبًا للاستفادة</p>
              </div>
              <ul className="space-y-2 text-right">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>عرض خاص بالمدارس والمؤسسات التعليمية</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>تجهيز حسابات طلابية جماعية</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>تقارير تقدمية للطلاب</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>اشتراكات مدرسية مخصّصة حسب الحاجة</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>للاستفادة: تواصل معنا عبر صفحة الاتصال</span>
                </li>
              </ul>
              <Button 
                className="w-full mt-6" 
                variant="outline"
                onClick={() => navigate('/contact')}
              >
                تواصل معنا
              </Button>
            </CardContent>
          </Card>
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
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">طريقة الدفع:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>تحويل مبلغ 700 دج إلى الحساب البنكي: XXXX-XXXX-XXXX</li>
                  <li>أو الدفع عبر بريد الجزائر</li>
                  <li>أو الدفع عبر المحافظ الإلكترونية</li>
                </ol>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>ملاحظة:</strong> بعد إتمام عملية الدفع، سيتم تفعيل حسابك المميز خلال 24 ساعة. 
                  إذا لم يتم التفعيل، يرجى التواصل معنا عبر النموذج أدناه.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setIsPaymentDialogOpen(false);
                    setIsContactDialogOpen(true);
                  }}
                  className="flex-1"
                >
                  أرسل إيصال الدفع
                </Button>
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
                يرجى ملء النموذج التالي وسنقوم بتفعيل حسابك المميز في أقرب وقت ممكن
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <Input
                placeholder="الاسم الكامل"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                required
              />
              <Input
                type="email"
                placeholder="البريد الإلكتروني"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                required
              />
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
              <Button type="submit" className="w-full">إرسال</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Pricing;

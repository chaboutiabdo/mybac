import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  Star,
  Trophy,
  Users,
  GraduationCap,
  ArrowRight,
  Play,
  CheckCircle,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Menu,
  Facebook,
  Twitter,
  Instagram,
  Youtube
} from "lucide-react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/5 to-primary/5 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full bg-background/95 backdrop-blur-xl border-b border-border/30 z-50 animate-fade-in shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 animate-slide-up">
              <div className="relative">
                <img 
                  src="/lovable-uploads/2473f7f5-d49d-4abd-8426-94b1d4b3646e.png" 
                  alt="THE SMART Logo" 
                  className="h-12 w-12 object-contain animate-bounce-subtle"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-pulse"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">THE SMART</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => scrollToSection('about')}
                className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-105 story-link"
              >
                من نحن
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-105 story-link"
              >
                المميزات
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-105 story-link"
              >
                العروض
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-105 story-link"
              >
                اتصل بنا
              </button>
              <Link to="/login">
                <Button className="gradient-primary text-white hover:scale-105 transition-all duration-300 shadow-glow">
                  تسجيل الدخول
                </Button>
              </Link>
            </nav>
            <Button variant="ghost" className="md:hidden hover:scale-105 transition-transform">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10 animate-slide-up">
              <div className="space-y-6">
                <Badge className="bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-primary/40 px-4 py-2 text-sm font-medium animate-fade-in shadow-lg">
                  🎓 التعلم بالذكاء الاصطناعي المتطور
                </Badge>
                <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight animate-fade-in">
                  أتقن تعلمك مع منصة THE SMART الذكية
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed animate-fade-in max-w-2xl" style={{animationDelay: '0.2s'}}>
                  حوّل تجربة تعلمك مع الدروس الخصوصية بالذكاء الاصطناعي، والامتحانات التدريبية، والإرشاد المتخصص. انضم إلى آلاف الطلاب الناجحين.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 animate-fade-in" style={{animationDelay: '0.4s'}}>
                <Link to="/home">
                  <Button size="lg" className="gradient-primary text-white px-10 py-7 text-lg font-semibold shadow-glow hover:scale-105 transition-all duration-300 relative overflow-hidden group border-2 border-primary/20">
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative flex items-center">
                      ابدأ التعلم الآن
                      <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="px-10 py-7 text-lg hover:scale-105 transition-all duration-300 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 backdrop-blur-sm">
                  <Play className="mr-3 h-6 w-6" />
                  شاهد العرض التوضيحي
                </Button>
              </div>
            </div>
            <div className="relative animate-fade-in" style={{animationDelay: '0.6s'}}>
              <div className="relative z-10 flex items-center justify-center">
                <div className="w-96 h-96 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-primary/20 relative overflow-hidden group hover:scale-105 transition-all duration-500 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent"></div>
                  <GraduationCap className="h-40 w-40 text-primary animate-bounce-subtle relative z-10" />
                </div>
              </div>
              <div className="absolute top-1/2 right-0 transform translate-x-1/4 -translate-y-1/2 animate-bounce-subtle" style={{animationDelay: '0.8s'}}>
                <Card className="bg-gradient-to-br from-primary/30 to-secondary/30 border-primary/40 backdrop-blur-sm hover:scale-110 transition-all duration-300 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-6 w-6 text-accent animate-pulse" />
                      <span className="text-sm font-medium text-white">98% معدل النجاح</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="absolute bottom-10 left-0 transform -translate-x-1/4 animate-bounce-subtle" style={{animationDelay: '1s'}}>
                <Card className="bg-gradient-to-br from-secondary/30 to-accent/30 border-secondary/40 backdrop-blur-sm hover:scale-110 transition-all duration-300 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Star className="h-6 w-6 text-accent animate-pulse" />
                      <span className="text-sm font-medium text-white">4.9/5 التقييم</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              حول THE SMART
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              نحن ملتزمون بإحداث ثورة في التعليم من خلال تقنيات الذكاء الاصطناعي المتطورة وتجارب التعلم الشخصية.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:scale-105 transition-all duration-300 border-primary/10 animate-fade-in">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">فريق متخصص</h3>
                <p className="text-muted-foreground">مربون ذوو خبرة ومتخصصون في الذكاء الاصطناعي يعملون معاً</p>
              </CardContent>
            </Card>
            <Card className="hover:scale-105 transition-all duration-300 border-primary/10 animate-fade-in" style={{animationDelay: '0.2s'}}>
              <CardContent className="p-6 text-center">
                <GraduationCap className="h-12 w-12 text-secondary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">نتائج مثبتة</h3>
                <p className="text-muted-foreground">أكثر من 10,000 طالب حققوا أهدافهم معنا</p>
              </CardContent>
            </Card>
            <Card className="hover:scale-105 transition-all duration-300 border-primary/10 animate-fade-in" style={{animationDelay: '0.4s'}}>
              <CardContent className="p-6 text-center">
                <Sparkles className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">الابتكار بالذكاء الاصطناعي</h3>
                <p className="text-muted-foreground">أحدث تقنيات الذكاء الاصطناعي لمسارات التعلم الشخصية</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              مميزات قوية
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              كل ما تحتاجه للنجاح في امتحاناتك، مدعوم بتقنيات الذكاء الاصطناعي المتطورة.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: "التدريس بالذكاء الاصطناعي", desc: "مساعدة شخصية بالذكاء الاصطناعي على مدار الساعة" },
              { icon: Trophy, title: "الامتحانات التدريبية", desc: "امتحانات حقيقية مع حلول مفصلة" },
              { icon: Users, title: "الإرشاد من الخريجين", desc: "تواصل مع الخريجين الناجحين" },
              { icon: Star, title: "تتبع التقدم", desc: "راقب رحلة تعلمك" },
              { icon: CheckCircle, title: "الدروس المصورة", desc: "مكتبة فيديو شاملة" },
              { icon: Sparkles, title: "التوصيات الذكية", desc: "اقتراحات دراسية مدعومة بالذكاء الاصطناعي" }
            ].map((feature, index) => (
              <Card key={index} className="hover:scale-105 transition-all duration-300 border-primary/10 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                <CardContent className="p-6 text-center">
                  <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              العروض المتاحة
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              اختر العرض المناسب لك واستمتع بتجربة تعليمية متميزة
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card className="hover:scale-105 transition-all duration-300 border-primary/10 animate-fade-in">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="text-4xl mb-2">🎓</div>
                  <h3 className="text-2xl font-bold mb-2">العرض المجاني</h3>
                  <div className="text-3xl font-bold text-primary mb-4">مجاناً</div>
                </div>
                <ul className="space-y-3 text-right">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>الوصول إلى صفحة الفيديوهات</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>الوصول إلى صفحة الامتحانات</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>الوصول إلى صفحة المتفوقين (الخريجين)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>الوصول إلى صفحة الاختبارات اليومية (Daily Quiz) فقط</span>
                  </li>
                </ul>
                <Link to="/login" className="block mt-8">
                  <Button className="w-full gradient-primary text-white hover:scale-105 transition-all duration-300">
                    ابدأ مجاناً
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="hover:scale-105 transition-all duration-300 border-primary/50 shadow-lg relative animate-fade-in" style={{animationDelay: '0.2s'}}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-white px-4 py-1">الأكثر طلباً</Badge>
              </div>
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="text-4xl mb-2">💳</div>
                  <h3 className="text-2xl font-bold mb-2">عرض 700 دج</h3>
                  <div className="text-3xl font-bold text-primary mb-4">700 دج / شهرياً</div>
                </div>
                <ul className="space-y-3 text-right">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>كل ما في العرض المجاني</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>الوصول إلى صفحة تعلّم مع الذكاء الاصطناعي (Learn with AI)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>الوصول الكامل إلى صفحة الاختبارات والـ Quizzes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>إمكانية حلّ الامتحانات بمساعدة الذكاء الاصطناعي</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>ملخص شهري شامل</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>فرصة الحصول على جوائز عند التواجد ضمن قائمة أفضل الطلاب</span>
                  </li>
                </ul>
                <Link to="/login" className="block mt-8">
                  <Button className="w-full gradient-primary text-white hover:scale-105 transition-all duration-300">
                    اشترك الآن
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Scholarship Plan */}
            <Card className="hover:scale-105 transition-all duration-300 border-secondary/10 animate-fade-in" style={{animationDelay: '0.4s'}}>
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="text-4xl mb-2">🏅</div>
                  <h3 className="text-2xl font-bold mb-2">عرض المنحة</h3>
                  <div className="text-3xl font-bold text-secondary mb-4">سعر خاص</div>
                </div>
                <ul className="space-y-3 text-right">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>هذا العرض مخصص للتلاميذ ذوي الظروف الخاصة</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>للاستفادة، يرجى التواصل معنا مباشرة عبر صفحة الاتصال</span>
                  </li>
                </ul>
                <button 
                  onClick={() => scrollToSection('contact')} 
                  className="w-full mt-8 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-secondary/90 transition-all duration-300 hover:scale-105"
                >
                  تواصل معنا
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              تواصل معنا
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              لديك أسئلة؟ نحن هنا لمساعدتك على النجاح في رحلة تعلمك.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-4">
                <Mail className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold">البريد الإلكتروني</h3>
                  <p className="text-muted-foreground">support@thesmart.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold">الهاتف</h3>
                  <p className="text-muted-foreground">+213 XXX XXX XXX</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <MapPin className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold">العنوان</h3>
                  <p className="text-muted-foreground">الجزائر العاصمة، الجزائر</p>
                </div>
              </div>
            </div>
            <form className="space-y-4 animate-fade-in" style={{animationDelay: '0.2s'}}>
              <Input placeholder="اسمك الكامل" className="hover-scale" />
              <Input placeholder="بريدك الإلكتروني" type="email" className="hover-scale" />
              <Textarea placeholder="رسالتك" rows={4} className="hover-scale" />
              <Button className="w-full gradient-primary text-white hover:scale-105 transition-all duration-300">
                إرسال الرسالة
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img 
                  src="/lovable-uploads/2473f7f5-d49d-4abd-8426-94b1d4b3646e.png" 
                  alt="THE SMART Logo" 
                  className="h-10 w-10 object-contain"
                />
                <span className="font-bold">THE SMART</span>
              </div>
              <p className="text-muted-foreground text-sm">
                تمكين الطلاب من التفوق في امتحاناتهم من خلال التعلم المدعوم بالذكاء الاصطناعي.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">روابط سريعة</h4>
              <div className="space-y-2 text-sm">
                <button onClick={() => scrollToSection('about')} className="block text-muted-foreground hover:text-primary story-link">من نحن</button>
                <button onClick={() => scrollToSection('features')} className="block text-muted-foreground hover:text-primary story-link">المميزات</button>
                <button onClick={() => scrollToSection('pricing')} className="block text-muted-foreground hover:text-primary story-link">العروض</button>
                <button onClick={() => scrollToSection('contact')} className="block text-muted-foreground hover:text-primary story-link">اتصل بنا</button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">المنصة</h4>
              <div className="space-y-2 text-sm">
                <Link to="/login" className="block text-muted-foreground hover:text-primary story-link">تسجيل الدخول</Link>
                <Link to="/home" className="block text-muted-foreground hover:text-primary story-link">لوحة التحكم</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">تابعنا</h4>
              <div className="flex gap-4">
                <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer hover-scale" />
                <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer hover-scale" />
                <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer hover-scale" />
                <Youtube className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer hover-scale" />
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 THE SMART. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
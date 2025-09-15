import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageCircle, BookOpen, Lightbulb, Sparkles, Loader2 } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface StudyTopic {
  id: string;
  subject: string;
  chapter: string;
  keyConcepts: string[];
  tips: string[];
}

const mathChapters = [
  { value: "derivatives", label: "📘 الاشتقاقية والمشتقات" },
  { value: "exponential", label: "📘 الدوال الأسية" },
  { value: "logarithmic", label: "📘 الدوال اللوغاريتمية" },
  { value: "limits", label: "📘 النهايات والمستقيمات المقاربة" },
  { value: "sequences", label: "📘 المتتاليات العددية" },
  { value: "integration", label: "📘 التكامل والحساب التكاملي" },
  { value: "integers", label: "📘 الحساب في مجموعة الأعداد الصحيحة ℤ" },
  { value: "probability", label: "📘 الاحتمالات والإحصاء" },
  { value: "complex", label: "📘 الأعداد المركبة والتحويلات" },
  { value: "geometry", label: "📘 الهندسة في الفضاء" }
];

const physicsChapters = [
  { value: "chemical_tracking", label: "⚡ المتابعة الزمنية لتحول كيميائي" },
  { value: "mechanical_evolution", label: "⚡ تطور جملة ميكانيكياً" },
  { value: "electrical_phenomena", label: "⚡ دراسة ظواهر كهربائية" },
  { value: "chemical_equilibrium", label: "⚡ تطور جملة كيميائية نحو حالة التوازن" },
  { value: "nuclear_transformations", label: "⚡ دراسة التحولات النووية" },
  { value: "chemical_monitoring", label: "⚡ مراقبة تطور جملة كيميائية" }
];

const studyTopics: StudyTopic[] = [];

const LearnAI = () => {
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [currentTopic, setCurrentTopic] = useState<StudyTopic | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', content: string}>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedChapter("");
    setCurrentTopic(null);
  };

  const handleChapterChange = (chapter: string) => {
    setSelectedChapter(chapter);
    const topic = studyTopics.find(t => t.subject === selectedSubject && t.chapter === chapter);
    setCurrentTopic(topic || null);
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || isLoading || !user) return;
    
    setIsLoading(true);
    const userQuestion = question;
    setQuestion("");
    
    // Add user message immediately
    setChatMessages(prev => [
      ...prev,
      { role: 'user', content: userQuestion }
    ]);

    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { 
          question: userQuestion,
          subject: selectedSubject,
          chapter: selectedChapter
        }
      });

      if (error) throw error;

      // Add AI response
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', content: data.answer }
      ]);

    } catch (error) {
      console.error('Error asking question:', error);
      toast({
        title: "خطأ في الاتصال",
        description: "حدث خطأ أثناء الحصول على الإجابة. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      
      // Add error message to chat
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', content: "عذراً، حدث خطأ أثناء معالجة سؤالك. يرجى المحاولة مرة أخرى." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              تعلم مع الذكاء الاصطناعي
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              احصل على إرشادات دراسية مخصصة مدعومة بالذكاء الاصطناعي
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Brain className="h-5 w-5 text-primary" />
                    اختر الموضوع
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المادة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Math">📘 الرياضيات</SelectItem>
                      <SelectItem value="Physics">⚡ الفيزياء</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedChapter} onValueChange={handleChapterChange} disabled={!selectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفصل" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSubject === "Math" && mathChapters.map((chapter) => (
                        <SelectItem key={chapter.value} value={chapter.value}>
                          {chapter.label}
                        </SelectItem>
                      ))}
                      {selectedSubject === "Physics" && physicsChapters.map((chapter) => (
                        <SelectItem key={chapter.value} value={chapter.value}>
                          {chapter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {selectedChapter && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <BookOpen className="h-5 w-5 text-accent" />
                      نصائح الدراسة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <p>✨ اقرأ المفاهيم الأساسية أولاً</p>
                      <p>✨ حل التمارين التطبيقية خطوة بخطوة</p>
                      <p>✨ راجع الأمثلة المحلولة في الكتاب</p>
                      <p>✨ اسأل الذكاء الاصطناعي عن أي استفسار</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-2">
              <Card className="h-[500px] md:h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    مساعد الذكاء الاصطناعي للدراسة
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    اسأل أسئلة حول {selectedChapter ? "الفصل المختار" : "أي موضوع"} واحصل على شروحات مفصلة
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 bg-muted/20 rounded-lg p-3 md:p-4 mb-4 overflow-y-auto">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                        <div className="space-y-2">
                          <Brain className="h-10 w-10 md:h-12 md:w-12 mx-auto text-primary/50" />
                          <p className="text-sm md:text-base">اختر موضوعاً واسأل سؤالك الأول!</p>
                          <p className="text-xs md:text-sm">أنا هنا لمساعدتك في فهم مفاهيم البكالوريا خطوة بخطوة.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chatMessages.map((message, index) => (
                          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-[80%] p-3 rounded-lg ${
                              message.role === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-card border'
                            }`}>
                              {message.role === 'user' ? (
                                <p className="text-xs md:text-sm whitespace-pre-wrap">{message.content}</p>
                              ) : (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  {message.content.split(/(\\\(.*?\\\)|\\\[.*?\\\])/).map((part, index) => {
                                    if (part.startsWith('\\(') && part.endsWith('\\)')) {
                                      // Inline math
                                      const math = part.slice(2, -2);
                                      return <InlineMath key={index}>{math}</InlineMath>;
                                    } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                                      // Block math
                                      const math = part.slice(2, -2);
                                      return <BlockMath key={index}>{math}</BlockMath>;
                                    } else {
                                      // Regular text
                                      return <span key={index} className="text-xs md:text-sm whitespace-pre-wrap">{part}</span>;
                                    }
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <Textarea
                      placeholder={user ? (selectedChapter ? "اسأل سؤالاً حول الفصل المختار..." : "اختر موضوعاً أولاً، ثم اسأل سؤالك...") : "يجب تسجيل الدخول للاستفادة من الذكاء الاصطناعي"}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      disabled={!selectedChapter || isLoading || !user}
                      className="min-h-[60px] md:min-h-[80px] text-sm md:text-base"
                    />
                    <Button 
                      onClick={handleAskQuestion}
                      disabled={!question.trim() || !selectedChapter || isLoading || !user}
                      className="w-full text-sm md:text-base"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          جاري الحصول على الإجابة...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          اسأل المساعد الذكي
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LearnAI;
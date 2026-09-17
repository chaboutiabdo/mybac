import { useState, useRef, useEffect } from "react";
import { MATH_CHAPTERS, PHYSICS_CHAPTERS } from "@/lib/bac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  MessageCircle,
  BookOpen,
  Lightbulb,
  Sparkles,
  Loader2,
  Send,
  Bot,
  User,
} from "lucide-react";
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

const studyTopics: StudyTopic[] = [];

const LearnAI = () => {
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [currentTopic, setCurrentTopic] = useState<StudyTopic | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; content: string }>>(
    [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedChapter("");
    setCurrentTopic(null);
  };

  const handleChapterChange = (chapter: string) => {
    setSelectedChapter(chapter);
    const topic = studyTopics.find((t) => t.subject === selectedSubject && t.chapter === chapter);
    setCurrentTopic(topic || null);
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || isLoading || !user) return;

    setIsLoading(true);
    const userQuestion = question;
    setQuestion("");

    // Add user message immediately
    setChatMessages((prev) => [...prev, { role: "user", content: userQuestion }]);

    try {
      const { data, error } = await supabase.functions.invoke("gemini-chat", {
        body: {
          question: userQuestion,
          subject: selectedSubject,
          chapter: selectedChapter,
        },
      });

      if (error) throw error;

      // Add AI response
      setChatMessages((prev) => [...prev, { role: "ai", content: data.answer }]);
    } catch (error) {
      console.error("Error asking question:", error);
      toast({
        title: "خطأ في الاتصال",
        description: "حدث خطأ أثناء الحصول على الإجابة. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });

      // Add error message to chat
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", content: "عذراً، حدث خطأ أثناء معالجة سؤالك. يرجى المحاولة مرة أخرى." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pattern-field min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[34px] font-bold tracking-tight">تعلم مع الذكاء الاصطناعي</h1>
            <p className="text-lg text-muted-foreground">
              احصل على إرشادات دراسية مخصصة مدعومة بالذكاء الاصطناعي
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
              <Card className="border border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
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
                      <SelectItem value="Math">الرياضيات</SelectItem>
                      <SelectItem value="Physics">الفيزياء</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedChapter}
                    onValueChange={handleChapterChange}
                    disabled={!selectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفصل" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSubject === "Math" &&
                        MATH_CHAPTERS.map((chapter) => (
                          <SelectItem key={chapter.value} value={chapter.value}>
                            {chapter.label}
                          </SelectItem>
                        ))}
                      {selectedSubject === "Physics" &&
                        PHYSICS_CHAPTERS.map((chapter) => (
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
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <BookOpen className="h-5 w-5 text-accent" />
                      نصائح الدراسة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-base">
                      <p>اقرأ المفاهيم الأساسية أولاً</p>
                      <p>حل التمارين التطبيقية خطوة بخطوة</p>
                      <p>راجع الأمثلة المحلولة في الكتاب</p>
                      <p>اسأل الذكاء الاصطناعي عن أي استفسار</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-2">
              <Card className="h-[600px] md:h-[700px] flex flex-col border border-primary/20">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                    <Bot className="h-6 w-6 text-primary" />
                    مساعد الذكاء الاصطناعي للدراسة
                  </CardTitle>
                  <CardDescription className="text-base md:text-lg">
                    اسأل أسئلة حول {selectedChapter ? "الفصل المختار" : "أي موضوع"} واحصل على شروحات
                    مفصلة
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0">
                  {/* Chat Messages Area */}
                  <div className="flex-1 p-4 overflow-y-auto">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center">
                        <div className="space-y-4 max-w-md">
                          <div className="relative">
                            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center">
                              <Brain className="h-10 w-10 text-primary animate-pulse" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                              <Sparkles className="h-3 w-3 text-accent-foreground" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-foreground">
                              مرحباً! أنا مساعدك الذكي
                            </h3>
                            <p className="text-base text-muted-foreground">
                              اختر موضوعاً واسأل سؤالك الأول!
                            </p>
                            <p className="text-sm text-muted-foreground">
                              أنا هنا لمساعدتك في فهم مفاهيم البكالوريا خطوة بخطوة.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {chatMessages.map((message, index) => (
                          <div
                            key={index}
                            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                          >
                            {/* Avatar */}
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                message.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-secondary-foreground"
                              }`}
                            >
                              {message.role === "user" ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <Bot className="h-4 w-4" />
                              )}
                            </div>

                            {/* Message Content */}
                            <div className="flex-1 max-w-[85%] text-start">
                              <div
                                className={`p-4 rounded-2xl shadow-sm ${
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground ml-auto"
                                    : "bg-card border border-border/50"
                                }`}
                              >
                                {message.role === "user" ? (
                                  <p className="text-base whitespace-pre-wrap leading-relaxed">
                                    {message.content}
                                  </p>
                                ) : (
                                  <div className="prose prose-sm dark:prose-invert max-w-none text-base leading-relaxed">
                                    {message.content
                                      .split(/(\\\(.*?\\\)|\\\[.*?\\\])/)
                                      .map((part, partIndex) => {
                                        if (part.startsWith("\\(") && part.endsWith("\\)")) {
                                          // Inline math
                                          const math = part.slice(2, -2);
                                          return <InlineMath key={partIndex}>{math}</InlineMath>;
                                        } else if (part.startsWith("\\[") && part.endsWith("\\]")) {
                                          // Block math
                                          const math = part.slice(2, -2);
                                          return <BlockMath key={partIndex}>{math}</BlockMath>;
                                        } else {
                                          // Regular text with better formatting
                                          return (
                                            <span key={partIndex} className="whitespace-pre-wrap">
                                              {part.split("\n").map((line, lineIndex) => (
                                                <span key={lineIndex}>
                                                  {line}
                                                  {lineIndex < part.split("\n").length - 1 && (
                                                    <br />
                                                  )}
                                                </span>
                                              ))}
                                            </span>
                                          );
                                        }
                                      })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-card border-t border-border/50">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Textarea
                          ref={textareaRef}
                          placeholder={
                            user
                              ? selectedChapter
                                ? "اسأل سؤالاً حول الفصل المختار... (اضغط Enter للإرسال)"
                                : "اختر موضوعاً أولاً، ثم اسأل سؤالك..."
                              : "يجب تسجيل الدخول للاستفادة من الذكاء الاصطناعي"
                          }
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          onKeyPress={handleKeyPress}
                          disabled={!selectedChapter || isLoading || !user}
                          className="min-h-[60px] md:min-h-[80px] text-base md:text-lg resize-none border focus:border-primary/50 transition-colors"
                        />
                      </div>
                      <Button
                        onClick={handleAskQuestion}
                        disabled={!question.trim() || !selectedChapter || isLoading || !user}
                        className="px-6 py-3 h-auto text-primary-foreground transition-all duration-200"
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground text-center">
                      اضغط Enter للإرسال أو Shift+Enter لسطر جديد
                    </div>
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

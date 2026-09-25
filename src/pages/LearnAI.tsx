import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Brain, Loader2, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

import { AnswerText } from "@/components/ai/AnswerText";
import FilterPills, { SUBJECT_OPTIONS } from "@/components/FilterPills";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeAI, PENDING_ANSWER } from "@/lib/ai";
import { chaptersFor } from "@/lib/bac";
import { cn, errorMessage } from "@/lib/utils";

type ChatMessage = { role: "user" | "ai"; content: string };

// How much of a chapter's past conversation the page shows. The model itself
// only sees the last 3 exchanges (gemini-chat reads them from the same rows).
const HISTORY_SHOWN = 20;

const STUDY_TIPS = [
  "اقرأ المفاهيم الأساسية أولاً",
  "حلّ التمارين التطبيقية خطوة بخطوة",
  "راجع الأمثلة المحلولة في الكتاب",
  "اسأل المعلّم الذكي عن أي نقطة غامضة",
];

const LearnAI = () => {
  const { user, profile } = useAuth();
  const [subject, setSubject] = useState<string | null>(null);
  const [chapter, setChapter] = useState("");
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // the chapter on screen right now, read when a slow answer comes back
  const scopeRef = useRef("");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Each student's own conversation per chapter, saved by gemini-chat (every
  // answered question is a row of theirs). A reload used to show an empty
  // chat, and switching subject used to keep the other subject's messages.
  useEffect(() => {
    scopeRef.current = `${subject ?? ""}|${chapter}`;
    setChatMessages([]);
    setHistoryLoading(false);
    if (!user || !subject || !chapter) return;
    let cancelled = false;
    setHistoryLoading(true);
    supabase
      .from("ai_learning_conversations")
      .select("question_text, answer_text")
      // explicit: an admin's RLS reaches everyone's rows
      .eq("user_id", user.id)
      .eq("mode", "tutor")
      .eq("subject", subject)
      .eq("chapter", chapter)
      .neq("answer_text", PENDING_ANSWER)
      .order("created_at", { ascending: false })
      .limit(HISTORY_SHOWN)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Error loading the conversation:", error);
        setChatMessages(
          (data ?? [])
            .reverse()
            .flatMap((r): ChatMessage[] =>
              r.question_text && r.answer_text
                ? [{ role: "user", content: r.question_text }, { role: "ai", content: r.answer_text }]
                : []
            )
        );
        setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, subject, chapter]);

  const handleAskQuestion = async () => {
    if (!question.trim() || isLoading || !user) return;

    setIsLoading(true);
    const userQuestion = question;
    const askedIn = scopeRef.current;
    setQuestion("");
    setChatMessages((prev) => [...prev, { role: "user", content: userQuestion }]);

    try {
      // No history in the body: the function reads this student's saved turns
      // itself, so a failed question can never shift the roles of later ones.
      const data = await invokeAI<{ answer?: string }>({
        question: userQuestion,
        subject: subject ?? "",
        chapter,
      });
      if (!data?.answer) throw new Error("تعذّر توليد إجابة، جرّب صياغة أخرى.");
      // Switched chapter while waiting: the answer is saved and shows up when
      // the student comes back; it doesn't belong in this chat.
      if (scopeRef.current !== askedIn) return;
      setChatMessages((prev) => [...prev, { role: "ai", content: data.answer as string }]);
    } catch (error) {
      console.error("Error asking question:", error);
      // The function's own message — the daily quota, the premium wall, "your
      // question is too long" — used to be replaced here by a generic network
      // error, so a student who had simply run out of questions was told the
      // connection had failed.
      toast.error(errorMessage(error, "تعذّر الحصول على الإجابة، حاول مرة أخرى."));
      // The unanswered question leaves the chat and goes back in the box, so
      // the student can resend it without retyping.
      if (scopeRef.current === askedIn) {
        setChatMessages((prev) => {
          const i = prev.map((m) => m.role === "user" && m.content === userQuestion).lastIndexOf(true);
          return i < 0 ? prev : [...prev.slice(0, i), ...prev.slice(i + 1)];
        });
        setQuestion((current) => current || userQuestion);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const ready = Boolean(chapter) && Boolean(user);

  return (
    <div className="space-y-8">
      <PageHeader title="المعلّم الذكي" subtitle="اسأل بالعربية، واحصل على شرح خطوة بخطوة كما في ورقة الامتحان" />

      {/* grid-cols-1, not the implicit auto column: that one grows to fit its
          widest content, so a long formula widened the page on phones */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="space-y-4 rounded-card bg-card p-5 shadow-soft">
            <h2 className="text-lg font-medium">اختر الموضوع</h2>
            <FilterPills
              label="المادة"
              wrap
              options={SUBJECT_OPTIONS}
              value={subject}
              onChange={(s) => {
                setSubject(s);
                setChapter("");
              }}
            />
            <Select value={chapter} onValueChange={setChapter} disabled={!subject}>
              <SelectTrigger className="h-12 rounded-full" aria-label="الفصل">
                <SelectValue placeholder={subject ? "اختر الفصل" : "اختر المادة أولاً"} />
              </SelectTrigger>
              <SelectContent>
                {chaptersFor(subject).map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!profile?.stream && (
              <p className="text-sm text-muted-foreground">
                <Link to="/settings" className="text-foreground underline underline-offset-4">
                  حدّد شعبتك في الإعدادات
                </Link>{" "}
                ليكيّف المعلّم شرحه معك.
              </p>
            )}
          </section>

          {chapter && (
            <section className="rounded-card bg-tone-peach p-5 shadow-soft">
              <h2 className="text-lg font-medium">نصائح الدراسة</h2>
              <ul className="mt-3 space-y-2">
                {STUDY_TIPS.map((tip) => (
                  <li key={tip} className="rounded-2xl bg-card-raised/70 px-3.5 py-2.5 text-[15px]">
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <section className="flex h-[640px] flex-col rounded-card bg-card shadow-soft md:h-[720px]">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tone-peach">
              <Bot className="h-5 w-5" strokeWidth={1.8} aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-medium leading-tight">مساعد الدراسة</h2>
              <p className="text-[15px] text-muted-foreground">
                {chapter ? "اسأل عن الفصل المختار" : "اختر فصلاً ثم اسأل سؤالك"}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {chatMessages.length === 0 && historyLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                جارٍ تحميل محادثتك…
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                {/* the sparkle sits on the brain, not somewhere in the row */}
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-tone-lav">
                  <Brain className="h-9 w-9" strokeWidth={1.5} aria-hidden />
                  <span className="absolute -end-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-tone-peach ring-4 ring-card">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </span>
                <h3 className="mt-5 text-xl font-medium">مرحباً! أنا معلّمك الذكي</h3>
                <p className="mt-1 max-w-sm text-base text-muted-foreground">
                  اختر موضوعاً واسأل سؤالك الأول، وسأشرحه خطوة بخطوة كما تُحلّ أسئلة البكالوريا.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {chatMessages.map((message, index) => {
                  const mine = message.role === "user";
                  return (
                    <div key={index} className={cn("flex gap-3", mine && "flex-row-reverse")}>
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          mine ? "bg-primary text-primary-foreground" : "bg-tone-peach"
                        )}
                      >
                        {mine ? <User className="h-4 w-4" aria-hidden /> : <Bot className="h-4 w-4" aria-hidden />}
                      </span>
                      {/* an answer takes the whole row: shrink-wrapped, a
                          table or formula answer left a wide empty band beside it */}
                      <div
                        className={cn(
                          "min-w-0 rounded-3xl px-4 py-3",
                          mine ? "max-w-[85%] bg-primary text-primary-foreground" : "flex-1 bg-card-raised shadow-soft"
                        )}
                      >
                        {mine ? (
                          <p className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</p>
                        ) : (
                          <AnswerText content={message.content} />
                        )}
                      </div>
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tone-peach">
                      <Bot className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="flex items-center gap-2 rounded-3xl bg-card-raised px-4 py-3 text-muted-foreground shadow-soft">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      يكتب الإجابة…
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-border p-4">
            <div className="flex gap-3">
              <Textarea
                placeholder={
                  user
                    ? chapter
                      ? "اسأل سؤالاً حول الفصل المختار… (Enter للإرسال)"
                      : "اختر موضوعاً أولاً، ثم اسأل سؤالك…"
                    : "يجب تسجيل الدخول للاستفادة من المعلّم الذكي"
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAskQuestion();
                  }
                }}
                disabled={!ready || isLoading}
                className="min-h-[64px] flex-1 resize-none text-base"
              />
              <Button
                onClick={handleAskQuestion}
                disabled={!question.trim() || !ready || isLoading}
                aria-label="أرسل"
                className="h-auto w-14 rounded-2xl"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </div>
            <div className="mt-2 space-y-0.5 text-center text-[13px] text-muted-foreground">
              <p>Enter للإرسال، Shift+Enter لسطر جديد</p>
              {/* the free Gemini tier lets Google's reviewers read what is sent */}
              <p>
                ليكيّف المعلّم شرحه معك يُرسَل إليه شعبتك ومستواك في الفصول وبعض أخطائك، دون اسمك أو بريدك. لا تكتب
                معلومات شخصية في أسئلتك، فقد يطّلع عليها مزوّد الذكاء الاصطناعي.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LearnAI;

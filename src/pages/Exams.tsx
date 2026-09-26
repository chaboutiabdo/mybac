import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, FileText, Sparkles, Youtube } from "lucide-react";
import { toast } from "sonner";

import FilterPills, { STREAM_OPTIONS, SUBJECT_OPTIONS } from "@/components/FilterPills";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Loading } from "@/components/ui/states";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { EXAM_YEARS, TONE_BG, difficultyLabel, streamLabel, subjectLabel, subjectTone } from "@/lib/bac";
import { openStoredFile } from "@/lib/files";
import { cn } from "@/lib/utils";

type Exam = Tables<"exams">;
type Correction = { url: string; title: string; description: string | null };

const openVideo = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

/** Opens the paper's video correction, or lets the student pick one when each topic has its own. */
function CorrectionButton({ videos }: { videos: Correction[] }) {
  const button = (onClick?: () => void) => (
    <Button variant="secondary" className="bg-card-raised/70 hover:bg-card-raised" onClick={onClick}>
      <Youtube aria-hidden />
      تصحيح بالفيديو
    </Button>
  );
  if (videos.length === 1) return button(() => openVideo(videos[0].url));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{button()}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {videos.map((v) => (
          <DropdownMenuItem key={v.url} onSelect={() => openVideo(v.url)}>
            {v.description || v.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const Exams = () => {
  const [stream, setStream] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [year, setYear] = useState("all");
  const [exams, setExams] = useState<Exam[]>([]);
  const [examProgress, setExamProgress] = useState<Record<string, Tables<"exam_progress">>>({});
  const [corrections, setCorrections] = useState<Record<string, Correction[]>>({});
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const { trackExamActivity } = useActivityTracking();

  useEffect(() => {
    fetchExams();
    if (user) {
      fetchExamProgress();
      fetchCorrections();
    }
  }, [user]);

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .order("year", { ascending: false })
      .order("subject")
      .order("stream");
    if (error) {
      console.error("Error fetching exams:", error);
      toast.error("تعذّر تحميل المواضيع");
    }
    setExams(data ?? []);
    setLoading(false);
  };

  const fetchExamProgress = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("exam_progress").select("*").eq("student_id", user.id);
    if (error) {
      console.error("Error fetching exam progress:", error);
      return;
    }
    setExamProgress(Object.fromEntries((data ?? []).map((p) => [p.exam_id, p])));
  };

  // Video corrections by paper. RLS lets only signed-in users read videos. The
  // API returns at most 1,000 rows per request, and there are about that many.
  const fetchCorrections = async () => {
    const byExam: Record<string, Correction[]> = {};
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("videos")
        .select("exam_id, url, title, description")
        .eq("kind", "correction")
        .order("created_at", { ascending: false })
        .range(from, from + 999);
      if (error) {
        console.error("Error fetching video corrections:", error);
        return;
      }
      for (const v of data) {
        if (v.exam_id && v.url) (byExam[v.exam_id] ??= []).push({ url: v.url, title: v.title, description: v.description });
      }
      if (data.length < 1000) break;
    }
    setCorrections(byExam);
  };

  const handleExamAction = async (exam: Exam, action: "viewed" | "viewed_solution" | "solved_with_ai") => {
    if (!user) return;

    try {
      await trackExamActivity(
        exam.id,
        action === "viewed" ? "viewed" : action === "viewed_solution" ? "downloaded" : "started_solving",
        exam.title,
        exam.subject,
        exam.year,
        exam.stream
      );

      const progressUpdate: TablesInsert<"exam_progress"> = { student_id: user.id, exam_id: exam.id };
      if (action === "viewed") progressUpdate.viewed_exam = true;
      else if (action === "viewed_solution") progressUpdate.viewed_solution = true;
      else progressUpdate.solved_with_ai = true;

      await supabase.from("exam_progress").upsert(progressUpdate, { onConflict: "student_id,exam_id" });
      fetchExamProgress();
    } catch (error) {
      console.error("Error handling exam action:", error);
    }
  };

  const openExamFile = async (exam: Exam, type: "exam" | "solution") => {
    const fileUrl = type === "exam" ? exam.exam_url : exam.solution_url;
    if (!fileUrl) {
      toast.error(type === "exam" ? "ملف الموضوع غير متوفر" : "الحل غير متوفر بعد");
      return;
    }

    try {
      await openStoredFile(fileUrl);
      // exams.downloads is counted by a database trigger on exam_progress
    } catch (error) {
      console.error("Error opening file:", error);
      toast.error("تعذّر فتح الملف، حاول مرة أخرى");
    }
  };

  const filtered = exams.filter(
    (exam) =>
      (!stream || exam.stream === stream) &&
      (!subject || exam.subject === subject) &&
      (year === "all" || exam.year.toString() === year)
  );

  return (
    <div className="space-y-8">
      <PageHeader title="مواضيع البكالوريا" subtitle="مواضيع رسمية من الدورات السابقة مع حلولها الرسمية" />

      <div className="space-y-3">
        <FilterPills label="الشعبة" options={STREAM_OPTIONS} value={stream} onChange={setStream} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <FilterPills label="المادة" options={SUBJECT_OPTIONS} value={subject} onChange={setSubject} />
          </div>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-12 w-40 rounded-full" aria-label="السنة">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل السنوات</SelectItem>
              {EXAM_YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="لا توجد مواضيع تطابق اختيارك" description="غيّر الشعبة أو المادة أو السنة." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((exam, i) => {
            // derived at render: computing it at fetch time read progress before it had loaded
            const solved = Boolean(examProgress[exam.id]?.solved_with_ai || examProgress[exam.id]?.viewed_solution);
            return (
              <article
                key={exam.id}
                className={cn(
                  "flex flex-col rounded-card p-5 shadow-soft",
                  TONE_BG[subjectTone(exam.subject)],
                  filtered.length % 2 === 1 && i === filtered.length - 1 && "lg:col-span-2"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-card-raised/70 px-3 py-1.5 text-[13px] backdrop-blur">
                    {streamLabel(exam.stream)}
                  </span>
                  {exam.difficulty && (
                    <span className="rounded-full bg-card-raised/70 px-2.5 py-1.5 text-[13px] backdrop-blur">
                      {difficultyLabel(exam.difficulty)}
                    </span>
                  )}
                  {solved && (
                    <span className="ms-auto flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[13px] text-primary-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      راجعته
                    </span>
                  )}
                </div>

                <h2 className="mt-8 text-[22px] font-medium leading-[1.35]">
                  {subjectLabel(exam.subject)} <span className="tabular font-normal">{exam.year}</span>
                </h2>
                <p className="mt-1 text-[15px] text-foreground/70">
                  {exam.questions ? <span className="tabular">{exam.questions} تمارين · </span> : null}
                  <span className="tabular">{exam.downloads || 0}</span> تحميل
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      handleExamAction(exam, "viewed");
                      openExamFile(exam, "exam");
                    }}
                    disabled={!exam.exam_url}
                  >
                    <Eye aria-hidden />
                    عرض الموضوع
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-card-raised/70 hover:bg-card-raised"
                    onClick={() => {
                      handleExamAction(exam, "viewed_solution");
                      openExamFile(exam, "solution");
                    }}
                    disabled={!exam.solution_url}
                  >
                    <FileText aria-hidden />
                    {exam.solution_url ? "الحل الرسمي" : "لا يوجد حل بعد"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-card-raised/70 hover:bg-card-raised"
                    // Visible to everyone, functionally gated — /exams is a free
                    // route. Same shape as MistakeCard's explain button: a
                    // toast explains why, then hands the student to /pricing,
                    // rather than a silently dead button. exam_progress is NOT
                    // written here: the solution page writes it only after a
                    // solution actually renders, so a free student bounced to
                    // /pricing is never marked as having solved the exam (and
                    // never banks the 10 points handle_exam_points awards).
                    onClick={() => {
                      if (!isPremium) {
                        toast.error("الحل بالذكاء الاصطناعي ميزة مميّزة", {
                          description: "تصفّح المواضيع وحلولها الرسمية مجاني، أما الشرح خطوة بخطوة فيتطلب اشتراكاً مميّزاً.",
                        });
                        navigate("/pricing");
                        return;
                      }
                      navigate(`/exam-solution/${exam.id}`);
                    }}
                    // matches its two siblings: nothing to analyse without a file
                    disabled={!exam.exam_url && !exam.solution_url}
                  >
                    <Sparkles aria-hidden />
                    {exam.exam_url || exam.solution_url ? "حل بالذكاء الاصطناعي" : "لا يوجد ملف"}
                  </Button>
                  {corrections[exam.id] && <CorrectionButton videos={corrections[exam.id]} />}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Exams;

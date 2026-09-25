import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Layers, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Loading } from "@/components/ui/states";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { SUBJECTS, chapterLabel, chaptersFor, subjectLabel } from "@/lib/bac";
import { errorMessage } from "@/lib/utils";

// Every card belongs to one student (20260924000000_personal_ai.sql). The hint
// is required: profiles is also reachable through student_flashcard_progress,
// so a bare `profiles(...)` embed is ambiguous.
type Flashcard = Tables<"flashcards"> & { owner: { name: string | null; email: string | null } | null };

/** Matches the per-student, per-chapter CEILING in supabase/functions/gemini-chat/index.ts. */
const CEILING = 10;
const ALL = "all";

/**
 * The same checks the edge function now applies before inserting, run here
 * against what is already stored.
 *
 * This is not theoretical: the live deck contained cards where the model wrote
 * the CJK character 僃 instead of a closing \), so five of eight real cards
 * rendered as red KaTeX errors for students. Cards written before the server
 * gate existed are still in the table, and this is how an admin finds them.
 */
const countOf = (v: string, needle: string) => v.split(needle).length - 1;
// Script properties, not a literal codepoint range: spelling the range out as
// characters puts an ideographic space in the source, which is precisely the
// sort of invisible character this check exists to find.
// Gemini's JSON mode single-escapes backslashes, so \times can arrive as a
// literal TAB. The edge function repairs that on the way in now, but cards
// written before that landed are still in the table.
const CONTROL_CHARS = /[^\P{Cc}\n]/u;
const FOREIGN_SCRIPT = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;

function cardProblems(card: Flashcard): string[] {
  const problems: string[] = [];
  const fields: [string, string][] = [
    ["الوجه", card.front ?? ""],
    ["الظهر", card.back ?? ""],
    ["المفهوم", card.concept ?? ""],
  ];
  for (const [name, value] of fields) {
    if (countOf(value, "\\(") !== countOf(value, "\\)") || countOf(value, "\\[") !== countOf(value, "\\]")) {
      problems.push(`رموز رياضية غير مغلقة في ${name}`);
    }
    if (FOREIGN_SCRIPT.test(value)) problems.push(`حروف غريبة في ${name}`);
    if (CONTROL_CHARS.test(value)) problems.push(`رموز تالفة في ${name}`);
  }
  if ((card.front ?? "").trim().length < 10) problems.push("سؤال قصير جداً");
  if ((card.back ?? "").trim().length < 20) problems.push("إجابة قصيرة جداً");
  if (!(card.concept ?? "").trim()) problems.push("المفهوم فارغ");
  if (!/\p{Script=Arabic}/u.test(card.front ?? "")) problems.push("لا يحتوي نصاً عربياً");
  return problems;
}

export function FlashcardsManagement() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<string>(ALL);
  const [chapter, setChapter] = useState<string>(ALL);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [form, setForm] = useState({ front: "", back: "", concept: "" });
  const [saving, setSaving] = useState(false);

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("flashcards")
        .select("*, owner:profiles!flashcards_owner_id_fkey(name, email)")
        .order("subject")
        .order("chapter")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCards(data ?? []);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      toast.error("تعذّر تحميل البطاقات", { description: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const visible = useMemo(
    () =>
      cards.filter((c) => {
        if (subject !== ALL && c.subject !== subject) return false;
        if (chapter !== ALL && c.chapter !== chapter) return false;
        if (onlyProblems && cardProblems(c).length === 0) return false;
        return true;
      }),
    [cards, subject, chapter, onlyProblems],
  );

  // How many cards each chapter holds across all students — how much the AI is
  // being used per chapter. The ceiling is per student, so no /10 here.
  const perChapter = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cards) {
      const key = `${c.subject}/${c.chapter}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [cards]);

  const problemCount = useMemo(() => cards.filter((c) => cardProblems(c).length > 0).length, [cards]);

  const openEdit = (card: Flashcard) => {
    setEditing(card);
    setForm({ front: card.front ?? "", back: card.back ?? "", concept: card.concept ?? "" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("flashcards")
        .update({
          front: form.front.trim(),
          back: form.back.trim(),
          concept: form.concept.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      if (error) throw error;
      toast.success("تم حفظ البطاقة");
      setEditing(null);
      await fetchCards();
    } catch (error) {
      console.error("Error saving flashcard:", error);
      toast.error("تعذّر حفظ البطاقة", { description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (card: Flashcard) => {
    // Deleting cascades to every student's progress row for this card
    // (student_flashcard_progress_flashcard_id_fkey ON DELETE CASCADE).
    if (!window.confirm(`حذف هذه البطاقة نهائياً؟\n\n${card.front}`)) return;
    try {
      const { error } = await supabase.from("flashcards").delete().eq("id", card.id);
      if (error) throw error;
      toast.success("تم حذف البطاقة");
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch (error) {
      console.error("Error deleting flashcard:", error);
      toast.error("تعذّر حذف البطاقة", { description: errorMessage(error) });
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">البطاقات التعليمية</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            لكل طالب بطاقاته الخاصة، يولّدها الذكاء الاصطناعي من أخطائه ومستواه. الحد {CEILING} بطاقات لكل طالب في كل فصل.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{cards.length} بطاقة</Badge>
          {problemCount > 0 ? (
            <Button
              variant={onlyProblems ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyProblems((v) => !v)}
            >
              <AlertTriangle aria-hidden />
              {problemCount} بطاقة بها مشكلة
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={subject}
          onValueChange={(v) => {
            setSubject(v);
            setChapter(ALL);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="كل المواد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>كل المواد</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={chapter} onValueChange={setChapter} disabled={subject === ALL}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="كل الفصول" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>كل الفصول</SelectItem>
            {chaptersFor(subject).map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label} ({perChapter.get(`${subject}/${c.value}`) ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="لا توجد بطاقات"
          description={
            onlyProblems
              ? "لا توجد بطاقات بها مشاكل — الدفتر سليم."
              : "لم يتم توليد أي بطاقة لهذا الفصل بعد."
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((card) => {
            const problems = cardProblems(card);
            return (
              <Card key={card.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{card.front}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subjectLabel(card.subject)} · {chapterLabel(card.chapter)} ·{" "}
                      {card.owner?.name || card.owner?.email || "طالب محذوف"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={card.source === "ai_generated" ? "info" : "outline"}>
                      {card.source === "ai_generated" ? "ذكاء اصطناعي" : "يدوي"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(card)} aria-label="تعديل">
                      <Pencil aria-hidden />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(card)} aria-label="حذف">
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-wrap text-sm">{card.back}</p>
                  {card.concept ? (
                    <p className="text-sm text-muted-foreground">المفهوم: {card.concept}</p>
                  ) : null}
                  {problems.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/25 bg-destructive-light px-3 py-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                      <span className="text-sm text-destructive">{problems.join(" · ")}</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل البطاقة</DialogTitle>
            <DialogDescription>
              اكتب الرموز الرياضية بين {"\\("} و {"\\)"} وتأكد من إغلاق كل قوس.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="fc-front">
                الوجه (السؤال)
              </label>
              <Textarea
                id="fc-front"
                value={form.front}
                onChange={(e) => setForm((f) => ({ ...f, front: e.target.value }))}
                rows={2}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="fc-back">
                الظهر (الإجابة)
              </label>
              <Textarea
                id="fc-back"
                value={form.back}
                onChange={(e) => setForm((f) => ({ ...f, back: e.target.value }))}
                rows={5}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="fc-concept">
                المفهوم
              </label>
              <Input
                id="fc-concept"
                value={form.concept}
                onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "جارٍ الحفظ…" : "حفظ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

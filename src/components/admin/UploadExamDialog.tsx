import { useState } from "react";
import { EXAM_YEARS, STREAMS, SUBJECTS } from "@/lib/bac";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadExamDialogProps {
  children: React.ReactNode;
}

export function UploadExamDialog({ children }: UploadExamDialogProps) {
  const [open, setOpen] = useState(false);
  const [examFile, setExamFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    year: "",
    stream: "",
    difficulty: "",
    questions: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examFile) {
      toast.error("اختر ملف الموضوع أولاً");
      return;
    }

    setLoading(true);
    try {
      // Upload exam file to storage
      const examFileName = `exams/${Date.now()}-${examFile.name}`;
      const { error: examUploadError } = await supabase.storage
        .from('documents')
        .upload(examFileName, examFile);

      if (examUploadError) throw examUploadError;

      let solutionFileName = null;
      if (solutionFile) {
        solutionFileName = `solutions/${Date.now()}-${solutionFile.name}`;
        const { error: solutionUploadError } = await supabase.storage
          .from('documents')
          .upload(solutionFileName, solutionFile);

        if (solutionUploadError) throw solutionUploadError;
      }

      // Insert exam record into database
      const { error: insertError } = await supabase
        .from('exams')
        .insert({
          title: formData.title,
          subject: formData.subject,
          year: parseInt(formData.year),
          stream: formData.stream,
          difficulty: formData.difficulty,
          questions: parseInt(formData.questions) || 0,
          exam_url: examFileName,
          solution_url: solutionFileName
        });

      if (insertError) throw insertError;

      toast.success("تم رفع الموضوع");

      setOpen(false);
      setFormData({
        title: "",
        subject: "",
        year: "",
        stream: "",
        difficulty: "",
        questions: "",
      });
      setExamFile(null);
      setSolutionFile(null);
    } catch (error) {
      console.error('Error uploading exam:', error);
      toast.error("تعذّر رفع الموضوع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع موضوع بكالوريا
          </DialogTitle>
          <DialogDescription>
            أضف موضوعاً رسمياً مع حلّه
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">عنوان الموضوع</Label>
              <Input
                id="title"
                placeholder="مثال: الرياضيات — بكالوريا 2025"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">المادة</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  {/* this used to list the six STREAMS, so an exam's subject was saved as a stream */}
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="year">السنة</Label>
                <Select value={formData.year} onValueChange={(value) => setFormData({...formData, year: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر السنة" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stream">الشعبة</Label>
                <Select value={formData.stream} onValueChange={(value) => setFormData({...formData, stream: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الشعبة" />
                  </SelectTrigger>
                  {/* "Sciences" / "Math" / "Letters" matched no student filter, so uploads were invisible */}
                  <SelectContent>
                    {STREAMS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="difficulty">المستوى</Label>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData({...formData, difficulty: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستوى" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">سهل</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="hard">صعب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="questions">عدد التمارين</Label>
              <Input
                id="questions"
                type="number"
                placeholder="مثال: 4"
                min="1"
                value={formData.questions}
                onChange={(e) => setFormData({...formData, questions: e.target.value})}
                required
              />
            </div>

          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="exam-file">ملف الموضوع (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="exam-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setExamFile(e.target.files?.[0] || null)}
                  required
                />
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              {examFile && (
                <p className="text-base text-muted-foreground">
                  الملف: {examFile.name}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="solution-file">ملف الحل (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="solution-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSolutionFile(e.target.files?.[0] || null)}
                />
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              {solutionFile && (
                <p className="text-base text-muted-foreground">
                  الملف: {solutionFile.name}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                الحل اختياري، ويمكن إضافته لاحقاً
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t bg-popover sticky bottom-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" className="text-primary-foreground" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Plus className="h-4 w-4 me-2" />
              )}
              {loading ? "جارٍ الرفع…" : "رفع الموضوع"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
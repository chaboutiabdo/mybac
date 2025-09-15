import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    description: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examFile) {
      toast({
        title: "Error",
        description: "Please select an exam file",
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: "Exam uploaded successfully!",
      });

      setOpen(false);
      setFormData({
        title: "",
        subject: "",
        year: "",
        stream: "",
        difficulty: "",
        questions: "",
        description: ""
      });
      setExamFile(null);
      setSolutionFile(null);
    } catch (error) {
      console.error('Error uploading exam:', error);
      toast({
        title: "Error",
        description: "Failed to upload exam",
        variant: "destructive",
      });
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
            Upload New Exam
          </DialogTitle>
          <DialogDescription>
            Add a new examination paper with its solution
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Exam Title</Label>
              <Input
                id="title"
                placeholder="e.g., BAC Mathematics 2024 - Session 1"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="Biology">Biology</SelectItem>
                    <SelectItem value="Literature">Literature</SelectItem>
                    <SelectItem value="Philosophy">Philosophy</SelectItem>
                    <SelectItem value="History">History</SelectItem>
                    <SelectItem value="Geography">Geography</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Select value={formData.year} onValueChange={(value) => setFormData({...formData, year: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2021">2021</SelectItem>
                    <SelectItem value="2020">2020</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stream">Stream</Label>
                <Select value={formData.stream} onValueChange={(value) => setFormData({...formData, stream: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stream" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sciences">Sciences</SelectItem>
                    <SelectItem value="Math">Math</SelectItem>
                    <SelectItem value="Letters">Letters</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData({...formData, difficulty: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="questions">Number of Questions</Label>
              <Input
                id="questions"
                type="number"
                placeholder="e.g., 25"
                min="1"
                value={formData.questions}
                onChange={(e) => setFormData({...formData, questions: e.target.value})}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional details about the exam..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="exam-file">Exam File (PDF)</Label>
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
                <p className="text-sm text-muted-foreground">
                  Selected: {examFile.name}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="solution-file">Solution File (PDF)</Label>
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
                <p className="text-sm text-muted-foreground">
                  Selected: {solutionFile.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Solution file is optional and can be added later
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t bg-background sticky bottom-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="gradient-primary text-white" disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {loading ? "Uploading..." : "Upload Exam"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
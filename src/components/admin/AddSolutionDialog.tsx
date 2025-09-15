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
import { FileText, Upload } from "lucide-react";

interface AddSolutionDialogProps {
  children: React.ReactNode;
  examTitle: string;
}

export function AddSolutionDialog({ children, examTitle }: AddSolutionDialogProps) {
  const [open, setOpen] = useState(false);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission - connect to backend later
    console.log("Solution uploaded for exam:", examTitle);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Add/Edit Solution
          </DialogTitle>
          <DialogDescription>
            Upload or update the solution for: <strong>{examTitle}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="solution-file">Solution File (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="solution-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSolutionFile(e.target.files?.[0] || null)}
                  required
                />
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              {solutionFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {solutionFile.name}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Solution Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about the solution approach..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gradient-primary text-white">
              <Upload className="h-4 w-4 mr-2" />
              Upload Solution
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
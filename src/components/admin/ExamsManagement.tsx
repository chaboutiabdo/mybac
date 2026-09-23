import { useState, useEffect } from "react";
import { EXAM_YEARS, SUBJECTS } from "@/lib/bac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Upload, 
  Search, 
  Filter,
  Download,
  Edit,
  Trash2,
  Calendar,
  Book
} from "lucide-react";
import { UploadExamDialog } from "./UploadExamDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Exam = Tables<"exams">;

export function ExamsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // Load exams from Supabase
  const loadExams = async () => {
    try {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("خطأ", { description: "تعذّر تحميل الامتحانات" });
        return;
      }

      setExams(data || []);
    } catch (error) {
      console.error("Error loading exams:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const subjects = SUBJECTS.map((s) => s.value);
  const years = EXAM_YEARS;

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === "all" || exam.subject === subjectFilter;
    const matchesYear = yearFilter === "all" || exam.year.toString() === yearFilter;
    return matchesSearch && matchesSubject && matchesYear;
  });

  const totalDownloads = exams.reduce((sum, exam) => sum + (exam.downloads || 0), 0);
  const totalExams = exams.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8" />
            إدارة المواضيع
          </h1>
          <p className="text-muted-foreground">رفع مواضيع البكالوريا وإدارتها</p>
        </div>
        <UploadExamDialog>
          <Button className="text-primary-foreground">
            <Upload className="h-4 w-4 me-2" />
            رفع موضوع
          </Button>
        </UploadExamDialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-3xl font-bold">{totalExams}</p>
                <p className="text-base text-muted-foreground">إجمالي الامتحانات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-success" />
              <div>
                <p className="text-3xl font-bold">{totalDownloads.toLocaleString()}</p>
                <p className="text-base text-muted-foreground">مجموع التحميلات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <div>
                <p className="text-3xl font-bold">{new Date().getFullYear()}</p>
                <p className="text-base text-muted-foreground">السنة الحالية</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exams List */}
      <Card>
        <CardHeader>
          <CardTitle>مواضيع الامتحانات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالعنوان أو المادة…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 me-2" />
                <SelectValue placeholder="المادة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المواد</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="السنة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل السنوات</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exams Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>عنوان الموضوع</TableHead>
                  <TableHead>المادة</TableHead>
                  <TableHead>السنة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المستوى</TableHead>
                  <TableHead>الأسئلة</TableHead>
                  <TableHead>التحميلات</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      جارٍ تحميل المواضيع…
                    </TableCell>
                  </TableRow>
                ) : filteredExams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      لا توجد مواضيع
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{exam.title}</p>
                          <p className="text-base text-muted-foreground">
                            Uploaded {new Date(exam.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{exam.subject}</TableCell>
                      <TableCell>{exam.year}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-sm">
                          {exam.stream}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            exam.difficulty === "hard" ? "destructive" :
                            exam.difficulty === "medium" ? "secondary" : "outline"
                          }
                        >
                          {exam.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>{exam.questions}</TableCell>
                      <TableCell>{(exam.downloads || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" title="تحميل الموضوع">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="تعديل">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="حذف">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
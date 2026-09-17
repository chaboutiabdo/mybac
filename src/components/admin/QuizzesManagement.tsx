import { useState, useEffect } from "react";
import { Loading } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Calendar, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { UploadQuizDialog } from "./UploadQuizDialog";

type Quiz = Tables<'quizzes'>;

export function QuizzesManagement() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [dailyUploadDialogOpen, setDailyUploadDialogOpen] = useState(false);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes((data || []).map(quiz => ({
        ...quiz,
        questions: Array.isArray(quiz.questions) ? quiz.questions : []
      })));
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error("خطأ", { description: "تعذّر تحميل الاختبارات" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (quiz.chapter && quiz.chapter.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || quiz.type === typeFilter;
    const matchesSubject = subjectFilter === "all" || quiz.subject === subjectFilter;
    
    return matchesSearch && matchesType && matchesSubject;
  });

  const subjects = [...new Set(quizzes.map(quiz => quiz.subject))];
  // `questions` is a jsonb column, so it is typed Json rather than an array
  const questionCount = (questions: unknown): number =>
    Array.isArray(questions) ? questions.length : 0;

  const practiceQuizzes = quizzes.filter(q => q.type === 'practice');
  const dailyQuizzes = quizzes.filter(q => q.type === 'daily');
  const totalQuestions = quizzes.reduce((acc, quiz) => acc + questionCount(quiz.questions), 0);

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      toast.success("تم", { description: "Quiz deleted successfully" });
      
      loadQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error("خطأ", { description: "Failed to delete quiz" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Quizzes Management</h1>
          <p className="text-muted-foreground">
            Manage practice and daily quizzes for students
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setDailyUploadDialogOpen(true)}>
            <Calendar className="me-2 h-4 w-4" />
            Upload Daily Quiz
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            Upload Practice Quiz
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Total Quizzes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{quizzes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Practice Quizzes</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{practiceQuizzes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Daily Quizzes</CardTitle>
            <Calendar className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dailyQuizzes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">مجموع الأسئلة</CardTitle>
            <BookOpen className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalQuestions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Library</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by subject or chapter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ps-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="practice">تدريب</SelectItem>
                <SelectItem value="daily">يومي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <Loading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المادة</TableHead>
                  <TableHead>الفصل</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الأسئلة</TableHead>
                  <TableHead>Max Score</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuizzes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No quizzes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuizzes.map((quiz) => (
                    <TableRow key={quiz.id}>
                      <TableCell className="font-medium">{quiz.subject}</TableCell>
                      <TableCell>{quiz.chapter || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={quiz.type === 'daily' ? 'default' : 'secondary'}>
                          {quiz.type === 'daily' ? 'يومي' : 'تدريب'}
                        </Badge>
                      </TableCell>
                      <TableCell>{questionCount(quiz.questions)}</TableCell>
                      <TableCell>{quiz.max_score} pts</TableCell>
                      <TableCell>{new Date(quiz.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteQuiz(quiz.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UploadQuizDialog
        isOpen={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onQuizUploaded={loadQuizzes}
      />

      <UploadQuizDialog
        isOpen={dailyUploadDialogOpen}
        onOpenChange={setDailyUploadDialogOpen}
        onQuizUploaded={loadQuizzes}
        type="daily"
      />
    </div>
  );
}
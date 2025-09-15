import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Eye, FileText, Sparkles, Download } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Exam {
  id: string;
  subject: string;
  stream: string;
  year: number;
  title: string;
  difficulty?: string;
  questions?: number;
  exam_url?: string;
  solution_url?: string;
  downloads?: number;
  solved: boolean;
}

const Exams = () => {
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [examProgress, setExamProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const { trackExamActivity } = useActivityTracking();
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
    if (user) {
      fetchExamProgress(); 
    }
  }, [user]);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('year', { ascending: false });

      if (error) throw error;
      
      const examsWithSolved = data?.map(exam => ({
        ...exam,
        solved: examProgress[exam.id]?.solved_with_ai || false
      })) || [];
      
      setExams(examsWithSolved);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast({
        title: "Error",
        description: "Failed to load exams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExamProgress = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('exam_progress')
        .select('*')
        .eq('student_id', user.id);

      if (error) throw error;
      
      const progressMap: Record<string, any> = {};
      data?.forEach(progress => {
        progressMap[progress.exam_id] = progress;
      });
      setExamProgress(progressMap);
    } catch (error) {
      console.error('Error fetching exam progress:', error);
    }
  };

  const handleExamAction = async (exam: Exam, action: 'viewed' | 'viewed_solution' | 'solved_with_ai') => {
    if (!user) return;

    console.log('User exam action:', { exam: exam.title, action });

    try {
      // Track exam activity
      await trackExamActivity(
        exam.id,
        action === 'viewed' ? 'viewed' : action === 'viewed_solution' ? 'downloaded' : 'started_solving',
        exam.title,
        exam.subject,
        exam.year,
        exam.stream
      );

      // Update exam progress for scoring
      const progressUpdate: any = {
        student_id: user.id,
        exam_id: exam.id
      };

      if (action === 'viewed') {
        progressUpdate.viewed_exam = true;
      } else if (action === 'viewed_solution') {
        progressUpdate.viewed_solution = true;
      } else if (action === 'solved_with_ai') {
        progressUpdate.solved_with_ai = true;
      }

      await supabase.from('exam_progress').upsert(progressUpdate, {
        onConflict: 'student_id,exam_id'
      });

      // Refresh exam progress to update UI
      fetchExamProgress();

      toast({
        title: "Success",
        description: `Exam ${action.replace('_', ' ')} successfully`,
      });

    } catch (error) {
      console.error('Error handling exam action:', error);
      toast({
        title: "Error",
        description: "Failed to process exam action",
        variant: "destructive",
      });
    }
  };

  const openExamFile = async (exam: Exam, type: 'exam' | 'solution') => {
    const fileUrl = type === 'exam' ? exam.exam_url : exam.solution_url;
    if (!fileUrl) {
      toast({
        title: "Error",
        description: `${type === 'exam' ? 'Exam' : 'Solution'} file not available`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if it's a direct URL or storage path
      if (fileUrl.startsWith('http')) {
        // Direct URL - just open in new tab to avoid blocking issues
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Storage path - get signed URL
        const { data } = await supabase.storage
          .from('documents')
          .createSignedUrl(fileUrl, 3600); // 1 hour expiry

        if (data?.signedUrl) {
          // Open signed URL directly in new tab
          window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } else {
          throw new Error('Failed to get signed URL');
        }
      }
      
      // Update downloads count
      if (type === 'exam') {
        await supabase
          .from('exams')
          .update({ downloads: (exam.downloads || 0) + 1 })
          .eq('id', exam.id);
      }

      toast({
        title: "Success",
        description: `${type === 'exam' ? 'Exam' : 'Solution'} file opened successfully!`,
      });

    } catch (error) {
      console.error('Error opening file:', error);
      toast({
        title: "Error",
        description: "Failed to open file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredExams = exams.filter(exam => {
    return (!selectedStream || selectedStream === "all" || exam.stream === selectedStream) &&
           (!selectedSubject || selectedSubject === "all" || exam.subject === selectedSubject) &&
           (!selectedYear || selectedYear === "all" || exam.year.toString() === selectedYear);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              امتحانات البكالوريا السابقة
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              تدرب على امتحانات رسمية سابقة واحصل على حلول مدعومة بالذكاء الاصطناعي
            </p>
          </div>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <FileText className="h-5 w-5 text-primary" />
                تصفية الامتحانات
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedStream} onValueChange={setSelectedStream}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الشعبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المادة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المواد</SelectItem>
                  <SelectItem value="Math">الرياضيات</SelectItem>
                  <SelectItem value="Physics">الفيزياء</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر السنة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع السنوات</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                  <SelectItem value="2020">2020</SelectItem>
                  <SelectItem value="2019">2019</SelectItem>
                  <SelectItem value="2018">2018</SelectItem>
                  <SelectItem value="2017">2017</SelectItem>
                  <SelectItem value="2016">2016</SelectItem>
                  <SelectItem value="2015">2015</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {filteredExams.map((exam) => (
              <Card key={exam.id} className="group hover:shadow-lg transition-all duration-300 border-primary/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                      {exam.solved && <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-success" />}
                      <span className="line-clamp-2">{exam.title}</span>
                    </CardTitle>
                    <Badge variant={exam.solved ? "default" : "secondary"} className="text-xs">
                      {exam.solved ? "محلول" : "جديد"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs md:text-sm">
                    شعبة {exam.stream} • {exam.year}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground">
                    <span>الصعوبة: <Badge variant="outline" className="ml-1 text-xs">{exam.difficulty || 'متوسط'}</Badge></span>
                    <span>{exam.downloads || 0} تحميل</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button 
                      className="w-full hover:scale-105 transition-all duration-300 text-xs md:text-sm"
                      variant="outline"
                      onClick={() => {
                        handleExamAction(exam, 'viewed');
                        openExamFile(exam, 'exam');
                      }}
                      disabled={!exam.exam_url}
                    >
                      <Eye className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      عرض الامتحان
                    </Button>
                    <Button 
                      className="w-full hover:scale-105 transition-all duration-300 text-xs md:text-sm"
                      variant="outline"
                      onClick={() => {
                        handleExamAction(exam, 'viewed_solution');
                        openExamFile(exam, 'solution');
                      }}
                      disabled={!exam.solution_url}
                    >
                      <FileText className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      {exam.solution_url ? 'الحلول' : 'لا يوجد حل'}
                    </Button>
                    <Button 
                      className="w-full relative overflow-hidden group bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                      onClick={() => {
                        toast({
                          title: "قريباً",
                          description: "هذه الميزة ستكون متاحة قريباً",
                        });
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center justify-center">
                        <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                        <span className="font-semibold">حل بالذكاء الاصطناعي</span>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
          {!loading && filteredExams.length === 0 && (
            <div className="text-center py-8 md:py-12">
              <p className="text-muted-foreground">لا توجد امتحانات تطابق المرشحات المحددة.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Exams;
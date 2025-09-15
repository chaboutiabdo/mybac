import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Play, 
  FileText, 
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Trophy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StudentActivityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

interface QuizResult {
  id: string;
  score: number;
  completed_at: string;
  quiz: {
    subject: string;
    type: string;
  };
}

interface VideoActivity {
  id: string;
  video_title: string;
  subject: string;
  action: string;
  created_at: string;
}

interface ExamActivity {
  id: string;
  exam_title: string;
  subject: string;
  year: number;
  action: string;
  created_at: string;
}

interface QuestionActivity {
  id: string;
  question_text: string;
  subject?: string;
  created_at: string;
  ai_response?: string;
}

export function StudentActivityDialog({ 
  isOpen, 
  onOpenChange, 
  studentId, 
  studentName 
}: StudentActivityDialogProps) {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [videoActivities, setVideoActivities] = useState<VideoActivity[]>([]);
  const [examActivities, setExamActivities] = useState<ExamActivity[]>([]);
  const [questionActivities, setQuestionActivities] = useState<QuestionActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchStudentActivity();
    }
  }, [isOpen, studentId]);

  const fetchStudentActivity = async () => {
    setLoading(true);
    try {
      // Fetch quiz results with proper join
      const { data: quizData } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          score,
          completed_at,
          quiz_id,
          quizzes (
            subject,
            type
          )
        `)
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false });

      // Fetch video activity
      const { data: videoData } = await supabase
        .from('video_activity_logs')
        .select('id, video_title, subject, action, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch exam activity
      const { data: examData } = await supabase
        .from('exam_activity_logs')
        .select('id, exam_title, subject, year, action, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch question activity
      const { data: questionData } = await supabase
        .from('student_questions_log')
        .select('id, question_text, subject, created_at, ai_response')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(30);

      console.log('Quiz data:', quizData);
      console.log('Video data:', videoData);
      console.log('Exam data:', examData);
      console.log('Question data:', questionData);

      // Transform quiz data properly
      const transformedQuizResults = quizData?.map(item => ({
        id: item.id,
        score: item.score,
        completed_at: item.completed_at,
        quiz: {
          subject: item.quizzes?.subject || 'Unknown',
          type: item.quizzes?.type || 'Unknown'
        }
      })) || [];

      setQuizResults(transformedQuizResults);
      setVideoActivities(videoData || []);
      setExamActivities(examData || []);
      setQuestionActivities(questionData || []);
    } catch (error) {
      console.error('Error fetching student activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getQuizScoreColor = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-destructive';
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Activity - {studentName}</DialogTitle>
            <DialogDescription>Loading student activity data...</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Activity - {studentName}</DialogTitle>
          <DialogDescription>
            Detailed learning activity and progress tracking
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="quizzes" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quizzes">
              <BookOpen className="h-4 w-4 mr-2" />
              Quizzes ({quizResults.length})
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Play className="h-4 w-4 mr-2" />
              Videos ({videoActivities.length})
            </TabsTrigger>
            <TabsTrigger value="exams">
              <FileText className="h-4 w-4 mr-2" />
              Exams ({examActivities.length})
            </TabsTrigger>
            <TabsTrigger value="questions">
              <MessageSquare className="h-4 w-4 mr-2" />
              Questions ({questionActivities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes" className="space-y-4">
            <div className="grid gap-4">
              {quizResults.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No quiz attempts found</p>
              ) : (
                quizResults.map((result) => (
                  <Card key={result.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{result.quiz.subject} Quiz</h4>
                          <p className="text-sm text-muted-foreground">
                            {result.quiz.type} • {formatDate(result.completed_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className={`h-4 w-4 ${getQuizScoreColor(result.score)}`} />
                          <span className={`font-bold ${getQuizScoreColor(result.score)}`}>
                            {result.score} points
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            <div className="grid gap-4">
              {videoActivities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No video activity found</p>
              ) : (
                videoActivities.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{activity.video_title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {activity.subject} • {formatDate(activity.created_at)}
                          </p>
                        </div>
                        <Badge variant={activity.action === 'completed' ? 'default' : 'secondary'}>
                          {activity.action}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="exams" className="space-y-4">
            <div className="grid gap-4">
              {examActivities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No exam activity found</p>
              ) : (
                examActivities.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{activity.exam_title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {activity.subject} {activity.year} • {formatDate(activity.created_at)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {activity.action}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <div className="grid gap-4">
              {questionActivities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No questions found</p>
              ) : (
                questionActivities.map((question) => (
                  <Card key={question.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{question.question_text}</h4>
                            <p className="text-xs text-muted-foreground">
                              {question.subject || 'General'} • {formatDate(question.created_at)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            AI Question
                          </Badge>
                        </div>
                        {question.ai_response && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                            <p className="text-xs text-muted-foreground mb-1">AI Response:</p>
                            <p className="line-clamp-2">{question.ai_response}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
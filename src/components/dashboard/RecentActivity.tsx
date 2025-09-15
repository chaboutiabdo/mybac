import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Play, 
  FileText, 
  MessageSquare,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ActivityItem {
  id: string;
  type: 'quiz' | 'video' | 'exam' | 'question';
  title: string;
  time: string;
  details?: string;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchRecentActivity();
    }
  }, [user]);

  const fetchRecentActivity = async () => {
    if (!user) return;

    try {
      // Get recent quiz attempts
      const { data: quizData } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          completed_at,
          score,
          quizzes!inner(subject, type)
        `)
        .eq('student_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(3);

      // Get recent video activity
      const { data: videoData } = await supabase
        .from('video_activity_logs')
        .select('id, video_title, subject, created_at, action')
        .eq('student_id', user.id)
        .eq('action', 'started')
        .order('created_at', { ascending: false })
        .limit(3);

      // Get recent exam activity
      const { data: examData } = await supabase
        .from('exam_activity_logs')
        .select('id, exam_title, subject, year, created_at, action')
        .eq('student_id', user.id)
        .in('action', ['viewed', 'started_solving'])
        .order('created_at', { ascending: false })
        .limit(2);

      // Get recent questions
      const { data: questionData } = await supabase
        .from('student_questions_log')
        .select('id, question_text, subject, created_at')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2);

      const allActivities: ActivityItem[] = [];

      // Add quiz activities
      quizData?.forEach(quiz => {
        allActivities.push({
          id: quiz.id,
          type: 'quiz',
          title: `Completed ${quiz.quizzes.subject} Quiz`,
          time: formatTimeAgo(quiz.completed_at),
          details: `Score: ${quiz.score}`
        });
      });

      // Add video activities
      videoData?.forEach(video => {
        allActivities.push({
          id: video.id,
          type: 'video',
          title: `Watched ${video.video_title}`,
          time: formatTimeAgo(video.created_at),
          details: video.subject
        });
      });

      // Add exam activities
      examData?.forEach(exam => {
        allActivities.push({
          id: exam.id,
          type: 'exam',
          title: `Solved ${exam.year} ${exam.subject} Exam`,
          time: formatTimeAgo(exam.created_at),
          details: exam.exam_title
        });
      });

      // Add question activities
      questionData?.forEach(question => {
        allActivities.push({
          id: question.id,
          type: 'question',
          title: 'Asked AI Question',
          time: formatTimeAgo(question.created_at),
          details: question.question_text.substring(0, 50) + '...'
        });
      });

      // Sort by most recent and take top 5
      allActivities.sort((a, b) => {
        const timeA = parseTimeAgo(a.time);
        const timeB = parseTimeAgo(b.time);
        return timeA - timeB;
      });

      setActivities(allActivities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const parseTimeAgo = (timeStr: string): number => {
    const match = timeStr.match(/(\d+)([smhdw])/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
    return value * (multipliers[unit as keyof typeof multipliers] || 1);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <BookOpen className="h-4 w-4" />;
      case 'video': return <Play className="h-4 w-4" />;
      case 'exam': return <FileText className="h-4 w-4" />;
      case 'question': return <MessageSquare className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'bg-primary/10 text-primary';
      case 'video': return 'bg-success/10 text-success';
      case 'exam': return 'bg-warning/10 text-warning';
      case 'question': return 'bg-accent/10 text-accent';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded mb-1"></div>
                  <div className="h-3 bg-muted/60 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent activity found.</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                  {activity.details && (
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.details}
                    </p>
                  )}
                  <Badge variant="secondary" className="text-xs mt-1">
                    {activity.time}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
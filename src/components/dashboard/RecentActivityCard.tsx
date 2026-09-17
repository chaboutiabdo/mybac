import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Loading } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  FileText, 
  PlayCircle, 
  Users, 
  Clock,
  ArrowRight,
  BookOpen,
  Target
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RecentActivityItem {
  id: string;
  type: 'quiz' | 'video' | 'exam';
  title: string;
  time: string;
  timestamp: number; // For sorting
}

const RecentActivityCard = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const formatTimeAgo = useCallback((dateString: string): string => {
    if (!dateString) return "just now";
    
    const now = new Date();
    const date = new Date(dateString);
    
    // Handle invalid dates
    if (isNaN(date.getTime())) return "just now";
    
    // Calculate difference in seconds (use absolute value to handle timezone issues)
    const diffInSeconds = Math.abs(Math.floor((now.getTime() - date.getTime()) / 1000));

    // If the date is in the future (more than 1 minute), show "just now"
    if (date.getTime() > now.getTime() && diffInSeconds > 60) {
      return "just now";
    }

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}${minutes === 1 ? 'm' : 'm'} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}${hours === 1 ? 'h' : 'h'} ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}${days === 1 ? 'd' : 'd'} ago`;
    }
    if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks}${weeks === 1 ? 'w' : 'w'} ago`;
    }
    // For older dates, show the actual date
    return date.toLocaleDateString();
  }, []);

  const fetchRecentActivity = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch recent activities in parallel
      const [quizData, videoData, examData] = await Promise.all([
        // Get recent completed quiz attempts
        supabase
          .from('quiz_attempts')
          .select(`
            id,
            completed_at,
            quizzes!inner(subject, type)
          `)
          .eq('student_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(3),
        
        // Get recent video activity (started or completed)
        supabase
          .from('video_activity_logs')
          .select('id, video_title, subject, created_at, action')
          .eq('student_id', user.id)
          .in('action', ['started', 'completed'])
          .order('created_at', { ascending: false })
          .limit(3),
        
        // Get recent exam activity
        supabase
          .from('exam_activity_logs')
          .select('id, exam_title, subject, year, created_at, action')
          .eq('student_id', user.id)
          .in('action', ['viewed', 'started_solving', 'completed'])
          .order('created_at', { ascending: false })
          .limit(2)
      ]);

      const allActivities: RecentActivityItem[] = [];

      // Add quiz activities
      quizData.data?.forEach(quiz => {
        if (quiz.completed_at && quiz.quizzes) {
          allActivities.push({
            id: quiz.id,
            type: 'quiz',
            title: `Completed ${quiz.quizzes.subject} Quiz`,
            time: formatTimeAgo(quiz.completed_at),
            timestamp: new Date(quiz.completed_at).getTime()
          });
        }
      });

      // Add video activities
      videoData.data?.forEach(video => {
        allActivities.push({
          id: video.id,
          type: 'video',
          title: `Watched ${video.video_title}`,
          time: formatTimeAgo(video.created_at),
          timestamp: new Date(video.created_at).getTime()
        });
      });

      // Add exam activities
      examData.data?.forEach(exam => {
        const actionText = exam.action === 'completed' ? 'Solved' : 'Viewed';
        allActivities.push({
          id: exam.id,
          type: 'exam',
          title: `${actionText} ${exam.year} ${exam.subject} Exam`,
          time: formatTimeAgo(exam.created_at),
          timestamp: new Date(exam.created_at).getTime()
        });
      });

      // Sort by most recent and take top 3
      allActivities.sort((a, b) => b.timestamp - a.timestamp);
      setRecentActivities(allActivities.slice(0, 3));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRecentActivity();
    } else {
      setLoading(false);
    }
  }, [user, fetchRecentActivity]);

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'bg-success';
      case 'video': return 'bg-primary';
      case 'exam': return 'bg-accent';
      default: return 'bg-muted';
    }
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
        <CardTitle className="font-display text-xl">آخر النشاطات</CardTitle>
        <Clock className="h-5 w-5 text-muted-foreground" strokeWidth={1.6} aria-hidden />
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <Loading />
        ) : recentActivities.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="لا يوجد نشاط بعد"
            description="ابدأ اختبار اليوم أو شاهد درسًا لتظهر نشاطاتك هنا."
            className="border-0"
          />
        ) : (
          recentActivities.map((activity) => {
            const Icon =
              activity.type === "quiz" ? Brain : activity.type === "video" ? PlayCircle : FileText;
            return (
              <div
                key={activity.id}
                className="flex items-center gap-4 border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-card-raised"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-gold/25 bg-surface-deep/60">
                  <Icon className="h-5 w-5 text-accent" strokeWidth={1.6} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground tabular">{activity.time}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard;

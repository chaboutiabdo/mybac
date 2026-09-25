import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  FileText,
  Video,
  TrendingUp,
  BookOpen,
  Upload
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import PageHeader from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { UploadExamDialog } from "./UploadExamDialog";
import { UploadQuizDialog } from "./UploadQuizDialog";
import { EmptyState, Loading } from "@/components/ui/states";
import { formatDateDZ } from "@/lib/bac";

export function AdminOverview() {
  const [stats, setStats] = useState({
    students: 0,
    schools: 0,
    exams: 0,
    videos: 0
  });
  const [showUploadQuiz, setShowUploadQuiz] = useState(false);
  // These two panels used to render hard-coded fake rows (Ahmed Benali,
  // "Lycée Mohamed Boudiaf — 87% completion"). Real data or nothing.
  const [recentAttempts, setRecentAttempts] = useState<
    { id: string; score: number | null; completed_at: string | null; name: string | null }[]
  >([]);
  const [topStudents, setTopStudents] = useState<
    { id: string | null; name: string | null; total_score: number | null }[]
  >([]);
  const [panelsLoading, setPanelsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchPanels();
  }, []);

  const fetchPanels = async () => {
    try {
      const [attempts, leaders] = await Promise.all([
        supabase
          .from('quiz_attempts')
          .select('id, score, completed_at, profiles!quiz_attempts_student_id_fkey(name)')
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(5),
        supabase.from('leaderboard').select('id, name, total_score').limit(5),
      ]);

      setRecentAttempts(
        (attempts.data ?? []).map((a) => ({
          id: a.id,
          score: a.score,
          completed_at: a.completed_at,
          name: (a.profiles as { name: string | null } | null)?.name ?? null,
        }))
      );
      setTopStudents(leaders.data ?? []);
    } catch (error) {
      console.error('Error fetching overview panels:', error);
    } finally {
      setPanelsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [studentsResponse, schoolsResponse, examsResponse, videosResponse] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('schools').select('id', { count: 'exact' }),
        supabase.from('exams').select('id', { count: 'exact' }),
        supabase.from('videos').select('id', { count: 'exact' })
      ]);

      setStats({
        students: studentsResponse.count || 0,
        schools: schoolsResponse.count || 0,
        exams: examsResponse.count || 0,
        videos: videosResponse.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="لوحة الإدارة" subtitle="نظرة سريعة على نشاط المنصة ومحتواها." />

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="إجمالي الطلاب"
          value={stats.students}
          subtitle="طالب مسجّل"
          icon={Users}
          variant="default"
        />
        <StatsCard
          title="الثانويات"
          value={stats.schools}
          subtitle="ثانوية مسجّلة"
          icon={GraduationCap}
          variant="success"
        />
        <StatsCard
          title="المواضيع"
          value={stats.exams}
          subtitle="موضوع بكالوريا"
          icon={FileText}
          variant="accent"
        />
        <StatsCard
          title="الدروس"
          value={stats.videos}
          subtitle="درس منشور"
          icon={Video}
          variant="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.6} />
              آخر الاختبارات المكتملة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {panelsLoading ? (
              <Loading />
            ) : recentAttempts.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="لا توجد اختبارات مكتملة بعد"
                description="ستظهر هنا فور أن يُنهي الطلاب اختباراتهم."
                className="border-0"
              />
            ) : (
              recentAttempts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium">{a.name ?? "طالب"}</p>
                    <p className="text-sm text-muted-foreground tabular">
                      {a.completed_at ? formatDateDZ(a.completed_at) : "—"}
                    </p>
                  </div>
                  <span className="text-base font-semibold tabular">{a.score ?? 0}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top students */}
        <Card>
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <GraduationCap className="h-4 w-4 text-muted-foreground" strokeWidth={1.6} />
              المتصدّرون
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {panelsLoading ? (
              <Loading />
            ) : topStudents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="لا يوجد طلاب بعد"
                className="border-0"
              />
            ) : (
              topStudents.map((student, i) => (
                <div
                  key={student.id ?? i}
                  className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
                >
                  <span className="w-4 text-sm font-semibold text-muted-foreground tabular">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-base">{student.name ?? "—"}</span>
                  <span className="text-base font-semibold tabular">
                    {(student.total_score ?? 0).toLocaleString("ar-DZ")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <UploadExamDialog>
              <Button size="xl" className="h-20 w-full rounded-card">
                <Upload aria-hidden />
                رفع موضوع بكالوريا
              </Button>
            </UploadExamDialog>
            <Button size="xl" variant="accent" className="h-20 w-full rounded-card" onClick={() => setShowUploadQuiz(true)}>
              <Upload aria-hidden />
              رفع اختبار تدريبي
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Quiz Dialog */}
      <UploadQuizDialog
        isOpen={showUploadQuiz}
        onOpenChange={setShowUploadQuiz}
        onQuizUploaded={() => {
          setShowUploadQuiz(false);
          fetchStats();
        }}
      />
    </div>
  );
}
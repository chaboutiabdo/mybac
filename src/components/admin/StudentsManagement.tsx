import { useEffect, useMemo, useState } from "react";
import { Eye, Search, Trophy, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
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
import { EmptyState, Loading } from "@/components/ui/states";
import { StudentActivityDialog } from "./StudentActivityDialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { STREAMS, formatDateDZ, streamLabel } from "@/lib/bac";

type Student = Tables<"profiles"> & {
  quizzesCompleted: number;
  lastActive: string | null;
};

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function StudentsManagement() {
  const [search, setSearch] = useState("");
  const [streamFilter, setStreamFilter] = useState("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Student | null>(null);

  useEffect(() => {
    void loadStudents();
  }, []);

  /**
   * Three queries total, regardless of how many students there are.
   *
   * This used to run four extra queries PER STUDENT (an N+1 that made 200+
   * round trips on a real roster) to find each student's quiz count and last
   * activity. Both are now aggregated client-side from two bulk reads.
   */
  const loadStudents = async () => {
    setLoading(true);
    try {
      const [profilesRes, attemptsRes, activityRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("quiz_attempts").select("student_id").not("completed_at", "is", null),
        supabase
          .from("video_activity_logs")
          .select("student_id, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const attemptsByStudent = new Map<string, number>();
      for (const row of attemptsRes.data ?? []) {
        attemptsByStudent.set(row.student_id, (attemptsByStudent.get(row.student_id) ?? 0) + 1);
      }

      // rows arrive newest-first, so the first one seen per student wins
      const lastActiveByStudent = new Map<string, string>();
      for (const row of activityRes.data ?? []) {
        if (!lastActiveByStudent.has(row.student_id)) {
          lastActiveByStudent.set(row.student_id, row.created_at);
        }
      }

      setStudents(
        (profilesRes.data ?? []).map((profile) => ({
          ...profile,
          quizzesCompleted: attemptsByStudent.get(profile.user_id) ?? 0,
          lastActive: lastActiveByStudent.get(profile.user_id) ?? profile.updated_at,
        }))
      );
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("تعذّر تحميل قائمة الطلاب");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        (s.name ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q);
      const matchesStream = streamFilter === "all" || s.stream === streamFilter;
      return matchesSearch && matchesStream;
    });
  }, [students, search, streamFilter]);

  const isActive = (s: Student) =>
    !!s.lastActive && new Date(s.lastActive).getTime() > Date.now() - ACTIVE_WINDOW_MS;

  const activeCount = students.filter(isActive).length;
  const premiumCount = students.filter((s) => s.role === "premium").length;
  const avgScore = students.length
    ? Math.round(students.reduce((sum, s) => sum + (s.total_score ?? 0), 0) / students.length)
    : 0;

  const tiles = [
    { label: "إجمالي الطلاب", value: students.length, icon: Users },
    { label: "نشطون هذا الأسبوع", value: activeCount, icon: UserCheck },
    { label: "مشتركون مميّزون", value: premiumCount, icon: Trophy },
    { label: "متوسّط النقاط", value: avgScore, icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[34px] font-bold tracking-tight">الطلاب</h1>
        <p className="mt-1 text-lg text-muted-foreground">
          كل الحسابات المسجّلة، ونشاطها خلال آخر سبعة أيام.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{tile.label}</p>
                <p className="mt-2 font-display text-3xl font-bold tabular">
                  {tile.value.toLocaleString("ar-DZ")}
                </p>
              </div>
              <tile.icon className="h-5 w-5 text-accent" strokeWidth={1.6} aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="ps-10"
            placeholder="ابحث بالاسم أو البريد الإلكتروني"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={streamFilter} onValueChange={setStreamFilter}>
          <SelectTrigger>
            <SelectValue placeholder="كل الشعب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الشعب</SelectItem>
            {STREAMS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="لا يوجد طلاب مطابقون"
              description="غيّر البحث أو عامل التصفية."
              className="border-0"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الشعبة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead>اختبارات</TableHead>
                  <TableHead>آخر نشاط</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-muted-foreground">{student.email}</div>
                    </TableCell>
                    {/* these two columns used to be swapped: "School" showed the
                        stream and "Stream" showed the role */}
                    <TableCell className="text-muted-foreground">
                      {streamLabel(student.stream)}
                    </TableCell>
                    <TableCell>
                      {student.role === "admin" ? (
                        <Badge variant="info">مدير</Badge>
                      ) : student.role === "premium" ? (
                        <Badge>مميّز</Badge>
                      ) : (
                        <Badge variant="secondary">مجاني</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold tabular">
                      {(student.total_score ?? 0).toLocaleString("ar-DZ")}
                    </TableCell>
                    <TableCell className="tabular">{student.quizzesCompleted}</TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular">
                      {student.lastActive ? formatDateDZ(student.lastActive) : "—"}
                      {!isActive(student) && (
                        <span className="ms-2 text-xs opacity-70">غير نشط</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(student)}
                        title="عرض النشاط"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <StudentActivityDialog
          isOpen
          onOpenChange={(open) => !open && setSelected(null)}
          /* user_id, not the profile PK — quiz_attempts.student_id is a FK to
             profiles.user_id, so passing `id` made this dialog always empty */
          studentId={selected.user_id}
          studentName={selected.name ?? ""}
        />
      )}
    </div>
  );
}

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
  schoolId: string | null;
};

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const NO_SCHOOL = "none";

export function StudentsManagement() {
  const [search, setSearch] = useState("");
  const [streamFilter, setStreamFilter] = useState("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<Pick<Tables<"schools">, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Student | null>(null);
  // per-row optimistic-disable while a school assignment is being written
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSchoolId, setBulkSchoolId] = useState(NO_SCHOOL);
  const [bulkAssigning, setBulkAssigning] = useState(false);

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
      const [profilesRes, attemptsRes, activityRes, schoolsRes, schoolLinksRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        // source='quiz': daily-question attempts are single answers, not quizzes
        supabase.from("quiz_attempts").select("student_id").eq("source", "quiz").not("completed_at", "is", null),
        supabase
          .from("video_activity_logs")
          .select("student_id, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("schools").select("id, name").order("name"),
        supabase.from("school_students").select("student_id, school_id"),
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

      const schoolByStudent = new Map<string, string>();
      for (const row of schoolLinksRes.data ?? []) {
        schoolByStudent.set(row.student_id, row.school_id);
      }

      setSchools(schoolsRes.data ?? []);
      setStudents(
        (profilesRes.data ?? []).map((profile) => ({
          ...profile,
          quizzesCompleted: attemptsByStudent.get(profile.user_id) ?? 0,
          lastActive: lastActiveByStudent.get(profile.user_id) ?? profile.updated_at,
          schoolId: schoolByStudent.get(profile.user_id) ?? null,
        }))
      );
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("تعذّر تحميل قائمة الطلاب");
    } finally {
      setLoading(false);
    }
  };

  /**
   * A student has at most one school in practice, even though `school_students`
   * has no DB constraint enforcing that — so reassigning deletes any existing
   * row for the selected students before inserting the new one. Batched: one
   * DELETE + one INSERT cover every id, not a query pair per student, so
   * selecting thirty names and assigning them costs the same two round trips
   * as assigning one.
   */
  const handleBulkAssignSchool = async (studentIds: string[], schoolId: string) => {
    if (studentIds.length === 0) return;
    try {
      const { error: deleteError } = await supabase.from("school_students").delete().in("student_id", studentIds);
      if (deleteError) throw deleteError;
      if (schoolId !== NO_SCHOOL) {
        const { error: insertError } = await supabase
          .from("school_students")
          .insert(studentIds.map((student_id) => ({ student_id, school_id: schoolId })));
        if (insertError) throw insertError;
      }
      const idSet = new Set(studentIds);
      setStudents((prev) =>
        prev.map((s) => (idSet.has(s.user_id) ? { ...s, schoolId: schoolId === NO_SCHOOL ? null : schoolId } : s))
      );
    } catch (error) {
      console.error("Error assigning school:", error);
      toast.error("تعذّر تحديث الثانوية");
      throw error;
    }
  };

  const handleAssignSchool = async (studentId: string, schoolId: string) => {
    setAssigning(studentId);
    try {
      await handleBulkAssignSchool([studentId], schoolId);
    } catch {
      // already toasted in handleBulkAssignSchool
    } finally {
      setAssigning(null);
    }
  };

  const handleBulkApply = async () => {
    setBulkAssigning(true);
    try {
      await handleBulkAssignSchool([...selectedIds], bulkSchoolId);
      toast.success(`تم تحديث ${selectedIds.size} طالباً`);
      setSelectedIds(new Set());
      setBulkSchoolId(NO_SCHOOL);
    } catch {
      // already toasted in handleBulkAssignSchool
    } finally {
      setBulkAssigning(false);
    }
  };

  const toggleSelected = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
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

  // "select all" only ever touches what's currently visible; the Set itself
  // is independent of the filter, so narrowing the search doesn't silently
  // drop an existing selection made before the filter changed.
  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.user_id));
  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filtered.forEach((s) => next.delete(s.user_id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((s) => next.add(s.user_id));
      return next;
    });
  };

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
        <h1 className="text-[40px] font-light tracking-tight sm:text-[52px]">الطلاب</h1>
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
                <p className="mt-2 tabular text-3xl font-semibold">
                  {tile.value.toLocaleString("ar-DZ")}
                </p>
              </div>
              <tile.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
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

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-card bg-card-raised p-4">
          <span className="text-sm font-medium">
            <span className="tabular">{selectedIds.size}</span> طالب محدَّد
          </span>
          <Select value={bulkSchoolId} onValueChange={setBulkSchoolId}>
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue placeholder="بدون ثانوية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SCHOOL}>بدون ثانوية</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => void handleBulkApply()} disabled={bulkAssigning}>
            تعيين
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            إلغاء التحديد
          </Button>
        </div>
      )}

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
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      aria-label="تحديد كل الطلاب الظاهرين"
                    />
                  </TableHead>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الشعبة</TableHead>
                  <TableHead>الثانوية</TableHead>
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
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedIds.has(student.user_id)}
                        onChange={() => toggleSelected(student.user_id)}
                        aria-label={`تحديد ${student.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-muted-foreground">{student.email}</div>
                    </TableCell>
                    {/* these two columns used to be swapped: "School" showed the
                        stream and "الشعبة" showed the role */}
                    <TableCell className="text-muted-foreground">
                      {streamLabel(student.stream)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={student.schoolId ?? NO_SCHOOL}
                        onValueChange={(value) => void handleAssignSchool(student.user_id, value)}
                        disabled={assigning === student.user_id}
                      >
                        <SelectTrigger className="h-8 w-40 text-sm">
                          <SelectValue placeholder="بدون ثانوية" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_SCHOOL}>بدون ثانوية</SelectItem>
                          {schools.map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

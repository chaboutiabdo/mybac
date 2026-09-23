import { useEffect, useState } from "react";
import { Users } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, Loading } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface SchoolDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  schoolName: string;
}

interface RosterStudent {
  user_id: string;
  name: string;
  email: string;
  total_score: number;
}

/**
 * A school's roster and aggregate progress — mirrors StudentActivityDialog's
 * shape (isOpen/onOpenChange/id/name props, fetch on open). This is the
 * actual point of linking students to a school at all: an admin can answer
 * "how is this school's cohort doing" with real numbers.
 */
export function SchoolDetailDialog({ isOpen, onOpenChange, schoolId, schoolName }: SchoolDetailDialogProps) {
  const [students, setStudents] = useState<RosterStudent[] | null>(null);

  useEffect(() => {
    if (!isOpen || !schoolId) return;
    setStudents(null);

    (async () => {
      const { data: links, error: linksError } = await supabase
        .from("school_students")
        .select("student_id")
        .eq("school_id", schoolId);
      if (linksError) {
        console.error("Error fetching school roster:", linksError);
        setStudents([]);
        return;
      }

      const studentIds = (links ?? []).map((l) => l.student_id);
      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email, total_score")
        .in("user_id", studentIds)
        .order("total_score", { ascending: false });
      if (profilesError) console.error("Error fetching school roster profiles:", profilesError);
      setStudents(profiles ?? []);
    })();
  }, [isOpen, schoolId]);

  const count = students?.length ?? 0;
  const avgScore = count > 0 ? Math.round(students!.reduce((sum, s) => sum + (s.total_score ?? 0), 0) / count) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{schoolName}</DialogTitle>
          <DialogDescription>طلاب هذه الثانوية وتقدّمهم</DialogDescription>
        </DialogHeader>

        {students === null ? (
          <Loading label="جارٍ تحميل قائمة الطلاب…" />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="لا يوجد طلاب مسجّلون بعد"
            description="اربط طلاباً بهذه الثانوية من صفحة إدارة الطلاب."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">عدد الطلاب</p>
                  <p className="tabular mt-1 text-2xl font-semibold">{count}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">متوسّط النقاط</p>
                  <p className="tabular mt-1 text-2xl font-semibold">{avgScore}</p>
                </CardContent>
              </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>النقاط</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.user_id}>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-sm text-muted-foreground">{s.email}</div>
                    </TableCell>
                    <TableCell className="tabular font-semibold">{(s.total_score ?? 0).toLocaleString("ar-DZ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

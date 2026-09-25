import { useEffect, useState } from "react";
import { CheckCircle2, Edit, Eye, Inbox, MapPin, PlusCircle, School, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Loading } from "@/components/ui/states";
import { SchoolDetailDialog } from "./SchoolDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { dzKey, formatDateDZ } from "@/lib/bac";
import { errorMessage } from "@/lib/utils";

type SchoolRow = Tables<"schools"> & { studentsCount: number };
type Inquiry = Pick<Tables<"support_requests">, "id" | "name" | "email" | "phone" | "message" | "created_at">;

const emptyForm = () => ({ name: "", city: "", contractDate: dzKey() });

export function SchoolsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [schools, setSchools] = useState<SchoolRow[] | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm());

  const [editing, setEditing] = useState<SchoolRow | null>(null);
  const [editForm, setEditForm] = useState(emptyForm());

  const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null);

  const loadSchools = async () => {
    const [schoolsRes, linksRes] = await Promise.all([
      supabase.from("schools").select("*").order("created_at", { ascending: false }),
      supabase.from("school_students").select("school_id"),
    ]);
    if (schoolsRes.error) {
      toast.error("تعذّر تحميل الثانويات", { description: errorMessage(schoolsRes.error) });
      return;
    }
    const counts = new Map<string, number>();
    for (const row of linksRes.data ?? []) {
      counts.set(row.school_id, (counts.get(row.school_id) ?? 0) + 1);
    }
    setSchools((schoolsRes.data ?? []).map((s) => ({ ...s, studentsCount: counts.get(s.id) ?? 0 })));
  };

  const loadInquiries = async () => {
    const { data, error } = await supabase
      .from("support_requests")
      .select("id, name, email, phone, message, created_at")
      .eq("type", "school_inquiry")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("تعذّر تحميل طلبات التواصل", { description: errorMessage(error) });
      return;
    }
    setInquiries(data ?? []);
  };

  useEffect(() => {
    void loadSchools();
    void loadInquiries();
  }, []);

  const filteredSchools = (schools ?? []).filter(
    (s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSchool = async () => {
    if (!addForm.name || !addForm.city || !addForm.contractDate) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("schools")
      .insert({ name: addForm.name, city: addForm.city, contract_date: addForm.contractDate });
    setSubmitting(false);
    if (error) {
      toast.error("تعذّر إضافة الثانوية", { description: errorMessage(error) });
      return;
    }
    toast.success("تمت إضافة الثانوية");
    setAddForm(emptyForm());
    setIsAddOpen(false);
    void loadSchools();
  };

  const openEdit = (school: SchoolRow) => {
    setEditing(school);
    setEditForm({ name: school.name, city: school.city, contractDate: school.contract_date });
  };

  const handleSaveEdit = async () => {
    if (!editing || !editForm.name || !editForm.city || !editForm.contractDate) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("schools")
      .update({ name: editForm.name, city: editForm.city, contract_date: editForm.contractDate })
      .eq("id", editing.id);
    setSubmitting(false);
    if (error) {
      toast.error("تعذّر حفظ التعديلات", { description: errorMessage(error) });
      return;
    }
    toast.success("تم حفظ التعديلات");
    setEditing(null);
    void loadSchools();
  };

  const handleDeleteSchool = async (school: SchoolRow) => {
    if (!window.confirm(`حذف "${school.name}"؟ سيُحذف معها ربط كل طلابها بها (${school.studentsCount}).`)) return;
    const { error } = await supabase.from("schools").delete().eq("id", school.id);
    if (error) {
      toast.error("تعذّر حذف الثانوية", { description: errorMessage(error) });
      return;
    }
    toast.success("تم حذف الثانوية");
    void loadSchools();
  };

  const handleMarkHandled = async (id: string) => {
    const { error } = await supabase.from("support_requests").update({ status: "approved" }).eq("id", id);
    if (error) {
      toast.error("تعذّر تحديث الطلب", { description: errorMessage(error) });
      return;
    }
    void loadInquiries();
  };

  const totalStudents = (schools ?? []).reduce((sum, s) => sum + s.studentsCount, 0);
  const cityCount = new Set((schools ?? []).map((s) => s.city)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[40px] font-light tracking-tight sm:text-[52px]">الثانويات</h1>
          <p className="mt-1 text-lg text-muted-foreground">الثانويات الشريكة، وطلابها المسجَّلون.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) setAddForm(emptyForm()); }}>
          <Button onClick={() => setIsAddOpen(true)}>
            <PlusCircle className="h-4 w-4 me-2" />
            إضافة ثانوية
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة ثانوية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-name">اسم الثانوية</Label>
                <Input id="add-name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="add-city">المدينة</Label>
                <Input id="add-city" value={addForm.city} onChange={(e) => setAddForm({ ...addForm, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="add-date">تاريخ العقد</Label>
                <Input
                  id="add-date"
                  type="date"
                  value={addForm.contractDate}
                  onChange={(e) => setAddForm({ ...addForm, contractDate: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddSchool} disabled={submitting}>
                  إضافة
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <School className="h-5 w-5 text-primary" strokeWidth={1.8} aria-hidden />
            <div>
              <p className="tabular text-2xl font-semibold">{(schools ?? []).length}</p>
              <p className="text-sm text-muted-foreground">كل الثانويات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Search className="h-5 w-5 text-success" strokeWidth={1.8} aria-hidden />
            <div>
              <p className="tabular text-2xl font-semibold">{totalStudents}</p>
              <p className="text-sm text-muted-foreground">إجمالي الطلاب المسجَّلين</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <MapPin className="h-5 w-5" strokeWidth={1.8} aria-hidden />
            <div>
              <p className="tabular text-2xl font-semibold">{cityCount}</p>
              <p className="text-sm text-muted-foreground">المدن</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inbound interest from Pricing.tsx's "عرض المؤسسات" tier */}
      {inquiries === null ? null : inquiries.length > 0 ? (
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Inbox className="h-5 w-5" strokeWidth={1.8} aria-hidden />
              <h2 className="text-lg font-medium">طلبات تواصل من ثانويات ({inquiries.length})</h2>
            </div>
            <ul className="space-y-2">
              {inquiries.map((req) => (
                <li key={req.id} className="rounded-2xl bg-card-raised p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{req.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {req.email} {req.phone ? `· ${req.phone}` : ""} · {formatDateDZ(req.created_at)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void handleMarkHandled(req.id)}>
                      <CheckCircle2 className="h-4 w-4 me-1.5" />
                      وضع كمعالَج
                    </Button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{req.message}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="ps-10"
              placeholder="ابحث بالاسم أو المدينة…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {schools === null ? (
            <Loading />
          ) : filteredSchools.length === 0 ? (
            <EmptyState icon={School} title="لا توجد ثانويات مطابقة" description="غيّر البحث أو أضف ثانوية جديدة." className="border-0" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الثانوية</TableHead>
                  <TableHead>المدينة</TableHead>
                  <TableHead>الطلاب</TableHead>
                  <TableHead>تاريخ العقد</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" aria-hidden />
                        {school.city}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{school.studentsCount} طالباً</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateDZ(school.contract_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewing({ id: school.id, name: school.name })} title="عرض الطلاب">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(school)} title="تعديل">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDeleteSchool(school)} title="حذف">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">اسم الثانوية</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-city">المدينة</Label>
              <Input id="edit-city" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-date">تاريخ العقد</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.contractDate}
                onChange={(e) => setEditForm({ ...editForm, contractDate: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
              <Button onClick={handleSaveEdit} disabled={submitting}>
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {viewing && (
        <SchoolDetailDialog
          isOpen
          onOpenChange={(open) => !open && setViewing(null)}
          schoolId={viewing.id}
          schoolName={viewing.name}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Loading } from "@/components/ui/states";
import { errorMessage } from "@/lib/utils";
import type { TablesInsert } from "@/integrations/supabase/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PlusCircle,
  Edit,
  Trash2,
  Users,
  User,
  AlertCircle,
  Clock,
} from "lucide-react";

type Tip = Tables<'advice_tips'>;

type Student = Pick<Tables<'profiles'>, 'user_id' | 'id' | 'name' | 'email' | 'role'>;

export function AdviceTipsManagement() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    target_user_id: "",
    is_public: true,
    priority: 1,
    expiry_date: "",
  });

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      const { data: tipsData, error: tipsError } = await supabase
        .from("advice_tips")
        .select("*")
        .order("priority", { ascending: false });

      if (tipsError) throw tipsError;
      setTips(tipsData);

      // Fetch premium users for targeting (only premium users can receive personalized tips)
      const { data: studentsData, error: studentsError } = await supabase
        .from("profiles")
        .select("id, user_id, name, email, role")
        .in("role", ["premium", "admin"]);

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      setIsLoading(false);
    } catch (error) {
      toast.error("خطأ", { description: "Failed to load advice tips." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert datetime-local format to ISO string for database
      let expiryDateISO = null;
      if (formData.expiry_date) {
        const date = new Date(formData.expiry_date);
        expiryDateISO = date.toISOString();
      }

      const tipData: TablesInsert<'advice_tips'> = {
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
        is_public: formData.is_public,
        target_user_id: formData.is_public ? null : (formData.target_user_id || null),
        expiry_date: expiryDateISO,
      };

      // Remove null target_user_id if it's empty string to avoid any issues
      if (tipData.target_user_id === "") {
        tipData.target_user_id = null;
      }

      const { error } = editingTip
        ? await supabase
            .from("advice_tips")
            .update(tipData)
            .eq("id", editingTip.id)
        : await supabase.from("advice_tips").insert([tipData]);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      toast.success("تم", { description: `Tip ${editingTip ? "updated" : "added"} successfully.` });

      setShowAddDialog(false);
      setEditingTip(null);
      setFormData({
        title: "",
        content: "",
        target_user_id: "",
        is_public: true,
        priority: 1,
        expiry_date: "",
      });
      fetchTips();
    } catch (error) {
      console.error("Error details:", error);
      toast.error("خطأ", { description: `Failed to ${editingTip ? "update" : "add"} tip. ${errorMessage(error, "")}` });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("advice_tips")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("تم", { description: "Tip deleted successfully." });

      fetchTips();
    } catch (error) {
      toast.error("خطأ", { description: "Failed to delete tip." });
    }
  };

  const handleEdit = (tip: Tip) => {
    setEditingTip(tip);
    
    // Convert ISO date to datetime-local format
    let expiryDateFormatted = "";
    if (tip.expiry_date) {
      const date = new Date(tip.expiry_date);
      // Format: YYYY-MM-DDTHH:mm
      expiryDateFormatted = date.toISOString().slice(0, 16);
    }
    
    setFormData({
      title: tip.title,
      content: tip.content,
      target_user_id: tip.target_user_id || "",
      is_public: tip.is_public,
      priority: tip.priority ?? 1,
      expiry_date: expiryDateFormatted,
    });
    setShowAddDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loading />
          <p className="text-muted-foreground">Loading advice tips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-tight">إدارة النصائح والتنبيهات</h2>
          <p className="text-muted-foreground">
            أضف وحرر النصائح والتنبيهات للمستخدمين
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="text-primary-foreground">
          <PlusCircle className="me-2 h-4 w-4" />
          إضافة نصيحة جديدة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة النصائح والتنبيهات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العنوان</TableHead>
                <TableHead>الأولوية</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tips.map((tip) => (
                <TableRow key={tip.id}>
                  <TableCell>{tip.title}</TableCell>
                  <TableCell>{tip.priority}</TableCell>
                  <TableCell>
                    {tip.is_public ? (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        عام
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        مستخدم محدد
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {tip.expiry_date ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(tip.expiry_date).toLocaleDateString()}
                      </div>
                    ) : (
                      "غير محدد"
                    )}
                  </TableCell>
                  <TableCell>
                    {tip.active ? (
                      <span className="text-success">نشط</span>
                    ) : (
                      <span className="text-muted-foreground">غير نشط</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(tip)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tip.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTip ? "تحرير النصيحة" : "إضافة نصيحة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="عنوان النصيحة"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>المحتوى</Label>
              <Textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="محتوى النصيحة"
                required
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Select
                  value={formData.priority.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">عادي</SelectItem>
                    <SelectItem value="2">مهم</SelectItem>
                    <SelectItem value="3">عاجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="datetime-local"
                  value={formData.expiry_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expiry_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>عام</Label>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_public: checked })
                  }
                />
              </div>
            </div>
            {!formData.is_public && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>المستخدم المستهدف (مميز فقط)</Label>
                  <AlertCircle className="h-4 w-4 text-warning" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  فقط المستخدمون المميزون يمكنهم تلقي نصائح مخصصة
                </p>
                <Select
                  value={formData.target_user_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, target_user_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مستخدم مميز" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.length > 0 ? (
                      students.map((student) => (
                        <SelectItem key={student.user_id} value={student.user_id}>
                          {student.name} ({student.email}) - {student.role === 'premium' ? 'مميز' : 'مدير'}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        لا يوجد مستخدمون مميزون
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full">
              {editingTip ? "تحديث النصيحة" : "إضافة النصيحة"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

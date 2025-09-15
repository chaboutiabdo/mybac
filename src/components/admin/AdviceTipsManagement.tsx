import { useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

interface Tip {
  id: string;
  title: string;
  content: string;
  target_user_id: string | null;
  is_public: boolean;
  priority: number;
  active: boolean;
  expiry_date: string | null;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

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
  
  const { toast } = useToast();

  const fetchTips = async () => {
    try {
      const { data: tipsData, error: tipsError } = await supabase
        .from("advice_tips")
        .select("*")
        .order("priority", { ascending: false });

      if (tipsError) throw tipsError;
      setTips(tipsData);

      // Fetch students for targeting
      const { data: studentsData, error: studentsError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("role", "student");

      if (studentsError) throw studentsError;
      setStudents(studentsData);

      setIsLoading(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load advice tips.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tipData = {
        ...formData,
        target_user_id: formData.target_user_id || null,
        expiry_date: formData.expiry_date || null,
      };

      const { error } = editingTip
        ? await supabase
            .from("advice_tips")
            .update(tipData)
            .eq("id", editingTip.id)
        : await supabase.from("advice_tips").insert([tipData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Tip ${editingTip ? "updated" : "added"} successfully.`,
      });

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
      toast({
        title: "Error",
        description: `Failed to ${editingTip ? "update" : "add"} tip.`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("advice_tips")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tip deleted successfully.",
      });

      fetchTips();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tip.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (tip: Tip) => {
    setEditingTip(tip);
    setFormData({
      title: tip.title,
      content: tip.content,
      target_user_id: tip.target_user_id || "",
      is_public: tip.is_public,
      priority: tip.priority,
      expiry_date: tip.expiry_date || "",
    });
    setShowAddDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">إدارة النصائح والتنبيهات</h2>
          <p className="text-muted-foreground">
            أضف وحرر النصائح والتنبيهات للمستخدمين
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gradient-primary text-white">
          <PlusCircle className="mr-2 h-4 w-4" />
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
                      <span className="text-green-500">نشط</span>
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
                <Label>المستخدم المستهدف</Label>
                <Select
                  value={formData.target_user_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, target_user_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستخدم" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </SelectItem>
                    ))}
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

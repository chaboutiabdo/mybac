import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MessageSquare, Pin, Edit, Trash2, Plus, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AdminAdvice {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
}

export function AdminAdviceManagement() {
  const [adviceList, setAdviceList] = useState<AdminAdvice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAdvice, setEditingAdvice] = useState<AdminAdvice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_pinned: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAdvice();
  }, []);

  const fetchAdvice = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_advice')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdviceList(data || []);
    } catch (error: any) {
      console.error('Error fetching advice:', error);
      toast({
        title: "خطأ في تحميل النصائح",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAdvice) {
        // Update existing advice
        const { error } = await supabase
          .from('admin_advice')
          .update({
            title: formData.title,
            content: formData.content,
            is_pinned: formData.is_pinned,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAdvice.id);

        if (error) throw error;

        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث النصيحة بنجاح",
        });
      } else {
        // Create new advice
        const { error } = await supabase
          .from('admin_advice')
          .insert([{
            title: formData.title,
            content: formData.content,
            is_pinned: formData.is_pinned
          }]);

        if (error) throw error;

        toast({
          title: "تم الإضافة بنجاح",
          description: "تم إضافة النصيحة الجديدة بنجاح",
        });
      }

      setShowDialog(false);
      setEditingAdvice(null);
      setFormData({ title: '', content: '', is_pinned: false });
      await fetchAdvice();
    } catch (error: any) {
      console.error('Error saving advice:', error);
      toast({
        title: "خطأ في الحفظ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (advice: AdminAdvice) => {
    setEditingAdvice(advice);
    setFormData({
      title: advice.title,
      content: advice.content,
      is_pinned: advice.is_pinned
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه النصيحة؟')) return;

    try {
      const { error } = await supabase
        .from('admin_advice')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف النصيحة بنجاح",
      });

      await fetchAdvice();
    } catch (error: any) {
      console.error('Error deleting advice:', error);
      toast({
        title: "خطأ في الحذف",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleNewAdvice = () => {
    setEditingAdvice(null);
    setFormData({ title: '', content: '', is_pinned: false });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              إدارة النصائح اليومية
            </CardTitle>
            <Button onClick={handleNewAdvice} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة نصيحة جديدة
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : adviceList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد نصائح متاحة
            </div>
          ) : (
            <div className="space-y-4">
              {adviceList.map((advice) => (
                <Card key={advice.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{advice.title}</h3>
                          {advice.is_pinned && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                              <Pin className="h-3 w-3 mr-1" />
                              مثبت
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-2">{advice.content}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(advice.created_at).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(advice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(advice.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAdvice ? 'تعديل النصيحة' : 'إضافة نصيحة جديدة'}
            </DialogTitle>
            <DialogDescription>
              {editingAdvice ? 'قم بتعديل النصيحة أدناه' : 'أضف نصيحة جديدة للطلاب'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">عنوان النصيحة</label>
              <Input
                placeholder="أدخل عنوان النصيحة..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">محتوى النصيحة</label>
              <Textarea
                placeholder="أدخل محتوى النصيحة..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_pinned"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_pinned" className="text-sm font-medium">
                تثبيت هذه النصيحة (ستظهر في أعلى الصفحة الرئيسية)
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                إلغاء
              </Button>
              <Button type="submit">
                {editingAdvice ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Pin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminAdvice {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
}

const AdminAdvice = () => {
  const [advice, setAdvice] = useState<AdminAdvice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestAdvice = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_advice')
          .select('*')
          .eq('is_pinned', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error fetching admin advice:', error);
        } else if (data) {
          setAdvice(data);
        }
      } catch (error) {
        console.error('Error fetching admin advice:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestAdvice();
  }, []);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!advice) {
    return null;
  }

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <Pin className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            نصيحة الإدارة اليومية
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            مثبت
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="font-semibold text-lg mb-2">{advice.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{advice.content}</p>
        <div className="mt-3 text-xs text-muted-foreground">
          {new Date(advice.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAdvice;

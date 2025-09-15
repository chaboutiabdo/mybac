import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdviceTip {
  id: string;
  title: string;
  content: string;
  target_user_id: string | null;
  is_public: boolean;
  priority: number;
  active: boolean;
  expiry_date: string | null;
  created_at: string;
}

const AdviceTips = () => {
  const [tips, setTips] = useState<AdviceTip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      const { data, error } = await supabase
        .from('advice_tips')
        .select('*')
        .eq('active', true)
        .or('is_public.eq.true,target_user_id.is.null')
        .lte('expiry_date', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching tips:', error);
        return;
      }

      if (data) {
        setTips(data);
      }
    } catch (error) {
      console.error('Error fetching tips:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: number) => {
    switch (priority) {
      case 3:
        return <Lightbulb className="h-4 w-4 text-red-500" />;
      case 2:
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3:
        return 'bg-red-100 text-red-700';
      case 2:
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 3:
        return 'عاجل';
      case 2:
        return 'مهم';
      default:
        return 'عادي';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-warning" />
            Daily Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading tips...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-warning" />
          Daily Tips
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tips.map((tip) => (
          <div key={tip.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm">{tip.title}</h4>
              <Badge className={`text-xs ${getPriorityColor(tip.priority)}`}>
                <div className="flex items-center gap-1">
                  {getPriorityIcon(tip.priority)}
                  {getPriorityLabel(tip.priority)}
                </div>
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {tip.content}
              </p>
              {tip.expiry_date && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ينتهي في {new Date(tip.expiry_date).toLocaleDateString("ar-SA")}
                </p>
              )}
            </div>
          </div>
        ))}
        {tips.length === 0 && (
          <div className="text-center text-muted-foreground text-sm">
            No tips available at the moment
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdviceTips;
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Clock, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";

type AdviceTip = Tables<'advice_tips'>;

const AdviceTips = () => {
  const [tips, setTips] = useState<AdviceTip[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  useEffect(() => {
    if (user) {
      fetchTips();
    }
  }, [user, isPremium]);

  const fetchTips = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('advice_tips')
        .select('*')
        .eq('active', true);

      // Build query: public tips OR personalized tips for current user (if premium)
      if (isPremium) {
        // Premium users: get public tips + their personalized tips
        query = query.or(`is_public.eq.true,target_user_id.eq.${user.id}`);
      } else {
        // Regular users: only public tips
        query = query.eq('is_public', true);
      }

      // Execute query
      const { data, error } = await query
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching tips:', error);
        return;
      }

      // Filter out expired tips on the client side
      const now = new Date();
      const filteredData = (data || []).filter(tip => 
        !tip.expiry_date || new Date(tip.expiry_date) > now
      );

      setTips(filteredData);
    } catch (error) {
      console.error('Error fetching tips:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: number) => {
    switch (priority) {
      case 3:
        return <Lightbulb className="h-4 w-4 text-destructive" />;
      case 2:
        return <Lightbulb className="h-4 w-4 text-warning" />;
      default:
        return <Lightbulb className="h-4 w-4 text-primary" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3:
        return 'bg-destructive-light text-destructive';
      case 2:
        return 'bg-warning-light text-yellow-700';
      default:
        return 'bg-primary-light text-blue-700';
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
      <Card className="h-full">
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 transition-all duration-300">
          <Lightbulb className="h-5 w-5 text-warning group- transition-transform duration-300" />
          Daily Tips
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tips.map((tip) => (
          <div key={tip.id} className="border rounded-lg p-4 hover:bg-card-raised/60 transition-all duration-200 hover:shadow-md">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                <h4 className="font-medium text-base">{tip.title}</h4>
                {!tip.is_public && tip.target_user_id && (
                  <Badge variant="outline" className="text-sm flex items-center gap-1">
                    <Crown className="h-3 w-3 text-warning" />
                    مخصص
                  </Badge>
                )}
              </div>
              <Badge className={`text-xs ${getPriorityColor(tip.priority ?? 1)}`}>
                <div className="flex items-center gap-1">
                  {getPriorityIcon(tip.priority ?? 1)}
                  {getPriorityLabel(tip.priority ?? 1)}
                </div>
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {tip.content}
              </p>
              {tip.expiry_date && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ينتهي في {new Date(tip.expiry_date).toLocaleDateString("ar-DZ")}
                </p>
              )}
            </div>
          </div>
        ))}
        {tips.length === 0 && (
          <div className="text-center text-muted-foreground text-base">
            No tips available at the moment
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdviceTips;
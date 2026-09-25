import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useUserScore = () => {
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // No realtime subscription: profiles was never in the supabase_realtime
    // publication, so the old one never received an event — it only opened a
    // websocket the CSP would have had to allow. The score is read on mount.
    if (user) fetchUserScore();
  }, [user]);

  const fetchUserScore = async () => {
    if (!user) return;

    try {
      // Get total_score directly from profiles table
      // This is automatically updated by triggers when points_transactions are added
      const { data, error } = await supabase
        .from('profiles')
        .select('total_score')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile score:', error);
        throw error;
      }

      setScore(data?.total_score || 0);
    } catch (error) {
      console.error('Error fetching user score:', error);
      
      // Fallback: Calculate from points_transactions
      try {
        const { data: transactions, error: transError } = await supabase
          .from('points_transactions')
          .select('points')
          .eq('student_id', user.id);

        if (transError) throw transError;

        const totalScore = transactions?.reduce((sum, t) => sum + t.points, 0) || 0;

        // display only — total_score is owned by the update_student_total_score
        // trigger. The client used to write it back here, which was a second
        // path for inflating the leaderboard; the profiles guard trigger now
        // reverts any such write anyway.
        setScore(totalScore);
      } catch (fallbackError) {
        console.error('Error calculating fallback score:', fallbackError);
        setScore(0);
      }
    } finally {
      setLoading(false);
    }
  };

  return { score, loading };
};
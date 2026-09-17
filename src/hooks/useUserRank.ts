import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * The caller's position on the leaderboard, or null when they are outside it.
 *
 * Reads the `leaderboard` view rather than `profiles`: the view is already
 * ordered by total_score and exposes no email, so ranking does not require
 * read access to other students' rows.
 */
export const useUserRank = () => {
  const { profile } = useAuth();
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) {
      setRank(null);
      return;
    }

    let active = true;

    (async () => {
      const { data, error } = await supabase.from('leaderboard').select('id');
      if (error || !data || !active) return;

      const index = data.findIndex((row) => row.id === profile.id);
      setRank(index === -1 ? null : index + 1);
    })();

    return () => {
      active = false;
    };
  }, [profile]);

  return rank;
};

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionStatus = 'free' | 'premium' | 'admin';

export const useSubscription = () => {
  const { user, profile } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user || !profile) {
        setSubscriptionStatus('free');
        setLoading(false);
        return;
      }

      // Check both role and subscription_status for compatibility
      const userRole = profile.role;
      const userSubscriptionStatus = profile.subscription_status;

      // Determine final status
      if (userRole === 'admin') {
        setSubscriptionStatus('admin');
      } else if (userRole === 'premium' || userSubscriptionStatus === 'premium') {
        setSubscriptionStatus('premium');
      } else {
        setSubscriptionStatus('free');
      }

      setLoading(false);
    };

    checkSubscriptionStatus();
  }, [user, profile]);

  const isPremium = subscriptionStatus === 'premium' || subscriptionStatus === 'admin';
  const isAdmin = subscriptionStatus === 'admin';
  const isNormal = subscriptionStatus === 'free';
  const isFree = subscriptionStatus === 'free'; // Keep for backward compatibility

  return {
    subscriptionStatus,
    isPremium,
    isAdmin,
    isNormal,
    isFree,
    loading
  };
};

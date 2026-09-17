-- Two competing CHECK constraints were added to profiles.subscription_status:
--   check_subscription_status          -> free | pending | premium
--   profiles_subscription_status_check -> free | premium | admin
-- Their intersection is {free, premium}, but sync_subscription_status() writes
-- 'admin' for admin users and 'pending' for pending ones, so those rows could
-- never be inserted. Collapse both into one constraint covering every value the
-- trigger actually produces.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_subscription_status;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('free', 'pending', 'premium', 'admin'));

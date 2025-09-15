-- Add subscription_status to profiles table
ALTER TABLE public.profiles
ADD COLUMN subscription_status text NOT NULL DEFAULT 'free';

-- Add constraint for subscription_status values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_subscription_status_check
CHECK (subscription_status IN ('free', 'pending', 'premium'));

-- Update existing free users
UPDATE public.profiles
SET subscription_status = 'free'
WHERE subscription_status IS NULL;

-- Add subscription_tier to profiles table for future use
ALTER TABLE public.profiles
ADD COLUMN subscription_tier text DEFAULT 'basic';

-- Add constraint for subscription_tier values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_subscription_tier_check
CHECK (subscription_tier IN ('basic', 'offer1', 'offer2'));

-- Update RLS policies
CREATE POLICY "Users can view their own profile subscription" ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

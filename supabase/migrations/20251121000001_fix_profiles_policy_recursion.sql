-- Admin policies ON profiles were written as EXISTS (SELECT 1 FROM profiles ...),
-- which re-enters profiles' own RLS -> 42P17 infinite recursion. Every read of
-- profiles failed, including policies on other tables that check the caller's
-- role. A SECURITY DEFINER helper runs outside RLS and breaks the cycle.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.profiles;
CREATE POLICY "Admins can manage all subscriptions" ON public.profiles
  FOR ALL USING (public.is_admin());

-- these two also compared auth.uid() to profiles.id instead of profiles.user_id
DROP POLICY IF EXISTS "Admins can update subscription status" ON public.profiles;
CREATE POLICY "Admins can update subscription status" ON public.profiles
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own subscription status" ON public.profiles;
CREATE POLICY "Users can view own subscription status" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

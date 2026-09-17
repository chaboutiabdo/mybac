-- Every UPDATE policy on profiles is `USING (auth.uid() = user_id)` with no
-- column guard, so a student could run
--   supabase.from('profiles').update({ role: 'admin' })
-- and become an admin. is_admin() reads that same column, so this collapsed
-- every other access control in the schema.
--
-- RLS WITH CHECK cannot reference OLD, so a policy cannot express "same row,
-- role unchanged". A BEFORE UPDATE trigger can.
--
-- Column-level REVOKE was rejected: admins are also `authenticated`, so it
-- would break the admin screens that legitimately write role
-- (StudentApprovalDialog, SimpleSubscriptionManagement) and force an RPC plus
-- client rewrites. This changes no client code at all.

CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() is NULL for migrations, psql and service_role callers: trusted
  -- server-side contexts that must still be able to provision an admin. RLS
  -- already decides who may reach this UPDATE at all; the trigger only has to
  -- constrain end users acting through a JWT.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    -- silently revert rather than raise: several components send whole-row
    -- updates and would break on an exception. check-security.mjs therefore
    -- asserts the resulting value, not an error.
    NEW.role                := OLD.role;
    NEW.total_score         := OLD.total_score;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_tier   := OLD.subscription_tier;
  END IF;
  RETURN NEW;
END;
$$;

-- name sorts before sync_subscription_trigger so the revert happens first
DROP TRIGGER IF EXISTS guard_profile_privileges ON public.profiles;
CREATE TRIGGER guard_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

-- Created in 20250831011737 and never dropped since. USING (true) with no TO
-- clause meant anyone holding the anon key could dump every student's name and
-- email: GET /rest/v1/profiles?select=*
DROP POLICY IF EXISTS "Anyone can view profiles for leaderboard" ON public.profiles;

-- The leaderboard still has to work. A view runs with its owner's permissions
-- (security_invoker defaults to false), which is the intended escape hatch:
-- it exposes exactly three columns and no way to reach the rest of the row.
CREATE OR REPLACE VIEW public.leaderboard AS
  SELECT id, name, total_score
  FROM public.profiles
  WHERE role <> 'admin'
  ORDER BY total_score DESC
  LIMIT 100;

GRANT SELECT ON public.leaderboard TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Add indexes for support_requests
CREATE INDEX IF NOT EXISTS idx_support_requests_type_status ON public.support_requests(type, status);
CREATE INDEX IF NOT EXISTS idx_support_requests_email ON public.support_requests(email);

-- Update role check constraint to include premium role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'premium', 'admin'));

-- Make sure support_requests status has proper constraints
ALTER TABLE public.support_requests DROP CONSTRAINT IF EXISTS support_requests_status_check;
ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to profiles if not exists
DO $$ BEGIN
    CREATE TRIGGER update_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add trigger to support_requests if not exists
DO $$ BEGIN
    CREATE TRIGGER update_support_requests_updated_at
        BEFORE UPDATE ON public.support_requests
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

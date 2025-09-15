-- Simplify subscription system to just premium/normal users
-- This migration ensures all users are either 'free' (normal) or 'premium'

-- Update all 'student' roles to 'free' subscription status
UPDATE profiles 
SET 
  role = 'student',
  subscription_status = 'free'
WHERE role = 'student' AND subscription_status IS NULL;

-- Update all 'premium' roles to 'premium' subscription status
UPDATE profiles 
SET 
  role = 'premium',
  subscription_status = 'premium'
WHERE role = 'premium' AND subscription_status IS NULL;

-- Ensure admin users have admin status
UPDATE profiles 
SET 
  role = 'admin',
  subscription_status = 'admin'
WHERE role = 'admin';

-- Add constraint to ensure subscription_status is one of the valid values
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status IN ('free', 'premium', 'admin'));

-- Add constraint to ensure role is one of the valid values
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('student', 'premium', 'admin'));

-- Create a function to sync role and subscription_status
CREATE OR REPLACE FUNCTION sync_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is admin, set subscription_status to admin
  IF NEW.role = 'admin' THEN
    NEW.subscription_status = 'admin';
  -- If role is premium, set subscription_status to premium
  ELSIF NEW.role = 'premium' THEN
    NEW.subscription_status = 'premium';
  -- If role is student, set subscription_status to free
  ELSIF NEW.role = 'student' THEN
    NEW.subscription_status = 'free';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync role and subscription_status
DROP TRIGGER IF EXISTS sync_subscription_trigger ON profiles;
CREATE TRIGGER sync_subscription_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_status();

-- Update the RLS policies to be simpler
-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create simplified policies
CREATE POLICY "Users can read their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Add subscription_status column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pending', 'premium'));

-- Update any existing profiles to have 'free' status if they're students
UPDATE profiles 
SET subscription_status = 'free' 
WHERE role = 'student' AND subscription_status IS NULL;

-- Update any existing profiles to have 'premium' status if they're premium users
UPDATE profiles 
SET subscription_status = 'premium' 
WHERE role = 'premium' AND subscription_status IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Add policies for subscription status
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow admins to update subscription status
CREATE POLICY "Admins can update subscription status"
ON profiles
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Allow users to view their own subscription status
CREATE POLICY "Users can view own subscription status"
ON profiles
FOR SELECT
USING (
  auth.uid() = id OR
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Enable RLS
alter table profiles enable row level security;

-- Add subscription_status column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='profiles' 
        AND column_name='subscription_status') 
    THEN
        ALTER TABLE profiles 
        ADD COLUMN subscription_status TEXT DEFAULT 'free' 
        CHECK (subscription_status IN ('free', 'pending', 'premium'));
    END IF;
END $$;

-- Set default values based on role
UPDATE profiles 
SET subscription_status = 
    CASE 
        WHEN role = 'premium' THEN 'premium'
        ELSE 'free'
    END
WHERE subscription_status IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON profiles(subscription_status);

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- Add RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create new policies
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (
    auth.uid() IN (
        SELECT id FROM profiles 
        WHERE role = 'admin'
    )
);

CREATE POLICY "Admins can update all profiles" 
ON profiles FOR UPDATE 
TO authenticated 
USING (
    auth.uid() IN (
        SELECT id FROM profiles 
        WHERE role = 'admin'
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT id FROM profiles 
        WHERE role = 'admin'
    )
);

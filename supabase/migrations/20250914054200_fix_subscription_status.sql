-- Add subscription_status column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';

-- Set default values
UPDATE profiles 
SET subscription_status = 
    CASE 
        WHEN role = 'premium' THEN 'premium'
        ELSE 'free'
    END;

-- Add constraint
ALTER TABLE profiles 
ADD CONSTRAINT check_subscription_status 
CHECK (subscription_status IN ('free', 'pending', 'premium'));

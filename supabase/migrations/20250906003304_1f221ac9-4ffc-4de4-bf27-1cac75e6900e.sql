-- Add subscription tier to profiles table
CREATE TYPE subscription_tier AS ENUM ('basic', 'offer1', 'offer2');

ALTER TABLE profiles 
ADD COLUMN subscription_tier subscription_tier DEFAULT 'basic';

-- Update existing profiles to have basic tier
UPDATE profiles 
SET subscription_tier = 'basic' 
WHERE subscription_tier IS NULL;
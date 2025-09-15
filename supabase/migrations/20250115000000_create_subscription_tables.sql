-- Create admin_advice table
CREATE TABLE IF NOT EXISTS admin_advice (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add subscription_status column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'admin'));

-- Update existing profiles to have subscription_status based on role
UPDATE profiles 
SET subscription_status = CASE 
  WHEN role = 'admin' THEN 'admin'
  WHEN role = 'premium' THEN 'premium'
  ELSE 'free'
END
WHERE subscription_status IS NULL;

-- Create support_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS support_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'premium_subscription', 'technical', 'billing')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for admin_advice
ALTER TABLE admin_advice ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read admin advice
CREATE POLICY "Anyone can read admin advice" ON admin_advice
  FOR SELECT USING (true);

-- Only admins can insert, update, delete admin advice
CREATE POLICY "Only admins can manage admin advice" ON admin_advice
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create RLS policies for support_requests
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own support requests
CREATE POLICY "Users can insert their own support requests" ON support_requests
  FOR INSERT WITH CHECK (true);

-- Users can read their own support requests
CREATE POLICY "Users can read their own support requests" ON support_requests
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admins can read all support requests
CREATE POLICY "Admins can read all support requests" ON support_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admins can update support requests
CREATE POLICY "Admins can update support requests" ON support_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_advice_pinned ON admin_advice(is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_requests_type ON support_requests(type);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_admin_advice_updated_at 
  BEFORE UPDATE ON admin_advice 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_requests_updated_at 
  BEFORE UPDATE ON support_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

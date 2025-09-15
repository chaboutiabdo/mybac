-- Create support_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS support_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL REFERENCES profiles(email),
    name TEXT NOT NULL,
    phone TEXT,
    message TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create index on email and type
CREATE INDEX IF NOT EXISTS support_requests_email_type_idx ON support_requests(email, type);

-- Create index on status
CREATE INDEX IF NOT EXISTS support_requests_status_idx ON support_requests(status);

-- Add RLS policies
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Allow admins to see all requests
CREATE POLICY "Admins can see all support requests"
ON support_requests FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Allow admins to update support requests
CREATE POLICY "Admins can update support requests"
ON support_requests FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Allow users to see their own support requests
CREATE POLICY "Users can see their own support requests"
ON support_requests FOR SELECT
TO authenticated
USING (
    email IN (
        SELECT email FROM profiles
        WHERE profiles.id = auth.uid()
    )
);

-- Allow users to create their own support requests
CREATE POLICY "Users can create their own support requests"
ON support_requests FOR INSERT
TO authenticated
WITH CHECK (
    email IN (
        SELECT email FROM profiles
        WHERE profiles.id = auth.uid()
    )
);

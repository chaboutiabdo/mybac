-- Create support_requests table for handling premium subscription requests and other support inquiries
CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Policies for support_requests
DROP POLICY IF EXISTS "Users can view their own requests" ON public.support_requests;
CREATE POLICY "Users can view their own requests"
ON public.support_requests
FOR SELECT
USING (email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "Users can create support requests" ON public.support_requests;
CREATE POLICY "Users can create support requests"
ON public.support_requests
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all requests" ON public.support_requests;
CREATE POLICY "Admins can view all requests"
ON public.support_requests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create index IF NOT EXISTS for better query performance
CREATE INDEX IF NOT EXISTS idx_support_requests_email ON public.support_requests(email);
CREATE INDEX IF NOT EXISTS idx_support_requests_type ON public.support_requests(type);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);

-- Create support_requests table for handling premium subscription requests and other support inquiries
CREATE TABLE public.support_requests (
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
CREATE POLICY "Users can view their own requests"
ON public.support_requests
FOR SELECT
USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Users can create support requests"
ON public.support_requests
FOR INSERT
WITH CHECK (true);

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

-- Create index for better query performance
CREATE INDEX idx_support_requests_email ON public.support_requests(email);
CREATE INDEX idx_support_requests_type ON public.support_requests(type);
CREATE INDEX idx_support_requests_status ON public.support_requests(status);

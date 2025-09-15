-- Add new columns to advice_tips table
ALTER TABLE public.advice_tips
ADD COLUMN target_user_id UUID REFERENCES auth.users(id),
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN priority INTEGER NOT NULL DEFAULT 1,
ADD COLUMN expiry_date TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX idx_advice_tips_target_user ON public.advice_tips(target_user_id);
CREATE INDEX idx_advice_tips_priority ON public.advice_tips(priority);

-- Update policies to handle user-specific tips
DROP POLICY IF EXISTS "Anyone can view active tips" ON public.advice_tips;

CREATE POLICY "Users can view their targeted tips" ON public.advice_tips
FOR SELECT
USING (
  active = true AND 
  (
    is_public = true OR
    target_user_id = auth.uid() OR
    target_user_id IS NULL
  )
);

-- Function to clean up expired tips
CREATE OR REPLACE FUNCTION clean_expired_tips()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.advice_tips
  WHERE expiry_date IS NOT NULL
  AND expiry_date < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean expired tips daily
CREATE TRIGGER clean_expired_tips_trigger
  AFTER INSERT OR UPDATE ON public.advice_tips
  EXECUTE FUNCTION clean_expired_tips();

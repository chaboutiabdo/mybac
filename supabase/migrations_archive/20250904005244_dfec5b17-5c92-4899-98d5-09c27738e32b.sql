-- Create avatars storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload avatar images" ON storage.objects;
CREATE POLICY "Users can upload avatar images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update avatar images" ON storage.objects;
CREATE POLICY "Users can update avatar images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can delete avatar images" ON storage.objects;
CREATE POLICY "Users can delete avatar images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars');
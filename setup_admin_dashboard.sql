-- Admin Dashboard Database Setup Script
-- Run this in your Supabase SQL Editor

-- 1. Create alumni-files storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('alumni-files', 'alumni-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up storage policies for alumni-files bucket
-- Allow public read access
CREATE POLICY "Public read access for alumni files" ON storage.objects
FOR SELECT USING (bucket_id = 'alumni-files');

-- Allow admin upload access
CREATE POLICY "Admin upload access for alumni files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'alumni-files' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admin delete access
CREATE POLICY "Admin delete access for alumni files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'alumni-files' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. Create alumni_files table (if not exists)
CREATE TABLE IF NOT EXISTS alumni_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumni_id UUID NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create alumni_advice table (if not exists)
CREATE TABLE IF NOT EXISTS alumni_advice (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumni_id UUID NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Set up RLS policies for alumni_files
ALTER TABLE alumni_files ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access for alumni files" ON alumni_files
FOR SELECT USING (true);

-- Allow admin insert access
CREATE POLICY "Admin insert access for alumni files" ON alumni_files
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admin delete access
CREATE POLICY "Admin delete access for alumni files" ON alumni_files
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 6. Set up RLS policies for alumni_advice
ALTER TABLE alumni_advice ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access for alumni advice" ON alumni_advice
FOR SELECT USING (true);

-- Allow admin insert access
CREATE POLICY "Admin insert access for alumni advice" ON alumni_advice
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admin delete access
CREATE POLICY "Admin delete access for alumni advice" ON alumni_advice
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alumni_files_alumni_id ON alumni_files(alumni_id);
CREATE INDEX IF NOT EXISTS idx_alumni_files_uploaded_by ON alumni_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_alumni_advice_alumni_id ON alumni_advice(alumni_id);
CREATE INDEX IF NOT EXISTS idx_alumni_advice_category ON alumni_advice(category);
CREATE INDEX IF NOT EXISTS idx_alumni_advice_featured ON alumni_advice(is_featured);

-- 8. Sample data for testing (optional)
-- Insert some sample alumni if they don't exist
INSERT INTO alumni (name, bac_score, university, field_of_study, graduation_year)
VALUES 
  ('Fatima Zahra', 18.5, 'University of Algiers', 'Computer Science', 2023),
  ('Ahmed Benali', 17.2, 'USTHB', 'Mathematics', 2022),
  ('Amina Khelil', 16.8, 'ENP', 'Engineering', 2023)
ON CONFLICT DO NOTHING;

-- 9. Make sure you have an admin user
-- Update your profile to admin role (replace 'your-user-id' with actual user ID)
-- UPDATE profiles SET role = 'admin' WHERE user_id = 'your-user-id';

-- 10. Verify setup
SELECT 'Setup completed successfully!' as status;
SELECT COUNT(*) as alumni_count FROM alumni;
SELECT COUNT(*) as files_count FROM alumni_files;
SELECT COUNT(*) as advice_count FROM alumni_advice;

-- ============================================
-- SETUP DATABASE FOR ALUMNI FILES & ADVICE
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor
-- Then click "Run" to execute

-- Step 1: Create storage bucket for alumni files
INSERT INTO storage.buckets (id, name, public)
VALUES ('alumni-files', 'alumni-files', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for alumni files" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload access for alumni files" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access for alumni files" ON storage.objects;

-- Step 3: Create storage policies
CREATE POLICY "Public read access for alumni files" ON storage.objects
FOR SELECT USING (bucket_id = 'alumni-files');

CREATE POLICY "Admin upload access for alumni files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'alumni-files' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin delete access for alumni files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'alumni-files' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Step 4: Create alumni_files table
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

-- Step 5: Create alumni_advice table
CREATE TABLE IF NOT EXISTS alumni_advice (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumni_id UUID NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Enable RLS and create policies for alumni_files
ALTER TABLE alumni_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for alumni files table" ON alumni_files;
DROP POLICY IF EXISTS "Admin insert access for alumni files table" ON alumni_files;
DROP POLICY IF EXISTS "Admin delete access for alumni files table" ON alumni_files;

CREATE POLICY "Public read access for alumni files table" ON alumni_files
FOR SELECT USING (true);

CREATE POLICY "Admin insert access for alumni files table" ON alumni_files
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin delete access for alumni files table" ON alumni_files
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Step 7: Enable RLS and create policies for alumni_advice
ALTER TABLE alumni_advice ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for alumni advice table" ON alumni_advice;
DROP POLICY IF EXISTS "Admin insert access for alumni advice table" ON alumni_advice;
DROP POLICY IF EXISTS "Admin delete access for alumni advice table" ON alumni_advice;

CREATE POLICY "Public read access for alumni advice table" ON alumni_advice
FOR SELECT USING (true);

CREATE POLICY "Admin insert access for alumni advice table" ON alumni_advice
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin delete access for alumni advice table" ON alumni_advice
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alumni_files_alumni_id ON alumni_files(alumni_id);
CREATE INDEX IF NOT EXISTS idx_alumni_files_uploaded_by ON alumni_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_alumni_advice_alumni_id ON alumni_advice(alumni_id);
CREATE INDEX IF NOT EXISTS idx_alumni_advice_category ON alumni_advice(category);
CREATE INDEX IF NOT EXISTS idx_alumni_advice_featured ON alumni_advice(is_featured);

-- Step 9: Verification queries
SELECT 'Database setup completed successfully!' as status;
SELECT 'Alumni files table created' as message, COUNT(*) as row_count FROM alumni_files;
SELECT 'Alumni advice table created' as message, COUNT(*) as row_count FROM alumni_advice;

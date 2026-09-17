-- Create alumni_resources table
CREATE TABLE IF NOT EXISTS alumni_resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    alumni_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE alumni_resources ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Allow public read access" ON alumni_resources;
CREATE POLICY "Allow public read access" ON alumni_resources
    FOR SELECT USING (true);

-- Allow alumni to manage their own resources
DROP POLICY IF EXISTS "Allow alumni to manage their resources" ON alumni_resources;
CREATE POLICY "Allow alumni to manage their resources" ON alumni_resources
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
    );
-- Create alumni_files table for file uploads
CREATE TABLE public.alumni_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alumni_id UUID NOT NULL REFERENCES public.alumni(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alumni_advice table for advice system
CREATE TABLE public.alumni_advice (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alumni_id UUID NOT NULL REFERENCES public.alumni(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_alumni_files_alumni_id ON public.alumni_files(alumni_id);
CREATE INDEX idx_alumni_files_file_type ON public.alumni_files(file_type);
CREATE INDEX idx_alumni_advice_alumni_id ON public.alumni_advice(alumni_id);
CREATE INDEX idx_alumni_advice_category ON public.alumni_advice(category);
CREATE INDEX idx_alumni_advice_featured ON public.alumni_advice(is_featured);

-- Enable RLS (Row Level Security)
ALTER TABLE public.alumni_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_advice ENABLE ROW LEVEL SECURITY;

-- Create policies for alumni_files
CREATE POLICY "Anyone can view alumni files" ON public.alumni_files
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage alumni files" ON public.alumni_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for alumni_advice
CREATE POLICY "Anyone can view alumni advice" ON public.alumni_advice
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage alumni advice" ON public.alumni_advice
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add storage bucket for alumni files
INSERT INTO storage.buckets (id, name, public) VALUES ('alumni-files', 'alumni-files', true);

-- Create storage policies for alumni files bucket
CREATE POLICY "Anyone can view alumni files" ON storage.objects
  FOR SELECT USING (bucket_id = 'alumni-files');

CREATE POLICY "Admins can upload alumni files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'alumni-files' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update alumni files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'alumni-files' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete alumni files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'alumni-files' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

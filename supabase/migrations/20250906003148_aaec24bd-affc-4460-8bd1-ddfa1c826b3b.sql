-- Create storage bucket for documents (exams and solutions)
insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

-- Create storage policies for documents bucket
-- Admins can upload, view, update, and delete files
create policy "Admins can upload documents" 
on storage.objects 
for insert 
with check (
  bucket_id = 'documents' and 
  exists (
    select 1 from profiles 
    where profiles.user_id = auth.uid() 
    and profiles.role = 'admin'
  )
);

create policy "Admins can view all documents" 
on storage.objects 
for select 
using (
  bucket_id = 'documents' and 
  exists (
    select 1 from profiles 
    where profiles.user_id = auth.uid() 
    and profiles.role = 'admin'
  )
);

create policy "Admins can update documents" 
on storage.objects 
for update 
using (
  bucket_id = 'documents' and 
  exists (
    select 1 from profiles 
    where profiles.user_id = auth.uid() 
    and profiles.role = 'admin'
  )
);

create policy "Admins can delete documents" 
on storage.objects 
for delete 
using (
  bucket_id = 'documents' and 
  exists (
    select 1 from profiles 
    where profiles.user_id = auth.uid() 
    and profiles.role = 'admin'
  )
);

-- Students can view documents (for downloading exams and solutions)
create policy "Students can view documents" 
on storage.objects 
for select 
using (
  bucket_id = 'documents' and 
  exists (
    select 1 from profiles 
    where profiles.user_id = auth.uid() 
    and profiles.role in ('student', 'premium', 'admin')
  )
);
-- Create the admin user profile
INSERT INTO public.profiles (user_id, name, email, role) 
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Admin Chabouti',
  'a.chabouti@esi-sba.dz',
  'admin'
) ON CONFLICT (user_id) DO NOTHING;
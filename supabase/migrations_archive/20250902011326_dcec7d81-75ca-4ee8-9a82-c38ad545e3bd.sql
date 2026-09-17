-- Create the admin user profile (only if the matching auth user exists)
INSERT INTO public.profiles (user_id, name, email, role)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Admin Chabouti',
  'a.chabouti@esi-sba.dz',
  'admin'
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
)
ON CONFLICT (user_id) DO NOTHING;

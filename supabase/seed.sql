-- Creates one test user per role. Run in the Supabase SQL editor (bypasses RLS).
-- Idempotent: re-running resets the passwords and roles rather than erroring.
-- Password for all three: Test1234!

do $$
declare
  u record;
  uid uuid;
begin
  for u in
    select * from (values
      ('admin@mybac.test',   'Admin Test',   'admin'::public.user_role),
      ('premium@mybac.test', 'Premium Test', 'premium'::public.user_role),
      ('student@mybac.test', 'Student Test', 'student'::public.user_role)
    ) as t(email, name, role)
  loop
    select id into uid from auth.users where email = u.email;

    if uid is null then
      uid := gen_random_uuid();
      -- the on_auth_user_created trigger creates the matching public.profiles row
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) values (
        uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        u.email, extensions.crypt('Test1234!', extensions.gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', u.name), now(), now()
      );
      insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
      values (gen_random_uuid(), uid, uid::text, 'email',
              jsonb_build_object('sub', uid::text, 'email', u.email), now(), now());
    else
      update auth.users
         set encrypted_password = extensions.crypt('Test1234!', extensions.gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             updated_at = now()
       where id = uid;
    end if;

    -- the trigger defaults every new profile to 'student'; set the real role
    update public.profiles set role = u.role, name = u.name where user_id = uid;
  end loop;
end $$;

-- GoTrue scans these columns into Go strings, so NULL makes every sign-in fail
-- with "Database error querying schema".
update auth.users set
  confirmation_token          = coalesce(confirmation_token, ''),
  recovery_token              = coalesce(recovery_token, ''),
  email_change                = coalesce(email_change, ''),
  email_change_token_new      = coalesce(email_change_token_new, ''),
  email_change_token_current  = coalesce(email_change_token_current, ''),
  phone_change                = coalesce(phone_change, ''),
  phone_change_token          = coalesce(phone_change_token, ''),
  reauthentication_token      = coalesce(reauthentication_token, '')
where email like '%@mybac.test';

select p.email, p.role, p.name from public.profiles p
 where p.email like '%@mybac.test' order by p.role;

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


-- ============================================================================
-- Sample content for local development
--
-- This used to live inside a migration, which meant it would have been
-- inserted into production too. Seed data belongs here: `supabase db reset`
-- runs it locally and nothing runs it on a deployed project.
--
-- Values use the canonical vocabulary from src/lib/bac.ts.
-- ============================================================================

INSERT INTO public.quizzes (type, subject, chapter, date, questions, max_score) VALUES
('daily', 'Math', 'limits', CURRENT_DATE, '[
  {
    "id": "q_1",
    "question": "ما هي نهاية (x²-1)/(x-1) عندما يؤول x إلى 1؟",
    "options": ["0", "1", "2", "غير معرّفة"],
    "correct": 2
  },
  {
    "id": "q_2",
    "question": "مشتقة الدالة x³ هي:",
    "options": ["3x²", "x²", "3x", "x³"],
    "correct": 0
  }
]'::jsonb, 50),
('practice', 'Physics', 'electrical_phenomena', CURRENT_DATE, '[
  {
    "id": "q_1",
    "question": "وحدة شدة التيار الكهربائي هي:",
    "options": ["V", "A", "Ω", "W"],
    "correct": 1
  }
]'::jsonb, 8)
ON CONFLICT DO NOTHING;

INSERT INTO public.exams (title, subject, stream, year, difficulty, questions) VALUES
('الرياضيات — بكالوريا 2025', 'Math',    'Sciences Expérimentales', 2025, 'hard',   4),
('الرياضيات — بكالوريا 2024', 'Math',    'Sciences Expérimentales', 2024, 'medium', 4),
('الفيزياء — بكالوريا 2024',  'Physics', 'Sciences Expérimentales', 2024, 'medium', 4),
('الرياضيات — بكالوريا 2023', 'Math',    'Mathématiques',           2023, 'easy',   4)
ON CONFLICT DO NOTHING;

INSERT INTO public.advice_tips (title, content, priority, is_public, active) VALUES
('راجع التمارين المحلولة', 'ابدأ بمواضيع السنوات الثلاث الأخيرة قبل الانتقال إلى ما قبلها.', 3, true, true),
('نظّم وقتك',              'جلسات من 45 دقيقة مع استراحة 10 دقائق أفضل من ساعات متواصلة.',   1, true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.admin_advice (title, content, is_pinned) VALUES
('نصيحة الإدارة اليومية', 'راجعوا التمارين المحلولة لدورة 2023 قبل الاختبار اليومي.', true)
ON CONFLICT DO NOTHING;

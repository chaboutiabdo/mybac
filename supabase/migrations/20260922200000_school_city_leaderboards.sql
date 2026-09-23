-- School- and city-scoped "أفضل الطلاب" leaderboards, alongside the
-- existing global one. Two new sources of scope:
--   - school: already exists via school_students, admin-assigned.
--   - city: new, self-reported by the student at signup (or later in
--     Settings) — free text, matching schools.city's own precedent, not a
--     maintained wilaya list.

ALTER TABLE public.profiles ADD COLUMN city text;

-- handle_new_user() only ever read `name` from raw_user_meta_data. A student
-- confirms their email before any session exists, so there is no later
-- moment to write `city` with an authenticated request — it has to be
-- captured here, at row creation, or not at all.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'city', '')
  );
  RETURN NEW;
END;
$$;

-- Same safe shape as the `leaderboard` view (id, name, total_score — no
-- email), same admin exclusion, same `LIMIT 100` cap. SECURITY DEFINER
-- functions rather than views, deliberately: a non-security_invoker view
-- already bit this project once this session (quizzes_public), and a plain
-- security_invoker view here would need the caller to have direct SELECT on
-- school_students/other students' profiles rows, which they don't and
-- shouldn't. Scope is derived from auth.uid() internally; the caller passes
-- nothing that could be used to probe another student's or school's rows.
CREATE OR REPLACE FUNCTION public.get_school_leaderboard()
RETURNS TABLE (id uuid, name text, total_score integer)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT p.id, p.name, p.total_score
  FROM public.profiles p
  JOIN public.school_students ss ON ss.student_id = p.user_id
  WHERE ss.school_id = (
          SELECT school_id FROM public.school_students WHERE student_id = auth.uid() LIMIT 1
        )
    AND p.role <> 'admin'
  ORDER BY p.total_score DESC
  LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.get_city_leaderboard()
RETURNS TABLE (id uuid, name text, total_score integer)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT p.id, p.name, p.total_score
  FROM public.profiles p
  WHERE p.city = (SELECT city FROM public.profiles WHERE user_id = auth.uid())
    AND p.city IS NOT NULL
    AND p.role <> 'admin'
  ORDER BY p.total_score DESC
  LIMIT 100;
$$;

-- The ALTER DEFAULT PRIVILEGES landmine documented throughout this project's
-- migrations grants anon EXECUTE on every new function unless revoked here.
REVOKE ALL ON FUNCTION public.get_school_leaderboard() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_city_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_school_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_city_leaderboard() TO authenticated;

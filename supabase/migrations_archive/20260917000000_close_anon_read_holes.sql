-- Close the anonymous-read holes found by scripts/attack-suite.mjs.
--
-- Seven tables carried `USING (true)` SELECT policies with no `TO` clause, so
-- PostgREST served them to the `anon` role — i.e. to anyone on the internet
-- holding the publishable key, which ships in the JS bundle.
--
-- The worst of these was `quizzes`: `questions` jsonb contains the `correct`
-- index for every question, so the entire answer key was downloadable without
-- logging in:
--
--   curl "$URL/rest/v1/quizzes?select=questions" -H "apikey: $PUBLISHABLE_KEY"
--   -> [{"questions":[{"correct":2,"options":[...],"question":"..."}]}]
--
-- Verified: no public route reads any of these tables. The only supabase call
-- on a public page is the support_requests INSERT from Pricing.tsx, which is
-- deliberately left open below.

-- ---------------------------------------------------------------- quizzes
-- The answer key. Students still see `correct` (see DEVELOPMENT.md — closing
-- that needs server-side scoring), but it is no longer unauthenticated.
DROP POLICY IF EXISTS "Anyone can view quizzes" ON public.quizzes;

CREATE POLICY "Authenticated users can view quizzes"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (true);

-- ------------------------------------------------------------------ exams
-- /exams sits behind ProtectedRoute; nothing public reads this.
DROP POLICY IF EXISTS "Anyone can view exams" ON public.exams;

CREATE POLICY "Authenticated users can view exams"
  ON public.exams FOR SELECT
  TO authenticated
  USING (true);

-- ------------------------------------------------------------ admin_advice
DROP POLICY IF EXISTS "Anyone can read admin advice" ON public.admin_advice;

CREATE POLICY "Authenticated users can read admin advice"
  ON public.admin_advice FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------- alumni
-- Real people: name, university, field of study and bac_score out of 20.
-- This was fully readable anonymously.
DROP POLICY IF EXISTS "Anyone can view alumni" ON public.alumni;

CREATE POLICY "Authenticated users can view alumni"
  ON public.alumni FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view alumni advice" ON public.alumni_advice;

CREATE POLICY "Authenticated users can view alumni advice"
  ON public.alumni_advice FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view alumni files" ON public.alumni_files;

CREATE POLICY "Authenticated users can view alumni files"
  ON public.alumni_files FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read access" ON public.alumni_resources;

CREATE POLICY "Authenticated users can view alumni resources"
  ON public.alumni_resources FOR SELECT
  TO authenticated
  USING (true);

-- -------------------------------------------------------- support_requests
-- INSERT stays open to anon: the contact form on the public landing page and
-- the receipt form on /pricing both write here without a session. Two
-- overlapping policies existed; collapse them to one so the intent is legible.
-- SELECT was already admin-only and is left alone.
DROP POLICY IF EXISTS "Users can create support requests" ON public.support_requests;
DROP POLICY IF EXISTS "Users can insert their own support requests" ON public.support_requests;

CREATE POLICY "Anyone can submit a support request"
  ON public.support_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ----------------------------------------------------------------- videos
-- "Anyone can view youtube videos" was {public}, so the free-video catalogue
-- was readable anonymously. /videos sits behind ProtectedRoute.
-- The premium policy already checks the caller's role and is left alone.
DROP POLICY IF EXISTS "Anyone can view youtube videos" ON public.videos;

CREATE POLICY "Authenticated users can view youtube videos"
  ON public.videos FOR SELECT
  TO authenticated
  USING (type = 'youtube'::video_type);

-- ------------------------------------------------------------ advice_tips
-- Two policies expressed the same rule; the {public} one also served anon.
DROP POLICY IF EXISTS "Users can view their targeted tips" ON public.advice_tips;

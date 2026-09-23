-- ============================================================================
-- THE SMART — baseline schema
--
-- Squashed from the 46 migrations that preceded it. Those accumulated three
-- near-duplicate 'add_subscription_status' patches, a 0-byte file, and tables
-- for a feature that was later deleted. Nothing deployed depended on that
-- history: the original cloud project no longer exists, so a new project
-- starts from this file.
--
-- Generated with `supabase db dump --local` from a database verified by
-- `npm run security` (90 assertions). The storage section below is appended
-- by hand because db dump only covers the public schema.
-- ============================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- (dump's `COMMENT ON SCHEMA public` removed: cosmetic, and on a hosted
-- project it needs schema ownership and can abort the whole baseline)


CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."booking_status" AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."quiz_type" AS ENUM (
    'daily',
    'normal',
    'practice'
);


ALTER TYPE "public"."quiz_type" OWNER TO "postgres";


CREATE TYPE "public"."subscription_tier" AS ENUM (
    'basic',
    'offer1',
    'offer2'
);


ALTER TYPE "public"."subscription_tier" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'student',
    'premium',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."video_type" AS ENUM (
    'youtube',
    'premium'
);


ALTER TYPE "public"."video_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_user_score"("user_id_param" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  video_score INTEGER := 0;
  exam_score INTEGER := 0;  
  daily_quiz_score INTEGER := 0;
  practice_quiz_score INTEGER := 0;
  booking_score INTEGER := 0;
  final_total_score INTEGER := 0;
BEGIN
  -- Video score: 5 points per watched video
  SELECT COALESCE(COUNT(*) * 5, 0) INTO video_score
  FROM video_progress 
  WHERE student_id = user_id_param AND watched = true;
  
  -- Exam score: 10 points per exam interaction (solution viewed or AI solved)
  SELECT COALESCE(COUNT(*) * 10, 0) INTO exam_score
  FROM exam_progress 
  WHERE student_id = user_id_param AND (viewed_solution = true OR solved_with_ai = true);
  
  -- Daily quiz score: 25 points per correct answer
  SELECT COALESCE(SUM(CASE WHEN qr.is_correct THEN 25 ELSE 0 END), 0) INTO daily_quiz_score
  FROM quiz_question_results qr
  JOIN quiz_attempts qa ON qr.quiz_attempt_id = qa.id
  JOIN quizzes q ON qa.quiz_id = q.id
  WHERE qr.student_id = user_id_param AND q.type = 'daily';
  
  -- Practice quiz score: 8 points per correct answer
  SELECT COALESCE(SUM(CASE WHEN qr.is_correct THEN 8 ELSE 0 END), 0) INTO practice_quiz_score
  FROM quiz_question_results qr
  JOIN quiz_attempts qa ON qr.quiz_attempt_id = qa.id
  JOIN quizzes q ON qa.quiz_id = q.id
  WHERE qr.student_id = user_id_param AND q.type = 'practice';
  
  -- Booking score: 70 points per alumni booking
  SELECT COALESCE(COUNT(*) * 70, 0) INTO booking_score
  FROM bookings 
  WHERE student_id = user_id_param;
  
  -- Calculate total
  final_total_score := video_score + exam_score + daily_quiz_score + practice_quiz_score + booking_score;
  
  -- Update user profile with the new total score
  UPDATE profiles 
  SET total_score = final_total_score 
  WHERE user_id = user_id_param;
  
  RETURN final_total_score;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return 0 if calculation fails
    RAISE WARNING 'Error calculating score for user %: %', user_id_param, SQLERRM;
    RETURN 0;
END;
$$;


ALTER FUNCTION "public"."calculate_user_score"("user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_expired_tips"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM public.advice_tips
  WHERE expiry_date IS NOT NULL
  AND expiry_date < NOW();
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."clean_expired_tips"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_profile_privileges"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Constrain only a DIRECT write from an end user or an anonymous caller.
  -- Nested trigger writes (the scoring path), the service key, migrations and
  -- admins all pass through.
  IF pg_trigger_depth() <= 1
     AND auth.role() IN ('anon', 'authenticated')
     AND NOT public.is_admin()
  THEN
    NEW.role                := OLD.role;
    NEW.total_score         := OLD.total_score;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_tier   := OLD.subscription_tier;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_profile_privileges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_booking_points"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  alumni_record RECORD;
BEGIN
  -- Record 70 points when booking is created
  SELECT id, name INTO alumni_record
  FROM public.alumni
  WHERE id = NEW.alumni_id;
  
  -- Only record if alumni exists
  IF FOUND THEN
    -- Record points
    PERFORM public.record_points_transaction(
      NEW.student_id,
      70,
      'booking',
      NEW.id,
      'Booking: ' || COALESCE(alumni_record.name, 'Alumni'),
      NULL,
      NULL,
      NULL,
      NULL
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in handle_booking_points: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_booking_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_exam_points"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  exam_record RECORD;
  points_awarded INTEGER := 0;
  source_desc TEXT := '';
  should_record BOOLEAN := false;
BEGIN
  -- Only record points when exam is first viewed/solved
  IF OLD IS NULL THEN
    -- New record - check if solution viewed or AI solved
    should_record := NEW.viewed_solution = true OR NEW.solved_with_ai = true;
  ELSE
    -- Updated record - check if solution viewed or AI solved for the first time
    should_record := (NEW.viewed_solution = true AND (OLD.viewed_solution IS NULL OR OLD.viewed_solution = false)) 
                     OR (NEW.solved_with_ai = true AND (OLD.solved_with_ai IS NULL OR OLD.solved_with_ai = false));
  END IF;

  IF should_record THEN
    -- Get exam details
    SELECT id, title, subject, year, stream INTO exam_record
    FROM public.exams
    WHERE id = NEW.exam_id;
    
    -- Only record if exam exists
    IF FOUND THEN
      -- Award 10 points per exam interaction
      points_awarded := 10;
      source_desc := 'Exam: ' || COALESCE(exam_record.title, 'Unknown');
      
      -- Record points
      PERFORM public.record_points_transaction(
        NEW.student_id,
        points_awarded,
        'exam',
        NEW.exam_id,
        source_desc,
        exam_record.subject,
        NULL,
        NULL,
        NULL
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in handle_exam_points: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_exam_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_video_completion_points"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  video_record RECORD;
BEGIN
  -- Only record points when video is marked as watched for the first time
  IF NEW.watched = true AND (OLD IS NULL OR OLD.watched IS NULL OR OLD.watched = false) THEN
    -- Get video details
    SELECT id, title, subject, chapter INTO video_record
    FROM public.videos
    WHERE id = NEW.video_id;
    
    -- Only record if video exists
    IF FOUND THEN
      -- Record 5 points for video completion
      PERFORM public.record_points_transaction(
        NEW.student_id,
        5,
        'video',
        NEW.video_id,
        'Video: ' || COALESCE(video_record.title, 'Unknown'),
        video_record.subject,
        video_record.chapter,
        NULL,
        NULL
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in handle_video_completion_points: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_video_completion_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_points_transaction"("p_student_id" "uuid", "p_points" integer, "p_source_type" "text", "p_source_id" "uuid" DEFAULT NULL::"uuid", "p_source_description" "text" DEFAULT NULL::"text", "p_subject" "text" DEFAULT NULL::"text", "p_chapter" "text" DEFAULT NULL::"text", "p_quiz_type" "text" DEFAULT NULL::"text", "p_question_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_points integer;
  v_id uuid;
BEGIN
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'student_id is required';
  END IF;

  -- IS DISTINCT FROM so a NULL auth.uid() (anon) fails closed
  IF p_student_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Cannot record points for another user';
  END IF;

  -- The value of an activity is set here, not by the caller.
  v_points := CASE p_source_type
                WHEN 'video'   THEN 5
                WHEN 'exam'    THEN 10
                WHEN 'booking' THEN 70
                WHEN 'quiz'    THEN CASE WHEN p_quiz_type = 'daily' THEN 25 ELSE 8 END
                ELSE NULL
              END;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Unknown source_type: %', p_source_type;
  END IF;

  INSERT INTO public.points_transactions (
    student_id, points, source_type, source_id, source_description,
    subject, chapter, quiz_type, question_id
  ) VALUES (
    p_student_id, v_points, p_source_type, p_source_id, p_source_description,
    p_subject, p_chapter, p_quiz_type, p_question_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."record_points_transaction"("p_student_id" "uuid", "p_points" integer, "p_source_type" "text", "p_source_id" "uuid", "p_source_description" "text", "p_subject" "text", "p_chapter" "text", "p_quiz_type" "text", "p_question_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_quiz_attempt"("p_attempt_id" "uuid", "p_answers" "jsonb") RETURNS TABLE("score" integer, "max_score" integer, "correct_count" integer, "total_questions" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_attempt   public.quiz_attempts%ROWTYPE;
  v_quiz      public.quizzes%ROWTYPE;
  v_question  jsonb;
  v_ord       int;
  v_qid       text;
  v_given     text;
  v_given_idx int;
  v_correct   int;
  v_is_right  boolean;
  v_right     int := 0;
  v_total     int := 0;
  v_per_q     int;
  v_score     int;
  v_is_retake boolean;
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF v_attempt.student_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not your attempt';
  END IF;

  IF v_attempt.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Attempt already submitted';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  v_per_q := CASE WHEN v_quiz.type = 'daily' THEN 25 ELSE 8 END;

  -- has this student completed this quiz before?
  SELECT EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE quiz_id = v_attempt.quiz_id
      AND student_id = auth.uid()
      AND id <> p_attempt_id
      AND completed_at IS NOT NULL
  ) INTO v_is_retake;

  FOR v_question, v_ord IN
    SELECT elem, ord
    FROM jsonb_array_elements(v_quiz.questions) WITH ORDINALITY AS t(elem, ord)
  LOOP
    v_total := v_total + 1;
    v_qid := COALESCE(v_question ->> 'id', 'q_' || v_ord);
    v_correct := (v_question ->> 'correct')::int;

    v_given := p_answers ->> v_qid;
    v_given_idx := CASE v_given
                     WHEN 'A' THEN 0 WHEN 'B' THEN 1
                     WHEN 'C' THEN 2 WHEN 'D' THEN 3
                     ELSE NULL
                   END;

    v_is_right := v_given_idx IS NOT NULL AND v_given_idx = v_correct;
    IF v_is_right THEN
      v_right := v_right + 1;
    END IF;

    INSERT INTO public.quiz_question_results (
      student_id, quiz_attempt_id, quiz_id, question_id, question_text,
      student_answer, correct_answer, is_correct, selected_choice_index,
      question_number, quiz_type, quiz_subject, quiz_chapter
    ) VALUES (
      auth.uid(), p_attempt_id, v_attempt.quiz_id, v_qid,
      COALESCE(v_question ->> 'question', ''),
      v_given,
      (ARRAY['A','B','C','D'])[v_correct + 1],
      v_is_right, v_given_idx, v_ord,
      v_quiz.type::text, v_quiz.subject, v_quiz.chapter
    )
    ON CONFLICT (quiz_attempt_id, question_id) DO NOTHING;

    -- Points only on a first pass, and only for a correct answer. The amount
    -- is decided inside record_points_transaction, not here.
    IF v_is_right AND NOT v_is_retake THEN
      BEGIN
        PERFORM public.record_points_transaction(
          auth.uid(), v_per_q, 'quiz', v_attempt.quiz_id,
          'Quiz: ' || COALESCE(v_quiz.subject, '') || ' - Q' || v_ord,
          v_quiz.subject, v_quiz.chapter, v_quiz.type::text, v_qid
        );
      EXCEPTION WHEN unique_violation THEN
        -- points_transactions_unique_award already holds this award, so the
        -- student has been paid for this question. Skip it rather than abort
        -- the whole submission.
        NULL;
      END;
    END IF;
  END LOOP;

  v_score := v_right * v_per_q;

  UPDATE public.quiz_attempts
     SET answers      = p_answers,
         score        = v_score,
         completed_at = now(),
         submitted    = true
   WHERE id = p_attempt_id;

  -- The stored max_score is unreliable (UploadQuizDialog wrote n*8 even for
  -- daily quizzes, which score 25 each), so report the true ceiling.
  RETURN QUERY SELECT v_score, v_total * v_per_q, v_right, v_total;
END;
$$;


ALTER FUNCTION "public"."submit_quiz_attempt"("p_attempt_id" "uuid", "p_answers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_subscription_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If role is admin, set subscription_status to admin
  IF NEW.role = 'admin' THEN
    NEW.subscription_status = 'admin';
  -- If role is premium, set subscription_status to premium
  ELSIF NEW.role = 'premium' THEN
    NEW.subscription_status = 'premium';
  -- If role is student, set subscription_status to free
  ELSIF NEW.role = 'student' THEN
    NEW.subscription_status = 'free';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_subscription_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_user_score"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM calculate_user_score(NEW.student_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_user_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_student_total_score"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    -- Update the student's total_score by summing all their points_transactions
    UPDATE public.profiles
    SET total_score = COALESCE((
      SELECT SUM(points) 
      FROM public.points_transactions 
      WHERE student_id = NEW.student_id
    ), 0)
    WHERE user_id = NEW.student_id;
    
    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error updating student total score: %', SQLERRM;
      RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_student_total_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_score"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update total score based on various activities
  UPDATE public.profiles
  SET total_score = COALESCE(
    (SELECT SUM(score) FROM public.quiz_attempts WHERE student_id = NEW.student_id), 0
  ) +
  COALESCE(
    (SELECT COUNT(*) FROM public.video_progress WHERE student_id = NEW.student_id AND watched = true), 0
  ) +
  COALESCE(
    (SELECT COUNT(*) FROM public.exam_progress WHERE student_id = NEW.student_id AND (viewed_exam = true OR viewed_solution = true OR solved_with_ai = true)), 0
  )
  WHERE user_id = NEW.student_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_score_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Handle different table operations
  IF TG_TABLE_NAME = 'video_progress' THEN
    PERFORM public.calculate_user_score(NEW.student_id);
  ELSIF TG_TABLE_NAME = 'exam_progress' THEN
    PERFORM public.calculate_user_score(NEW.student_id);
  ELSIF TG_TABLE_NAME = 'quiz_question_results' THEN
    PERFORM public.calculate_user_score(NEW.student_id);
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    PERFORM public.calculate_user_score(NEW.student_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_user_score_trigger"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_advice" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_advice" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advice_tips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text",
    "priority" integer DEFAULT 1,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "target_user_id" "uuid",
    "is_public" boolean DEFAULT true NOT NULL,
    "expiry_date" timestamp with time zone
);


ALTER TABLE "public"."advice_tips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_learning_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "answer_text" "text" NOT NULL,
    "subject" "text",
    "chapter" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_learning_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alumni" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "bac_score" numeric(4,2),
    "university" "text",
    "field_of_study" "text",
    "advice" "text",
    "avatar_url" "text",
    "linkedin_url" "text",
    "available_for_mentoring" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."alumni" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alumni_advice" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alumni_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "is_featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."alumni_advice" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alumni_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alumni_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "description" "text",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."alumni_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alumni_resources" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "alumni_id" "uuid",
    "title" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alumni_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alumni_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "topic" "text" NOT NULL,
    "time_preference" timestamp with time zone,
    "phone" "text" NOT NULL,
    "status" "public"."booking_status" DEFAULT 'pending'::"public"."booking_status" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "exam_title" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "year" integer NOT NULL,
    "stream" "text" NOT NULL,
    "difficulty" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exam_activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "viewed_exam" boolean DEFAULT false,
    "viewed_solution" boolean DEFAULT false,
    "solved_with_ai" boolean DEFAULT false,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."exam_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "stream" "text" NOT NULL,
    "year" integer NOT NULL,
    "exam_url" "text",
    "solution_url" "text",
    "difficulty" "text" DEFAULT 'medium'::"text",
    "questions" integer DEFAULT 0,
    "downloads" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "total_score" integer DEFAULT 0 NOT NULL,
    "stream" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subscription_tier" "public"."subscription_tier" DEFAULT 'basic'::"public"."subscription_tier",
    "subscription_status" "text" DEFAULT 'free'::"text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['student'::"public"."user_role", 'premium'::"public"."user_role", 'admin'::"public"."user_role"]))),
    CONSTRAINT "profiles_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['free'::"text", 'pending'::"text", 'premium'::"text", 'admin'::"text"]))),
    CONSTRAINT "profiles_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['basic'::"public"."subscription_tier", 'offer1'::"public"."subscription_tier", 'offer2'::"public"."subscription_tier"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."leaderboard" AS
 SELECT "id",
    "name",
    "total_score"
   FROM "public"."profiles"
  WHERE ("role" <> 'admin'::"public"."user_role")
  ORDER BY "total_score" DESC
 LIMIT 100;


ALTER VIEW "public"."leaderboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."points_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid",
    "source_description" "text",
    "subject" "text",
    "chapter" "text",
    "quiz_type" "text",
    "question_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."points_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions_import" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid",
    "question_text" "text" NOT NULL,
    "option_a" "text" NOT NULL,
    "option_b" "text" NOT NULL,
    "option_c" "text" NOT NULL,
    "option_d" "text" NOT NULL,
    "correct_answer" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "chapter" "text",
    "difficulty" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "questions_import_correct_answer_check" CHECK (("correct_answer" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text", 'D'::"text"]))),
    CONSTRAINT "questions_import_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"])))
);


ALTER TABLE "public"."questions_import" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "completed_at" timestamp with time zone,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "submitted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_question_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "quiz_attempt_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "question_text" "text" NOT NULL,
    "student_answer" "text",
    "correct_answer" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "time_spent" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quiz_type" "text",
    "quiz_subject" "text",
    "quiz_chapter" "text",
    "quiz_id" "uuid",
    "selected_choice_index" integer,
    "question_number" integer
);


ALTER TABLE "public"."quiz_question_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."quiz_type" NOT NULL,
    "subject" "text" NOT NULL,
    "chapter" "text",
    "date" "date" NOT NULL,
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "max_score" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."quizzes_public" AS
 SELECT "id",
    "type",
    "subject",
    "chapter",
    "date",
    "max_score",
    "created_at",
    COALESCE(( SELECT "jsonb_agg"(("t"."elem" - 'correct'::"text") ORDER BY "t"."ord") AS "jsonb_agg"
           FROM "jsonb_array_elements"("q"."questions") WITH ORDINALITY "t"("elem", "ord")), '[]'::"jsonb") AS "questions"
   FROM "public"."quizzes" "q";


ALTER VIEW "public"."quizzes_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."school_students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "contract_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_questions_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "topic" "text",
    "subject" "text",
    "context_type" "text",
    "context_id" "uuid",
    "ai_response" "text",
    "satisfaction_rating" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_questions_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."support_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "video_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "video_title" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "chapter" "text",
    "position" integer DEFAULT 0,
    "session_id" "uuid" DEFAULT "gen_random_uuid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."video_activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "watched" boolean DEFAULT false,
    "watch_time" integer DEFAULT 0,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."video_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "chapter" "text",
    "type" "public"."video_type" NOT NULL,
    "url" "text",
    "file_path" "text",
    "description" "text",
    "duration" integer,
    "views" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_advice"
    ADD CONSTRAINT "admin_advice_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advice_tips"
    ADD CONSTRAINT "advice_tips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_learning_conversations"
    ADD CONSTRAINT "ai_learning_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alumni_advice"
    ADD CONSTRAINT "alumni_advice_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alumni_files"
    ADD CONSTRAINT "alumni_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alumni"
    ADD CONSTRAINT "alumni_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alumni_resources"
    ADD CONSTRAINT "alumni_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_activity_logs"
    ADD CONSTRAINT "exam_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_progress"
    ADD CONSTRAINT "exam_progress_exam_id_student_id_key" UNIQUE ("exam_id", "student_id");



ALTER TABLE ONLY "public"."exam_progress"
    ADD CONSTRAINT "exam_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."questions_import"
    ADD CONSTRAINT "questions_import_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_unique_attempt" UNIQUE ("quiz_id", "student_id", "attempt_number");



ALTER TABLE ONLY "public"."quiz_question_results"
    ADD CONSTRAINT "quiz_question_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_students"
    ADD CONSTRAINT "school_students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_students"
    ADD CONSTRAINT "school_students_school_id_student_id_key" UNIQUE ("school_id", "student_id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_questions_log"
    ADD CONSTRAINT "student_questions_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_requests"
    ADD CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_activity_logs"
    ADD CONSTRAINT "video_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "video_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "video_progress_video_id_student_id_key" UNIQUE ("video_id", "student_id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



CREATE INDEX "advice_tips_active_public_idx" ON "public"."advice_tips" USING "btree" ("active", "is_public");



CREATE INDEX "advice_tips_expiry_date_idx" ON "public"."advice_tips" USING "btree" ("expiry_date");



CREATE INDEX "advice_tips_target_user_idx" ON "public"."advice_tips" USING "btree" ("target_user_id");



CREATE INDEX "idx_admin_advice_pinned" ON "public"."admin_advice" USING "btree" ("is_pinned", "created_at" DESC);



CREATE INDEX "idx_advice_tips_priority" ON "public"."advice_tips" USING "btree" ("priority");



CREATE INDEX "idx_advice_tips_target_user" ON "public"."advice_tips" USING "btree" ("target_user_id");



CREATE INDEX "idx_ai_conversations_created_at" ON "public"."ai_learning_conversations" USING "btree" ("created_at");



CREATE INDEX "idx_ai_conversations_user_id" ON "public"."ai_learning_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_alumni_advice_alumni_id" ON "public"."alumni_advice" USING "btree" ("alumni_id");



CREATE INDEX "idx_alumni_advice_category" ON "public"."alumni_advice" USING "btree" ("category");



CREATE INDEX "idx_alumni_advice_featured" ON "public"."alumni_advice" USING "btree" ("is_featured");



CREATE INDEX "idx_alumni_files_alumni_id" ON "public"."alumni_files" USING "btree" ("alumni_id");



CREATE INDEX "idx_alumni_files_file_type" ON "public"."alumni_files" USING "btree" ("file_type");



CREATE INDEX "idx_exam_activity_exam_id" ON "public"."exam_activity_logs" USING "btree" ("exam_id");



CREATE INDEX "idx_exam_activity_student_id" ON "public"."exam_activity_logs" USING "btree" ("student_id");



CREATE INDEX "idx_points_transactions_created_at" ON "public"."points_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_points_transactions_source_id" ON "public"."points_transactions" USING "btree" ("source_id");



CREATE INDEX "idx_points_transactions_source_type" ON "public"."points_transactions" USING "btree" ("source_type");



CREATE INDEX "idx_points_transactions_student_id" ON "public"."points_transactions" USING "btree" ("student_id");



CREATE INDEX "idx_points_transactions_subject" ON "public"."points_transactions" USING "btree" ("subject");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_subscription_status" ON "public"."profiles" USING "btree" ("subscription_status");



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_quiz_attempts_quiz_student" ON "public"."quiz_attempts" USING "btree" ("quiz_id", "student_id");



CREATE INDEX "idx_quiz_attempts_submitted" ON "public"."quiz_attempts" USING "btree" ("submitted");



CREATE INDEX "idx_quiz_question_results_quiz_attempt" ON "public"."quiz_question_results" USING "btree" ("quiz_attempt_id");



CREATE INDEX "idx_quiz_question_results_quiz_id" ON "public"."quiz_question_results" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_question_results_quiz_subject" ON "public"."quiz_question_results" USING "btree" ("quiz_subject");



CREATE INDEX "idx_quiz_question_results_quiz_type" ON "public"."quiz_question_results" USING "btree" ("quiz_type");



CREATE INDEX "idx_quiz_question_results_student_id" ON "public"."quiz_question_results" USING "btree" ("student_id");



CREATE INDEX "idx_student_questions_student_id" ON "public"."student_questions_log" USING "btree" ("student_id");



CREATE INDEX "idx_student_questions_topic" ON "public"."student_questions_log" USING "btree" ("topic");



CREATE INDEX "idx_support_requests_email" ON "public"."support_requests" USING "btree" ("email");



CREATE INDEX "idx_support_requests_status" ON "public"."support_requests" USING "btree" ("status");



CREATE INDEX "idx_support_requests_type" ON "public"."support_requests" USING "btree" ("type");



CREATE INDEX "idx_support_requests_type_status" ON "public"."support_requests" USING "btree" ("type", "status");



CREATE INDEX "idx_video_activity_student_id" ON "public"."video_activity_logs" USING "btree" ("student_id");



CREATE INDEX "idx_video_activity_video_id" ON "public"."video_activity_logs" USING "btree" ("video_id");



CREATE UNIQUE INDEX "points_transactions_unique_award" ON "public"."points_transactions" USING "btree" ("student_id", "source_type", "source_id", "question_id") WHERE (("source_id" IS NOT NULL) AND ("question_id" IS NOT NULL));



CREATE UNIQUE INDEX "quiz_question_results_unique_answer" ON "public"."quiz_question_results" USING "btree" ("quiz_attempt_id", "question_id");



CREATE INDEX "support_requests_email_type_idx" ON "public"."support_requests" USING "btree" ("email", "type");



CREATE INDEX "support_requests_status_idx" ON "public"."support_requests" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "bookings_score_trigger" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "clean_expired_tips_trigger" AFTER INSERT OR UPDATE ON "public"."advice_tips" FOR EACH STATEMENT EXECUTE FUNCTION "public"."clean_expired_tips"();



CREATE OR REPLACE TRIGGER "exam_progress_score_trigger" AFTER INSERT OR UPDATE ON "public"."exam_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "guard_profile_privileges" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_privileges"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."advice_tips" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "quiz_results_score_trigger" AFTER INSERT ON "public"."quiz_question_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "sync_subscription_trigger" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_subscription_status"();



CREATE OR REPLACE TRIGGER "trigger_booking_points" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_booking_points"();



CREATE OR REPLACE TRIGGER "trigger_exam_points" AFTER INSERT OR UPDATE ON "public"."exam_progress" FOR EACH ROW EXECUTE FUNCTION "public"."handle_exam_points"();



CREATE OR REPLACE TRIGGER "trigger_update_score_booking" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "trigger_update_score_exam" AFTER INSERT OR UPDATE ON "public"."exam_progress" FOR EACH ROW WHEN ((("new"."solved_with_ai" = true) OR ("new"."viewed_solution" = true))) EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "trigger_update_score_quiz" AFTER INSERT ON "public"."quiz_question_results" FOR EACH ROW WHEN (("new"."is_correct" = true)) EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "trigger_update_score_video" AFTER INSERT OR UPDATE ON "public"."video_progress" FOR EACH ROW WHEN (("new"."watched" = true)) EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "trigger_update_total_score_on_points_delete" AFTER DELETE ON "public"."points_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_student_total_score"();



CREATE OR REPLACE TRIGGER "trigger_update_total_score_on_points_insert" AFTER INSERT ON "public"."points_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_student_total_score"();



CREATE OR REPLACE TRIGGER "trigger_video_completion_points" AFTER INSERT OR UPDATE ON "public"."video_progress" FOR EACH ROW EXECUTE FUNCTION "public"."handle_video_completion_points"();



CREATE OR REPLACE TRIGGER "update_admin_advice_updated_at" BEFORE UPDATE ON "public"."admin_advice" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_alumni_updated_at" BEFORE UPDATE ON "public"."alumni" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_booking_score" AFTER INSERT OR DELETE OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "update_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_exam_activity_logs_updated_at" BEFORE UPDATE ON "public"."exam_activity_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_exam_progress_score" AFTER INSERT OR DELETE OR UPDATE ON "public"."exam_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "update_exams_updated_at" BEFORE UPDATE ON "public"."exams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quiz_question_results_updated_at" BEFORE UPDATE ON "public"."quiz_question_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quiz_results_score" AFTER INSERT OR DELETE OR UPDATE ON "public"."quiz_question_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "update_schools_updated_at" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_score_on_bookings" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "update_score_on_exam" AFTER INSERT OR UPDATE ON "public"."exam_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score"();



CREATE OR REPLACE TRIGGER "update_score_on_exam_progress" AFTER INSERT OR UPDATE ON "public"."exam_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "update_score_on_quiz" AFTER INSERT OR UPDATE ON "public"."quiz_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score"();



CREATE OR REPLACE TRIGGER "update_score_on_quiz_results" AFTER INSERT ON "public"."quiz_question_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "update_score_on_video" AFTER INSERT OR UPDATE ON "public"."video_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score"();



CREATE OR REPLACE TRIGGER "update_score_on_video_progress" AFTER INSERT OR UPDATE ON "public"."video_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "update_student_questions_log_updated_at" BEFORE UPDATE ON "public"."student_questions_log" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_support_requests_updated_at" BEFORE UPDATE ON "public"."support_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_video_activity_logs_updated_at" BEFORE UPDATE ON "public"."video_activity_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_video_progress_score" AFTER INSERT OR DELETE OR UPDATE ON "public"."video_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



CREATE OR REPLACE TRIGGER "update_videos_updated_at" BEFORE UPDATE ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "video_progress_score_trigger" AFTER INSERT OR UPDATE ON "public"."video_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_score_trigger"();



ALTER TABLE ONLY "public"."advice_tips"
    ADD CONSTRAINT "advice_tips_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."alumni_advice"
    ADD CONSTRAINT "alumni_advice_alumni_id_fkey" FOREIGN KEY ("alumni_id") REFERENCES "public"."alumni"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alumni_files"
    ADD CONSTRAINT "alumni_files_alumni_id_fkey" FOREIGN KEY ("alumni_id") REFERENCES "public"."alumni"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alumni_files"
    ADD CONSTRAINT "alumni_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."alumni_resources"
    ADD CONSTRAINT "alumni_resources_alumni_id_fkey" FOREIGN KEY ("alumni_id") REFERENCES "public"."alumni"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_alumni_id_fkey" FOREIGN KEY ("alumni_id") REFERENCES "public"."alumni"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_progress"
    ADD CONSTRAINT "exam_progress_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_progress"
    ADD CONSTRAINT "exam_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions_import"
    ADD CONSTRAINT "questions_import_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_question_results"
    ADD CONSTRAINT "quiz_question_results_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_students"
    ADD CONSTRAINT "school_students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_students"
    ADD CONSTRAINT "school_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "video_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "video_progress_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete all bookings" ON "public"."bookings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can delete alumni" ON "public"."alumni" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can delete exams" ON "public"."exams" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can delete profiles" ON "public"."profiles" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins can delete quizzes" ON "public"."quizzes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can delete school students" ON "public"."school_students" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can delete schools" ON "public"."schools" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can delete tips" ON "public"."advice_tips" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can delete videos" ON "public"."videos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can insert alumni" ON "public"."alumni" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can insert exams" ON "public"."exams" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can insert profiles" ON "public"."profiles" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert quizzes" ON "public"."quizzes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can insert school students" ON "public"."school_students" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can insert schools" ON "public"."schools" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can insert tips" ON "public"."advice_tips" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can insert videos" ON "public"."videos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can manage all subscriptions" ON "public"."profiles" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage alumni advice" ON "public"."alumni_advice" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can manage alumni files" ON "public"."alumni_files" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can manage questions_import" ON "public"."questions_import" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can read all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can read all support requests" ON "public"."support_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can see all support requests" ON "public"."support_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update all attempts" ON "public"."quiz_attempts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update all bookings" ON "public"."bookings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update all profiles" ON "public"."profiles" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can update alumni" ON "public"."alumni" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update exams" ON "public"."exams" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update quizzes" ON "public"."quizzes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update school students" ON "public"."school_students" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update schools" ON "public"."schools" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update subscription status" ON "public"."profiles" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update support requests" ON "public"."support_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update tips" ON "public"."advice_tips" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update videos" ON "public"."videos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all attempts" ON "public"."quiz_attempts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all bookings" ON "public"."bookings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all conversations" ON "public"."ai_learning_conversations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all exam activity" ON "public"."exam_activity_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all exam progress" ON "public"."exam_progress" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all points transactions" ON "public"."points_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all quiz results" ON "public"."quiz_question_results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all requests" ON "public"."support_requests" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all school students" ON "public"."school_students" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all student questions" ON "public"."student_questions_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all video activity" ON "public"."video_activity_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all video progress" ON "public"."video_progress" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view quizzes" ON "public"."quizzes" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view schools" ON "public"."schools" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins have full access to advice tips" ON "public"."advice_tips" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Allow alumni to manage their resources" ON "public"."alumni_resources" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Anyone can submit a support request" ON "public"."support_requests" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Authenticated users can read admin advice" ON "public"."admin_advice" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view alumni" ON "public"."alumni" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view alumni advice" ON "public"."alumni_advice" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view alumni files" ON "public"."alumni_files" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view alumni resources" ON "public"."alumni_resources" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view exams" ON "public"."exams" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view youtube videos" ON "public"."videos" FOR SELECT TO "authenticated" USING (("type" = 'youtube'::"public"."video_type"));



CREATE POLICY "Only admins can manage admin advice" ON "public"."admin_advice" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Premium users can view premium videos" ON "public"."videos" FOR SELECT USING ((("type" = 'premium'::"public"."video_type") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['premium'::"public"."user_role", 'admin'::"public"."user_role"])))))));



CREATE POLICY "Public tips are viewable by all authenticated users" ON "public"."advice_tips" FOR SELECT TO "authenticated" USING ((("active" = true) AND (("is_public" = true) OR ("target_user_id" = "auth"."uid"())) AND (("expiry_date" IS NULL) OR ("expiry_date" > "now"()))));



CREATE POLICY "Students can create attempts" ON "public"."quiz_attempts" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can create bookings" ON "public"."bookings" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can delete their exam progress" ON "public"."exam_progress" FOR DELETE USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can delete their video progress" ON "public"."video_progress" FOR DELETE USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can insert their exam activity" ON "public"."exam_activity_logs" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can insert their exam progress" ON "public"."exam_progress" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can insert their questions" ON "public"."student_questions_log" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can insert their video activity" ON "public"."video_activity_logs" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can insert their video progress" ON "public"."video_progress" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can update their exam progress" ON "public"."exam_progress" FOR UPDATE USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can update their questions" ON "public"."student_questions_log" FOR UPDATE USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can update their video progress" ON "public"."video_progress" FOR UPDATE USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their attempts" ON "public"."quiz_attempts" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their bookings" ON "public"."bookings" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their exam activity" ON "public"."exam_activity_logs" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their exam progress" ON "public"."exam_progress" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their points transactions" ON "public"."points_transactions" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their questions" ON "public"."student_questions_log" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their quiz results" ON "public"."quiz_question_results" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their school info" ON "public"."school_students" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their video activity" ON "public"."video_activity_logs" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their video progress" ON "public"."video_progress" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Users can create their own conversations" ON "public"."ai_learning_conversations" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create their own support requests" ON "public"."support_requests" FOR INSERT TO "authenticated" WITH CHECK (("email" IN ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can read their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own support requests" ON "public"."support_requests" FOR SELECT USING (("email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text"));



CREATE POLICY "Users can see their own support requests" ON "public"."support_requests" FOR SELECT TO "authenticated" USING (("email" IN ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own subscription status" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can view their own conversations" ON "public"."ai_learning_conversations" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own profile subscription" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own requests" ON "public"."support_requests" FOR SELECT USING (("email" = ("auth"."jwt"() ->> 'email'::"text")));



ALTER TABLE "public"."admin_advice" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advice_tips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_learning_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alumni" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alumni_advice" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alumni_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alumni_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."points_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions_import" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_question_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."school_students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_questions_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































REVOKE ALL ON FUNCTION "public"."calculate_user_score"("user_id_param" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_user_score"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_expired_tips"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_expired_tips"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_expired_tips"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_profile_privileges"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_profile_privileges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_profile_privileges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_booking_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_booking_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_booking_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_exam_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_exam_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_exam_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_video_completion_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_video_completion_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_video_completion_points"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_points_transaction"("p_student_id" "uuid", "p_points" integer, "p_source_type" "text", "p_source_id" "uuid", "p_source_description" "text", "p_subject" "text", "p_chapter" "text", "p_quiz_type" "text", "p_question_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_points_transaction"("p_student_id" "uuid", "p_points" integer, "p_source_type" "text", "p_source_id" "uuid", "p_source_description" "text", "p_subject" "text", "p_chapter" "text", "p_quiz_type" "text", "p_question_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_points_transaction"("p_student_id" "uuid", "p_points" integer, "p_source_type" "text", "p_source_id" "uuid", "p_source_description" "text", "p_subject" "text", "p_chapter" "text", "p_quiz_type" "text", "p_question_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_quiz_attempt"("p_attempt_id" "uuid", "p_answers" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_quiz_attempt"("p_attempt_id" "uuid", "p_answers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_quiz_attempt"("p_attempt_id" "uuid", "p_answers" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_subscription_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_subscription_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_subscription_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_user_score"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_user_score"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_user_score"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_student_total_score"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_student_total_score"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_user_score"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_user_score"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_score_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_score_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_score_trigger"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_advice" TO "anon";
GRANT ALL ON TABLE "public"."admin_advice" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_advice" TO "service_role";



GRANT ALL ON TABLE "public"."advice_tips" TO "anon";
GRANT ALL ON TABLE "public"."advice_tips" TO "authenticated";
GRANT ALL ON TABLE "public"."advice_tips" TO "service_role";



GRANT ALL ON TABLE "public"."ai_learning_conversations" TO "anon";
GRANT ALL ON TABLE "public"."ai_learning_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_learning_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."alumni" TO "anon";
GRANT ALL ON TABLE "public"."alumni" TO "authenticated";
GRANT ALL ON TABLE "public"."alumni" TO "service_role";



GRANT ALL ON TABLE "public"."alumni_advice" TO "anon";
GRANT ALL ON TABLE "public"."alumni_advice" TO "authenticated";
GRANT ALL ON TABLE "public"."alumni_advice" TO "service_role";



GRANT ALL ON TABLE "public"."alumni_files" TO "anon";
GRANT ALL ON TABLE "public"."alumni_files" TO "authenticated";
GRANT ALL ON TABLE "public"."alumni_files" TO "service_role";



GRANT ALL ON TABLE "public"."alumni_resources" TO "anon";
GRANT ALL ON TABLE "public"."alumni_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."alumni_resources" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."exam_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."exam_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."exam_progress" TO "anon";
GRANT ALL ON TABLE "public"."exam_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_progress" TO "service_role";



GRANT ALL ON TABLE "public"."exams" TO "anon";
GRANT ALL ON TABLE "public"."exams" TO "authenticated";
GRANT ALL ON TABLE "public"."exams" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."points_transactions" TO "anon";
GRANT ALL ON TABLE "public"."points_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."points_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."questions_import" TO "anon";
GRANT ALL ON TABLE "public"."questions_import" TO "authenticated";
GRANT ALL ON TABLE "public"."questions_import" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_question_results" TO "anon";
GRANT ALL ON TABLE "public"."quiz_question_results" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_question_results" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes_public" TO "anon";
GRANT ALL ON TABLE "public"."quizzes_public" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes_public" TO "service_role";



GRANT ALL ON TABLE "public"."school_students" TO "anon";
GRANT ALL ON TABLE "public"."school_students" TO "authenticated";
GRANT ALL ON TABLE "public"."school_students" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."student_questions_log" TO "anon";
GRANT ALL ON TABLE "public"."student_questions_log" TO "authenticated";
GRANT ALL ON TABLE "public"."student_questions_log" TO "service_role";



GRANT ALL ON TABLE "public"."support_requests" TO "anon";
GRANT ALL ON TABLE "public"."support_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."support_requests" TO "service_role";



GRANT ALL ON TABLE "public"."video_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."video_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."video_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."video_progress" TO "anon";
GRANT ALL ON TABLE "public"."video_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."video_progress" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

































-- ============================================================================
-- Storage buckets and policies
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('documents',    'documents',    false),
  ('alumni-files', 'alumni-files', true)
ON CONFLICT (id) DO NOTHING;

-- The 'avatars' bucket is deliberately NOT recreated: it was public with
-- write policies that gated on nothing but the bucket name, so anyone could
-- upload to and delete from the project's own storage origin. Nothing in
-- src/ references it.

CREATE POLICY "Admins can delete alumni files" ON storage.objects FOR DELETE TO public
  USING (((bucket_id = 'alumni-files'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((public.profiles.user_id = auth.uid()) AND (public.profiles.role = 'admin'::public.user_role))))));
CREATE POLICY "Admins can delete documents" ON storage.objects FOR DELETE TO public
  USING (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((public.profiles.user_id = auth.uid()) AND (public.profiles.role = 'admin'::public.user_role))))));
CREATE POLICY "Admins can update alumni files" ON storage.objects FOR UPDATE TO public
  USING (((bucket_id = 'alumni-files'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((public.profiles.user_id = auth.uid()) AND (public.profiles.role = 'admin'::public.user_role))))));
CREATE POLICY "Admins can update documents" ON storage.objects FOR UPDATE TO public
  USING (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((public.profiles.user_id = auth.uid()) AND (public.profiles.role = 'admin'::public.user_role))))));
CREATE POLICY "Admins can upload alumni files" ON storage.objects FOR INSERT TO public
  WITH CHECK (((bucket_id = 'alumni-files'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((public.profiles.user_id = auth.uid()) AND (public.profiles.role = 'admin'::public.user_role))))));
CREATE POLICY "Admins can upload documents" ON storage.objects FOR INSERT TO public
  WITH CHECK (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((public.profiles.user_id = auth.uid()) AND (public.profiles.role = 'admin'::public.user_role))))));
CREATE POLICY "Admins can view all documents" ON storage.objects FOR SELECT TO public
  USING (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((public.profiles.user_id = auth.uid()) AND (public.profiles.role = 'admin'::public.user_role))))));
CREATE POLICY "Anyone can view alumni files" ON storage.objects FOR SELECT TO public
  USING ((bucket_id = 'alumni-files'::text));
CREATE POLICY "Students can view documents" ON storage.objects FOR SELECT TO public
  USING (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((public.profiles.user_id = auth.uid()) AND (public.profiles.role = ANY (ARRAY['student'::public.user_role, 'premium'::public.user_role, 'admin'::public.user_role])))))));


-- ============================================================================
-- Things `supabase db dump` does not capture
--
-- Two gaps, both found by rebuilding from this file and running the security
-- suites against the result. Keep this section in sync by hand.
-- ============================================================================

-- 1. TRIGGERS OUTSIDE `public`.
--    The dump covers the public schema only, so the trigger that creates a
--    profile row for every new auth user was lost. Without it, sign-up
--    succeeds and the user has no profile: the app then bounces them to
--    /login forever.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

--    The second one lives in 20260920000000_score_integrity.sql and belongs
--    here at the next squash: `on_auth_user_email_changed` mirrors a confirmed
--    email change into profiles.email, which the guard trigger otherwise pins.
--    Lose it and a student who changes their email keeps the old one on the
--    admin roster and on their premium receipt, forever.

-- 2. REVOKES.
--    The dump re-emits Supabase's default `GRANT ... TO anon, authenticated`
--    for every function and drops explicit revokes, which silently reopened
--    the holes the security work closed. calculate_user_score in particular is
--    SECURITY DEFINER, takes a caller-supplied uuid, and rewrites that user's
--    total_score — it was callable by anon.
REVOKE ALL ON FUNCTION public.calculate_user_score(uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN ('update_user_score', 'update_student_total_score',
                        'recalculate_all_user_scores', 'update_user_score_trigger')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
  END LOOP;
END $$;

-- anon may not spend points or grade a quiz
REVOKE ALL ON FUNCTION public.record_points_transaction(
  uuid, integer, text, uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_points_transaction(
  uuid, integer, text, uuid, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

-- `quizzes` itself is admin-only; students read the view, which strips the
-- answer key. The dump grants the view to anon by default.
REVOKE ALL ON public.quizzes_public FROM PUBLIC, anon;
GRANT SELECT ON public.quizzes_public TO authenticated;

REVOKE ALL ON public.leaderboard FROM PUBLIC, anon;
GRANT SELECT ON public.leaderboard TO authenticated;

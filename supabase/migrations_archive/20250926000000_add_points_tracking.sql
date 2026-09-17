-- Create points_transactions table to track all points with source information
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source_type TEXT NOT NULL, -- 'video', 'quiz', 'exam', 'booking'
  source_id UUID, -- video_id, quiz_id, exam_id, or booking_id
  source_description TEXT, -- Human-readable description (e.g., "Video: Limits", "Quiz: Math Practice Q1")
  subject TEXT,
  chapter TEXT,
  quiz_type TEXT, -- 'daily' or 'practice' for quiz sources
  question_id TEXT, -- For quiz question sources
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhance quiz_question_results table to include quiz metadata
ALTER TABLE public.quiz_question_results 
ADD COLUMN IF NOT EXISTS quiz_type TEXT,
ADD COLUMN IF NOT EXISTS quiz_subject TEXT,
ADD COLUMN IF NOT EXISTS quiz_chapter TEXT,
ADD COLUMN IF NOT EXISTS quiz_id UUID,
ADD COLUMN IF NOT EXISTS selected_choice_index INTEGER, -- Store the index (0, 1, 2, 3) of the selected choice
ADD COLUMN IF NOT EXISTS question_number INTEGER; -- Store the question number in the quiz

-- Add foreign key constraint for quiz_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quiz_question_results_quiz_id_fkey'
  ) THEN
    ALTER TABLE public.quiz_question_results DROP CONSTRAINT IF EXISTS quiz_question_results_quiz_id_fkey;
ALTER TABLE public.quiz_question_results ADD CONSTRAINT quiz_question_results_quiz_id_fkey
    FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_points_transactions_student_id ON public.points_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_source_type ON public.points_transactions(source_type);
CREATE INDEX IF NOT EXISTS idx_points_transactions_source_id ON public.points_transactions(source_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON public.points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_transactions_subject ON public.points_transactions(subject);
CREATE INDEX IF NOT EXISTS idx_quiz_question_results_quiz_type ON public.quiz_question_results(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quiz_question_results_quiz_subject ON public.quiz_question_results(quiz_subject);
CREATE INDEX IF NOT EXISTS idx_quiz_question_results_quiz_id ON public.quiz_question_results(quiz_id);

-- Enable RLS on points_transactions
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for points_transactions
DROP POLICY IF EXISTS "Students can view their points transactions" ON public.points_transactions;
CREATE POLICY "Students can view their points transactions" 
ON public.points_transactions 
FOR SELECT 
USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert their own points transactions" ON public.points_transactions;
CREATE POLICY "Students can insert their own points transactions" 
ON public.points_transactions 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all points transactions" ON public.points_transactions;
CREATE POLICY "Admins can view all points transactions" 
ON public.points_transactions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Note: SECURITY DEFINER functions bypass RLS, so triggers will work correctly

-- Function to record points transaction
CREATE OR REPLACE FUNCTION public.record_points_transaction(
  p_student_id UUID,
  p_points INTEGER,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_source_description TEXT DEFAULT NULL,
  p_subject TEXT DEFAULT NULL,
  p_chapter TEXT DEFAULT NULL,
  p_quiz_type TEXT DEFAULT NULL,
  p_question_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transaction_id UUID;
BEGIN
  -- Validate inputs
  IF p_student_id IS NULL OR p_points IS NULL OR p_source_type IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters: student_id, points, and source_type are required';
  END IF;

  -- Only allow positive points
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'Points must be positive';
  END IF;

  INSERT INTO public.points_transactions (
    student_id,
    points,
    source_type,
    source_id,
    source_description,
    subject,
    chapter,
    quiz_type,
    question_id
  ) VALUES (
    p_student_id,
    p_points,
    p_source_type,
    p_source_id,
    p_source_description,
    p_subject,
    p_chapter,
    p_quiz_type,
    p_question_id
  ) RETURNING id INTO transaction_id;
  
  RETURN transaction_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error recording points transaction: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Trigger to record points when video is completed
CREATE OR REPLACE FUNCTION public.handle_video_completion_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create trigger for video points
DROP TRIGGER IF EXISTS trigger_video_completion_points ON public.video_progress;
CREATE TRIGGER trigger_video_completion_points
  AFTER INSERT OR UPDATE ON public.video_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_video_completion_points();

-- Trigger to record points when exam is viewed/solved
CREATE OR REPLACE FUNCTION public.handle_exam_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create trigger for exam points
DROP TRIGGER IF EXISTS trigger_exam_points ON public.exam_progress;
CREATE TRIGGER trigger_exam_points
  AFTER INSERT OR UPDATE ON public.exam_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_exam_points();

-- Trigger to record points when booking is created
CREATE OR REPLACE FUNCTION public.handle_booking_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create trigger for booking points
DROP TRIGGER IF EXISTS trigger_booking_points ON public.bookings;
CREATE TRIGGER trigger_booking_points
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_points();


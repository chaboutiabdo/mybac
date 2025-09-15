-- Create learning activity tracking tables

-- Table for detailed quiz question results
CREATE TABLE public.quiz_question_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  quiz_attempt_id UUID NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  student_answer TEXT,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_spent INTEGER, -- seconds spent on this question
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for video activity tracking
CREATE TABLE public.video_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  video_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'started', 'paused', 'resumed', 'completed'
  video_title TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT,
  position INTEGER DEFAULT 0, -- video position in seconds
  session_id UUID DEFAULT gen_random_uuid(), -- to group actions by session
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for exam selection activity
CREATE TABLE public.exam_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  exam_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'viewed', 'downloaded', 'started_solving', 'completed'
  exam_title TEXT NOT NULL,
  subject TEXT NOT NULL,
  year INTEGER NOT NULL,
  stream TEXT NOT NULL,
  difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for student questions and topics asked
CREATE TABLE public.student_questions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  topic TEXT,
  subject TEXT,
  context_type TEXT, -- 'quiz', 'video', 'exam', 'general'
  context_id UUID, -- ID of the quiz/video/exam if applicable
  ai_response TEXT,
  satisfaction_rating INTEGER, -- 1-5 rating of AI response
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tracking tables
ALTER TABLE public.quiz_question_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_questions_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_question_results
CREATE POLICY "Students can view their quiz results" 
ON public.quiz_question_results 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can insert their quiz results" 
ON public.quiz_question_results 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all quiz results" 
ON public.quiz_question_results 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- RLS policies for video_activity_logs
CREATE POLICY "Students can view their video activity" 
ON public.video_activity_logs 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can insert their video activity" 
ON public.video_activity_logs 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all video activity" 
ON public.video_activity_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- RLS policies for exam_activity_logs
CREATE POLICY "Students can view their exam activity" 
ON public.exam_activity_logs 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can insert their exam activity" 
ON public.exam_activity_logs 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all exam activity" 
ON public.exam_activity_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- RLS policies for student_questions_log
CREATE POLICY "Students can view their questions" 
ON public.student_questions_log 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can insert their questions" 
ON public.student_questions_log 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their questions" 
ON public.student_questions_log 
FOR UPDATE 
USING (student_id = auth.uid());

CREATE POLICY "Admins can view all student questions" 
ON public.student_questions_log 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Create indexes for better performance
CREATE INDEX idx_quiz_question_results_student_id ON public.quiz_question_results(student_id);
CREATE INDEX idx_quiz_question_results_quiz_attempt ON public.quiz_question_results(quiz_attempt_id);
CREATE INDEX idx_video_activity_student_id ON public.video_activity_logs(student_id);
CREATE INDEX idx_video_activity_video_id ON public.video_activity_logs(video_id);
CREATE INDEX idx_exam_activity_student_id ON public.exam_activity_logs(student_id);
CREATE INDEX idx_exam_activity_exam_id ON public.exam_activity_logs(exam_id);
CREATE INDEX idx_student_questions_student_id ON public.student_questions_log(student_id);
CREATE INDEX idx_student_questions_topic ON public.student_questions_log(topic);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_quiz_question_results_updated_at
BEFORE UPDATE ON public.quiz_question_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_activity_logs_updated_at
BEFORE UPDATE ON public.video_activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_activity_logs_updated_at
BEFORE UPDATE ON public.exam_activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_questions_log_updated_at
BEFORE UPDATE ON public.student_questions_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
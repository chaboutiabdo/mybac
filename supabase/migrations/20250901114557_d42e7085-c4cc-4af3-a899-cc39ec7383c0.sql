-- Create function to update user score with proper search path
CREATE OR REPLACE FUNCTION public.update_user_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create triggers to update scores
CREATE TRIGGER update_score_on_quiz
  AFTER INSERT OR UPDATE ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_user_score();

CREATE TRIGGER update_score_on_video
  AFTER INSERT OR UPDATE ON public.video_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_user_score();

CREATE TRIGGER update_score_on_exam
  AFTER INSERT OR UPDATE ON public.exam_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_user_score();

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alumni_updated_at BEFORE UPDATE ON public.alumni FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for testing

-- Insert sample exams
INSERT INTO public.exams (title, subject, stream, year, difficulty, questions) VALUES
('BAC Mathematics 2023 - Session 1', 'Mathematics', 'Sciences Exactes', 2023, 'hard', 25),
('BAC Physics 2023 - Practice Test', 'Physics', 'Sciences Exactes', 2023, 'medium', 30),
('BAC Chemistry 2022 - Session 2', 'Chemistry', 'Sciences Exactes', 2022, 'hard', 20),
('BAC Literature 2023 - Session 1', 'Literature', 'Lettres et Langues', 2023, 'medium', 15),
('BAC Philosophy 2023 - Session 2', 'Philosophy', 'Lettres et Langues', 2023, 'easy', 10);

-- Insert sample videos
INSERT INTO public.videos (title, subject, chapter, type, url, description) VALUES
('Limits and Continuity - Part 1', 'Mathematics', 'Limits', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Introduction to limits and continuity'),
('Derivatives Explained', 'Mathematics', 'Derivatives', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Basic derivatives and their applications'),
('Newton''s Laws of Motion', 'Physics', 'Mechanics', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Understanding Newton''s three laws'),
('Atomic Structure', 'Chemistry', 'Atoms', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Introduction to atomic structure'),
('Advanced Calculus Techniques', 'Mathematics', 'Integration', 'premium', NULL, 'Premium content on advanced integration methods');

-- Insert sample alumni
INSERT INTO public.alumni (name, bac_score, university, field_of_study, advice) VALUES
('Ahmed Benali', 18.75, 'USTHB', 'Computer Science', 'Focus on understanding concepts rather than memorizing. Practice daily and don''t hesitate to ask questions.'),
('Fatima Zahra', 19.25, 'University of Algiers', 'Medicine', 'Time management is crucial during BAC preparation. Create a study schedule and stick to it.'),
('Mohamed Amine', 17.50, 'ESI Algiers', 'Software Engineering', 'Mathematics is the foundation of many subjects. Master it early and everything else becomes easier.'),
('Yasmine Mokrani', 18.00, 'ENSTP', 'Civil Engineering', 'Don''t neglect the humanities subjects. They can make a significant difference in your overall score.');

-- Insert sample advice tips
INSERT INTO public.advice_tips (title, content, category, priority) VALUES
('Study Schedule', 'Create a realistic daily study schedule and stick to it. Include breaks and time for revision.', 'Study Tips', 1),
('Past Papers', 'Practice with past BAC papers regularly. They help you understand the exam format and time management.', 'Exam Preparation', 1),
('Group Study', 'Form study groups with classmates. Teaching others helps reinforce your own understanding.', 'Study Tips', 2),
('Health and Sleep', 'Maintain a healthy sleep schedule. Your brain needs rest to consolidate information effectively.', 'Wellness', 1),
('Stress Management', 'Practice relaxation techniques like deep breathing or meditation to manage exam stress.', 'Wellness', 2);

-- Insert sample daily quiz for today
INSERT INTO public.quizzes (type, subject, chapter, date, questions, max_score) VALUES
('daily', 'Mathematics', 'Limits', CURRENT_DATE, '[
  {
    "question": "What is the limit of (x²-1)/(x-1) as x approaches 1?",
    "options": ["0", "1", "2", "Undefined"],
    "correct": 2
  },
  {
    "question": "The derivative of x³ is:",
    "options": ["3x²", "x²", "3x", "x³"],
    "correct": 0
  }
]'::jsonb, 8);
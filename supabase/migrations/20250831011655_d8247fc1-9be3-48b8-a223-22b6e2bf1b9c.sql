-- Create RLS policies for all tables

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Anyone can view profiles for leaderboard" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Schools policies (admin only)
CREATE POLICY "Admins can manage schools" ON public.schools FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- School students policies
CREATE POLICY "Students can view their school info" ON public.school_students FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins can manage school students" ON public.school_students FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Exams policies
CREATE POLICY "Anyone can view exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Admins can manage exams" ON public.exams FOR INSERT, UPDATE, DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Quizzes policies
CREATE POLICY "Anyone can view quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Admins can manage quizzes" ON public.quizzes FOR INSERT, UPDATE, DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Quiz attempts policies
CREATE POLICY "Students can view their attempts" ON public.quiz_attempts FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can create attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admins can view all attempts" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Videos policies
CREATE POLICY "Anyone can view youtube videos" ON public.videos FOR SELECT USING (type = 'youtube');
CREATE POLICY "Premium users can view premium videos" ON public.videos FOR SELECT USING (
  type = 'premium' AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('premium', 'admin')
  )
);
CREATE POLICY "Admins can manage videos" ON public.videos FOR INSERT, UPDATE, DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Video progress policies
CREATE POLICY "Students can manage their progress" ON public.video_progress FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Admins can view all progress" ON public.video_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Exam progress policies
CREATE POLICY "Students can manage their exam progress" ON public.exam_progress FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Admins can view all exam progress" ON public.exam_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Alumni policies
CREATE POLICY "Anyone can view alumni" ON public.alumni FOR SELECT USING (true);
CREATE POLICY "Admins can manage alumni" ON public.alumni FOR INSERT, UPDATE, DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Bookings policies
CREATE POLICY "Students can view their bookings" ON public.bookings FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can create bookings" ON public.bookings FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Advice tips policies
CREATE POLICY "Anyone can view active tips" ON public.advice_tips FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage tips" ON public.advice_tips FOR INSERT, UPDATE, DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create function to update user score
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
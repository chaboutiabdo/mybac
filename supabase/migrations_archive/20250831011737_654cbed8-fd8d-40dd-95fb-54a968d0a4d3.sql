-- Create RLS policies for all tables

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Anyone can view profiles for leaderboard" ON public.profiles;
CREATE POLICY "Anyone can view profiles for leaderboard" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Schools policies (admin only)
DROP POLICY IF EXISTS "Admins can view schools" ON public.schools;
CREATE POLICY "Admins can view schools" ON public.schools FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can insert schools" ON public.schools;
CREATE POLICY "Admins can insert schools" ON public.schools FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update schools" ON public.schools;
CREATE POLICY "Admins can update schools" ON public.schools FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete schools" ON public.schools;
CREATE POLICY "Admins can delete schools" ON public.schools FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- School students policies
DROP POLICY IF EXISTS "Students can view their school info" ON public.school_students;
CREATE POLICY "Students can view their school info" ON public.school_students FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all school students" ON public.school_students;
CREATE POLICY "Admins can view all school students" ON public.school_students FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can insert school students" ON public.school_students;
CREATE POLICY "Admins can insert school students" ON public.school_students FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update school students" ON public.school_students;
CREATE POLICY "Admins can update school students" ON public.school_students FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete school students" ON public.school_students;
CREATE POLICY "Admins can delete school students" ON public.school_students FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Exams policies
DROP POLICY IF EXISTS "Anyone can view exams" ON public.exams;
CREATE POLICY "Anyone can view exams" ON public.exams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert exams" ON public.exams;
CREATE POLICY "Admins can insert exams" ON public.exams FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update exams" ON public.exams;
CREATE POLICY "Admins can update exams" ON public.exams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete exams" ON public.exams;
CREATE POLICY "Admins can delete exams" ON public.exams FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Quizzes policies
DROP POLICY IF EXISTS "Anyone can view quizzes" ON public.quizzes;
CREATE POLICY "Anyone can view quizzes" ON public.quizzes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert quizzes" ON public.quizzes;
CREATE POLICY "Admins can insert quizzes" ON public.quizzes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update quizzes" ON public.quizzes;
CREATE POLICY "Admins can update quizzes" ON public.quizzes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete quizzes" ON public.quizzes;
CREATE POLICY "Admins can delete quizzes" ON public.quizzes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Quiz attempts policies
DROP POLICY IF EXISTS "Students can view their attempts" ON public.quiz_attempts;
CREATE POLICY "Students can view their attempts" ON public.quiz_attempts FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Students can create attempts" ON public.quiz_attempts;
CREATE POLICY "Students can create attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.quiz_attempts;
CREATE POLICY "Admins can view all attempts" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Videos policies
DROP POLICY IF EXISTS "Anyone can view youtube videos" ON public.videos;
CREATE POLICY "Anyone can view youtube videos" ON public.videos FOR SELECT USING (type = 'youtube');
DROP POLICY IF EXISTS "Premium users can view premium videos" ON public.videos;
CREATE POLICY "Premium users can view premium videos" ON public.videos FOR SELECT USING (
  type = 'premium' AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('premium', 'admin')
  )
);
DROP POLICY IF EXISTS "Admins can insert videos" ON public.videos;
CREATE POLICY "Admins can insert videos" ON public.videos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update videos" ON public.videos;
CREATE POLICY "Admins can update videos" ON public.videos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete videos" ON public.videos;
CREATE POLICY "Admins can delete videos" ON public.videos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Video progress policies
DROP POLICY IF EXISTS "Students can view their video progress" ON public.video_progress;
CREATE POLICY "Students can view their video progress" ON public.video_progress FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Students can insert their video progress" ON public.video_progress;
CREATE POLICY "Students can insert their video progress" ON public.video_progress FOR INSERT WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "Students can update their video progress" ON public.video_progress;
CREATE POLICY "Students can update their video progress" ON public.video_progress FOR UPDATE USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Students can delete their video progress" ON public.video_progress;
CREATE POLICY "Students can delete their video progress" ON public.video_progress FOR DELETE USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all video progress" ON public.video_progress;
CREATE POLICY "Admins can view all video progress" ON public.video_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Exam progress policies
DROP POLICY IF EXISTS "Students can view their exam progress" ON public.exam_progress;
CREATE POLICY "Students can view their exam progress" ON public.exam_progress FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Students can insert their exam progress" ON public.exam_progress;
CREATE POLICY "Students can insert their exam progress" ON public.exam_progress FOR INSERT WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "Students can update their exam progress" ON public.exam_progress;
CREATE POLICY "Students can update their exam progress" ON public.exam_progress FOR UPDATE USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Students can delete their exam progress" ON public.exam_progress;
CREATE POLICY "Students can delete their exam progress" ON public.exam_progress FOR DELETE USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all exam progress" ON public.exam_progress;
CREATE POLICY "Admins can view all exam progress" ON public.exam_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Alumni policies
DROP POLICY IF EXISTS "Anyone can view alumni" ON public.alumni;
CREATE POLICY "Anyone can view alumni" ON public.alumni FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert alumni" ON public.alumni;
CREATE POLICY "Admins can insert alumni" ON public.alumni FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update alumni" ON public.alumni;
CREATE POLICY "Admins can update alumni" ON public.alumni FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete alumni" ON public.alumni;
CREATE POLICY "Admins can delete alumni" ON public.alumni FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Bookings policies
DROP POLICY IF EXISTS "Students can view their bookings" ON public.bookings;
CREATE POLICY "Students can view their bookings" ON public.bookings FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Students can create bookings" ON public.bookings;
CREATE POLICY "Students can create bookings" ON public.bookings FOR INSERT WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
CREATE POLICY "Admins can update all bookings" ON public.bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete all bookings" ON public.bookings;
CREATE POLICY "Admins can delete all bookings" ON public.bookings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Advice tips policies
DROP POLICY IF EXISTS "Anyone can view active tips" ON public.advice_tips;
CREATE POLICY "Anyone can view active tips" ON public.advice_tips FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "Admins can insert tips" ON public.advice_tips;
CREATE POLICY "Admins can insert tips" ON public.advice_tips FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update tips" ON public.advice_tips;
CREATE POLICY "Admins can update tips" ON public.advice_tips FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can delete tips" ON public.advice_tips;
CREATE POLICY "Admins can delete tips" ON public.advice_tips FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
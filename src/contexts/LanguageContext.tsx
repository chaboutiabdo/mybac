import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    // Navigation
    home: 'Home',
    quizzes: 'Quizzes',
    exams: 'Exams',
    videos: 'Videos',
    aiLearn: 'AI Learn',
    alumni: 'Alumni',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Log out',
    
    // Hero Section
    madeForAlgerianStudents: '🇩🇿 Made for Algerian Students',
    aceYourBacExam: 'Ace Your BAC Exam with AI',
    heroDescription: 'Master your BAC preparation with AI-powered quizzes, expert solutions, and personalized learning paths designed for Algerian curriculum.',
    startDailyQuiz: 'Start Daily Quiz',
    watchVideos: 'Watch Videos',
    studentsCount: '10,000+ Students',
    pastExams: '500+ Past Exams',
    successRate: '98% Success Rate',
    
    // Stats & Dashboard
    totalScore: 'Total Score',
    pointsEarned: 'Points earned',
    quizzesCompleted: 'Quizzes Completed',
    dailyAndPractice: 'Daily & practice',
    examsSolved: 'Exams Solved',
    pastBacPapers: 'Past BAC papers',
    studyStreak: 'Study Streak',
    daysInARow: 'Days in a row',
    thisWeek: 'this week',
    
    // Quick Actions
    dailyQuiz: 'Daily Quiz',
    today: 'Today',
    progress: 'Progress',
    questionsRemaining: 'questions remaining',
    continueQuiz: 'Continue Quiz',
    recommendedForYou: 'Recommended for You',
    limitsAndContinuity: 'Limits and Continuity',
    mathChapter3: 'Math - Chapter 3',
    bac2023MathExam: 'BAC 2023 Math Exam',
    practiceTest: 'Practice Test',
    study: 'Study',
    practice: 'Practice',
    recentActivity: 'Recent Activity',
    completedPhysicsQuiz: 'Completed Physics Quiz',
    watchedDerivativesVideo: 'Watched Derivatives video',
    solved2022BacExam: 'Solved 2022 BAC Exam',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    alumniSpotlight: 'Alumni Spotlight',
    bacScore: 'BAC Score',
    medicineStudent: 'Medicine Student',
    alumniQuote: '"Focus on understanding concepts, not just memorizing. The BAC tests your thinking skills!"',
    connectWithAlumni: 'Connect with Alumni',
    
    // Leaderboard
    topStudents: 'Top Students',
    
    // Quiz Page
    quizCenter: 'Quiz Center',
    quizCenterDescription: 'Test your knowledge with AI-generated quizzes and track your progress',
    todaysQuiz: "Today's Quiz",
    dailyChallenge: 'Daily Challenge',
    overallProgress: 'Overall Progress',
    mathQuestions: 'Math Questions',
    physicsQuestions: 'Physics Questions',
    maxPoints: 'Max: 100 points',
    dailyQuizzes: 'Daily Quizzes',
    practiceQuizzes: 'Practice Quizzes',
    current: 'Current',
    currentScore: 'Current Score',
    continue: 'Continue',
    yesterday: 'Yesterday',
    completed: 'Completed',
    score: 'Score',
    review: 'Review',
    weeklyPerformance: 'Weekly Performance',
    averageScore: 'Average Score',
    weeklyPointsEarned: 'Points Earned',
    dayStreak: 'Day Streak',
    mathematics: 'Mathematics',
    physics: 'Physics',
    mixedReview: 'Mixed Review',
    practiceAllSubjects: 'All Subjects',
    questions: 'Questions',
    medium: 'Medium',
    easy: 'Easy',
    hard: 'Hard',
    startQuiz: 'Start Quiz',
    
    // Exams Page
    previousBacExams: 'Previous BAC Exams',
    previousBacExamsDescription: 'Practice with official past exams and get AI-powered solutions',
    filterExams: 'Filter Exams',
    selectStream: 'Select Stream',
    allStreams: 'All Streams',
    sciences: 'Sciences',
    math: 'Math',
    letters: 'Letters',
    selectSubject: 'Select Subject',
    examAllSubjects: 'All Subjects',
    chemistry: 'Chemistry',
    selectYear: 'Select Year',
    allYears: 'All Years',
    solved: 'Solved',
    new: 'New',
    stream: 'Stream',
    viewExam: 'View Exam',
    solution: 'Solution',
    solveWithAi: 'Solve with AI',
    
    // Videos Page
    educationalVideos: 'Educational Videos',
    educationalVideosDescription: 'Learn from structured video content and expert explanations',
    filterVideos: 'Filter Videos',
    selectChapter: 'Select Chapter',
    allChapters: 'All Chapters',
    limits: 'Limits',
    mechanics: 'Mechanics',
    derivatives: 'Derivatives',
    videoType: 'Video Type',
    allTypes: 'All Types',
    freeYoutube: 'Free (YouTube)',
    premium: 'Premium',
    free: 'Free',
    introductionToLimits: 'Introduction to Limits',
    advancedLimitTechniques: 'Advanced Limit Techniques',
    newtonsLawsExplained: "Newton's Laws Explained",
    problemSolvingInMechanics: 'Problem Solving in Mechanics',
    watchAgain: 'Watch Again',
    watchVideo: 'Watch Video',
    
    // Profile
    student: 'Student',
    rank: 'Rank',
    level: 'Level',
    learningProgress: 'Learning Progress',
    achievements: 'Achievements',
    videosWatched: 'Videos Watched',
    
    // Theme & Language
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    language: 'Language',
    english: 'English',
    arabic: 'العربية',
    
    // Common
    pts: 'pts',
    bronze: 'Bronze',
    firstQuiz: 'First Quiz',
    achieved: 'Achieved',
    videoWatcher: 'Video Watcher',
    topTen: 'Top 10',
    locked: 'Locked',
    min: 'min',
    hrs: 'hrs',
    mathem: 'Math',
    chem: 'Chemistry'
  },
  ar: {
    // Navigation
    home: 'الرئيسية',
    quizzes: 'اختبارات',
    exams: 'امتحانات',
    videos: 'فيديوهات',
    aiLearn: 'تعلم بالذكاء الاصطناعي',
    alumni: 'خريجين',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    logout: 'تسجيل خروج',
    
    // Hero Section
    madeForAlgerianStudents: '🇩🇿 مصمم للطلاب الجزائريين',
    aceYourBacExam: 'تفوق في امتحان البكالوريا بالذكاء الاصطناعي',
    heroDescription: 'اتقن التحضير لامتحان البكالوريا مع اختبارات مدعومة بالذكاء الاصطناعي وحلول خبراء ومسارات تعلم شخصية مصممة للمنهج الجزائري.',
    startDailyQuiz: 'ابدأ الاختبار اليومي',
    watchVideos: 'شاهد الفيديوهات',
    studentsCount: '+10,000 طالب',
    pastExams: '+500 امتحان سابق',
    successRate: '98% معدل نجاح',
    
    // Stats & Dashboard
    totalScore: 'النتيجة الإجمالية',
    pointsEarned: 'نقاط مكتسبة',
    quizzesCompleted: 'اختبارات مكتملة',
    dailyAndPractice: 'يومية وتدريبية',
    examsSolved: 'امتحانات محلولة',
    pastBacPapers: 'أوراق بكالوريا سابقة',
    studyStreak: 'سلسلة دراسية',
    daysInARow: 'أيام متتالية',
    thisWeek: 'هذا الأسبوع',
    
    // Quick Actions
    dailyQuiz: 'الاختبار اليومي',
    today: 'اليوم',
    progress: 'التقدم',
    questionsRemaining: 'أسئلة متبقية',
    continueQuiz: 'متابعة الاختبار',
    recommendedForYou: 'موصى لك',
    limitsAndContinuity: 'النهايات والاستمرارية',
    mathChapter3: 'رياضيات - الفصل 3',
    bac2023MathExam: 'امتحان الرياضيات بكالوريا 2023',
    practiceTest: 'اختبار تدريبي',
    study: 'دراسة',
    practice: 'تدريب',
    recentActivity: 'النشاط الأخير',
    completedPhysicsQuiz: 'أكمل اختبار الفيزياء',
    watchedDerivativesVideo: 'شاهد فيديو المشتقات',
    solved2022BacExam: 'حل امتحان بكالوريا 2022',
    hoursAgo: 'س مضت',
    daysAgo: 'ي مضت',
    alumniSpotlight: 'أضواء على الخريجين',
    bacScore: 'نتيجة البكالوريا',
    medicineStudent: 'طالب طب',
    alumniQuote: '"ركز على فهم المفاهيم وليس الحفظ فقط. البكالوريا تختبر مهارات التفكير لديك!"',
    connectWithAlumni: 'تواصل مع الخريجين',
    
    // Leaderboard
    topStudents: 'أفضل الطلاب',
    
    // Quiz Page
    quizCenter: 'مركز الاختبارات',
    quizCenterDescription: 'اختبر معلوماتك باختبارات مدعومة بالذكاء الاصطناعي وتتبع تقدمك',
    todaysQuiz: 'اختبار اليوم',
    dailyChallenge: 'التحدي اليومي',
    overallProgress: 'التقدم العام',
    mathQuestions: 'أسئلة الرياضيات',
    physicsQuestions: 'أسئلة الفيزياء',
    maxPoints: 'الحد الأقصى: 100 نقطة',
    dailyQuizzes: 'اختبارات يومية',
    practiceQuizzes: 'اختبارات تدريبية',
    current: 'حالي',
    currentScore: 'النتيجة الحالية',
    continue: 'متابعة',
    yesterday: 'أمس',
    completed: 'مكتمل',
    score: 'النتيجة',
    review: 'مراجعة',
    weeklyPerformance: 'الأداء الأسبوعي',
    averageScore: 'متوسط النتيجة',
    weeklyPointsEarned: 'نقاط مكتسبة',
    dayStreak: 'أيام متتالية',
    mathematics: 'الرياضيات',
    physics: 'الفيزياء',
    mixedReview: 'مراجعة مختلطة',
    practiceAllSubjects: 'جميع المواد',
    questions: 'أسئلة',
    medium: 'متوسط',
    easy: 'سهل',
    hard: 'صعب',
    startQuiz: 'ابدأ الاختبار',
    
    // Exams Page
    previousBacExams: 'امتحانات البكالوريا السابقة',
    previousBacExamsDescription: 'تدرب على امتحانات رسمية سابقة واحصل على حلول مدعومة بالذكاء الاصطناعي',
    filterExams: 'تصفية الامتحانات',
    selectStream: 'اختر الشعبة',
    allStreams: 'جميع الشعب',
    sciences: 'علوم',
    math: 'رياضيات',
    letters: 'آداب',
    selectSubject: 'اختر المادة',
    examAllSubjects: 'جميع المواد',
    chemistry: 'كيمياء',
    selectYear: 'اختر السنة',
    allYears: 'جميع السنوات',
    solved: 'محلول',
    new: 'جديد',
    stream: 'شعبة',
    viewExam: 'عرض الامتحان',
    solution: 'الحل',
    solveWithAi: 'حل بالذكاء الاصطناعي',
    
    // Videos Page
    educationalVideos: 'فيديوهات تعليمية',
    educationalVideosDescription: 'تعلم من محتوى فيديو منظم وشروحات خبراء',
    filterVideos: 'تصفية الفيديوهات',
    selectChapter: 'اختر الفصل',
    allChapters: 'جميع الفصول',
    limits: 'النهايات',
    mechanics: 'الميكانيكا',
    derivatives: 'المشتقات',
    videoType: 'نوع الفيديو',
    allTypes: 'جميع الأنواع',
    freeYoutube: 'مجاني (يوتيوب)',
    premium: 'مميز',
    free: 'مجاني',
    introductionToLimits: 'مقدمة في النهايات',
    advancedLimitTechniques: 'تقنيات النهايات المتقدمة',
    newtonsLawsExplained: 'شرح قوانين نيوتن',
    problemSolvingInMechanics: 'حل المسائل في الميكانيكا',
    watchAgain: 'شاهد مرة أخرى',
    watchVideo: 'شاهد الفيديو',
    
    // Profile
    student: 'طالب',
    rank: 'الترتيب',
    level: 'المستوى',
    learningProgress: 'التقدم التعليمي',
    achievements: 'الإنجازات',
    videosWatched: 'فيديوهات مشاهدة',
    
    // Theme & Language
    lightMode: 'الوضع الفاتح',
    darkMode: 'الوضع الداكن',
    language: 'اللغة',
    english: 'English',
    arabic: 'العربية',
    
    // Common
    pts: 'نقطة',
    bronze: 'برونزي',
    firstQuiz: 'أول اختبار',
    achieved: 'محقق',
    videoWatcher: 'مشاهد فيديو',
    topTen: 'أفضل 10',
    locked: 'مقفل',
    min: 'د',
    hrs: 'س',
    mathem: 'رياضيات',
    chem: 'كيمياء'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    return (stored as Language) || 'en';
  });

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
import { createContext, useContext, type ReactNode } from "react";

/**
 * Arabic-only.
 *
 * There used to be a parallel 141-key English dictionary and a `setLanguage`
 * switcher. The switcher was removed from the UI, so `en` became unreachable
 * except as a stale localStorage value that would silently render the app in
 * English with no way back. The dictionary is gone and the language is fixed.
 *
 * `dir="rtl"` and `lang="ar"` are set in index.html, so the first paint is
 * already correct and no effect is needed here.
 */

interface LanguageContextType {
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<string, string> = {
    // Navigation
    home: "الرئيسية",
    quizzes: "اختبارات",
    exams: "امتحانات",
    videos: "فيديوهات",
    aiLearn: "تعلم بالذكاء الاصطناعي",
    alumni: "خريجين",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    logout: "تسجيل خروج",

    // Hero Section
    madeForAlgerianStudents: "مصمم للطلاب الجزائريين",
    aceYourBacExam: "تفوق في امتحان البكالوريا بالذكاء الاصطناعي",
    heroDescription:
      "اتقن التحضير لامتحان البكالوريا مع اختبارات مدعومة بالذكاء الاصطناعي وحلول خبراء ومسارات تعلم شخصية مصممة للمنهج الجزائري.",
    startDailyQuiz: "ابدأ الاختبار اليومي",
    watchVideos: "شاهد الفيديوهات",
    studentsCount: "+10,000 طالب",
    pastExams: "+500 امتحان سابق",
    successRate: "98% معدل نجاح",

    // Stats & Dashboard
    totalScore: "النتيجة الإجمالية",
    pointsEarned: "نقاط مكتسبة",
    quizzesCompleted: "اختبارات مكتملة",
    dailyAndPractice: "يومية وتدريبية",
    examsSolved: "امتحانات محلولة",
    pastBacPapers: "أوراق بكالوريا سابقة",
    studyStreak: "سلسلة دراسية",
    daysInARow: "أيام متتالية",
    thisWeek: "هذا الأسبوع",

    // Quick Actions
    dailyQuiz: "الاختبار اليومي",
    today: "اليوم",
    progress: "التقدم",
    questionsRemaining: "أسئلة متبقية",
    continueQuiz: "متابعة الاختبار",
    recommendedForYou: "موصى لك",
    limitsAndContinuity: "النهايات والاستمرارية",
    mathChapter3: "رياضيات - الفصل 3",
    bac2023MathExam: "امتحان الرياضيات بكالوريا 2023",
    practiceTest: "اختبار تدريبي",
    study: "دراسة",
    practice: "تدريب",
    recentActivity: "النشاط الأخير",
    completedPhysicsQuiz: "أكمل اختبار الفيزياء",
    watchedDerivativesVideo: "شاهد فيديو المشتقات",
    solved2022BacExam: "حل امتحان بكالوريا 2022",
    hoursAgo: "س مضت",
    daysAgo: "ي مضت",
    alumniSpotlight: "أضواء على الخريجين",
    bacScore: "نتيجة البكالوريا",
    medicineStudent: "طالب طب",
    alumniQuote: '"ركز على فهم المفاهيم وليس الحفظ فقط. البكالوريا تختبر مهارات التفكير لديك!"',
    connectWithAlumni: "تواصل مع الخريجين",

    // Leaderboard
    topStudents: "أفضل الطلاب",

    // Quiz Page
    quizCenter: "مركز الاختبارات",
    quizCenterDescription: "اختبر معلوماتك باختبارات مدعومة بالذكاء الاصطناعي وتتبع تقدمك",
    todaysQuiz: "اختبار اليوم",
    dailyChallenge: "التحدي اليومي",
    overallProgress: "التقدم العام",
    mathQuestions: "أسئلة الرياضيات",
    physicsQuestions: "أسئلة الفيزياء",
    maxPoints: "الحد الأقصى: 100 نقطة",
    dailyQuizzes: "اختبارات يومية",
    practiceQuizzes: "اختبارات تدريبية",
    current: "حالي",
    currentScore: "النتيجة الحالية",
    continue: "متابعة",
    yesterday: "أمس",
    completed: "مكتمل",
    score: "النتيجة",
    review: "مراجعة",
    weeklyPerformance: "الأداء الأسبوعي",
    averageScore: "متوسط النتيجة",
    weeklyPointsEarned: "نقاط مكتسبة",
    dayStreak: "أيام متتالية",
    mathematics: "الرياضيات",
    physics: "الفيزياء",
    mixedReview: "مراجعة مختلطة",
    practiceAllSubjects: "جميع المواد",
    questions: "أسئلة",
    medium: "متوسط",
    easy: "سهل",
    hard: "صعب",
    startQuiz: "ابدأ الاختبار",

    // Exams Page
    previousBacExams: "امتحانات البكالوريا السابقة",
    previousBacExamsDescription:
      "تدرب على امتحانات رسمية سابقة واحصل على حلول مدعومة بالذكاء الاصطناعي",
    filterExams: "تصفية الامتحانات",
    selectStream: "اختر الشعبة",
    allStreams: "جميع الشعب",
    sciences: "علوم",
    math: "رياضيات",
    letters: "آداب",
    selectSubject: "اختر المادة",
    examAllSubjects: "جميع المواد",
    chemistry: "كيمياء",
    selectYear: "اختر السنة",
    allYears: "جميع السنوات",
    solved: "محلول",
    new: "جديد",
    stream: "شعبة",
    viewExam: "عرض الامتحان",
    solution: "الحل",
    solveWithAi: "حل بالذكاء الاصطناعي",

    // Videos Page
    educationalVideos: "فيديوهات تعليمية",
    educationalVideosDescription: "تعلم من محتوى فيديو منظم وشروحات خبراء",
    filterVideos: "تصفية الفيديوهات",
    selectChapter: "اختر الفصل",
    allChapters: "جميع الفصول",
    limits: "النهايات",
    mechanics: "الميكانيكا",
    derivatives: "المشتقات",
    videoType: "نوع الفيديو",
    allTypes: "جميع الأنواع",
    freeYoutube: "مجاني (يوتيوب)",
    premium: "مميز",
    free: "مجاني",
    introductionToLimits: "مقدمة في النهايات",
    advancedLimitTechniques: "تقنيات النهايات المتقدمة",
    newtonsLawsExplained: "شرح قوانين نيوتن",
    problemSolvingInMechanics: "حل المسائل في الميكانيكا",
    watchAgain: "شاهد مرة أخرى",
    watchVideo: "شاهد الفيديو",

    // Profile
    student: "طالب",
    rank: "الترتيب",
    level: "المستوى",
    learningProgress: "التقدم التعليمي",
    achievements: "الإنجازات",
    videosWatched: "فيديوهات مشاهدة",

    // Theme & Language
    lightMode: "الوضع الفاتح",
    darkMode: "الوضع الداكن",
    language: "اللغة",
    english: "English",
    arabic: "العربية",

    // Common
    pts: "نقطة",
    bronze: "برونزي",
    firstQuiz: "أول اختبار",
    achieved: "محقق",
    videoWatcher: "مشاهد فيديو",
    topTen: "أفضل 10",
    locked: "مقفل",
    min: "د",
    hrs: "س",
    mathem: "رياضيات",
    chem: "كيمياء",
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/** Falls back to the key itself, which makes a missing translation visible. */
const t = (key: string): string => translations[key] ?? key;

const value: LanguageContextType = { t, isRTL: true };

export function LanguageProvider({ children }: { children: ReactNode }) {
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

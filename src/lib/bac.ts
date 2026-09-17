/**
 * Algerian BAC domain constants — front end only.
 *
 * Two jobs:
 *  1. Remove a real duplication. `mathChapters` / `physicsChapters` were
 *     copy-pasted verbatim into both Videos.tsx and LearnAI.tsx.
 *  2. Add what the app was missing entirely: the real stream list, per-stream
 *     coefficients, the /20 scale, and the exam countdown.
 */

/* ------------------------------------------------------------------ streams */

export interface Stream {
  /** stored value — matches what admin upload forms already write */
  value: string
  /** Arabic label, what students see */
  label: string
  /** French label, how the stream is named officially */
  fr: string
}

/**
 * The six Terminale streams. The codebase previously held three mutually
 * contradictory lists, and the student-facing filter on the exams page
 * contained only "الكل" — a decorative dropdown.
 */
export const STREAMS: Stream[] = [
  { value: "Sciences Expérimentales", label: "علوم تجريبية", fr: "Sciences Expérimentales" },
  { value: "Mathématiques", label: "رياضيات", fr: "Mathématiques" },
  { value: "Technique Mathématiques", label: "تقني رياضي", fr: "Technique Mathématiques" },
  { value: "Gestion Économie", label: "تسيير واقتصاد", fr: "Gestion et Économie" },
  { value: "Lettres et Philosophie", label: "آداب وفلسفة", fr: "Lettres et Philosophie" },
  { value: "Langues Étrangères", label: "لغات أجنبية", fr: "Langues Étrangères" },
]

export const streamLabel = (value?: string | null): string =>
  STREAMS.find((s) => s.value === value)?.label ?? value ?? "—"

/* ------------------------------------------------------- subjects & coefficients */

export interface Subject {
  value: string
  label: string
}

/** Only Math and Physics have content today; the rest are listed for filters. */
export const SUBJECTS: Subject[] = [
  { value: "Math", label: "الرياضيات" },
  { value: "Physics", label: "الفيزياء" },
  { value: "Science", label: "علوم الطبيعة والحياة" },
  { value: "Arabic", label: "اللغة العربية" },
  { value: "French", label: "الفرنسية" },
  { value: "English", label: "الإنجليزية" },
  { value: "Philosophy", label: "الفلسفة" },
  { value: "History", label: "التاريخ والجغرافيا" },
  { value: "Islamic", label: "العلوم الإسلامية" },
]

export const subjectLabel = (value?: string | null): string =>
  SUBJECTS.find((s) => s.value === value)?.label ?? value ?? "—"

/**
 * Per-stream subject coefficients (معاملات).
 *
 * NOTE: confirm against the current ONEC grid before relying on these for
 * anything beyond display — a wrong معامل is immediately obvious to a student.
 * Only the two streams the app actually serves content for are filled in.
 */
export const COEFFICIENTS: Record<string, Record<string, number>> = {
  "Sciences Expérimentales": {
    Math: 5, Physics: 5, Science: 6, Arabic: 3, French: 2,
    English: 2, Philosophy: 2, History: 2, Islamic: 2,
  },
  "Mathématiques": {
    Math: 7, Physics: 6, Science: 2, Arabic: 3, French: 2,
    English: 2, Philosophy: 2, History: 2, Islamic: 2,
  },
  "Technique Mathématiques": {
    Math: 6, Physics: 6, Arabic: 2, French: 2,
    English: 2, Philosophy: 2, History: 2, Islamic: 2,
  },
}

/** Coefficient for a subject in a stream, or null when unknown. */
export function coefficient(stream?: string | null, subject?: string | null): number | null {
  if (!stream || !subject) return null
  return COEFFICIENTS[stream]?.[subject] ?? null
}

/* --------------------------------------------------------------- BAC calendar */

/**
 * Start of the main BAC session (دورة عادية). Update once a year — ONEC
 * publishes the date each spring.
 */
export const BAC_DATE = new Date("2026-06-07T08:00:00+01:00")

/** Whole days until the exam; 0 once it has started. */
export function daysUntilBac(from: Date = new Date()): number {
  const ms = BAC_DATE.getTime() - from.getTime()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export const BAC_SESSION_LABEL = "دورة جوان 2026"

export const SESSIONS = [
  { value: "normale", label: "دورة عادية" },
  { value: "rattrapage", label: "دورة استدراكية" },
] as const

/* ------------------------------------------------------------------ grading */

/** Percentage (or points out of a max) shown on the BAC's /20 scale. */
export function outOf20(score: number, max: number): number {
  if (!max || max <= 0) return 0
  return Math.round((score / max) * 20 * 10) / 10
}

/** Formats a mark the way it appears on a bulletin: `14.5` , or `—`. */
export function formatMark(score?: number | null, max = 20): string {
  if (score === null || score === undefined) return "—"
  return outOf20(score, max).toFixed(2).replace(/\.?0+$/, "")
}

/* ------------------------------------------------------------------- chapters */

export interface Chapter {
  value: string
  label: string
}

/** Terminale mathematics programme, in curriculum order. */
export const MATH_CHAPTERS: Chapter[] = [
  { value: "derivatives", label: "الاشتقاقية والمشتقات" },
  { value: "exponential", label: "الدوال الأسية" },
  { value: "logarithmic", label: "الدوال اللوغاريتمية" },
  { value: "limits", label: "النهايات والمستقيمات المقاربة" },
  { value: "sequences", label: "المتتاليات العددية" },
  { value: "integration", label: "التكامل والحساب التكاملي" },
  { value: "integers", label: "الحساب في مجموعة الأعداد الصحيحة ℤ" },
  { value: "probability", label: "الاحتمالات والإحصاء" },
  { value: "complex", label: "الأعداد المركبة والتحويلات" },
  { value: "geometry", label: "الهندسة في الفضاء" },
]

/** Terminale physics programme — the six official unit titles. */
export const PHYSICS_CHAPTERS: Chapter[] = [
  { value: "chemical_tracking", label: "المتابعة الزمنية لتحول كيميائي" },
  { value: "mechanical_evolution", label: "تطور جملة ميكانيكياً" },
  { value: "electrical_phenomena", label: "دراسة ظواهر كهربائية" },
  { value: "chemical_equilibrium", label: "تطور جملة كيميائية نحو حالة التوازن" },
  { value: "nuclear_transformations", label: "دراسة التحولات النووية" },
  { value: "chemical_monitoring", label: "مراقبة تطور جملة كيميائية" },
]

export const chaptersFor = (subject?: string | null): Chapter[] =>
  subject === "Math" ? MATH_CHAPTERS : subject === "Physics" ? PHYSICS_CHAPTERS : []

export const chapterLabel = (value?: string | null): string =>
  [...MATH_CHAPTERS, ...PHYSICS_CHAPTERS].find((c) => c.value === value)?.label ?? value ?? "—"

/* ---------------------------------------------------------------------- dates */

/** Algeria uses Gregorian months; `ar-SA` would render Hijri-flavoured output. */
export const formatDateDZ = (value: string | number | Date): string =>
  new Date(value).toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

/** Exam years present in the archive, newest first. */
export const EXAM_YEARS = Array.from({ length: 18 }, (_, i) => 2025 - i)

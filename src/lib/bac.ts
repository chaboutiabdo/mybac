/**
 * Algerian BAC domain constants — front end only.
 *
 * Two jobs:
 *  1. Remove a real duplication. `mathChapters` / `physicsChapters` were
 *     copy-pasted verbatim into both Videos.tsx and LearnAI.tsx.
 *  2. Add what the app was missing entirely: the real stream list, per-stream
 *     coefficients, the /20 scale, and the exam countdown.
 */

/* -------------------------------------------------------------------- tones */

/**
 * The six category colours of the design. A stream or subject keeps the same
 * tone on every page. Class names are spelled out in full so Tailwind sees
 * them — never build them with string concatenation.
 */
export type Tone = "pink" | "mint" | "lav" | "peach" | "sage" | "sky"

export const TONE_BG: Record<Tone, string> = {
  pink: "bg-tone-pink",
  mint: "bg-tone-mint",
  lav: "bg-tone-lav",
  peach: "bg-tone-peach",
  sage: "bg-tone-sage",
  sky: "bg-tone-sky",
}

export const TONE_BG_STRONG: Record<Tone, string> = {
  pink: "bg-tone-pink-strong",
  mint: "bg-tone-mint-strong",
  lav: "bg-tone-lav-strong",
  peach: "bg-tone-peach-strong",
  sage: "bg-tone-sage-strong",
  sky: "bg-tone-sky-strong",
}

/* ------------------------------------------------------------------ streams */

export interface Stream {
  /** stored value — matches what admin upload forms already write */
  value: string
  /** Arabic label, what students see */
  label: string
  /** French label, how the stream is named officially */
  fr: string
  tone: Tone
}

/**
 * The six Terminale streams. The codebase previously held three mutually
 * contradictory lists, and the student-facing filter on the exams page
 * contained only "الكل" — a decorative dropdown.
 */
export const STREAMS: Stream[] = [
  { value: "Sciences Expérimentales", label: "علوم تجريبية", fr: "Sciences Expérimentales", tone: "pink" },
  { value: "Mathématiques", label: "رياضيات", fr: "Mathématiques", tone: "lav" },
  { value: "Technique Mathématiques", label: "تقني رياضي", fr: "Technique Mathématiques", tone: "sky" },
  { value: "Gestion Économie", label: "تسيير واقتصاد", fr: "Gestion et Économie", tone: "mint" },
  { value: "Lettres et Philosophie", label: "آداب وفلسفة", fr: "Lettres et Philosophie", tone: "peach" },
  { value: "Langues Étrangères", label: "لغات أجنبية", fr: "Langues Étrangères", tone: "sage" },
]

export const streamLabel = (value?: string | null): string =>
  STREAMS.find((s) => s.value === value)?.label ?? value ?? "—"

export const streamTone = (value?: string | null): Tone =>
  STREAMS.find((s) => s.value === value)?.tone ?? "sage"

/* ------------------------------------------------------- subjects & coefficients */

export interface Subject {
  value: string
  label: string
  tone: Tone
}

/** Only Math and Physics have content today; the rest are listed for filters. */
export const SUBJECTS: Subject[] = [
  { value: "Math", label: "الرياضيات", tone: "lav" },
  { value: "Physics", label: "الفيزياء", tone: "pink" },
  { value: "Science", label: "علوم الطبيعة والحياة", tone: "mint" },
  { value: "Arabic", label: "اللغة العربية", tone: "peach" },
  { value: "French", label: "الفرنسية", tone: "sky" },
  { value: "English", label: "الإنجليزية", tone: "sage" },
  { value: "Philosophy", label: "الفلسفة", tone: "peach" },
  { value: "History", label: "التاريخ والجغرافيا", tone: "sage" },
  { value: "Islamic", label: "العلوم الإسلامية", tone: "sage" },
]

export const subjectLabel = (value?: string | null): string =>
  SUBJECTS.find((s) => s.value === value)?.label ?? value ?? "—"

export const subjectTone = (value?: string | null): Tone =>
  SUBJECTS.find((s) => s.value === value)?.tone ?? "sage"

/** Exam difficulty as stored (`easy` / `medium` / `hard`), in Arabic. */
export const difficultyLabel = (value?: string | null): string =>
  ({ easy: "سهل", medium: "متوسط", hard: "صعب" } as Record<string, string>)[value ?? ""] ?? value ?? "—"

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
 * Start of the next main BAC session (دورة عادية). Update once a year — ONEC
 * publishes the date each spring. 2027 is an ESTIMATE (the first Sunday of
 * June, as in 2026) until then. EXAM_YEARS below follows this date.
 */
export const BAC_DATE = new Date("2027-06-06T08:00:00+01:00")

/** Whole days until the exam; 0 once it has started. */
export function daysUntilBac(from: Date = new Date()): number {
  const ms = BAC_DATE.getTime() - from.getTime()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export const BAC_SESSION_LABEL = "دورة جوان 2027"

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

/**
 * Exam years in the archive, newest first: every session held before the one
 * BAC_DATE points at. A hard-coded 2025 here kept the 2026 papers out of both
 * the upload form and the student filter.
 */
const LAST_HELD_SESSION = BAC_DATE.getFullYear() - 1
export const EXAM_YEARS = Array.from({ length: LAST_HELD_SESSION - 2007 }, (_, i) => LAST_HELD_SESSION - i)

/**
 * Admin panel sections.
 *
 * Lives here rather than in the page so the sidebar can import it without a
 * component depending on a page. Each id is also the URL segment: /admin/students
 */
export const ADMIN_SECTIONS = [
  "overview",
  "students",
  "schools",
  "videos",
  "exams",
  "quizzes",
  "advice",
  "tips",
  "subscriptions",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const isAdminSection = (value: string | undefined): value is AdminSection =>
  !!value && (ADMIN_SECTIONS as readonly string[]).includes(value);

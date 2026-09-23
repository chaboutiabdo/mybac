import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { MATH_CHAPTERS, PHYSICS_CHAPTERS, subjectLabel } from "@/lib/bac";
import { errorMessage } from "@/lib/utils";

// Mirrors get_chapter_mastery()'s RETURNS TABLE exactly — see
// supabase/migrations/20260919130000_chapter_mastery.sql for the formula.
export type ChapterMasteryRow = Database["public"]["Functions"]["get_chapter_mastery"]["Returns"][number];

export interface ChapterMastery {
  subject: string;
  chapter: string;
  label: string;
  /** false = never attempted. When false, the four fields below are all 0 and mean nothing — render "no data", never "0%". */
  hasData: boolean;
  attempted: number;
  correct: number;
  activeMistakes: number;
  masteryPct: number;
}

export interface SubjectMastery {
  subject: string;
  label: string;
  chapters: ChapterMastery[];
  /** unweighted mean masteryPct across this subject's touched chapters; null when none are touched yet */
  overallPct: number | null;
}

const SUBJECTS_WITH_CHAPTERS = [
  { value: "Math", chapters: MATH_CHAPTERS },
  { value: "Physics", chapters: PHYSICS_CHAPTERS },
];
const TOTAL_CHAPTERS = MATH_CHAPTERS.length + PHYSICS_CHAPTERS.length;

const average = (values: number[]): number | null =>
  values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;

/**
 * A chapter counts as weak below this. ONE definition, exported, because there
 * were three: /revision used < 70, while /weekly-report and the simulator
 * results took the bottom floor(touched/2) with no threshold at all — so a
 * student whose worst chapter was 92% saw it flagged red as "needs review",
 * and a student with a single chapter at 12% got no weak list and no
 * recommendation at all.
 */
export const WEAK_THRESHOLD = 70;
/** Above this a chapter is worth showing as a strength. */
export const STRONG_THRESHOLD = 80;

export interface UseChapterMasteryResult {
  subjects: SubjectMastery[];
  /** Chapters with real data below WEAK_THRESHOLD, worst first. */
  weakChapters: ChapterMastery[];
  /** Chapters with real data at/above STRONG_THRESHOLD, best first. */
  strongChapters: ChapterMastery[];
  /** unweighted mean masteryPct across every touched chapter, both subjects; null when nothing is touched yet */
  overallPct: number | null;
  touchedChapters: number;
  totalChapters: number;
  loading: boolean;
  error: string | null;
  /** answering a question changes mastery server-side; callers that cause
   *  that (the daily question, a finished quiz) must refresh it or the
   *  dashboard keeps showing the percentage from before the answer. */
  refetch: () => Promise<void>;
}

export const useChapterMastery = (): UseChapterMasteryResult => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectMastery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMastery = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc("get_chapter_mastery");
      if (rpcError) throw rpcError;

      const byKey = new Map((data ?? []).map((r) => [`${r.quiz_subject}:${r.quiz_chapter}`, r]));

      setSubjects(
        SUBJECTS_WITH_CHAPTERS.map(({ value, chapters }) => {
          const chapterList: ChapterMastery[] = chapters.map((c) => {
            const row = byKey.get(`${value}:${c.value}`);
            return {
              subject: value,
              chapter: c.value,
              label: c.label,
              hasData: !!row,
              attempted: row?.attempted ?? 0,
              correct: row?.correct ?? 0,
              activeMistakes: row?.active_mistakes ?? 0,
              masteryPct: row?.mastery_pct ?? 0,
            };
          });
          return {
            subject: value,
            label: subjectLabel(value),
            chapters: chapterList,
            overallPct: average(chapterList.filter((c) => c.hasData).map((c) => c.masteryPct)),
          };
        })
      );
    } catch (err) {
      console.error("Error fetching chapter mastery:", err);
      setError(errorMessage(err, "تعذّر تحميل مستوى إتقانك"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMastery();
  }, [fetchMastery]);

  const allChapters = subjects.flatMap((s) => s.chapters);
  const touched = allChapters.filter((c) => c.hasData);
  const touchedChapters = touched.length;

  // A chapter is weak or strong on its own merits, never because of where it
  // happens to sit in a sorted list — that ranking approach condemned a 92%
  // chapter whenever it was the worst of only two.
  const weakChapters = touched
    .filter((c) => c.masteryPct < WEAK_THRESHOLD)
    .sort((a, b) => a.masteryPct - b.masteryPct);
  const strongChapters = touched
    .filter((c) => c.masteryPct >= STRONG_THRESHOLD)
    .sort((a, b) => b.masteryPct - a.masteryPct);

  return {
    subjects,
    weakChapters,
    strongChapters,
    overallPct: average(allChapters.filter((c) => c.hasData).map((c) => c.masteryPct)),
    touchedChapters,
    totalChapters: TOTAL_CHAPTERS,
    loading,
    error,
    refetch: fetchMastery,
  };
};

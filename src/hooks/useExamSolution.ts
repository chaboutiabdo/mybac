import { useEffect, useState } from "react";
import { AI_SOLVE_TIMEOUT_MS, invokeAI } from "@/lib/ai";
import { errorMessage } from "@/lib/utils";

export interface SolutionStep {
  step: number;
  explanation: string;
  formula?: string;
}

export interface SolvedQuestion {
  question_number: string;
  title: string;
  steps: SolutionStep[];
  final_answer: string;
  key_concept: string;
  common_mistake?: string;
  memory_tip?: string;
}

export interface ExamSolutionResponse {
  solution: SolvedQuestion[];
  /**
   * 'solution_grounded': explained from the official corrigé.
   * 'derived': worked out from the paper alone — less reliable, and the page says so.
   */
  source: "solution_grounded" | "derived";
  cached: boolean;
  exam: { id: string; title: string; subject: string; stream: string; year: number };
}

/**
 * Hand-declared, not derived from src/integrations/supabase/types.ts: nothing
 * client-side ever reads `exam_ai_solutions` (it has no SELECT policy for
 * students, by design), so the table never reaches codegen and this shape is
 * the edge function's HTTP contract, not a table row.
 *
 * Fetch-on-mount. gemini-chat owns the caching, so there is nothing here to
 * memoise; `refetch` exists because a free-tier Google that is busy for two
 * minutes is often free again a minute later.
 */
export function useExamSolution(examId: string | undefined) {
  const [data, setData] = useState<ExamSolutionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // The generous deadline is this mode's own: the server gives up at ~128 s.
        const res = await invokeAI<ExamSolutionResponse>(
          { mode: "solve_exam", exam_id: examId },
          AI_SOLVE_TIMEOUT_MS,
        );
        if (!cancelled) setData(res);
      } catch (err) {
        console.error("Error solving exam:", err);
        if (!cancelled) setError(errorMessage(err, "تعذّر توليد حل هذا الموضوع"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [examId, attempt]);

  return { data, loading, error, refetch: () => setAttempt((n) => n + 1) };
}

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/utils";

/** Why the server picked this question — drives the line shown to the student. */
export type DailyQuestionReason = "repeated_mistake" | "weak_chapter" | "new_practice" | "balanced";

export interface DailyQuestion {
  id: string;
  quizId: string;
  questionId: string;
  questionText: string;
  /** Options only — the answer key never leaves the server before submission. */
  options: string[];
  subject: string;
  chapter: string | null;
  reason: DailyQuestionReason;
  answeredAt: string | null;
  isCorrect: boolean | null;
  studentAnswer: string | null;
  /**
   * Only populated once the question has been answered — the server withholds
   * it until then. Without this, answering wrong and refreshing destroyed the
   * right answer forever, on the one feature built to fix repeated mistakes.
   */
  correctAnswer: string | null;
}

export interface DailyQuestionResult {
  isCorrect: boolean;
  correctAnswer: string;
}

/**
 * Today's personalised question. The assignment is pinned server-side for the
 * whole day (daily_questions has a UNIQUE on student+date), so this hook can
 * fetch freely without re-rolling the question — and an already-answered state
 * survives a refresh because it lives in the database, not in component state.
 */
export function useDailyQuestion() {
  const { user } = useAuth();
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [result, setResult] = useState<DailyQuestionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc("get_or_create_daily_question");
        if (rpcError) throw rpcError;
        const row = Array.isArray(data) ? data[0] : data;
        if (cancelled) return;

        if (!row) {
          setQuestion(null);
          return;
        }
        setQuestion({
          id: row.id,
          quizId: row.quiz_id,
          questionId: row.question_id,
          questionText: row.question_text ?? "",
          options: Array.isArray(row.options) ? (row.options as string[]) : [],
          subject: row.quiz_subject ?? "",
          chapter: row.quiz_chapter ?? null,
          reason: (row.reason ?? "balanced") as DailyQuestionReason,
          answeredAt: row.answered_at,
          isCorrect: row.is_correct,
          studentAnswer: row.student_answer,
          correctAnswer: row.correct_answer,
        });
      } catch (err) {
        console.error("Error loading the daily question:", err);
        if (!cancelled) setError(errorMessage(err, "تعذّر تحميل سؤال اليوم"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const submit = useCallback(async (letter: string) => {
    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("submit_daily_question", {
        p_answer: letter,
      });
      if (rpcError) throw rpcError;
      const row = Array.isArray(data) ? data[0] : data;
      const outcome = { isCorrect: Boolean(row?.is_correct), correctAnswer: row?.correct_answer ?? "" };
      setResult(outcome);
      setQuestion((prev) =>
        prev
          ? {
              ...prev,
              answeredAt: new Date().toISOString(),
              isCorrect: outcome.isCorrect,
              studentAnswer: letter,
              correctAnswer: outcome.correctAnswer,
            }
          : prev
      );
      return outcome;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { question, result, loading, submitting, error, submit };
}

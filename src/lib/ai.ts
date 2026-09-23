import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * One way in to the `gemini-chat` edge function.
 *
 * Two things every AI call site needs and only some of them had:
 *
 * 1. The function's own Arabic error message. It answers 429 with
 *    «بلغت الحد اليومي للأسئلة» and 403 with the premium wall, but
 *    `supabase.functions.invoke` collapses every non-2xx into an opaque
 *    FunctionsHttpError. /learn-ai showed "خطأ في الاتصال" for all of them, so
 *    a student who had simply used up the daily quota was told the network was
 *    broken. useGenerateFlashcards already unwrapped this by hand; now
 *    everything does.
 *
 * 2. A deadline. `functions.invoke` has no timeout, and the function itself
 *    tries three models — up to 135 s for solve_exam — so a stalled call
 *    spins the UI with no way out.
 *
 * ponytail: FunctionInvokeOptions in functions-js 2.4.6 has no `signal`, so
 * this cannot actually abort the request — the upstream call keeps running and
 * still costs quota. It bounds what the STUDENT waits for, not what the server
 * does. Swap to a raw fetch against /functions/v1 if real cancellation is ever
 * worth the lost auth-header handling.
 */

/** Text modes: the server stops trying models after 55 s. */
export const AI_TIMEOUT_MS = 90_000;
/** solve_exam reads a whole PDF: the server stops trying after ~128 s. */
export const AI_SOLVE_TIMEOUT_MS = 150_000;

export async function invokeAI<T>(
  body: Record<string, unknown>,
  timeoutMs: number = AI_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("استغرق المساعد وقتاً أطول من المعتاد، حاول مرة أخرى.")),
      timeoutMs,
    );
  });

  try {
    const { data, error } = await Promise.race([
      supabase.functions.invoke("gemini-chat", { body }),
      deadline,
    ]);

    if (error) {
      if (error instanceof FunctionsHttpError) {
        const payload: { error?: string } | null = await error.context.json().catch(() => null);
        if (payload?.error) throw new Error(payload.error);
      }
      throw error;
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

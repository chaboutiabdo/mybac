import { useState } from "react";
import { invokeAI } from "@/lib/ai";
import type { Flashcard } from "@/hooks/useFlashcards";
import { errorMessage } from "@/lib/utils";

export function useGenerateFlashcards() {
  const [loading, setLoading] = useState(false);

  const generate = async (subject: string, chapter: string, count = 8): Promise<Flashcard[]> => {
    setLoading(true);
    try {
      // The error unwrapping this hook used to do by hand now lives in
      // invokeAI, so every AI call site gets it.
      const data = await invokeAI<{ flashcards?: Flashcard[] }>({
        mode: "generate_flashcards",
        subject,
        chapter,
        count,
      });
      return data?.flashcards ?? [];
    } catch (err) {
      throw new Error(errorMessage(err, "تعذّر توليد بطاقات جديدة"));
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading };
}

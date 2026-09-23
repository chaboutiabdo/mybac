import { useState } from "react";
import { invokeAI } from "@/lib/ai";
import { errorMessage } from "@/lib/utils";

export function useExplainMistake() {
  const [loading, setLoading] = useState(false);

  const explain = async (mistakeId: string): Promise<string> => {
    setLoading(true);
    try {
      // invokeAI surfaces the function's own Arabic message — the premium
      // wall and the daily quota both used to arrive here as a generic error.
      const data = await invokeAI<{ answer?: string }>({
        mode: "explain_mistake",
        mistake_id: mistakeId,
      });
      if (!data?.answer) throw new Error("تعذّر الحصول على شرح");
      return data.answer;
    } catch (err) {
      throw new Error(errorMessage(err, "تعذّر الحصول على شرح"));
    } finally {
      setLoading(false);
    }
  };

  return { explain, loading };
}

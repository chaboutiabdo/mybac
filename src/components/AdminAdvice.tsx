import { useEffect, useState } from "react";
import { Pin } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatDateDZ } from "@/lib/bac";

type AdminAdvice = Tables<"admin_advice">;

/** The admin's pinned message, as a sage announcement strip. */
const AdminAdvice = () => {
  const [advice, setAdvice] = useState<AdminAdvice | null>(null);

  useEffect(() => {
    supabase
      .from("admin_advice")
      .select("*")
      .eq("is_pinned", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("Error fetching admin advice:", error);
        setAdvice(data);
      });
  }, []);

  if (!advice) return null;

  return (
    <section className="flex gap-4 rounded-card bg-tone-sage p-5 shadow-soft">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card-raised/70">
        <Pin className="h-5 w-5" strokeWidth={1.8} aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-card-raised/70 px-2.5 py-0.5 text-[13px]">رسالة من الإدارة</span>
          {advice.created_at && (
            <span className="text-[13px] text-foreground/60">{formatDateDZ(advice.created_at)}</span>
          )}
        </div>
        <h3 className="mt-1.5 text-lg font-medium">{advice.title}</h3>
        <p className="mt-1 text-[15px] leading-relaxed text-foreground/75">{advice.content}</p>
      </div>
    </section>
  );
};

export default AdminAdvice;

import { useEffect, useState } from "react";
import { Clock, Crown, Lightbulb } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { TONE_BG, type Tone } from "@/lib/bac";
import { cn } from "@/lib/utils";

type AdviceTip = Tables<"advice_tips">;

const PRIORITY: Record<number, { label: string; tone: Tone }> = {
  3: { label: "عاجل", tone: "pink" },
  2: { label: "مهم", tone: "peach" },
  1: { label: "عادي", tone: "sage" },
};

const AdviceTips = () => {
  const [tips, setTips] = useState<AdviceTip[] | null>(null);
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  useEffect(() => {
    if (!user) return;

    let query = supabase.from("advice_tips").select("*").eq("active", true);
    // public tips, plus a premium student's own personalised ones
    query = isPremium
      ? query.or(`is_public.eq.true,target_user_id.eq.${user.id}`)
      : query.eq("is_public", true);

    query
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) console.error("Error fetching tips:", error);
        const now = new Date();
        setTips((data ?? []).filter((tip) => !tip.expiry_date || new Date(tip.expiry_date) > now));
      });
  }, [user, isPremium]);

  // nothing to say is better than an empty card
  if (!tips || tips.length === 0) return null;

  return (
    <section className="rounded-card bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tone-sage">
          <Lightbulb className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </span>
        <h2 className="text-lg font-medium">نصائح للمراجعة</h2>
      </div>

      <ul className="mt-4 space-y-2">
        {tips.map((tip) => {
          const priority = PRIORITY[tip.priority ?? 1] ?? PRIORITY[1];
          return (
            <li key={tip.id} className="rounded-2xl bg-card-raised p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="flex-1 text-[15px] font-medium">{tip.title}</h3>
                {!tip.is_public && tip.target_user_id && (
                  <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[13px] text-primary-foreground">
                    <Crown className="h-3 w-3" aria-hidden />
                    مخصّص لك
                  </span>
                )}
                <span className={cn("rounded-full px-2.5 py-0.5 text-[13px]", TONE_BG[priority.tone])}>
                  {priority.label}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">{tip.content}</p>
              {tip.expiry_date && (
                <p className="mt-2 flex items-center gap-1 text-[13px] text-muted-foreground">
                  <Clock className="h-3 w-3" aria-hidden />
                  حتى {new Date(tip.expiry_date).toLocaleDateString("ar-DZ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default AdviceTips;

import { CalendarDays } from "lucide-react";

import { BAC_SESSION_LABEL, daysUntilBac } from "@/lib/bac";
import { useCountUp } from "@/hooks/useCountUp";

/**
 * Days left until the BAC.
 *
 * This is one of the two elements allowed a glow (the other is the score in
 * the nav). It is the single most motivating number on the page.
 */
const BacCountdown = () => {
  const days = useCountUp(daysUntilBac());

  return (
    <div className="flex items-center gap-5">
      <div className="glow-gold relative text-center">
        <div className="font-display text-[52px] font-bold leading-none text-accent tabular">
          {days.toLocaleString("ar-DZ")}
        </div>
        <div className="mt-1 text-sm font-medium text-accent/80">يومًا</div>
      </div>
      <div className="h-14 w-px bg-gradient-to-b from-transparent via-border-gold/60 to-transparent" />
      <div className="text-base leading-relaxed">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-accent" aria-hidden />
          تبقّى على البكالوريا
        </div>
        <div className="text-muted-foreground tabular">{BAC_SESSION_LABEL}</div>
      </div>
    </div>
  );
};

export default BacCountdown;

import { Flame } from "lucide-react";

import { BAC_SESSION_LABEL, daysUntilBac } from "@/lib/bac";
import { useCountUp } from "@/hooks/useCountUp";

/** Days left until the BAC, as the mockup's ink chip. */
const BacCountdown = () => {
  const days = useCountUp(daysUntilBac());
  // Arabic counts 3–10 take the plural; the rest take the singular accusative
  const unit = days % 100 >= 3 && days % 100 <= 10 ? "أيام" : "يوماً";

  return (
    <div
      title={BAC_SESSION_LABEL}
      className="flex shrink-0 items-center gap-3 rounded-full bg-primary py-2 pe-5 ps-2 text-primary-foreground shadow-soft"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tone-pink text-foreground">
        <Flame className="h-4 w-4" fill="currentColor" strokeWidth={0} aria-hidden />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="tabular text-lg font-semibold">{days}</span>
        <span className="text-sm text-primary-foreground/70">{unit} على البكالوريا</span>
      </span>
    </div>
  );
};

export default BacCountdown;

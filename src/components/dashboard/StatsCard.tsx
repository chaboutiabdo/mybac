import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "accent";
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

// each variant wears one of the design's tones
const tone: Record<NonNullable<StatsCardProps["variant"]>, string> = {
  default: "bg-tone-sky",
  success: "bg-tone-mint",
  warning: "bg-tone-peach",
  accent: "bg-tone-lav",
};

const StatsCard = ({ title, value, subtitle, icon: Icon, variant = "default", trend }: StatsCardProps) => {
  // Numeric values count up on mount; "…" and marks like "14.5 / 20" do not.
  const numeric = typeof value === "number" ? value : null;
  const counted = useCountUp(numeric ?? 0);
  const shown = numeric === null ? value : counted.toLocaleString("ar-DZ");

  return (
    <div className="flex h-full flex-col rounded-card bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[15px] text-muted-foreground">{title}</span>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", tone[variant])}>
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </span>
      </div>

      <div className="mt-auto pt-5">
        <div className="tabular text-[40px] font-semibold leading-none tracking-tight">{shown}</div>
        {subtitle && <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>}
        {trend && (
          <p className={cn("tabular mt-2 text-sm font-medium", trend.isPositive ? "text-success" : "text-destructive")}>
            {trend.isPositive ? "+" : "−"}
            {trend.value}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatsCard;

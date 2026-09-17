import { Card, CardContent } from "@/components/ui/card";
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

const iconTone: Record<NonNullable<StatsCardProps["variant"]>, string> = {
  default: "text-muted-foreground",
  success: "text-success",
  warning: "text-accent",
  accent: "text-accent",
};

const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  trend,
}: StatsCardProps) => {
  // Numeric values count up on mount; "…" and marks like "14.5 / 20" do not.
  const numeric = typeof value === "number" ? value : null;
  const counted = useCountUp(numeric ?? 0);
  const shown = numeric === null ? value : counted.toLocaleString("ar-DZ");

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="rule-gold text-sm text-muted-foreground">{title}</span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-gold/25 bg-surface-deep/60">
            <Icon className={cn("h-5 w-5", iconTone[variant])} strokeWidth={1.6} aria-hidden />
          </span>
        </div>

        <div className="mt-auto pt-4">
          <div className="font-display text-[38px] font-bold leading-none tracking-tight tabular">
            {shown}
          </div>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p
              className={cn(
                "mt-2 text-sm font-medium tabular",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "+" : "−"}
              {trend.value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/60 bg-primary text-primary-foreground",
        secondary:
          "border-border bg-card-raised text-muted-foreground",
        destructive:
          "border-destructive/25 bg-destructive-light text-destructive",
        outline: "border-border-gold/40 text-muted-foreground",
        // amber is a signal, not decoration: due dates, streaks, warnings
        warning: "border-accent/40 bg-accent-light text-accent",
        success: "border-success/35 bg-success-light text-success",
        info: "border-border-gold/30 bg-primary-light text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

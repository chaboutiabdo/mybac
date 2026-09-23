import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // pill chips, as in the mockup
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // ink chip: premium, "top 10"
        default: "bg-primary text-primary-foreground",
        // the translucent white chip that sits on a tone card
        secondary: "bg-card-raised/70 text-foreground backdrop-blur",
        destructive: "bg-destructive-light text-destructive",
        outline: "border border-foreground/10 text-muted-foreground",
        warning: "bg-warning-light text-warning",
        success: "bg-success-light text-success",
        info: "bg-tone-sky text-foreground",
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

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-muted",
      className
    )}
    {...props}
  >
    {/* width, not translateX: a transform is not direction-aware, so in this
        RTL app the shadcn default anchored the fill to the LEFT edge and grew
        it away from the reading origin. Block width flips with `direction`
        for free, in both RTL and LTR. */}
    <ProgressPrimitive.Indicator
      className="h-full bg-primary transition-all"
      style={{ width: `${value || 0}%` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

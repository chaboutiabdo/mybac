import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[15px] font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-primary-hover to-primary text-primary-foreground shadow-raised hover:from-primary hover:to-primary-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-card/60 text-foreground hover:bg-card-raised hover:border-border-gold/60",
        secondary: "border border-border bg-card text-foreground hover:bg-card-raised",
        // the one most important action on a screen
        gold: "bg-gradient-to-b from-accent-hover to-accent text-accent-foreground font-semibold shadow-raised hover:from-accent hover:to-accent-hover",
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // `hero` was a gradient with a glow. Kept as an alias so the ~12 call
        // sites keep working; it is now just the primary button.
        hero: "bg-gradient-to-b from-accent-hover to-accent text-accent-foreground font-semibold shadow-raised hover:from-accent hover:to-accent-hover",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
      },
      size: {
        default: "h-10 px-5 py-2 text-[15px]",
        sm: "h-9 rounded-md px-3.5",
        lg: "h-12 rounded-lg px-7 text-base",
        xl: "h-14 rounded-lg px-9 text-[17px] font-semibold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

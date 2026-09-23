import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // every button is a pill, as in the mockup
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // ink: the one primary action on a screen
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-foreground/10 bg-transparent text-foreground hover:bg-card-raised",
        // cream, white on hover: the mockup's inactive filter pill
        secondary: "bg-card text-foreground hover:bg-card-raised",
        // peach: premium and featured
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
        ghost: "text-muted-foreground hover:bg-card-raised hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4",
        lg: "h-12 px-7 text-base",
        xl: "h-14 px-9 text-[17px] font-semibold",
        icon: "h-11 w-11",
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

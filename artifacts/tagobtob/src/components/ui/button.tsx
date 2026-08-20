import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

const buttonVariantClasses = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm shadow-destructive/20",
  outline: "border border-border bg-background hover:bg-accent text-foreground hover:border-primary/40",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent text-foreground",
  link: "text-primary underline-offset-4 hover:underline",
  glow: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-3px_hsl(var(--primary)_/_0.4)] hover:shadow-[0_0_25px_-3px_hsl(var(--primary)_/_0.6)] border border-primary-foreground/10",
} as const

const buttonSizeClasses = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3 text-xs",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
  xl: "h-14 rounded-lg px-10 text-lg uppercase tracking-wider font-semibold",
} as const

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: keyof typeof buttonVariantClasses
  size?: keyof typeof buttonSizeClasses
}

type ButtonVariantsOptions = Pick<ButtonProps, "variant" | "size" | "className">

const buttonVariants = ({
  variant = "default",
  size = "default",
  className,
}: ButtonVariantsOptions = {}) =>
  cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    buttonVariantClasses[variant],
    buttonSizeClasses[size],
    className,
  )

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

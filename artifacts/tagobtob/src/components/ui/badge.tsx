import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" | "gold" | "silver" | "bronze" }>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "border-transparent bg-primary/20 text-primary border border-primary/30",
      secondary: "border-transparent bg-secondary text-secondary-foreground",
      destructive: "border-transparent bg-destructive text-destructive-foreground",
      outline: "text-foreground border border-border/50",
      gold: "border-transparent bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-[0_0_15px_-3px_rgba(234,179,8,0.2)]",
      silver: "border-transparent bg-gray-400/20 text-gray-300 border border-gray-400/30",
      bronze: "border-transparent bg-orange-700/20 text-orange-400 border border-orange-700/30",
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-wider",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }

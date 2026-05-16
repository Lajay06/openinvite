import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] rounded-[999px] transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default:     "border-[#0A0A0A] bg-[#0A0A0A] text-white",
        secondary:   "border-[rgba(10,10,10,0.15)] bg-transparent text-[#444444]",
        destructive: "border-[#E03553] bg-transparent text-[#E03553]",
        outline:     "border-[rgba(10,10,10,0.15)] bg-transparent text-[#444444]",
        success:     "border-[rgba(10,10,10,0.15)] bg-transparent text-[#0A0A0A]",
        brand:       "border-[#E03553] bg-[#E03553] text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants }

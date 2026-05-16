import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-sm font-semibold rounded-[999px] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#E03553] text-white border-0 hover:scale-[1.03] active:scale-[0.98]",
        destructive:
          "bg-[#E03553] text-white border-0 hover:scale-[1.03] active:scale-[0.98]",
        outline:
          "bg-[rgba(10,10,10,0.08)] border border-[rgba(10,10,10,0.12)] text-[#0A0A0A] hover:scale-[1.03] active:scale-[0.98]",
        secondary:
          "bg-[rgba(10,10,10,0.08)] border border-[rgba(10,10,10,0.12)] text-[#0A0A0A] hover:scale-[1.03] active:scale-[0.98]",
        ghost:
          "bg-transparent text-[#0A0A0A] hover:bg-[rgba(10,10,10,0.06)] border-0",
        link:
          "text-[#0A0A0A] underline-offset-4 hover:underline bg-transparent border-0 p-0 font-normal",
        "glass-dark":
          "bg-[rgba(255,255,255,0.15)] backdrop-blur-[12px] border border-[rgba(255,255,255,0.2)] text-white hover:scale-[1.03] active:scale-[0.98]",
      },
      size: {
        default: "px-6 py-3",
        sm: "px-4 py-2 text-xs",
        lg: "px-8 py-3.5 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }

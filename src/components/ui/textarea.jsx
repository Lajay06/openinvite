import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full bg-transparent border-0 border-b border-[#0A0A0A] rounded-none px-0 py-3 text-sm font-semibold text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.6)] placeholder:font-normal focus:border-b-2 focus:border-[#E03553] focus:outline-none transition-all duration-200 resize-none disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// fullBleed: for the small set of genuinely edge-to-edge experiences
// (entrance animations, full-screen previews) that were never meant to be
// a compact rounded box — per CLAUDE.md's own instruction ("if a modal
// needs its own radius override, that's drift — fix it at the wrapper
// instead"), this is that fix, implemented once here rather than letting
// individual components hand-roll their own position:fixed overlay again.
// hideClose: fullBleed consumers usually render their own close affordance
// as part of the full-screen composition, not the corner X.
// title: most migrated modals already render their own visibly-styled
// heading (a plain <span>/<h2>, not Radix's DialogTitle) — Radix requires
// a real DialogTitle for screen readers regardless, so this renders one
// visually-hidden (sr-only) using that same text, rather than asking every
// consumer to restructure its existing header markup. Consumers that
// already compose their own <DialogTitle> (visible, styled) don't pass
// this prop, so nothing doubles up.
const DialogContent = React.forwardRef(({ className, children, fullBleed = false, hideClose = false, title, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={fullBleed ? "bg-black" : undefined} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        fullBleed
          ? "fixed inset-0 z-50 w-full h-full max-w-none translate-x-0 translate-y-0 gap-4 bg-transparent p-0 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 rounded-none overflow-auto"
          : "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[rgba(10,10,10,0.1)] bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl overflow-hidden",
        className
      )}
      {...props}>
      {title && <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>}
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-none opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[#444444]", className)}
    {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

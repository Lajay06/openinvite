import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


// `isIframe` lived here and was deleted 2026-08-30. It read
// `window.self !== window.top` AT MODULE LOAD, and this file exports cn(),
// which nearly every component imports — so one line made most of the dashboard
// impossible to load outside a browser. It had ZERO consumers anywhere in the
// repo and did not appear in the built bundle at all, so this is a deletion,
// not a behavior change. Deleted rather than guarded: a guarded dead thing is a
// thing someone will later assume is load-bearing.
//
// If an iframe check is ever needed again, evaluate it INSIDE the function that
// needs it, never at module scope.


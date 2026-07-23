import React from "react";

// Shared wrapper for both /login and /register — kept deliberately identical
// between the two so neither page can visually drift from the other; the
// only difference between them is field count (Register has one more).
//
// h-screen (fixed to exactly one viewport, not min-h-screen) + tight
// vertical rhythm throughout so the whole card — including Register's
// 4 OAuth buttons + divider + 3 fields, the tallest case — fits a normal
// laptop viewport (~1366x768 and up) with no scrolling. overflow-y-auto
// stays on as a safety net for a genuinely short window, not the default
// path.
//
// The source logo asset is a white wordmark (built for dark backgrounds —
// see PublicNav/Layout.jsx's dark top bar, which uses it unfiltered or with
// brightness(0) invert(1)). This page's background is bg-background, a
// light off-white, so brightness(0) forces it to solid black here — same
// treatment as PublicFooter.jsx on its own white background.
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="h-screen overflow-y-auto flex items-center justify-center bg-background px-4 py-3">
      <div className="w-full max-w-md">
        <div className="text-center mb-3">
          <img
            src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
            alt="Openinvite"
            className="h-5 w-auto mx-auto mb-3"
            style={{ filter: "brightness(0)" }}
          />
          <div className="inline-flex items-center justify-center w-10 h-10 bg-primary mb-2">
            <Icon className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
        </div>
        {/* Card: 0 border-radius, no box-shadow — DESIGN_SPEC's card rules */}
        <div className="bg-card border border-border p-4">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-3">{footer}</p>
        )}
      </div>
    </div>
  );
}

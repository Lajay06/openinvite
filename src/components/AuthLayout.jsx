import React from "react";

// Shared wrapper for both /login and /register — kept deliberately identical
// between the two so neither page can visually drift from the other; the
// only difference between them is field count (Register has one more).
// min-h-screen + py-10 (not just items-center with no vertical padding)
// plus overflow-y-auto on the outer element means content taller than the
// viewport scrolls cleanly instead of crowding the edges.
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen overflow-y-auto flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
            alt="Openinvite"
            className="h-7 w-auto mx-auto mb-6"
          />
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        {/* Card: 0 border-radius, no box-shadow — DESIGN_SPEC's card rules */}
        <div className="bg-card border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}

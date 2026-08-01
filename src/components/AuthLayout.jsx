import React from "react";
import { ImageSlider } from "@/components/ui/ImageSlider";

// Shared wrapper for both /login and /register — kept deliberately identical
// between the two so neither page can visually drift from the other; the
// only difference between them is field count (Register has one more).
//
// Split layout matching the Contact page's pattern: form on one side,
// full-bleed photo carousel on the other (same ImageSlider component
// ResetPassword.jsx/ForgotPassword.jsx already use, reused here rather than
// building a second carousel). The four-photo set below is fixed across
// both pages so a visitor bouncing between /login and /register never sees
// the carousel jump or reset.
//
// The old per-page coloured icon square (UserPlus/LogIn/Mail) is gone —
// the wordmark alone is the mark now, no icon.
//
// The source logo asset is a white wordmark (built for dark backgrounds —
// see PublicNav/Layout.jsx's dark top bar, which uses it unfiltered or with
// brightness(0) invert(1)). The form side's background is bg-background, a
// light off-white, so brightness(0) forces it to solid black here — same
// treatment as PublicFooter.jsx on its own white background.
const CAROUSEL_IMAGES = [
  "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_SNOWBOUND_Daniel_Far%C3%B2_Photos_ID12431_yunnan.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Teen_Spirit__Marlen_Stahlhuth_Photos_ID14324_zqa5rg.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_SNOWBOUND_Daniel_Far%C3%B2_Photos_ID12430_hmrv0c.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_SUITE_TALK_PALI_MENDEZ_Photos_ID14166_tqzysj.jpg",
];

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="h-screen overflow-hidden flex">
      {/* LEFT — full-bleed crossfade carousel, hidden below md same as the
          Reset/Forgot password pattern this was reused from. */}
      <div className="hidden md:block" style={{ width: "50%", flexShrink: 0, height: "100vh" }}>
        <ImageSlider images={CAROUSEL_IMAGES} />
      </div>

      {/* RIGHT — form panel. overflow-y-auto stays on as a safety net for a
          genuinely short viewport (Register's 4 OAuth buttons + divider +
          3 fields is the tallest case), not the default path. */}
      <div className="w-full md:w-1/2 h-screen overflow-y-auto flex items-center justify-center bg-background px-4 py-3">
        <div className="w-full max-w-md">
          <div className="text-center mb-3">
            <img
              src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
              alt="Openinvite"
              className="h-6 w-auto mx-auto mb-4"
              style={{ filter: "brightness(0)" }}
            />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
          </div>
          {/* Card: 0 border-radius, no box-shadow — DESIGN_SPEC's card rules.
              The modal 16px-radius rule doesn't apply here — this isn't a
              modal, and border-radius stays scoped to buttons/pills only. */}
          <div className="bg-card border border-border p-4">
            {children}
          </div>
          {footer && (
            <p className="text-center text-sm text-muted-foreground mt-3">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}

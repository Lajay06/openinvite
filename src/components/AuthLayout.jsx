import React from "react";
import PublicNav from "@/components/public/PublicNav";
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
// the carousel jump or reset. ImageSlider renders photos and dots only —
// its old quote+attribution caption has been removed from the component
// itself, so there is no prop to opt out of here any more.
//
// PublicNav is included so these pages read as part of the site rather than
// stranded (matches Contact.jsx's bar). PublicNav is position:fixed, so it
// contributes no layout height on its own — paddingTop: 64 below reserves
// the same 64px (h-16) it occupies, exactly as Contact.jsx does.
//
// The old per-page colored icon square (UserPlus/LogIn/Mail) is gone —
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

// Field-label treatment for the auth forms.
//
// src/components/ui/label.jsx forces `uppercase` (plus font-bold and the
// 0.08em tracking that only exists to space out caps) on every <Label> in
// the product. DESIGN_SPEC.md:6 and :180 forbid uppercase outright, but that
// primitive has 25 importers and all but Register/Login are dashboard or
// website-builder surfaces — restyling it is a product-wide change, not an
// auth one. So the auth pages override it here instead.
//
// The values match the local labelStyle that ForgotPassword.jsx and
// ResetPassword.jsx use (11px / 600 / 0.06em, sentence case), which is what
// keeps all four auth pages on one label treatment. Import this rather than
// hand-writing the classes per field, so Register and Login can't drift from
// each other.
//
// The color is DESIGN_SPEC.md:10's label value, rgba(10,10,10,0.6) — the
// textMuted token from src/styles/tokens.js. Spelled as an arbitrary value
// the same way select.jsx does, so it is byte-identical to the inline color
// the Forgot/Reset labelStyle now uses; `text-muted-foreground` resolves to
// rgb(107,107,107), one step off the rgb(108,108,108) that rgba composites
// to, and that near-miss is exactly the kind of drift this constant exists
// to prevent.
export const AUTH_LABEL_CLASS =
  "normal-case font-semibold tracking-[0.06em] text-[rgba(10,10,10,0.6)]";

// showNav/images/image/bare/contentMaxWidth are additive — every existing
// caller (Login/Register/ForgotPassword/ResetPassword) passes none of them
// and gets byte-identical output. Added for OnboardingShell.jsx (Group A
// shell redesign): onboarding hides PublicNav (a wizard mid-flow isn't a
// page a visitor should navigate away from), shows one fixed photo per step
// instead of the carousel (image, singular — takes over from `images` when
// passed), and skips this component's built-in logo/title/card chrome
// entirely — each onboarding step already renders its own heading in the
// wizard's own voice, and the wizard's logo/step-counter/back button live in
// its own fixed-position overlay (independent of this component either
// way). `bare` also switches the content column to left-aligned — every
// onboarding step wants its heading/inputs/CTA flush to one left margin,
// whereas Login/Register (the only non-bare callers) stay centered.
export default function AuthLayout({ title, subtitle, footer, children, showNav = true, images = CAROUSEL_IMAGES, image, bare = false, contentMaxWidth }) {
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {showNav && <PublicNav />}

      <div className="flex-1 flex overflow-hidden" style={{ paddingTop: showNav ? 64 : 0, boxSizing: "border-box" }}>
        {/* LEFT — full-bleed photo, hidden below md same as the
            Reset/Forgot password pattern this was reused from. `image`
            (singular) renders one fixed photo, no crossfade/dots — the
            onboarding call site passes this per-step. Falls back to the
            4-photo crossfade carousel for Login/Register/Forgot/Reset. */}
        <div className="hidden md:block h-full" style={{ width: "50%", flexShrink: 0 }}>
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageSlider images={images} />
          )}
        </div>

        {/* RIGHT — form panel. overflow-y-auto stays on as a safety net for a
            genuinely short viewport (Register's 4 OAuth buttons + divider +
            3 fields is the tallest case), not the default path. */}
        <div className={`w-full md:w-1/2 h-full overflow-y-auto flex items-center bg-background px-4 py-3 ${bare ? "justify-start" : "justify-center"}`}>
          {bare ? (
            <div className="w-full pl-8 md:pl-16" style={{ maxWidth: contentMaxWidth }}>
              {children}
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

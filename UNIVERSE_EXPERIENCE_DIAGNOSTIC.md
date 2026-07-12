# Universe Experience Diagnostic

*Read-only diagnostic. No code changes. Investigates why the live published guest site's universe experience (motion, transitions, texture, several buttons) doesn't work despite this session's earlier fixes (PRs #79–84).*

---

## Headline finding — one confirmed root cause explains items 1 and 4 together

**`MultiPageWeddingWebsite.jsx` renders through two entirely different component trees depending on whether the couple has used the section-based page builder for a given page — and only one of those two trees has any motion, video-hero, or real interactive logic. The other is a static, non-functional preview mockup, and it is what guests actually see whenever a page has builder-authored sections.**

`MultiPageWeddingWebsite.jsx:274-307`:
```jsx
{(() => {
  // If the builder has authored sections for this page, render them.
  // This makes the published site match the builder preview exactly.
  const dynamicSections = weddingDetails.pageSections?.[page];
  const sorted = dynamicSections?.length
    ? [...dynamicSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  if (sorted.length > 0) {
    return (
      <div>
        {sorted.map(section => (
          <WBSectionRenderer
            key={section.id}
            section={section}
            theme={theme}
            typo={typography}
            universeTheme={null}
            masterData={weddingDetails}
          />
        ))}
      </div>
    );
  }
  // Fallback: data-driven pages (Stay, Transport, Experience) and any
  // page where no sections have been authored yet.
  return (
    <PageComponent
      weddingDetails={weddingDetails}
      theme={theme}
      typography={typography}
      universeConfig={universeConfig}
    />
  );
})()}
```

**Confirmed live** — `john-suzanne`'s `home` page has authored sections (`pageSections.home = ['cinematic-hero', 'our-story', 'event-details', 'full-rsvp']`, fetched directly from the production API), so its home page renders entirely through `WBSectionRenderer`, **never** through `WeddingHomePage.jsx` — the component every prior PR this session (#79 colour, #80 RSVP theming, #81 video hero, #82 texture/motion recalibration) actually wired.

`WBSectionRenderer.jsx:1` — its entire import list is `import React, { useRef, useEffect } from 'react';`. **No `framer-motion`, no `SectionReveal`, no `isMotionEnabled`, no `TextureOverlay`, no `universeStyling` import at all**, confirmed via `grep` across the full 514-line file returning zero matches for any of those five terms. `universeTheme={null}` is passed explicitly at the call site (`MultiPageWeddingWebsite.jsx:290`) — the couple's resolved universe colours never even reach this component as a *theme* object (only the more limited `theme`/`typo` props do, which the file does use for colour/font — see §3).

This is the exact "wired in builder preview but not in published render tree" pattern the goal named — except inverted from the usual direction: here the *builder's own* section-rendering component (`WBSectionRenderer`, designed for the live-editing canvas, where a couple is arranging blocks, not experiencing a finished site) is what actually serves guests, and it was never built with any of the polish or interactivity the dedicated page components have.

---

## (1) Motion/animation

- **Where it's wired correctly**: 12 of 14 dedicated guest-page components (`WeddingCelebrationPage.jsx`, `WeddingRSVPPage.jsx`, `WeddingOurStoryPage.jsx`, `WeddingRegistryPage.jsx`, `WeddingGuestbookPage.jsx`, `WeddingPollsPage.jsx`, `WeddingFAQPage.jsx`, `WeddingMusicPage.jsx`, `WeddingPhotosPage.jsx`, `WeddingStayPage.jsx`, `WeddingTransportPage.jsx`, `WeddingExperiencePage.jsx`) import and use `SectionReveal` (`src/components/guest-website/SectionReveal.jsx`), which correctly computes `shouldAnimate` from `universeConfig.motion` and the `disabled={!isMotionEnabled(weddingDetails)}` prop. `isMotionEnabled()` (`src/lib/universeStyling.js:95-97`) resolves `weddingDetails.scrollAnimation !== 'none'` — confirmed live for `john-suzanne`, `scrollAnimation: 'dramatic'`, so this gate correctly evaluates to enabled.
- **`WeddingHomePage.jsx`** uses raw `framer-motion` `motion.div` (`:129-135, :170-174`) directly on the hero text, gated only by the browser's `prefersReduced` (OS-level reduced-motion preference), not `isMotionEnabled`/`scrollAnimation` — a one-time mount fade-in, not a scroll-triggered reveal. This still runs correctly when this component actually renders.
- **The break**: none of the above matters for any page with authored `pageSections`, because `WBSectionRenderer.jsx` (confirmed, §headline) renders instead and has zero motion code. Every section type it supports (`cinematic-hero`, `our-story`, `event-details`, `full-rsvp`, all the others listed at `WBSectionRenderer.jsx:87-500`) is a static, unanimated block.
- **Conclusion**: motion code is correct and *not* dead in the abstract — it's simply unreachable for any page a couple has customised with the section builder, which given the section builder is the primary content-editing surface (per `BUILDER_UNIVERSE_AUDIT.md`/`WEBSITE_BUILDER_GAP_MAP.md`'s earlier findings on `WBRightPanel.jsx`/`SectionTemplatePicker.jsx`), is very likely most real weddings' actual state — matching the live `john-suzanne` record.

---

## (2) Transitions

**Appears correctly wired, unlike motion — not affected by the WBSectionRenderer split**, since it wraps *whichever* content renders (section-based or component-based) at one level up.

`MultiPageWeddingWebsite.jsx:259-272`:
```jsx
<AnimatePresence mode="wait">
  <motion.div
    key={page}
    variants={getTransitionVariants(
      universeConfig?.pageTransition?.type ?? weddingDetails.pageTransition ?? 'fade'
    )}
    initial="initial" animate="animate" exit="exit"
    transition={{ duration: prefersReduced ? 0 : (universeConfig?.pageTransition?.duration ?? 0.6) }}
  >
```
`key={page}` is present and changes on navigation (confirmed `page` is derived from the URL param), which is what `AnimatePresence mode="wait"` needs to actually trigger an exit/enter cycle — the classic bug (missing/constant `key`) is not present here. `getTransitionVariants()` (`:168-193`, read in full) returns real, distinct `initial`/`animate`/`exit` variant objects per type (`fade`/`slide`/`reveal`/`dissolve`), not a no-op. `universeConfig?.pageTransition` now resolves for all 10 universes as of PR #82 (previously aman-only).

**This item could not be confirmed broken from code alone** — everything here reads correctly wired. If the user is still observing no transition on navigation, the two most likely explanations *not* eliminated by this review are (a) a rendering/observation issue specific to how fast `mode="wait"` transitions read at short durations (`aman`'s is 0.65s, most universes 0.4–0.8s — easy to miss if not looking for it), or (b) something outside this file entirely (e.g. a CSS reset or a parent overflow/scroll-restoration behaviour masking the animation). Recommend confirming with a real click-through before scoping a fix — this is the one item in the goal where the code does not show an obvious bug.

---

## (3) Texture

**Structurally correct, mounted once at the root — not affected by the WBSectionRenderer split** (rendered before the page-content fork, so it applies regardless of which tree renders below it).

`MultiPageWeddingWebsite.jsx:198-215`:
```jsx
<div className="wb-guest-root" style={{
  position: 'relative',
  '--wb-heading-font': typography.headingFont,
  '--wb-body-font': typography.bodyFont,
  '--texture-opacity': universeConfig?.texture?.opacity,
  backgroundColor: theme.darkBg,
  color: theme.darkText,
}}>
  {universeConfig?.texture && (
    <TextureOverlay textureId={universeConfig.texture.type} opacity={universeConfig.texture.opacity} />
  )}
```
`universeConfig?.texture` is truthy for every one of the 10 universes (confirmed via `tests/persistence/universe-styling.mjs`, all passing as of PR #82). `TextureOverlay.jsx` renders `position: absolute; inset: 0` sized to its nearest positioned ancestor (`wb-guest-root`, which has `position: relative` — confirmed present). Opacity resolves through the CSS custom property with a coded fallback (`opacity: var(--texture-opacity, ${texture.defaultOpacity})`), and even if `universeConfig?.texture?.opacity` were ever `undefined`, an invalid/unset custom property value causes `var()` to use its fallback per the CSS Custom Properties spec, not to silently disappear.

**No confirmed bug found in this path.** The one candidate explanation not fully ruled out by static reading: the deliberately "barely-there" calibration (grain at 0.025–0.035 opacity, linen at 0.015 — see `UNIVERSE_CONFIGS` comments in `src/lib/websiteThemes.js`, explicitly "visible on close inspection, not at a glance") may simply read as "texture doesn't appear" to a user who isn't looking for a subtle grain/paper/linen overlay rather than a genuinely absent one. Recommend a visual A/B (toggle the opacity to something obviously large temporarily) to distinguish "not mounted" from "mounted but imperceptible" before scoping a fix here — unlike motion and dead buttons, this one has no smoking-gun code defect.

---

## (4) Dead buttons

All confirmed inside `WBSectionRenderer.jsx` — every one of these renders on the published site (not just the builder canvas) whenever the corresponding section type is present in a page's `pageSections`, which is confirmed true for `john-suzanne`'s home page (`cinematic-hero`, `our-story`, `event-details`, `full-rsvp`).

| Control | File:line | Root cause |
|---|---|---|
| "Joyfully Accepts" / "Regretfully Declines" RSVP buttons | `WBSectionRenderer.jsx:271-272` | `cursor: 'default'` explicitly set, **no `onClick` at all**. The "Full Name" field (`:268`) is a `<p>` label, not an `<input>` — there's no way to type a name. This entire block is a static visual mockup of what an RSVP section looks like, rendered as-is to real guests. Applies to all three case labels that map to it: `rsvp-meal`, `full-rsvp`, `simple-rsvp` (`:258-260`). |
| Guest Book "submit" | `WBSectionRenderer.jsx:463-467` | Not even a fake button with a label — a plain `<div style={{height:36, background:'#0A0A0A'}} />` (a solid black rectangle) standing in for a submit button. No text, no `onClick`, no message input (the "message" and "textarea" areas are grey skeleton-style `<div>`s at `:464-465`, not real form fields). |
| Song request / hashtag wall / photo upload | `WBSectionRenderer.jsx:472-483` | Renders the **literal placeholder string `'Interactive section'`** (`:479`, the `c.message \|\| c.hashtag \|\| 'Interactive section'` fallback) with no input, upload control, or button of any kind. |
| Hero "+ Add Photo" badge | `WBSectionRenderer.jsx:98-101` | Not a bug exactly — this is a builder-only affordance (prompting the couple to add a photo) that has no `onClick` and is purely visual; it's coded to only show `{!c.photoUrl && (...)}`, i.e. only when no photo has been set. On the *published* site this reads as a dead, clickable-looking badge with no purpose, since guests can't add a photo — it should not render outside the builder's own editing context at all. |

No other dead-button pattern (missing `onClick`, `onClick={() => {}}`, or a handler referencing an undefined function) was found in the dedicated page components (`WeddingRSVPPage.jsx`, `WeddingPollsPage.jsx`, `WeddingGuestbookPage.jsx`, etc.) themselves — their interactive controls are real and wired to the actual `api/*.js` endpoints this session's other work (poll/RSVP entity migrations) fixed. The dead-button problem is entirely contained within `WBSectionRenderer.jsx`'s section-type implementations.

---

## (5) Cross-cutting cause

**Confirmed: yes, a single upstream cause.** `MultiPageWeddingWebsite.jsx`'s `pageSections`-vs-`PageComponent` fork (`:277-296`) means the published site renders through `WBSectionRenderer.jsx` — a component built for the builder's own live-editing canvas, never given motion, texture-context, or real interactivity — for any page where the couple has used the section-based editor. The dedicated, fully-wired `PageComponent`s (`WeddingHomePage.jsx`, `WeddingRSVPPage.jsx`, etc.) that received every fix from PRs #79–84 are the *fallback* path, used only when a page has **zero** authored sections. Given the section-based editor is the builder's primary, promoted content-editing surface, this fallback is likely the less-common case for real weddings, not the common one — inverting the intended priority.

This explains items 1 and 4 completely. It does not explain items 2 and 3, which read as correctly implemented at the `MultiPageWeddingWebsite.jsx` level (outside the fork) and need visual confirmation rather than a further code fix, per §2/§3 above.

---

## Prioritised fix list

Ordered by severity; each item scoped to one PR.

1. **[Critical] Wire real interactivity into `WBSectionRenderer.jsx`'s RSVP/guestbook/song-request/photo-upload section types**, or — likely simpler and more robust — **make those specific section types render the real dedicated components** (`WeddingRSVPPage.jsx`'s RSVP form, `WeddingGuestbookPage.jsx`'s submit flow, `WeddingPollsPage.jsx`'s voting) instead of a static mockup, whenever they appear inside a `pageSections` array. This is the single highest-impact fix — it's the difference between a guest being able to RSVP/sign the guestbook at all versus a page that looks like a form but silently does nothing.
2. **[Critical] Wire `SectionReveal`/`isMotionEnabled` into every `WBSectionRenderer.jsx` section type**, mirroring the pattern already proven in all 12 dedicated `PageComponent`s, so scroll-reveal motion runs regardless of whether a page uses section-based or component-based rendering.
3. **[High] Wire the real hero (video/image, `heroVideoUrl`/`coverPhoto`, `HeroBackground` from `WeddingHomePage.jsx`) into `WBSectionRenderer.jsx`'s `cinematic-hero`/`minimal-text-hero`/`split-hero` cases**, which currently only support a per-section static `photoUrl` and have no knowledge of the couple's actual hero video (feat/video-hero, PR #81, is entirely bypassed for any wedding using a section-based hero).
4. **[Medium] Remove or gate the "+ Add Photo" badge (`WBSectionRenderer.jsx:98-101`) so it never renders outside the builder's own editing context** — a small, contained fix; it's currently a dead, confusing affordance on the published site.
5. **[Low, needs visual confirmation first] Investigate page-transition perceptibility** — code reads as correctly wired (§2); before scoping any fix, confirm via an actual click-through whether transitions genuinely don't run, or are simply too fast/subtle to notice at their current calibrated durations.
6. **[Low, needs visual confirmation first] Investigate texture-overlay perceptibility** — code reads as correctly wired and mounted (§3); before scoping any fix, confirm whether the overlay is genuinely absent from the rendered DOM (inspect element) versus present but too subtle at its deliberately "barely-there" calibrated opacity.

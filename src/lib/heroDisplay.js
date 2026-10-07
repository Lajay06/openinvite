/**
 * src/lib/heroDisplay.js
 *
 * WHAT THE HERO SHOWS — the three switches, in the one place both the builder
 * and the guest site read them from.
 *
 * ── DEFAULTS ARE ON, AND THAT IS THE WHOLE CONTRACT ─────────────────────────
 *
 * Every couple already has a hero with their names on it. A switch stored as
 * `undefined` therefore has to mean ON, not OFF, or the day this ships every
 * existing site loses its names — a migration disguised as a default. So the
 * test is `!== false` everywhere, never a truthy test.
 *
 * ── WHERE IT IS STORED, AND WHY NOT IN THE FIELD NAMED FOR IT ───────────────
 *
 * In `homeContent`, which is a declared BARE object and keeps whatever nested
 * keys it is handed — the same property `homeContent.blocks` already depends
 * on. The overlay in particular has lived at `homeContent.overlay` since it
 * shipped, with its own size, position and scrim, so a couple's existing
 * monogram is already there. `heroOverlay` was declared in Base44 before that
 * was checked; moving the store to it would need a migration and would buy
 * nothing. It stays declared and unused — see OPEN-TICKETS.
 */

/** The couple's names on the hero. Absent means on. */
export const heroShowsNames = (details) => details?.homeContent?.showNames !== false;

/**
 * THE UNIVERSE'S MOTIF IN THE INTRO. Absent means on.
 *
 * Item 11 of goals/2026-10-08-site-fixes-batch-1.md: "Add a third toggle,
 * 'Show motif', default on, that hides the universe's motif for a plain
 * intro."
 *
 * WHICH MOTIF, SINCE THE WORD IS USED FOR SEVERAL THINGS HERE. Not the
 * couple's monogram, which is the MARK and has had its own switch all along.
 * This is the hairline the entrance moment draws under its kicker, in the
 * beat before the names arrive, and it is the only decorative element in the
 * intro that a couple cannot already turn off.
 *
 * VISIBLE WHERE IT IS SET, which is why this is the right surface for the
 * control: StudioWebsite remounts EntranceMoment inside the preview on
 * purpose, so a couple watching the entrance in the studio sees the switch
 * take effect rather than having to publish to find out.
 *
 * Stored in homeContent beside the other two, as the item asks.
 */
export const heroShowsMotif = (details) => details?.homeContent?.showMotif !== false;

/** The wedding date on the hero. Absent means on. */
export const heroShowsDate = (details) => details?.homeContent?.showDate !== false;

/**
 * THE WELCOME LINE, AND ONLY THE WELCOME LINE. Absent means on.
 *
 * "Show names" already lets a couple take their names off the hero. It leaves
 * the kicker — "Join us as we celebrate…" — behind, and this is the switch for
 * that.
 *
 * ── IT USED TO HIDE THE MARK AS WELL, AND THE OWNER REVERSED THAT ──────────
 *
 * This file argued the coupling: "one switch for two things, deliberately...
 * a monogram floating alone over a photo with no text is not a state anyone
 * asked for". Item 11 of goals/2026-10-08-site-fixes-batch-1.md rules the
 * other way, in those words: "Show welcome text must hide only the welcome
 * text; today it also hides the mark."
 *
 * The argument was not wrong about taste, it was wrong about whose call it is.
 * A couple who switches off the words and keeps the monogram now gets exactly
 * that, and "Show mark" is the switch for the monogram, which is what its
 * label always said. The old reasoning is left here rather than deleted so the
 * reversal is legible: nobody has to wonder whether the coupling was an
 * accident.
 */
export const heroShowsWelcome = (details) => details?.homeContent?.showWelcome !== false;

/**
 * The kicker a hero should print, which is nothing when the welcome line is
 * off. Takes the copy object rather than reaching for it, because every
 * universe's hero is handed its own `copy` and this must not guess which.
 */
export const heroKickerOf = (details, copy) => (heroShowsWelcome(details) ? (copy?.heroKicker || '') : '');

/**
 * The overlay to render, or null. A mark with no URL is nothing to draw, and a
 * mark switched off is a mark the couple has kept but does not want shown —
 * turning it off must NOT delete their upload, which is why this is a flag on
 * the object rather than a removal of it.
 *
 * The upload survives either way, and it is NOT null when the welcome line is
 * off any more: see heroShowsWelcome for the reversal.
 */
export function heroOverlayOf(details) {
  const overlay = details?.homeContent?.overlay;
  if (!overlay?.url) return null;
  // NO LONGER GATED ON THE WELCOME LINE. See heroShowsWelcome: the two were
  // one switch and the owner separated them in item 11.
  return overlay.enabled === false ? null : overlay;
}

/**
 * DOES THIS UNIVERSE'S HERO CARRY A DATE AT ALL?
 *
 * Nineteen of the twenty do not. Each has a Masthead layout that renders the
 * kicker and the couple's names and nothing else — the date/venue/RSVP strip
 * left the hero deliberately ("P5 hero restraint": logistics leave the hero,
 * they do not leave the site). Only the layout-less default hero prints a
 * date, which today is `tulum` and any wedding with no universe chosen.
 *
 * So the Date switch is shown only where a date is actually rendered. A
 * control that visibly does nothing on nineteen universes would be worse than
 * no control: the couple would turn it off, see the date still on their
 * celebration page, and conclude the builder is broken.
 */
export const universeHeroRendersDate = (universeConfig) => !universeConfig?.layout;

/**
 * Media blocks that can carry an overlay: the ones that render ONE media
 * surface for it to sit on. A gallery is a grid of them and there is no single
 * surface to centre a mark over, so it is left out rather than given a control
 * whose result would depend on the column count.
 */
export const OVERLAY_BLOCK_TYPES = ['photo', 'full-width-image', 'video'];

/** The overlay to render for a block, or null. Same on/off contract as the hero. */
export function blockOverlayOf(block) {
  const overlay = block?.overlay;
  if (!overlay?.url) return null;
  return overlay.enabled === false ? null : overlay;
}

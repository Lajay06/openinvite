/**
 * src/lib/planFeatures.js
 *
 * The single canonical source for Pro/Ultra plan feature copy (PR G3 email
 * overhaul — fixes an upgrade email that advertised Ultra features that
 * don't exist: custom domain, white-glove onboarding call, dedicated
 * account manager, multiple weddings, API access). Pure JS, no React/DOM
 * APIs, so it's importable from both src/pages/Pricing.jsx (the live
 * pricing page, the source of truth these were copied from verbatim) and
 * api/emails/*.js (Node/Vercel functions) — one array, read from both
 * places, so they can never drift apart again.
 *
 * ULTRA_EXTRAS is additive to Pro, matching Pricing.jsx's own TABLE_ROWS
 * gating: the guest suite, digital invitations, online RSVP, premium
 * themes, and the guest suite are Ultra-only. Nothing here should ever
 * name a feature the product doesn't actually have.
 */

/**
 * The trial list. It is NOT Pro's and NOT Ultra's: a trial is full access for
 * fourteen days, so it names the headline of each area rather than the full
 * Ultra set. Three of its lines are the same strings ULTRA_EXTRAS uses, quoted
 * exactly rather than reworded, because the Account page used to carry its own
 * spelling of them and that is precisely how it drifted: a retired builder
 * name the vocabulary guard bars, a count of eleven universe styles against a
 * pricing page saying twenty, and an invitations line still naming a channel
 * removed in batch 1 item 12b.
 */
export const TRIAL_FEATURES = [
  "14-day full access to every feature",
  "Unlimited guests, budget, seating & vendors",
  "Guest suite builder",
  "Digital invitations by email",
  "Online RSVP pages for guests",
  "Ava AI: unlimited conversations",
  "Priority support",
];

export const PRO_FEATURES = [
  "Unlimited guests & full RSVP management",
  "Complete budget suite",
  "Ava AI: unlimited & context-aware",
  "Full vendor management & marketplace",
  "Seating planner",
  "Schedule & day-of timeline",
  "Photography, styling & moodboard tools",
  "Music planner & registry management",
  "Vows & speeches writer",
  "Priority support",
  "24-month access",
];

export const ULTRA_EXTRAS = [
  "Guest suite builder",
  "Universes (20 guest suite styles)",
  "Digital invitations by email",
  "Online RSVP pages for guests",
  "Guest suite: stay, getting here & experience guide",
  "Save the dates & thank you cards",
];

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
 * gating: wedding website, digital invitations, online RSVP, premium
 * themes, and the guest suite are Ultra-only. Nothing here should ever
 * name a feature the product doesn't actually have.
 */

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
  "Wedding website builder",
  "Premium themes (12 universe styles)",
  "Digital invitations via email & WhatsApp",
  "Online RSVP pages for guests",
  "Guest suite: accommodation, transport & experience guide",
  "Save the dates & thank you cards",
];

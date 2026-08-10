/**
 * src/lib/setupJourney.js
 *
 * Single source of truth for the "empty account → launched wedding"
 * critical path (Ava Studio Part 2). Every isComplete() reads only data
 * already persisted to WeddingDetails / Guest / Vendor / Schedule — there
 * is no separate "journey progress" field written anywhere. That means a
 * step finished during onboarding, from the plain dashboard pages, or from
 * Ava Studio itself always shows correctly on every surface that reads
 * this file, with no explicit sync step required.
 *
 * route is a guide-and-route destination only — landing a couple on the
 * right dashboard page. It does not deep-link to a specific field or
 * sub-section yet; that's the "next action highlighted" mechanism proposed
 * for PR2 (data-ava-focus / useAvaFocus), out of scope here.
 */

import { getMyRecords } from '@/lib/resolveMyWedding';

// Same Cloudinary bucket/asset pool the onboarding wizard's own
// SHELL_STEP_IMAGES (Onboarding.jsx) draws from — reused deliberately so
// Ava Studio's photography-forward look shares the exact visual world as
// onboarding, with no new asset sourcing.
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dsr84xknv/image/upload';
const img = (path) => `${CLOUDINARY_BASE}/f_auto,q_auto/${path}`;

// ultraGated: true marks the 3 steps that require the Ultra plan (wedding
// website builder, universes, and online RSVP pages are Ultra-only per
// src/lib/planFeatures.js's ULTRA_EXTRAS — confirmed against the live
// pricing page, the source of truth that list is copied from). AvaStudio.jsx
// uses this to group them into a separate "What Ultra adds" upgrade-nudge
// cluster for Pro-plan accounts, rather than routing a Pro user into a step
// they can't act on.
export const JOURNEY_STEPS = [
  {
    key: 'website',
    title: 'Build your website',
    purpose: 'Add your story, photos, and the pages guests will actually see.',
    route: '/studio/guest-suite',
    image: img('DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10294_qw316r.jpg'),
    ultraGated: true,
    isComplete: (wedding) => {
      const sections = wedding?.pageSections || {};
      const corePages = ['home', 'our-story', 'celebration'];
      return corePages.every((p) => (sections[p]?.length || 0) > 0);
    },
  },
  {
    key: 'guests',
    title: 'Add your guests',
    purpose: 'Get your guest list into Openinvite so RSVPs and seating have somewhere to go.',
    route: '/Guests?ava_focus=guests',
    image: img('DTS_Pride_Agust%C3%ADn_Far%C3%ADas_Photos_ID5544_sgsmaz.jpg'),
    ultraGated: false,
    isComplete: (wedding, counts) => (counts?.guestCount || 0) > 0,
  },
  {
    key: 'rsvp',
    title: 'Turn on RSVP',
    purpose: 'Set meal options, plus-ones, and your reply deadline.',
    route: '/studio/guest-suite',
    image: img('DTS_Philia_Daniel_Far%C3%B2_Photos_ID4659_pnnku3.jpg'),
    ultraGated: true,
    isComplete: (wedding) => !!(wedding?.rsvpContent && Object.keys(wedding.rsvpContent).length > 0),
  },
  {
    key: 'publish',
    title: 'Publish your website',
    purpose: 'Go live so guests can find everything in one place.',
    route: '/studio/guest-suite/share',
    image: img('DTS_Community_Agust%C3%ADn_Far%C3%ADas_Photos_ID6374_iumjqj.jpg'),
    ultraGated: true,
    isComplete: (wedding) => !!wedding?.websiteEnabled,
  },
  {
    key: 'budget',
    title: 'Set your budget',
    purpose: 'Put a number on it, then track it as you book.',
    route: '/Budget?ava_focus=budget',
    image: img('DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa.jpg'),
    ultraGated: false,
    isComplete: (wedding) => (wedding?.budget?.total || 0) > 0,
  },
  {
    key: 'vendors',
    title: 'Add your vendors',
    purpose: "Already booked?, keep every contact in one place. Still looking?, browse the marketplace.",
    route: '/Vendors?ava_focus=vendors',
    image: img('DTS_Misc_1__Nick_Fancher__Nick_Fancher_Photos_ID6183_eapdy7.jpg'),
    ultraGated: false,
    isComplete: (wedding, counts) => (counts?.vendorCount || 0) > 0,
  },
  {
    key: 'day',
    title: 'Plan the day',
    purpose: 'Lock in your ceremony venue, time, and order of events.',
    route: '/event-details?ava_focus=day',
    image: img('justin-follis-A7Um4oi-UYU-unsplash_bbjjam.jpg'),
    ultraGated: false,
    isComplete: (wedding, counts) => !!wedding?.mainCeremony?.venueName || (counts?.scheduleCount || 0) > 0,
  },
];

/** Fetches the record counts JOURNEY_STEPS' isComplete checks need, beyond the WeddingDetails record itself. */
export async function getJourneyCounts() {
  const [guests, vendors, schedule] = await Promise.all([
    getMyRecords('Guest'),
    getMyRecords('Vendor'),
    getMyRecords('Schedule'),
  ]);
  return { guestCount: guests.length, vendorCount: vendors.length, scheduleCount: schedule.length };
}

/**
 * @returns {{ steps: object[], nextIndex: number, doneCount: number, allDone: boolean }}
 *   steps carries each JOURNEY_STEPS entry plus a computed `done` boolean.
 *   nextIndex is the first incomplete step (or the last step if all are done).
 */
export function getJourneyProgress(wedding, counts) {
  const steps = JOURNEY_STEPS.map((s) => ({ ...s, done: s.isComplete(wedding, counts) }));
  const firstIncomplete = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;
  return {
    steps,
    nextIndex: firstIncomplete === -1 ? steps.length - 1 : firstIncomplete,
    doneCount,
    allDone: firstIncomplete === -1,
  };
}

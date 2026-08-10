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

export const JOURNEY_STEPS = [
  {
    key: 'website',
    title: 'Build your website',
    purpose: 'Add your story, photos, and the pages guests will actually see.',
    route: '/studio/guest-suite',
    avaLine: "Let's start with your website — it's the first thing your guests see, so let's make it feel like you.",
    avaLineDone: "Your website's taking shape. Come back anytime to add more.",
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
    avaLine: "Time to bring your people in. Add your guest list to get started.",
    avaLineDone: "Your guest list is in. You can add more any time.",
    isComplete: (wedding, counts) => (counts?.guestCount || 0) > 0,
  },
  {
    key: 'rsvp',
    title: 'Turn on RSVP',
    purpose: 'Set meal options, plus-ones, and your reply deadline.',
    route: '/studio/guest-suite',
    avaLine: "Let's make it easy for guests to say yes — set up your RSVP details.",
    avaLineDone: "RSVP is set up. Guests will know exactly how to respond.",
    isComplete: (wedding) => !!(wedding?.rsvpContent && Object.keys(wedding.rsvpContent).length > 0),
  },
  {
    key: 'publish',
    title: 'Publish your website',
    purpose: 'Go live so guests can find everything in one place.',
    route: '/studio/guest-suite/share',
    avaLine: "Everything's ready — let's take your website live.",
    avaLineDone: "Your website is live.",
    isComplete: (wedding) => !!wedding?.websiteEnabled,
  },
  {
    key: 'budget',
    title: 'Set your budget',
    purpose: 'Put a number on it, then track it as you book.',
    route: '/Budget?ava_focus=budget',
    avaLine: "Let's put a number on this wedding — a budget now saves you stress later.",
    avaLineDone: "Your budget's set. Keep tracking as you book.",
    isComplete: (wedding) => (wedding?.budget?.total || 0) > 0,
  },
  {
    key: 'vendors',
    title: 'Add your vendors',
    purpose: "Already booked?, keep every contact in one place. Still looking?, browse the marketplace.",
    route: '/Vendors?ava_focus=vendors',
    avaLine: "Add the vendors you've already booked, or start browsing to fill the gaps.",
    avaLineDone: "Your vendors are in one place. Nice.",
    isComplete: (wedding, counts) => (counts?.vendorCount || 0) > 0,
  },
  {
    key: 'day',
    title: 'Plan the day',
    purpose: 'Lock in your ceremony venue, time, and order of events.',
    route: '/event-details?ava_focus=day',
    avaLine: "Last one — let's lock in your ceremony details so the day has a shape.",
    avaLineDone: "The day is planned. You're in great shape.",
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

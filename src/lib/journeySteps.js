/**
 * src/lib/journeySteps.js
 *
 * The PURE half of the setup journey: the step definitions and the
 * completeness/ordering/plan logic, with NO data-client imports.
 *
 * Split out of setupJourney.js on 2026-08-19 so the decisions can be tested
 * under plain Node. setupJourney.js imports a Vite-aliased data client, which
 * a test runner cannot resolve — the same reason dashboardSources.js takes its
 * loaders as arguments. Logic that decides something should not require a
 * browser to exercise.
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
    // DELIBERATELY does NOT require 'website'. RSVP tokens resolve at
    // /rsvp/<token> independently of any published site, so a couple can run
    // their entire RSVP flow on emailed links alone and never publish. Adding
    // requires: ['website'] here would invent a dependency the product does
    // not have and would stall couples who are doing it the emailed-link way.
    // (advisor ruling, 2026-08-19 — do not "fix" this.)
    title: 'Turn on RSVP',
    purpose: 'Set meal options, plus-ones, and your reply deadline.',
    route: '/studio/guest-suite',
    image: img('DTS_Philia_Daniel_Far%C3%B2_Photos_ID4659_pnnku3.jpg'),
    ultraGated: true,
    isComplete: (wedding) => !!(wedding?.rsvpContent && Object.keys(wedding.rsvpContent).length > 0),
  },
  {
    key: 'publish',
    // The ONLY ordering constraint in this list. Publishing a site whose core
    // pages are empty puts a hollow site in front of guests, so publish waits
    // for build.
    requires: ['website'],
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

export function getJourneyProgress(wedding, counts, { plan = 'ultra' } = {}) {
  const hasUltra = plan === 'ultra';
  const byKey = {};
  const steps = JOURNEY_STEPS.map((s) => {
    const done = s.isComplete(wedding, counts);
    byKey[s.key] = done;
    return { ...s, done };
  });

  // A step is PROPOSABLE only if it is incomplete, its prerequisites are met,
  // and the couple's plan can actually action it. The plan check is what stops
  // orientation turning into upsell pressure: a free-plan couple is pointed at
  // work they can do, never at a paywall dressed as a next step.
  for (const s of steps) {
    s.blockedBy = (s.requires || []).filter((k) => !byKey[k]);
    s.planLocked = s.ultraGated && !hasUltra;
    s.proposable = !s.done && s.blockedBy.length === 0 && !s.planLocked;
  }

  const nextIndex = steps.findIndex((s) => s.proposable);
  const doneCount = steps.filter((s) => s.done).length;

  // allDone and nothingProposable are DIFFERENT questions and conflating them
  // is what would produce a wrong closing line. A free-plan couple who has
  // finished every step they can action has nothing proposable and is NOT
  // done — showing them "all complete" would be a lie, and showing them an
  // upgrade prompt would be the upsell pressure this layer must not become.
  const allDone = steps.every((s) => s.done);

  return {
    steps,
    /** Index of the first proposable step, or -1 when there is none. */
    nextIndex,
    doneCount,
    allDone,
    nothingProposable: nextIndex === -1,
  };
}

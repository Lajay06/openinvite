/**
 * src/lib/avaStudioCopy.js
 *
 * Deterministic, wedding-aware narration for each Ava Studio step — same
 * sentence-construction technique as the onboarding wizard's own
 * OnboardingStep7Ava.jsx ("Ava knows you're planning a {type} wedding for
 * {count} guests {location}"), extended to all 7 journey steps and to both
 * the todo and done state of each. Static templates, no live LLM call —
 * every value is read straight off the real WeddingDetails record, with a
 * generic fallback whenever a field hasn't been filled in yet so no
 * template ever renders an awkward gap.
 */

import { getUniverse } from '@/lib/universeCatalog';

import { coupleDisplayName } from '@/lib/coupleNames';
function coupleNames(wedding) {
  return (
    coupleDisplayName(wedding)
  );
}

function guestCountPhrase(wedding, counts) {
  const declared = wedding?.guestCount;
  const added = counts?.guestCount;
  if (declared) return `${declared} guests`;
  if (added) return `${added} guest${added === 1 ? '' : 's'}`;
  return 'your guests';
}

function locationPhrase(wedding) {
  const address = wedding?.mainCeremony?.address;
  const venue = wedding?.mainCeremony?.venueName;
  if (venue && address) return `at ${venue}`;
  if (address) return `in ${address}`;
  if (venue) return `at ${venue}`;
  return '';
}

function weddingStyleWord(wedding) {
  return wedding?.weddingStyle?.[0] || 'beautiful';
}

function faithPhrase(wedding) {
  const faith = wedding?.theme?.faith;
  return faith ? `A ${faith} ceremony` : 'Your ceremony';
}

function universeName(wedding) {
  const u = getUniverse(wedding?.activeUniverse || 'london');
  return u?.name || 'your';
}

// A trailing space-safe join — drops a phrase entirely rather than leaving
// a double space or dangling word when a template's optional part is ''.
function join(...parts) {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function cap(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : str;
}

const TEMPLATES = {
  website: (wedding, counts) => {
    const names = coupleNames(wedding);
    const universe = universeName(wedding);
    const guests = guestCountPhrase(wedding, counts);
    return {
      todo: names
        ? `${names}, your ${universe} website is the first thing ${guests} will see — let's make it feel like you.`
        : `Your ${universe} website is the first thing your guests will see — let's make it feel like you.`,
      done: `Your ${universe} website is taking shape. Come back anytime to add more.`,
    };
  },
  guests: (wedding, counts) => {
    const guests = wedding?.guestCount ? `${wedding.guestCount} guests` : 'your guest list';
    const loc = locationPhrase(wedding);
    const names = coupleNames(wedding);
    return {
      todo: cap(join(`${guests}${loc ? ` ${loc}` : ''} — let's get everyone into one place.`)),
      done: names ? `${names}'s guest list is in. Add more any time.` : `Your guest list is in. Add more any time.`,
    };
  },
  rsvp: (wedding, counts) => {
    const guests = guestCountPhrase(wedding, counts);
    return {
      todo: `${cap(guests)}, one clear way to say yes. Set your meal options and reply deadline.`,
      done: `RSVP is set up — your guests know exactly how to respond.`,
    };
  },
  publish: (wedding) => {
    const names = coupleNames(wedding);
    return {
      todo: names ? `${names}'s website is ready — time to go live.` : `Your website is ready — time to go live.`,
      done: names ? `You're live! ${names}'s wedding website is out in the world.` : `You're live! Your wedding website is out in the world.`,
    };
  },
  budget: (wedding) => {
    const style = weddingStyleWord(wedding);
    const names = coupleNames(wedding);
    return {
      todo: `Every ${style} wedding has a lot of moving pieces — let's put a number on ${names ? `${names}'s` : 'yours'}.`,
      done: `Your budget's set. Keep tracking as you book.`,
    };
  },
  vendors: (wedding) => {
    const names = coupleNames(wedding);
    return {
      todo: `Track who's booked for ${names ? `${names}'s` : 'your'} big day — or find who's still missing.`,
      done: `Your vendors are all in one place. Nice.`,
    };
  },
  day: (wedding) => {
    const names = coupleNames(wedding);
    const loc = wedding?.mainCeremony?.address || wedding?.mainCeremony?.venueName || '';
    const faith = faithPhrase(wedding);
    const where = loc ? ` in ${loc}` : '';
    return {
      todo: `${faith} deserves every detail nailed down — let's lock in ${names ? `${names}'s` : 'your'} day${where}.`,
      done: `The day is planned. You're in great shape.`,
    };
  },
};

/** @returns {{todo: string, done: string}} */
export function personalizeStep(stepKey, wedding, counts) {
  const fn = TEMPLATES[stepKey];
  if (!fn) return { todo: '', done: '' };
  return fn(wedding || {}, counts || {});
}

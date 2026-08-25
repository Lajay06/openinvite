/**
 * src/lib/goodToKnow.js
 *
 * Which of the couple's "Good to know" items a guest actually sees, and the
 * sentences they read. Pure — no React, no DOM — so the published page, the
 * builder preview, the nav and tests/persistence/publish-parity.mjs all call
 * ONE implementation rather than four that drift.
 *
 * D-1b. Before this, `weddingPolicies` was read by exactly two files in the
 * repo and nothing anywhere read a policy's `display` flag: the dashboard
 * promised these would "appear in the Policies section of your wedding
 * website and Experience Guide" and neither destination existed.
 *
 * The couple's own words lead wherever they wrote any. Where they wrote
 * nothing, the option they picked still says something useful on its own —
 * and where they wrote nothing AND picked nothing, the section does not
 * render at all, because an empty heading is its own small broken promise.
 */

/** Guest-voiced sentences for the option vocabularies the dashboard offers. */
const CHILDREN_LINE = {
  all: 'Children are very welcome.',
  wedding_party: 'Children of the wedding party are welcome.',
  adults_only: 'This is an adults-only celebration.',
};

const GIFTS_LINE = {
  welcome: 'Gifts are welcome, though your presence is the part that matters.',
  no_gifts: 'No gifts, please — having you there is more than enough.',
  charity: 'In place of gifts, a donation to charity would mean a great deal.',
  wishing_well: 'There will be a wishing well on the day, if you would like to give.',
};

/**
 * Guest order, not dashboard order: what a guest needs in order to get ready,
 * then what they need on the day, then how to behave about it.
 */
const SECTIONS = [
  { key: 'dressCode', title: 'What to wear' },
  { key: 'children', title: 'Children' },
  { key: 'dietary', title: 'Food and dietary needs' },
  { key: 'gifts', title: 'Gifts' },
  { key: 'photography', title: 'Photographs' },
  { key: 'socialMedia', title: 'Sharing online' },
  { key: 'lateArrival', title: 'Running late' },
  { key: 'other', title: 'Anything else' },
];

/** @returns {string[]} the lines a section shows, already in reading order. */
export function linesFor(key, p) {
  if (!p) return [];
  const out = [];
  switch (key) {
    case 'dressCode':
      if (p.guidance) out.push(p.guidance);
      if (p.weatherNote) out.push(p.weatherNote);
      break;
    case 'children':
      if (CHILDREN_LINE[p.option]) out.push(CHILDREN_LINE[p.option]);
      if (p.message) out.push(p.message);
      break;
    case 'dietary':
      if (p.description) out.push(p.description);
      if (p.contactName || p.contactEmail) {
        out.push(`Let ${p.contactName || 'us'} know${p.contactEmail ? ` at ${p.contactEmail}` : ''}.`);
      }
      break;
    case 'gifts':
      if (GIFTS_LINE[p.option]) out.push(GIFTS_LINE[p.option]);
      if (p.message) out.push(p.message);
      break;
    case 'photography':
      if (p.unplugged) out.push('We are having an unplugged ceremony — please keep phones and cameras away until afterwards.');
      if (p.message) out.push(p.message);
      break;
    case 'socialMedia':
      if (p.noCeremony) out.push('Please hold off posting until after the ceremony.');
      if (p.tagUs && p.hashtag) out.push(`If you share anything, use ${p.hashtag}.`);
      else if (p.hashtag) out.push(`Our hashtag is ${p.hashtag}.`);
      if (p.message) out.push(p.message);
      break;
    case 'lateArrival':
      if (p.policy) out.push(p.policy);
      break;
    case 'other':
      if (p.text) out.push(p.text);
      break;
    default:
      break;
  }
  return out;
}

/** A section shows only when the couple turned it on AND it has something to say. */
export function visibleSections(weddingPolicies) {
  const policies = weddingPolicies || {};
  return SECTIONS
    .map(s => ({ ...s, lines: policies[s.key]?.display ? linesFor(s.key, policies[s.key]) : [] }))
    .filter(s => s.lines.length > 0);
}

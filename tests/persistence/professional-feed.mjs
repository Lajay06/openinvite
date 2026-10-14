/**
 * tests/persistence/professional-feed.mjs
 *
 * Openinvite Professional: the linked-couple feed never carries a guest's
 * contact details, ids, tokens or ciphertext, and a link that is not live
 * returns nothing. goals/2026-10-14-professional.md, Privacy.
 *
 * Credential-free. The input rows are deliberately loaded with every field
 * that must never leave (email, phone, mailing address, id, the RSVP token
 * hashes, the PII blob), so the allowlist is tested against the worst row the
 * server could ever hand it.
 *
 * PLANT (R19, run beside the fix): a passthrough projection, `{ ...guest }`,
 * the shape this module exists to forbid, goes through the same detector and
 * must be caught. If the detector ever stops seeing it, the green above it
 * means nothing.
 */
import { pass, fail } from './_shared.mjs';
import {
  buildLinkedFeed, forbiddenInFeed, isLinkLive, normalizeShares, frozenTotals, SHARE_DEFAULTS,
} from '../../api/_lib/professionalFeed.js';

const WORST_GUEST = (i, over = {}) => ({
  id: `guest_${i}`,
  name: `Guest ${i}`,
  email: `guest${i}@example.com`,
  phone: '+1 415 555 0199',
  mailing_address: '1 Main St, Napa CA',
  plus_one_email: `plus${i}@example.com`,
  encrypted_guest_pii: 'v1.aaaa.bbbb.cccc',
  rsvp_link_id_hash: 'f'.repeat(64),
  rsvp_link_id_enc: 'v1.x.y.z',
  created_by_id: 'user_couple',
  notes: 'private note from the couple',
  rsvp_status: 'attending',
  plus_one: true,
  plus_one_name: `Plus ${i}`,
  dietary_restrictions: 'Vegan',
  special_requests: 'Wheelchair access',
  meal_label: 'Risotto',
  table_assignment: 'Table 3',
  is_child: false,
  ...over,
});
const APPROVED = [
  { event_type: 'request', created_date: '2026-10-01T00:00:00Z' },
  { event_type: 'approve', created_date: '2026-10-02T00:00:00Z', shares: { ...SHARE_DEFAULTS, schedule: true, vendors: true, budget: true, songs: true, accessibility: true } },
];
const WEDDING = { id: 'wd_1', weddingDate: '2026-11-20', venueName: 'The Glasshouse', ceremonyTime: '16:00', created_by_id: 'user_couple', ownerEmail: 'couple@example.com' };
const EXTRAS = {
  schedule: [{ time: '16:00', title: 'Ceremony', location: 'Lawn', id: 's1', created_by_id: 'u' }],
  vendors: [{ category: 'Florist', name: 'Wild Stem', email: 'ruth@example.com', phone: '1', id: 'v1' }],
  budget: { total: 50000, spent: 21000, id: 'b1' },
  songs: [{ title: 'Dancing Queen', guest_id: 'guest_1', email: 'x@example.com' }],
};

export function runProfessionalFeed() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, the linked feed allowlist:\n');

  const guests = [WORST_GUEST(1), WORST_GUEST(2, { rsvp_status: 'declined' }), WORST_GUEST(3, { rsvp_status: 'pending', is_child: true })];
  const feed = buildLinkedFeed({ linkRows: APPROVED, guests, wedding: WEDDING, extras: EXTRAS });

  const hits = forbiddenInFeed(feed);
  check('professional feed: every switch on, no email, phone, address, id, token, _enc or _hash leaves', hits.length === 0, hits.join(', ') || 'clean');
  const json = JSON.stringify(feed);
  const leaks = ['@example.com', '555 0199', 'Main St', 'guest_1', 'v1.aaaa', 'ffffffff', 'private note', 'user_couple', 'wd_1'].filter((s) => json.includes(s));
  check('professional feed: no planted contact value appears anywhere in the response text', leaks.length === 0, leaks.join(', ') || 'none of 9 planted values');
  check('professional feed: names, meals and tables arrive when shared', feed.guests?.[0]?.name === 'Guest 1' && feed.meals?.Risotto === 1 && feed.guests[0].table === 'Table 3', JSON.stringify(feed.guests?.[0]));
  check('professional feed: totals count coming, not coming and waiting', feed.totals.coming === 1 && feed.totals.not_coming === 1 && feed.totals.waiting === 1 && feed.totals.plus_ones === 1, JSON.stringify(feed.totals));

  const revoked = [...APPROVED, { event_type: 'unlink', created_date: '2026-10-03T00:00:00Z' }];
  check('professional feed: an unlinked couple returns nothing', buildLinkedFeed({ linkRows: revoked, guests, wedding: WEDDING }) === null, 'null');
  const tie = [...APPROVED, { event_type: 'unlink', created_date: '2026-10-02T00:00:00Z' }];
  check('professional feed: an unlink at the same instant as an approval wins', !isLinkLive(tie), 'not live');
  check('professional feed: a request the couple never approved returns nothing', buildLinkedFeed({ linkRows: [APPROVED[0]], guests, wedding: WEDDING }) === null, 'null');
  check('professional feed: no link rows at all returns nothing', buildLinkedFeed({ linkRows: [], guests, wedding: WEDDING }) === null, 'null');

  const defaults = buildLinkedFeed({ linkRows: [{ event_type: 'approve', created_date: '2026-10-02T00:00:00Z' }], guests, wedding: WEDDING, extras: EXTRAS });
  const offByDefault = ['schedule', 'vendors', 'budget', 'songs'].filter((k) => k in defaults);
  check('professional feed: schedule, vendors, budget and songs stay out unless the couple turns them on', offByDefault.length === 0 && !('accessibility' in defaults.guests[0]), offByDefault.join(', ') || 'all four absent');

  const noNames = buildLinkedFeed({ linkRows: [{ event_type: 'approve', created_date: '2026-10-02T00:00:00Z', shares: { names: false } }], guests, wedding: WEDDING });
  check('professional feed: with names off, no guest or plus-one name is sent', !JSON.stringify(noNames).includes('Guest 1') && !JSON.stringify(noNames).includes('Plus 1'), 'names absent');

  const sh = normalizeShares({ totals: 'yes', email: true, names: false });
  check('professional feed: a stored switch that is not a known key cannot open a field', !('email' in sh) && sh.totals === true && sh.names === false, JSON.stringify(sh));

  const frozen = frozenTotals(feed);
  check('professional feed: the frozen copy after an unlink holds totals only', frozen && !JSON.stringify(frozen).includes('Guest') && Object.keys(frozen).length === 6, JSON.stringify(frozen));

  // PLANT: the passthrough this module forbids. The detector must see it.
  const planted = { guests: guests.map((g) => ({ ...g })) };
  const plantHits = forbiddenInFeed(planted);
  check('PLANT: a passthrough projection is caught by the detector', plantHits.length >= 9, `${plantHits.length} hits, e.g. ${plantHits.slice(0, 3).join(', ')}`);
  return r;
}

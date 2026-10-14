/**
 * tests/persistence/professional-vendors.mjs
 *
 * Openinvite Professional: vendor links and the vendor's page.
 * goals/2026-10-14-professional.md, What a professional gets, 5, and Team and
 * access: a private link, revocable, expiring 7 days after the event, showing
 * the vendor's own items and nothing about guests, money or other vendors.
 *
 * PLANT (R19): a view built by spreading the booking must be caught by the
 * same "no money, no contact" check.
 */
import { pass, fail } from './_shared.mjs';
import { insuranceState, linkExpiresAt, isVendorLinkLive, newLinkToken, TOKEN_RE, vendorSheetView } from '../../src/lib/professionalVendors.js';

const MONEY_OR_CONTACT = /fee|deposit|amount|email|guest|token|_hash|_enc|^id$|vendor_id|event_id|workspace_id/i;
const keysDeep = (v, out = []) => {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.push(k); keysDeep(x, out); }
  return out;
};

export function runProfessionalVendors(view = vendorSheetView) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, vendors and vendor links:\n');

  const now = new Date('2026-10-14T12:00:00Z');
  check('professional vendors: insurance reads expired, soon, on file or missing', insuranceState('2026-10-01', now) === 'expired' && insuranceState('2026-10-30', now) === 'soon' && insuranceState('2027-06-01', now) === 'ok' && insuranceState('', now) === 'none', 'four states');

  check('professional vendors: a link expires at the end of the seventh day after the event', linkExpiresAt('2026-11-07') === '2026-11-14T23:59:59.000Z', linkExpiresAt('2026-11-07'));
  const live = { link_token: 't', link_expires_at: '2026-11-14T23:59:59.000Z' };
  check('professional vendors: a link works before it expires', isVendorLinkLive(live, now), 'live');
  check('professional vendors: a link stops after it expires', !isVendorLinkLive(live, new Date('2026-11-15T00:00:01Z')), 'expired');
  check('professional vendors: a turned-off link stops at once', !isVendorLinkLive({ ...live, link_revoked: true }, now), 'revoked');
  check('professional vendors: no token, or no expiry, is no link', !isVendorLinkLive({ link_expires_at: live.link_expires_at }, now) && !isVendorLinkLive({ link_token: 't' }, now), 'none');

  const a = newLinkToken();
  const b = newLinkToken();
  check('professional vendors: tokens are 32 random bytes, url-safe, never repeated', TOKEN_RE.test(a) && TOKEN_RE.test(b) && a !== b, `${a.length} chars`);

  const v = view({
    event: { id: 'ev', couple_names: 'Maya and Theo', event_date: '2026-11-07', venue: 'The Glasshouse', workspace_id: 'ws' },
    booking: { id: 'vb', vendor_id: 'v', event_id: 'ev', role: 'Florist', fee: 4200, deposit: 1000, arrive: 540, finish: 1380, link_token: 'secret' },
    vendor: { id: 'v', company: 'Wild Stem', email: 'ruth@example.com', phone: '1', insurance_expires: '2027-01-01' },
    rows: [{ id: 'r', event_id: 'ev', sheet: 'Setup', start_minute: 540, duration_minutes: 120, item: 'Arch build', location: 'Lawn', cue: '', notes: 'Couple prefers white', owner_ref: 'v', status: 'todo' }],
    planner: { name: 'Holly', phone: '+1 415 555 0100', email: 'holly@example.com' },
  });
  const leaked = keysDeep(v).filter((k) => MONEY_OR_CONTACT.test(k));
  check('professional vendors: the vendor page carries no money, no contact details, no ids or tokens', leaked.length === 0, leaked.join(', ') || `${keysDeep(v).length} keys clean`);
  check('professional vendors: the vendor page carries no private notes', !JSON.stringify(v).includes('Couple prefers'), 'notes stay with the team');
  check('professional vendors: the vendor sees their items, times and the planner’s number', v.rows.length === 1 && v.arrive_minute === 540 && v.planner.phone === '+1 415 555 0100', 'shown');

  if (view === vendorSheetView) {
    const planted = (x) => ({ ...x.booking, vendor: x.vendor, rows: x.rows });
    const p = planted({ booking: { fee: 1, link_token: 't' }, vendor: { email: 'e@x.y' }, rows: [{ notes: 'n' }] });
    check('PLANT: a view spread from the booking is caught', keysDeep(p).some((k) => MONEY_OR_CONTACT.test(k)), keysDeep(p).filter((k) => MONEY_OR_CONTACT.test(k)).join(', '));
  }
  return r;
}

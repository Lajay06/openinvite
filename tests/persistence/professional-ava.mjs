/**
 * tests/persistence/professional-ava.mjs
 *
 * Openinvite Professional: Ava for professionals. goals/2026-10-14-professional.md,
 * What a professional gets, 16. The facts are computed by the same rules the
 * screens use; Ava only words them; she never sees a guest's name or any
 * contact detail.
 *
 * PLANT (R19): facts that carry a vendor's email must fail factsAreClean;
 * by hand, a facts builder that adds guest names fails the guest-name check.
 */
import { pass, fail } from './_shared.mjs';
import { factsFor, buildProPrompt, factsAreClean, PROMPTS, SYSTEM } from '../../src/lib/professionalAva.js';

const store = {
  ProEvent: [{ id: 'ev', couple_names: 'Maya and Theo', event_date: '2026-11-07', venue: 'The Glasshouse' }],
  ProMember: [{ id: 'sam', name: 'Sam Ortiz', email_display: 'sam@example.com', phone: '+1 415 555 0111' }],
  VendorContact: [{ id: 'v', company: 'Wild Stem', role: 'Florist', contact: 'Ruth', email: 'ruth@example.com', phone: '+1 415 555 0101' }],
  ProVendorBooking: [{ id: 'b', event_id: 'ev', vendor_id: 'v', role: 'Florist', arrive: 540, finish: 1380, fee: 4200 }],
  RunSheetRow: [
    { id: 'r1', event_id: 'ev', sheet: 'Setup', start_minute: 540, duration_minutes: 60, item: 'Arch build', owner_ref: 'v', location: 'Lawn', cue: '' },
    { id: 'r2', event_id: 'ev', sheet: 'Setup', start_minute: 720, duration_minutes: 30, item: 'Chairs', owner_ref: '', location: '', cue: '' },
  ],
  PaymentDue: [{ id: 'p', event_id: 'ev', label: 'Florist balance', amount: 3200, due_date: '2026-10-16', status: 'due' }],
  ProTask: [{ id: 't', event_id: 'ev', title: 'Confirm numbers', owner_id: 'sam', due_date: '2026-10-15', done: false }],
  ProGuest: [{ id: 'g', event_id: 'ev', name: 'Asha Rao', dietary: 'Vegetarian' }],
};

export function runProfessionalAva(build = factsFor) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, Ava:\n');
  const now = new Date('2026-10-14T12:00:00Z');
  const event = store.ProEvent[0];
  check('professional Ava: the three asks the goal names exist', PROMPTS.map((p) => p.key).join() === 'week,gaps,vendor', 'week, gaps, vendor');

  const week = build('week', { store, now });
  check('professional Ava: "due this week" is built from the payment and task rules', week.some((l) => l.includes('Florist balance, US$3,200')) && week.some((l) => l.includes('Confirm numbers')), week.join(' | '));
  const gaps = build('gaps', { store, event, now });
  check('professional Ava: "find gaps" carries the run sheet checks’ own findings', gaps.some((l) => /nothing runs from 10:00 am to 12:00 pm/.test(l)) && gaps.some((l) => /nobody responsible/.test(l)), gaps.slice(-2).join(' | '));
  const vendor = build('vendor', { store, event, now });
  check('professional Ava: "draft the vendor email" knows the vendor’s times and items', vendor.some((l) => /Wild Stem.*arrive 9:00 am, finish 11:00 pm/.test(l)) && vendor.some((l) => /Arch build/.test(l)), vendor.join(' | '));

  const all = [...week, ...gaps, ...vendor].join('\n');
  check('professional Ava: no email, phone or money beyond the payment line reaches the model', !/@/.test(all) && !/555/.test(all) && !/4,200|4200/.test(all), 'clean');
  check('professional Ava: no guest name reaches the model', !all.includes('Asha') && factsAreClean([...week, ...gaps, ...vendor], ['Asha Rao']), 'clean');
  check('professional Ava: she is told the house rules: facts only, no dashes, she never sends', /Use only the facts given/.test(SYSTEM) && /No dashes/.test(SYSTEM) && /never claim to have sent/.test(SYSTEM) && buildProPrompt('week', ['x']).startsWith(SYSTEM), 'in the prompt');

  if (build === factsFor) {
    check('PLANT: facts carrying a vendor email are refused', !factsAreClean(['Vendor: Wild Stem, ruth@example.com']), 'refused');
  }
  return r;
}

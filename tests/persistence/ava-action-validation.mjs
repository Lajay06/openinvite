/**
 * Ava action validation — the guard that stops LLM output reaching a write
 * path unchecked.
 *
 * Two obligations, and the second is the one that actually caught the bug:
 *
 *   1. entityFields.generated.js is IN SYNC with the RULE 12 mirror. A stale
 *      generated file is the same failure as the 2026-07 embedded snapshot
 *      (#483) — a second copy of the schema that can drift silently.
 *
 *   2. The validator refuses exactly what Ava's old prompt produced. These
 *      cases are pinned as REGRESSION FIXTURES, using the literal payloads the
 *      broken prompt taught, so that a future prompt edit reintroducing them
 *      fails here rather than in production.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { buildMap, render } from '../../scripts/generate-entity-fields.mjs';
import { validateAvaAction } from '../../src/lib/avaActionValidation.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const GENERATED = resolve(__dir, '../../src/lib/entityFields.generated.js');

export async function runAvaActionValidation() {
  const results = [];
  console.log('\n  Ava action validation — LLM output is checked against the schema before any write:\n');

  // ── 1. the generated file matches the mirror ──────────────────────────────
  const onDisk = readFileSync(GENERATED, 'utf8');
  const fresh = render(buildMap());
  results.push(onDisk === fresh
    ? pass('entityFields.generated.js is in sync with base44/entities/*.jsonc', `${Object.keys(buildMap()).length} entities`)
    : fail('entityFields.generated.js is STALE — run npm run generate:entity-fields',
        'regenerated output', 'committed file differs'));

  // ── 2. regression fixtures: the exact payloads the old prompt taught ──────
  const CASES = [
    {
      name: 'create_schedule with the old prompt\'s title/time is REFUSED',
      entity: 'Schedule', data: { title: 'Wedding ceremony', time: '15:00' },
      expect: (r) => !r.ok && r.stripped.includes('title') && r.stripped.includes('time')
        && r.missingRequired.length === 3,
    },
    {
      name: 'create_budget_item with total_amount is REFUSED (the money field)',
      entity: 'Budget', data: { category: 'catering', total_amount: 8000 },
      expect: (r) => !r.ok && r.stripped.includes('total_amount')
        && r.missingRequired.includes('budgeted_amount') && r.missingRequired.includes('item_name'),
    },
    {
      name: 'budget category "Catering" (wrong case) is REFUSED, not stored',
      entity: 'Budget', data: { category: 'Catering', item_name: 'x', budgeted_amount: 1 },
      expect: (r) => !r.ok && r.badEnum.some((b) => b.field === 'category'),
    },
    {
      name: 'rsvp_status "confirmed" is REFUSED — it matches no filter in this app',
      entity: 'Guest', data: { rsvp_status: 'confirmed' },
      opts: { isUpdate: true },
      expect: (r) => !r.ok && r.badEnum.some((b) => b.field === 'rsvp_status'),
    },
    // ── the admit half: correct payloads must still go through ─────────────
    {
      name: 'ADMIT: a correct schedule payload passes with all three fields',
      entity: 'Schedule',
      data: { event_name: 'Wedding ceremony', event_date: '2027-06-12', start_time: '15:00' },
      expect: (r) => r.ok && r.cleaned.event_name === 'Wedding ceremony'
        && r.cleaned.event_date === '2027-06-12' && r.cleaned.start_time === '15:00',
    },
    {
      name: 'ADMIT: a correct budget payload keeps the amount',
      entity: 'Budget', data: { category: 'catering', item_name: 'Wedding breakfast', budgeted_amount: 8000 },
      expect: (r) => r.ok && r.cleaned.budgeted_amount === 8000,
    },
    {
      name: 'ADMIT: create_vendor and update_vendor were already correct',
      entity: 'Vendor', data: { name: 'Golden Hour Photography', category: 'photography', status: 'researching' },
      expect: (r) => r.ok && r.cleaned.category === 'photography',
    },
    {
      name: 'ADMIT: update_guest to a real enum value passes',
      entity: 'Guest', data: { rsvp_status: 'attending' }, opts: { isUpdate: true },
      expect: (r) => r.ok && r.cleaned.rsvp_status === 'attending',
    },
    // ── structural ────────────────────────────────────────────────────────
    {
      name: 'server-managed id is stripped without being reported as unknown',
      entity: 'Vendor', data: { id: 'abc', status: 'booked' }, opts: { isUpdate: true },
      expect: (r) => r.ok && r.cleaned.id === undefined && !r.stripped.includes('id'),
    },
    {
      name: 'an unknown entity fails closed',
      entity: 'NotAnEntity', data: { x: 1 },
      expect: (r) => !r.ok && /Unknown entity/.test(r.error),
    },
    {
      name: 'an update is partial — required fields are not re-demanded',
      entity: 'Budget', data: { paid: true }, opts: { isUpdate: true },
      expect: (r) => r.ok && r.missingRequired.length === 0,
    },
  ];

  for (const c of CASES) {
    const r = validateAvaAction(c.entity, c.data, c.opts || {});
    results.push(c.expect(r)
      ? pass(c.name, r.error || 'ok')
      : fail(c.name, JSON.stringify(c.data), JSON.stringify({ ok: r.ok, stripped: r.stripped, missingRequired: r.missingRequired, badEnum: r.badEnum, error: r.error })));
  }

  // ── 3. the prompt itself must not teach a field that does not exist ───────
  const modal = readFileSync(resolve(__dir, '../../src/components/layout/AvaModal.jsx'), 'utf8');
  const banned = ['"total_amount"', '"title":"Wedding ceremony"', '"time":"15:00"', '"rsvp_status":"confirmed"'];
  const found = banned.filter((b) => modal.includes(b));
  results.push(found.length === 0
    ? pass('ACTION_INSTRUCTIONS teaches no field name the schema rejects', `${banned.length} known-bad patterns absent`)
    : fail('ACTION_INSTRUCTIONS still teaches a rejected field name', 'none of ' + banned.join(', '), found.join(', ')));

  return results;
}

/**
 * scripts/verify-attendees-live.mjs
 *
 * The live-data half of the attendee resolver's proof: the facts that are true
 * of one specific database rather than of the function.
 *
 * READ-ONLY. This script issues GET requests only. It never writes, updates or
 * deletes anything, which is why it is safe to point at production data.
 *
 * NOT wired into CI — CI has no credentials, and a guard that silently skips
 * when its inputs are missing is worse than no guard. This one refuses to run
 * rather than reporting a pass it did not earn.
 *
 * Usage:
 *   BASE44_TEST_EMAIL=... BASE44_TEST_PASSWORD=... node scripts/verify-attendees-live.mjs
 *
 * The pure properties (id uniqueness, determinism, round-trip, the
 * permission-flag rule, RSVP agreement with plusOne.js) are asserted without
 * credentials in scripts/test-attendees.mjs and run in CI.
 */

import { readFileSync } from 'node:fs';
import {
  resolveAttendees,
  isPlusOneId,
  hostIdFromAttendeeId,
} from '../src/lib/attendees.js';
import { plusOneRsvpStatus } from '../src/lib/plusOne.js';

for (const file of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
    }
  } catch { /* file may not exist */ }
}

const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const EMAIL = process.env.BASE44_TEST_EMAIL;
const PASS = process.env.BASE44_TEST_PASSWORD;
const BASE = 'https://base44.app/api';

// What the owner stated as the identity to hold. Overridable so this stays
// useful as the demo data changes, but the defaults are the numbers on record.
const EXPECT_PRIMARIES = Number(process.env.EXPECT_PRIMARIES || 202);
const EXPECT_PLUS_ONES = Number(process.env.EXPECT_PLUS_ONES || 40);

const results = [];
function check(label, pass, detail = '') {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${pass || !detail ? '' : `  -> ${detail}`}`);
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`${method} ${path} -> HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

async function run() {
  if (!EMAIL || !PASS) {
    console.error('\n  REFUSING TO RUN — BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD are not set.');
    console.error('  This script asserts facts about live data. With no credentials it can');
    console.error('  prove nothing, so it exits non-zero rather than printing a green run.\n');
    process.exit(2);
  }

  process.stdout.write('  Logging in... ');
  const auth = await api('POST', `/apps/${APP_ID}/auth/login`, { body: { email: EMAIL, password: PASS } });
  const token = auth.access_token;
  if (!token) throw new Error('No access_token in login response');
  console.log('done');

  const guests = await api('GET', `/apps/${APP_ID}/entities/Guest?limit=1000`, { token });
  console.log(`  Read ${guests.length} Guest records (read-only)\n`);

  const attendees = resolveAttendees(guests);
  const primaries = attendees.filter(a => !a.isPlusOne);
  const plusOnes = attendees.filter(a => a.isPlusOne);

  // ── the identity that is the point of the exercise ────────────────────────
  check(`${EXPECT_PRIMARIES} primaries`, primaries.length === EXPECT_PRIMARIES, `got ${primaries.length}`);
  check(`${EXPECT_PLUS_ONES} plus-ones`, plusOnes.length === EXPECT_PLUS_ONES, `got ${plusOnes.length}`);
  check(`${EXPECT_PRIMARIES + EXPECT_PLUS_ONES} attendees total`,
    attendees.length === EXPECT_PRIMARIES + EXPECT_PLUS_ONES, `got ${attendees.length}`);

  // ── ids ───────────────────────────────────────────────────────────────────
  const ids = attendees.map(a => a.id);
  check('every attendee id is unique', new Set(ids).size === ids.length,
    `${ids.length - new Set(ids).size} duplicate(s)`);

  const again = resolveAttendees(guests).map(a => a.id);
  check('ids are deterministic across two runs', JSON.stringify(again) === JSON.stringify(ids));

  const realIds = new Set(guests.map(g => g.id));
  const collisions = plusOnes.filter(a => realIds.has(a.id));
  check('no synthetic id collides with a real guest id', collisions.length === 0,
    collisions.map(a => a.id).join(', '));

  const badRoundTrip = plusOnes.filter(a => hostIdFromAttendeeId(a.id) !== a.hostGuestId || !realIds.has(a.hostGuestId));
  check('host guest id round-trips out of every synthetic id, and exists',
    badRoundTrip.length === 0, badRoundTrip.map(a => a.id).join(', '));
  check('isPlusOneId agrees with isPlusOne on every attendee',
    attendees.every(a => isPlusOneId(a.id) === a.isPlusOne));

  // ── the permission flag is not a person ───────────────────────────────────
  const permissionOnly = guests.filter(g =>
    g.plus_one === true && !String(g.plus_one_name || '').trim() && !String(g.plus_one_email || '').trim());
  const leaked = permissionOnly.filter(g => attendees.some(a => a.hostGuestId === g.id));
  check(`plus_one:true with no name/email yields no attendee (${permissionOnly.length} such record(s))`,
    leaked.length === 0, `${leaked.length} leaked`);

  // ── RSVP agreement, byte for byte ─────────────────────────────────────────
  const mismatched = plusOnes.filter(a => a.rsvpStatus !== plusOneRsvpStatus(a.guest));
  check('every plus-one RSVP equals plusOne.js plusOneRsvpStatus()',
    mismatched.length === 0,
    mismatched.slice(0, 5).map(a => `${a.hostGuestId}: ${a.rsvpStatus} vs ${plusOneRsvpStatus(a.guest)}`).join('; '));

  // ── MODEL 2, read-only reconnaissance (reported, not asserted) ────────────
  // Deliberately not a pass/fail: the owner is deciding the precedence rule and
  // needs the shape of the real disagreement, not a verdict on it.
  let withModel2 = 0, agreeCount = 0, disagreeCount = 0, disagreeNames = 0;
  const examples = [];
  for (const g of guests) {
    const responses = Array.isArray(g.event_responses) ? g.event_responses : [];
    const maxCount = responses.reduce((m, r) => Math.max(m, Number(r?.plus_ones) || 0), 0);
    const names = [...new Set(responses.flatMap(r => (r?.plus_one_names || []).filter(Boolean)))];
    if (maxCount === 0 && names.length === 0) continue;
    withModel2++;
    const flatHas = !!(String(g.plus_one_name || '').trim() || String(g.plus_one_email || '').trim());
    const flatName = String(g.plus_one_name || '').trim();
    const countAgrees = (maxCount > 0) === flatHas;
    const nameAgrees = names.length === 0 || !flatName || names.includes(flatName);
    if (countAgrees && nameAgrees) agreeCount++;
    else {
      disagreeCount++;
      if (!nameAgrees) disagreeNames++;
      if (examples.length < 8) {
        examples.push(`      ${g.id}  model2: count=${maxCount} names=[${names.join('|')}]  flat: name="${flatName}" email=${!!g.plus_one_email}`);
      }
    }
  }
  console.log('\n  ── MODEL 2 reconnaissance (read-only, not asserted) ──');
  console.log(`    guests with event_responses[].plus_ones > 0 or non-empty plus_one_names: ${withModel2}`);
  console.log(`    agree with the flat fields:    ${agreeCount}`);
  console.log(`    disagree with the flat fields: ${disagreeCount}  (of which name mismatches: ${disagreeNames})`);
  const flatOnly = guests.filter(g => {
    const responses = Array.isArray(g.event_responses) ? g.event_responses : [];
    const has2 = responses.some(r => (Number(r?.plus_ones) || 0) > 0 || (r?.plus_one_names || []).filter(Boolean).length);
    return !has2 && !!(String(g.plus_one_name || '').trim() || String(g.plus_one_email || '').trim());
  }).length;
  console.log(`    flat fields present but model 2 empty: ${flatOnly}`);
  if (examples.length) { console.log('    examples:'); examples.forEach(e => console.log(e)); }

  const passed = results.filter(Boolean).length;
  console.log(`\n  ${passed}/${results.length} ${results.every(Boolean) ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
  process.exit(results.every(Boolean) ? 0 : 1);
}

run().catch(err => { console.error(`\n  ERROR: ${err.message}\n`); process.exit(1); });

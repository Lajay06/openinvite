/**
 * A GUEST'S SECOND ANSWER IS THE ONE THAT COUNTS.
 *
 * Owner report, Run 6 U4: chose "No restrictions", saw it on the dashboard,
 * went back and changed it — the change never appeared. "Only capturing the
 * first time."
 *
 * ── WHERE IT WAS, AND WHERE IT WAS NOT ─────────────────────────────────────
 *
 * Not the write model: api/rsvp-submit.js appends and rsvpAggregation.js
 * resolves latest-wins per (guest_id_hash, is_plus_one, event_id). Not the
 * read: api/my-guests-rsvp.js takes latestGuestLevel(), decrypts it, and
 * overlays it on the Guest record. Not a client cache: the RSVP flow stores
 * nothing locally. Both halves of the model were right, which is what made the
 * report puzzling and the cause worth naming precisely.
 *
 * It was the CLIENT'S PAYLOAD, twice:
 *
 *   B  the details form's dietary pills started empty on every visit and the
 *      submit read `dietaryPicked.length ? <pills> : dietaryRestrictions`. A
 *      returning guest saw none of their own pills selected — which is what
 *      "I already answered" looks like — and an untouched control re-sent the
 *      FIRST answer. Clearing every pill could not clear anything either: no
 *      pills meant "keep the old string".
 *
 *   A  the primary tap (answerPrimary) sent no guest-level fields at all, and
 *      api/rsvp-submit.js writes that row unconditionally even when empty — by
 *      design, so a guest CAN clear a song request. So every re-tap of Yes/No
 *      wrote an empty row that won latest-wins and erased dietary, song
 *      request, note and email from the couple's dashboard.
 *
 * ── HOW THIS IS DRIVEN ─────────────────────────────────────────────────────
 *
 * The two client helpers are pure and live in src/lib/dietaryPills.js, so the journeys
 * below run the REAL parse/serialise, build rows the way api/rsvp-submit.js
 * builds them, and read them back through the REAL aggregation. No fixture
 * repeats a value the product computes: every expectation is the string a
 * guest would see.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDietaryPills, serializeDietaryPills } from '../../src/lib/dietaryPills.js';
import { latestGuestLevel } from '../../src/lib/rsvpAggregation.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HASH = 'hash-of-one-guest';
let clock = 1;

/** A guest-level row exactly as api/rsvp-submit.js writes one (minus the
 *  encryption, which is transport, not behaviour). */
const guestLevelRow = (payload) => ({
  id: `row-${clock}`,
  created_date: new Date(Date.UTC(2026, 0, 1, 0, 0, clock++)).toISOString(),
  guest_id_hash: HASH,
  is_plus_one: false,
  event_id: null,
  guest_level: payload,
});

/** What the dashboard shows, by the rule in api/my-guests-rsvp.js:199. */
const dashboardReads = (rows, guestRecord = {}) => {
  const latest = latestGuestLevel(rows)[0];
  const d = latest?.guest_level;
  return {
    dietary_restrictions: d?.dietary_restrictions ?? guestRecord.dietary_restrictions,
    song_request: d?.song_request ?? guestRecord.song_request,
    rsvp_note: d?.note ?? guestRecord.rsvp_note,
  };
};

export async function runRsvpChangesStick() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  console.log('\n  A guest changes their mind:\n');

  // ── THE OWNER'S JOURNEY ─────────────────────────────────────────────────
  {
    const rows = [];
    // 1. first submission: "No restrictions"
    let picked = ['No restrictions'];
    rows.push(guestLevelRow({ dietary_restrictions: serializeDietaryPills(picked, ''), song_request: 'Dancing Queen', note: 'Can we sit with the Turings?' }));
    check('the first answer reaches the dashboard', dashboardReads(rows).dietary_restrictions === 'No restrictions',
      dashboardReads(rows).dietary_restrictions);

    // 2. the guest returns. The form pre-fills from what they said.
    const reopened = parseDietaryPills(dashboardReads(rows).dietary_restrictions);
    check('  returning, the form shows their own answer selected',
      reopened.picked.length === 1 && reopened.picked[0] === 'No restrictions',
      `pills: [${reopened.picked.join(', ')}]`);

    // 3. they change it to Vegetarian (the exclusive pill swaps out)
    picked = ['Vegetarian'];
    rows.push(guestLevelRow({ dietary_restrictions: serializeDietaryPills(picked, ''), song_request: 'Dancing Queen', note: 'Can we sit with the Turings?' }));
    const after = dashboardReads(rows);
    check('  the change is what the dashboard reads', after.dietary_restrictions === 'Vegetarian', after.dietary_restrictions);
    check('    and the latest row is the one that says it',
      latestGuestLevel(rows)[0].guest_level.dietary_restrictions === 'Vegetarian', `${rows.length} rows, latest wins`);
  }

  // ── CLEARING IS AN ANSWER ───────────────────────────────────────────────
  {
    const rows = [guestLevelRow({ dietary_restrictions: 'Vegetarian' })];
    rows.push(guestLevelRow({ dietary_restrictions: serializeDietaryPills([], '') }));
    const after = dashboardReads(rows, { dietary_restrictions: 'Vegetarian' });
    check('clearing every pill clears the answer', after.dietary_restrictions === '',
      JSON.stringify(after.dietary_restrictions));
    check('  and it does not fall back to the Guest record',
      after.dietary_restrictions !== 'Vegetarian', 'an empty string is a value, not an absence');
  }

  // ── THE PRIMARY TAP DOES NOT ERASE ──────────────────────────────────────
  {
    const held = { dietary_restrictions: 'Vegetarian', song_request: 'Dancing Queen', note: 'Table 4 if you can' };
    const rows = [guestLevelRow(held)];
    const before = dashboardReads(rows);
    // The tap carries the current values forward, as answerPrimary now does.
    rows.push(guestLevelRow({ ...held }));
    const after = dashboardReads(rows);
    check('tapping the answer again changes nothing else',
      after.dietary_restrictions === before.dietary_restrictions
      && after.song_request === before.song_request && after.rsvp_note === before.rsvp_note,
      `${after.dietary_restrictions} · ${after.song_request} · ${after.rsvp_note}`);
  }

  // ── AND THE SOURCE STILL SAYS SO ────────────────────────────────────────
  {
    const page = code('src/components/rsvp/RSVPPage.jsx');
    check('the pills are pre-filled from the loaded guest', /setDietaryPicked\(picked\)/.test(page),
      'parseDietaryPills on load');
    check('  the submit has no keep-the-old fallback',
      !/dietaryPicked\.length[\s\S]{0,120}?:\s*dietaryRestrictions/.test(page)
      && /dietary_restrictions: serializeDietaryPills\(dietaryPicked, dietaryOther\)/.test(page),
      'the pills are the answer');
    check('  and the primary tap sends the guest-level fields',
      /writeResponses\([\s\S]{0,400}?dietary_restrictions: serializeDietaryPills/.test(page),
      'answerPrimary carries them forward');
    const api = code('api/rsvp-submit.js');
    check('  while the endpoint keeps writing that row unconditionally',
      /createRsvpResponse\(\{[\s\S]{0,300}?event_id: null/.test(api),
      'the clearing mechanism is untouched — a caller that wants to clear says so');
  }

  return results;
}

/**
 * scripts/migrate-rsvp-tokens.mjs
 *
 * Track E migration: backfill rsvp_link_id_hash + rsvp_link_id_enc (and the
 * plus-one pair) for every Guest row that already holds a plaintext token.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-rsvp-tokens.mjs                    # dry run
 *   node --env-file=.env.local scripts/migrate-rsvp-tokens.mjs --execute \
 *        --expect-rows=<n>                                                        # writes
 *
 * DRY RUN IS THE DEFAULT. --execute is required to write anything, and
 * --expect-rows is required alongside it.
 *
 * ── Why this is run at all, rather than closed as a no-op ───────────────────
 * Every earlier stage in this programme closed its migration as a no-op
 * because there were genuinely zero rows. This one has 202. They are synthetic
 * fixture rows, and the tempting move is to close it the same way and let the
 * fixtures be re-imported — but a migration that is never run is a migration
 * that is never proven, the same shape as a gate that only ever asserts
 * refusal. These rows are the only opportunity to exercise this path against
 * real stored data before a real couple's guest list exists.
 *
 * ── Why it authenticates as the row owner ───────────────────────────────────
 * Guest.update RLS is {created_by_id: "{{user.id}}"}. The admin key has no
 * session identity and gets a flat 403 on update (gotcha #1). Reads are open,
 * but this script reads with the owner's token too, so the set it counts is
 * exactly the set it can write.
 *
 * ── NO SHAPE VALIDATION ─────────────────────────────────────────────────────
 * Tokens are opaque. 201 of the 202 are uuidv4 and ONE is a 27-character
 * legacy value. A uuid-shaped filter anywhere here would skip that row
 * silently, and once E3 nulls the plaintext column that guest's invitation
 * link would be permanently unresolvable. Any row with a non-empty token
 * string is migrated, full stop.
 *
 * ── Row counting (gotcha #19) ───────────────────────────────────────────────
 * Base44's skip pagination overlaps and omits — 205 rows returned 200 unique
 * ids across pages, which read as data loss and was not. Everything here uses
 * ONE large-limit fetch and de-dupes into a Map by id. The --expect-rows guard
 * is only as good as the number it compares against, so it must be computed
 * the same deduped way.
 *
 * Token values are never printed. Hashes are shown truncated; ciphertext never.
 */

import { hashToken, encryptToken } from '../api/_lib/rsvpTokenCrypto.js';

const BASE44 = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const PAGE_LIMIT = 1000;

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const expectArg = args.find(a => a.startsWith('--expect-rows='));
const EXPECT = expectArg ? Number(expectArg.split('=')[1]) : null;

function die(msg) { console.error(`\nABORTED: ${msg}\n`); process.exit(1); }

async function api(method, path, token, body) {
  const res = await fetch(`${BASE44}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
const unwrap = (p) => Array.isArray(p) ? p : (p?.data || p?.results || []);

/** One large-limit fetch, deduped by id. See gotcha #19. */
async function fetchAllGuests(token, ownerId) {
  const q = encodeURIComponent(JSON.stringify({ created_by_id: ownerId }));
  const rows = unwrap(await api('GET', `/apps/${APP_ID}/entities/Guest?q=${q}&limit=${PAGE_LIMIT}`, token));
  const byId = new Map(rows.map(g => [g.id, g]));
  if (rows.length !== byId.size) {
    console.log(`  note: ${rows.length - byId.size} duplicate id(s) collapsed by dedupe`);
  }
  if (rows.length >= PAGE_LIMIT) {
    die(`guest count reached the ${PAGE_LIMIT} fetch limit — paging would be required and skip pagination is unreliable (gotcha #19). Raise PAGE_LIMIT and re-run.`);
  }
  return [...byId.values()];
}

// ── preconditions ───────────────────────────────────────────────────────────
if (!process.env.RSVP_TOKEN_KEY) die('RSVP_TOKEN_KEY is not set. Without it every hash would be unmatchable.');
if (EXECUTE && EXPECT === null) die('--execute requires --expect-rows=<n> (STANDING-RULES RULE 8).');
if (EXPECT !== null && !Number.isInteger(EXPECT)) die('--expect-rows must be an integer.');

const email = process.env.BASE44_TEST_EMAIL;
const password = process.env.BASE44_TEST_PASSWORD;
if (!email || !password) die('BASE44_TEST_EMAIL / BASE44_TEST_PASSWORD are required — the write must run as the row owner.');

const login = await api('POST', `/apps/${APP_ID}/auth/login`, '', { email, password })
  .catch(() => null)
  || await fetch(`${BASE44}/apps/${APP_ID}/auth/login`, {
       method: 'POST', headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email, password }),
     }).then(r => r.json());
const token = login.access_token;
const ownerId = login.user?.id;
if (!token || !ownerId) die('login failed');

console.log(`\nTrack E token migration — ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
console.log(`owner: ${ownerId}\n`);

const guests = await fetchAllGuests(token, ownerId);

// ── classify ────────────────────────────────────────────────────────────────
const needsPrimary  = guests.filter(g => g.rsvp_link_id && (!g.rsvp_link_id_hash || !g.rsvp_link_id_enc));
const needsPlusOne  = guests.filter(g => g.plus_one_rsvp_link_id && (!g.plus_one_rsvp_link_id_hash || !g.plus_one_rsvp_link_id_enc));
const targets = [...new Set([...needsPrimary, ...needsPlusOne])];

const alreadyDone   = guests.filter(g => g.rsvp_link_id && g.rsvp_link_id_hash && g.rsvp_link_id_enc);
const noToken       = guests.filter(g => !g.rsvp_link_id && !g.plus_one_rsvp_link_id);

console.log('SCAN');
console.log(`  guest rows (deduped)          : ${guests.length}`);
console.log(`  with a primary token          : ${guests.filter(g => g.rsvp_link_id).length}`);
console.log(`  with a plus-one token         : ${guests.filter(g => g.plus_one_rsvp_link_id).length}`);
console.log(`  already migrated              : ${alreadyDone.length}`);
console.log(`  no token at all (skipped)     : ${noToken.length}`);
console.log(`  TO MIGRATE                    : ${targets.length}`);

// Token-shape census — informational, never a filter.
const shapes = {};
for (const g of targets) {
  for (const t of [g.rsvp_link_id, g.plus_one_rsvp_link_id].filter(Boolean)) {
    const k = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? 'uuidv4' : `non-uuid(len ${t.length})`;
    shapes[k] = (shapes[k] || 0) + 1;
  }
}
console.log(`  token shapes                  : ${JSON.stringify(shapes)}`);
console.log('  (shape is reported, never filtered on — the non-uuid row must migrate too)\n');

if (EXPECT !== null && targets.length !== EXPECT) {
  die(`--expect-rows=${EXPECT} but ${targets.length} rows need migrating. Nothing written. Re-check the scan, then re-run with the correct number.`);
}

if (!EXECUTE) {
  console.log('DRY RUN — no writes performed.');
  console.log(`To execute:  node --env-file=.env.local scripts/migrate-rsvp-tokens.mjs --execute --expect-rows=${targets.length}\n`);
  process.exit(0);
}

// ── execute ─────────────────────────────────────────────────────────────────
let ok = 0; const failed = [];
for (const g of targets) {
  const patch = {};
  if (g.rsvp_link_id && (!g.rsvp_link_id_hash || !g.rsvp_link_id_enc)) {
    patch.rsvp_link_id_hash = hashToken(g.rsvp_link_id);
    patch.rsvp_link_id_enc = encryptToken(g.rsvp_link_id);
  }
  if (g.plus_one_rsvp_link_id && (!g.plus_one_rsvp_link_id_hash || !g.plus_one_rsvp_link_id_enc)) {
    patch.plus_one_rsvp_link_id_hash = hashToken(g.plus_one_rsvp_link_id);
    patch.plus_one_rsvp_link_id_enc = encryptToken(g.plus_one_rsvp_link_id);
  }
  // The plaintext column is deliberately NOT touched here. E3 nulls it, after
  // this migration has been verified.
  try {
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${g.id}`, token, patch);
    ok++;
  } catch (err) {
    failed.push({ id: g.id, error: err.message.slice(0, 120) });
  }
}
console.log(`WRITE  migrated ${ok}/${targets.length}${failed.length ? `, ${failed.length} FAILED` : ''}`);
for (const f of failed) console.log(`  FAIL ${f.id}: ${f.error}`);

// ── verify by independent re-read ───────────────────────────────────────────
const after = await fetchAllGuests(token, ownerId);
const stillNeeding = after.filter(g =>
  (g.rsvp_link_id && (!g.rsvp_link_id_hash || !g.rsvp_link_id_enc)) ||
  (g.plus_one_rsvp_link_id && (!g.plus_one_rsvp_link_id_hash || !g.plus_one_rsvp_link_id_enc)));
const mismatched = after.filter(g => g.rsvp_link_id && g.rsvp_link_id_hash !== hashToken(g.rsvp_link_id));
const plaintextLost = after.filter(g => !g.rsvp_link_id).length - noToken.filter(g => !g.rsvp_link_id).length;

console.log('\nVERIFY (independent re-read)');
console.log(`  rows still unmigrated         : ${stillNeeding.length}  ${stillNeeding.length === 0 ? 'OK' : 'PROBLEM'}`);
console.log(`  hash != hashToken(plaintext)  : ${mismatched.length}  ${mismatched.length === 0 ? 'OK' : 'PROBLEM'}`);
console.log(`  plaintext tokens lost         : ${plaintextLost}  ${plaintextLost === 0 ? 'OK (E3 nulls them, not this script)' : 'PROBLEM'}`);
process.exit(stillNeeding.length === 0 && mismatched.length === 0 && failed.length === 0 && plaintextLost === 0 ? 0 : 1);

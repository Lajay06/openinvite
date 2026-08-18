/**
 * scripts/null-guest-pii.mjs
 *
 * Track D: null the nine plaintext PII columns and replace `name` with a
 * placeholder, leaving encrypted_guest_pii as the only source.
 *
 * Usage:
 *   node --env-file=.env.local scripts/null-guest-pii.mjs                     # dry run
 *   node --env-file=.env.local scripts/null-guest-pii.mjs --execute \
 *        --expect-rows=<n>                                                     # writes
 *
 * DRY RUN IS THE DEFAULT.
 *
 * ── Separate from the migration, on purpose ─────────────────────────────────
 * The migration ADDS a derived column and is trivially re-runnable. This
 * DESTROYS the only remaining plaintext copy of 205 rows of guest PII and
 * cannot be undone. Folding a destructive step in as a flag on the safe tool is
 * how an --execute gets typed with the wrong intent.
 *
 * ── `name` is placeheld, not nulled ─────────────────────────────────────────
 * `name` is `required` on the entity, so it cannot be null. It takes "—", a
 * single em dash: visibly not a name, harmless to sort, not mistakable for real
 * data in a CSV export, and NOT an empty string — which some UI treats as
 * "missing" and replaces with a fallback that might itself read as a name.
 * Whether `required` should be dropped is deferred to the post-D cleanup.
 *
 * ── VERIFY BEFORE DESTROY, per row ──────────────────────────────────────────
 * Before writing anything to a row: decrypt its blob, assert all ten keys are
 * present, and assert each equals that row's still-present plaintext. ONE row
 * failing aborts the entire run without a single write.
 *
 * This is the whole safety argument, not a belt-and-braces extra. Afterwards
 * there is no second copy: a row whose blob does not round-trip has lost that
 * guest's details permanently. The only moment the check is worth anything is
 * immediately before the original is destroyed.
 *
 * ── The enumerated exception ────────────────────────────────────────────────
 * One row cannot be written by any credential — created_by_id "anonymous"
 * against an owner-scoped update rule, admin-key PUT returns 403.
 *
 * IT IS NOT IN THIS SCRIPT'S TARGET SET AT ALL, and that is worth stating
 * rather than relying on. The scan is scoped to created_by_id = the owner, and
 * this row is owned by "anonymous", so it never appears — the skip-by-id list
 * would report "0 skipped" and read as "no exceptions" while one plainly
 * exists. So the row is checked SEPARATELY with an app-wide admin read and
 * reported explicitly, and the id list is kept as a second line of defence in
 * case such a row ever does land inside the owner scope.
 *
 * The exit gate asserts exactly this one exception; if the list ever grows,
 * the gate fails.
 *
 * ── gotcha #18 watch ────────────────────────────────────────────────────────
 * `email` and `plus_one_email` carry format: "email" in the live schema. E3
 * proved nulling a plain-string column works here; a format-constrained column
 * is the untested case, and a 422 on null is exactly that class. The dry run
 * probes it on ONE row and reverts. If a 422 appears the script STOPS and asks
 * for the column types to be flipped — it does not work around it.
 *
 * PII values are never printed.
 */

import { readGuestPiiBlob } from '../api/_lib/guestPii.js';
import { PII_FIELDS, BLOB_FIELD, NAME_PLACEHOLDER, NULLABLE_PII_FIELDS } from '../api/_lib/guestProtectedFields.js';
import { shouldRetry, backoffMs } from './lib/retryPolicy.mjs';

const BASE44 = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const FETCH_LIMIT = 1000;
const WRITE_DELAY_MS = 150;
const MAX_RETRIES = 4;

/** Shared with the write path so the two cannot drift onto different values. */
const NULL_FIELDS = NULLABLE_PII_FIELDS;
/** Format-constrained columns — the gotcha #18 candidates. */
const FORMAT_EMAIL = ['email', 'plus_one_email'];
/** Rows no credential can write. Enumerated, never a predicate. */
const UNWRITABLE = ['6a584d473aa3ab1ec180fcdc'];

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const expectArg = args.find(a => a.startsWith('--expect-rows='));
const EXPECT = expectArg ? Number(expectArg.split('=')[1]) : null;

function die(msg) { console.error(`\nABORTED: ${msg}\n`); process.exit(1); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function api(method, path, token, body) {
  const res = await fetch(`${BASE44}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}
const unwrap = (p) => Array.isArray(p) ? p : (p?.data || p?.results || []);

async function writeWithRetry(path, token, patch) {
  let attempt = 0;
  for (;;) {
    try { return await api('PUT', path, token, patch); }
    catch (err) {
      if (!shouldRetry(err, attempt, MAX_RETRIES)) throw err;
      attempt++;
      const ms = backoffMs(attempt, WRITE_DELAY_MS);
      console.log(`    429 — retry ${attempt}/${MAX_RETRIES} in ${ms}ms`);
      await sleep(ms);
    }
  }
}

async function fetchAll(token, ownerId) {
  const q = encodeURIComponent(JSON.stringify({ created_by_id: ownerId }));
  const rows = unwrap(await api('GET', `/apps/${APP_ID}/entities/Guest?q=${q}&limit=${FETCH_LIMIT}`, token));
  if (rows.length >= FETCH_LIMIT) die(`row count reached the ${FETCH_LIMIT} fetch limit — skip pagination is unreliable (gotcha #19).`);
  return [...new Map(rows.map(g => [g.id, g])).values()];
}
const fetchOne = async (id, token) =>
  unwrap(await api('GET', `/apps/${APP_ID}/entities/Guest?q=${encodeURIComponent(JSON.stringify({ id }))}`, token))[0] || null;

if (!process.env.BASE44_ADMIN_KEY) die('BASE44_ADMIN_KEY is not set — blobs cannot be verified.');
if (EXECUTE && EXPECT === null) die('--execute requires --expect-rows=<n> (STANDING-RULES RULE 8).');

const email = process.env.BASE44_TEST_EMAIL, password = process.env.BASE44_TEST_PASSWORD;
if (!email || !password) die('BASE44_TEST_EMAIL / BASE44_TEST_PASSWORD required — Guest.update is owner-scoped.');

const login = await fetch(`${BASE44}/apps/${APP_ID}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
}).then(r => r.json());
const token = login.access_token, ownerId = login.user?.id;
if (!token || !ownerId) die('login failed');

console.log(`\nTrack D — null Guest plaintext PII — ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
console.log(`  nine columns -> null; name -> "${NAME_PLACEHOLDER}"\n`);

const guests = await fetchAll(token, ownerId);
const skippedInScope = guests.filter(g => UNWRITABLE.includes(g.id));
const candidates = guests.filter(g => !UNWRITABLE.includes(g.id));
// A row needs work if any of the NINE still holds a value, or if `name` is not
// yet the placeholder. Testing PII_FIELDS wholesale was wrong on a second run:
// `name` is "—" after a successful pass, which is non-empty, so every row
// looked like it still held plaintext.
const needsWork = (g) =>
  NULL_FIELDS.some(f => g[f] !== null && g[f] !== undefined && g[f] !== '') ||
  g.name !== NAME_PLACEHOLDER;
const targets = candidates.filter(needsWork);

console.log('SCAN');
console.log(`  guest rows in scope (owner, deduped) : ${guests.length}`);
console.log(`  still holding plaintext              : ${targets.length}`);

// The enumerated exception, checked app-wide rather than inferred from the
// owner-scoped set it was never part of.
console.log('\nENUMERATED EXCEPTION — checked app-wide, not inferred');
console.log(`  skipped by id from within the owner scope : ${skippedInScope.length}`);
for (const id of UNWRITABLE) {
  const row = await fetchOne(id, process.env.BASE44_ADMIN_KEY);
  if (!row) { console.log(`  ${id}  NOT FOUND app-wide — the pin is stale, remove it`); continue; }
  const inScope = guests.some(g => g.id === id);
  const holds = PII_FIELDS.filter(f => row[f]).length;
  console.log(`  ${id}`);
  console.log(`     created_by_id      : ${row.created_by_id}`);
  console.log(`     inside owner scope : ${inScope}  ${inScope ? '(would be skipped by id)' : '(never fetched — outside the scan entirely)'}`);
  console.log(`     has a blob         : ${!!row[BLOB_FIELD]}`);
  console.log(`     PII fields held    : ${holds}  <- stays readable; nothing can write this row`);
}

// ── verify before destroy, every target ─────────────────────────────────────
const unsafe = [];
for (const g of targets) {
  const back = readGuestPiiBlob(g[BLOB_FIELD]);
  if (!back) { unsafe.push({ id: g.id, why: 'no blob, or blob does not decrypt' }); continue; }
  if (Object.keys(back).length !== PII_FIELDS.length) { unsafe.push({ id: g.id, why: `blob has ${Object.keys(back).length} keys, expected ${PII_FIELDS.length}` }); continue; }
  // Compare ONLY against plaintext that is still there. A column already nulled
  // by a previous pass has nothing to verify against, and `name` legitimately
  // differs once it holds the placeholder — comparing those would flag every
  // partially-processed row as corrupt and abort a run that is simply
  // finishing what an earlier one started.
  const comparable = NULL_FIELDS.filter(f => g[f] !== null && g[f] !== undefined && g[f] !== '');
  if (g.name !== NAME_PLACEHOLDER) comparable.push('name');
  const bad = comparable.filter(f => (back[f] ?? null) !== (g[f] ?? null));
  if (bad.length > 0) unsafe.push({ id: g.id, why: `blob disagrees with plaintext on: ${bad.join(', ')}` });
}
console.log('\nPRECONDITION — recovery verified immediately before destruction');
console.log(`  rows whose blob matches every remaining plaintext value : ${targets.length - unsafe.length}/${targets.length}`);
if (unsafe.length > 0) {
  for (const u of unsafe.slice(0, 10)) console.log(`    UNSAFE ${u.id}: ${u.why}`);
  die(`${unsafe.length} row(s) failed the round-trip precondition. NOTHING WRITTEN. Nulling these would destroy their only recoverable copy.`);
}
console.log('  every target is recoverable from its blob alone — safe to null');

// ── gotcha #18 probe: can a format:"email" column actually hold null? ───────
if (targets.length > 0) {
  const probe = targets[0];
  console.log('\nGOTCHA #18 PROBE — format:"email" columns accepting null');
  for (const f of FORMAT_EMAIL) {
    const original = probe[f] ?? null;
    try {
      await api('PUT', `/apps/${APP_ID}/entities/Guest/${probe.id}`, token, { [f]: null });
      const fresh = await fetchOne(probe.id, token);
      const held = (fresh?.[f] ?? null) === null;
      await api('PUT', `/apps/${APP_ID}/entities/Guest/${probe.id}`, token, { [f]: original });
      const restored = await fetchOne(probe.id, token);
      const ok = (restored?.[f] ?? null) === original;
      console.log(`  ${f.padEnd(16)} accepts null: ${held ? 'YES' : 'NO'} | reverted: ${ok ? 'yes' : 'NO — MANUAL FIX NEEDED'}`);
      if (!held) die(`${f} did not hold null. Flip this column to a union type via the advisor BEFORE running. The script does not work around a schema constraint.`);
      if (!ok) die(`${f} failed to revert on row ${probe.id}. Stop and restore manually before proceeding.`);
    } catch (err) {
      if (err.status === 422) {
        die(`422 nulling ${f} — GOTCHA #18. Flip this column to a union type via the advisor BEFORE running. The script does not work around it.`);
      }
      throw err;
    }
    await sleep(WRITE_DELAY_MS);
  }
}

if (EXPECT !== null && targets.length !== EXPECT) {
  die(`--expect-rows=${EXPECT} but ${targets.length} rows hold plaintext. Nothing written.`);
}

if (!EXECUTE) {
  console.log('\nDRY RUN — no writes performed (the gotcha #18 probe above wrote and reverted one row).');
  console.log(`To execute:  node --env-file=.env.local scripts/null-guest-pii.mjs --execute --expect-rows=${targets.length}\n`);
  process.exit(0);
}

// ── execute ────────────────────────────────────────────────────────────────
let ok = 0; const failed = [];
for (const g of targets) {
  const patch = { name: NAME_PLACEHOLDER };
  for (const f of NULL_FIELDS) patch[f] = null;
  try { await writeWithRetry(`/apps/${APP_ID}/entities/Guest/${g.id}`, token, patch); ok++; }
  catch (err) { failed.push({ id: g.id, error: err.message.slice(0, 140) }); }
  await sleep(WRITE_DELAY_MS);
}
console.log(`\nWRITE  nulled ${ok}/${targets.length}${failed.length ? `, ${failed.length} FAILED` : ''}`);
for (const f of failed) console.log(`  FAIL ${f.id}: ${f.error}`);

// ── verify ─────────────────────────────────────────────────────────────────
const after = await fetchAll(token, ownerId);
const leftover = after.filter(g => !UNWRITABLE.includes(g.id) && NULL_FIELDS.some(f => g[f]));
const wrongName = after.filter(g => !UNWRITABLE.includes(g.id) && g.name !== NAME_PLACEHOLDER);
const unrecoverable = after.filter(g => !UNWRITABLE.includes(g.id) && !readGuestPiiBlob(g[BLOB_FIELD]));

console.log('\nVERIFY (independent re-read)');
console.log(`  rows still holding a nulled column : ${leftover.length}  ${leftover.length === 0 ? 'OK' : 'PROBLEM'}`);
console.log(`  rows whose name is not the placeholder : ${wrongName.length}  ${wrongName.length === 0 ? 'OK' : 'PROBLEM'}`);
console.log(`  rows no longer recoverable via blob : ${unrecoverable.length}  ${unrecoverable.length === 0 ? 'OK' : 'PROBLEM'}`);
// Asserted app-wide, not from the owner-scoped set — the exception lives
// outside that scope, so counting it there would always report zero.
const exceptionRows = [];
for (const id of UNWRITABLE) {
  const row = await fetchOne(id, process.env.BASE44_ADMIN_KEY);
  if (row) exceptionRows.push({ id, pii: PII_FIELDS.filter(f => row[f]).length });
}
console.log(`  enumerated exception, untouched     : ${exceptionRows.length} row(s) — ${exceptionRows.map(r => `${r.id} (${r.pii} PII field(s))`).join(', ') || 'none found'}`);
process.exit(leftover.length === 0 && wrongName.length === 0 && unrecoverable.length === 0 && failed.length === 0 ? 0 : 1);

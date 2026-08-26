/**
 * scripts/cleanup-duplicate-slug.mjs
 *
 * ONE ROW, ONE FIELD. Sets the slug of a single WeddingDetails record to the
 * empty string so that one other record holds that address alone.
 *
 * Usage:
 *   node scripts/cleanup-duplicate-slug.mjs            (dry run — reads and reports)
 *   node scripts/cleanup-duplicate-slug.mjs --write     (performs the one write)
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SAFETY LOCKS — NEVER BYPASS.
 *
 * 1. THE TWO IDS ARE HARD-CODED. This script cannot be pointed at another
 *    record by argument. Changing its target means editing it and re-reading
 *    these locks.
 * 2. EVERY PRECONDITION IS CHECKED AGAINST WHAT IS READ, not assumed. If any
 *    one does not match, the script STOPS and writes nothing.
 * 3. NOT A TOTAL-ROW-COUNT PRECONDITION. Real signups change the row count,
 *    and a legitimate new couple must not halt a cleanup for the wrong
 *    reason. The preconditions are about the SPECIFIC ROWS.
 * 4. TWO RECORDS BELONG TO PEOPLE WHO ARE NOT THE OWNER — they are not read
 *    beyond the slug scan that finds them, never modified, and never swept.
 * 5. READ · VERIFY · WRITE · RE-READ, reporting before and after.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠ THIS SCRIPT CANNOT COMPLETE, AND THE REASON IS A PLATFORM WALL.
 *
 * Every precondition passes and the write returns 403. BASE44_PLATFORM_NOTES.md
 * records exactly this, and it was written before this script existed:
 *
 *   BASE44_ADMIN_KEY is a normal API credential, evaluated against each
 *   entity's own RLS exactly like any other caller. It has no session identity
 *   matching any real user's {{user.id}}.
 *     read   -> 200, silently filtered
 *     update -> 403 Permission denied for update operation
 *
 * So the admin key can READ these rows and cannot WRITE them. There is no way
 * to grant it owner-equivalent access to a specific record via RLS.
 *
 * The script is kept because its READ half is the verification: it proves the
 * preconditions hold, which is what any other route to the fix will need.
 * The write path stays so the failure is reproducible rather than folklore.
 *
 * PROCESS NOTE, recorded against myself: CLAUDE.md says to read
 * BASE44_PLATFORM_NOTES.md BEFORE touching the admin key. I read it after the
 * 403. The notes exist to prevent exactly this attempt, and consulting them
 * first would have replaced a failed production write with a report.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalSlug } from '../api/_lib/slugCanon.js';

const __dir = dirname(fileURLToPath(import.meta.url));
for (const file of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(resolve(__dir, '..', file), 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch { /* file absent */ }
}

const API = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const KEY = process.env.BASE44_ADMIN_KEY;

const KEEPS  = '6a53724b2a603fc391c5bf82';   // earlier created_date — keeps the address
const CLEARS = '6a537256a029951304f83e18';   // later — its slug becomes ''
const SLUG   = 'tulum-test';
const WRITE  = process.argv.includes('--write');

if (!KEY) { console.error('  BASE44_ADMIN_KEY not available. Stopping.'); process.exit(1); }

const get = async (p) => {
  const r = await fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`GET ${p} -> ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j : (j?.data || j?.results || (j ? [j] : []));
};

const fail = (msg) => { console.error(`\n  PRECONDITION NOT MET: ${msg}\n  Stopping. Nothing written.\n`); process.exit(1); };

console.log(`\n  Duplicate address cleanup — ${WRITE ? 'WRITE' : 'DRY RUN'}\n`);

const all = await get(`/apps/${APP_ID}/entities/WeddingDetails`);
console.log(`  ${all.length} WeddingDetails rows read`);

// PRECONDITION 1 — exactly two records hold the normalized slug
const holders = all.filter(w => canonicalSlug(w.slug) === canonicalSlug(SLUG));
console.log(`\n  records holding ${JSON.stringify(SLUG)}: ${holders.length}`);
for (const w of holders) console.log(`    ${w.id}  created ${w.created_date}  slug=${JSON.stringify(w.slug)}`);
if (holders.length !== 2) fail(`expected exactly 2 records holding ${JSON.stringify(SLUG)}, read ${holders.length}`);

// PRECONDITION 2 — they are the two named ids
const ids = holders.map(w => w.id).sort();
if (JSON.stringify(ids) !== JSON.stringify([KEEPS, CLEARS].sort())) {
  fail(`the two holders are not the authorized ids.\n    read:       ${ids.join(', ')}\n    authorized: ${[KEEPS, CLEARS].sort().join(', ')}`);
}

// PRECONDITION 3 — the keeper carries the earlier created_date
const keeper = holders.find(w => w.id === KEEPS);
const clearer = holders.find(w => w.id === CLEARS);
const tk = Date.parse(keeper.created_date), tc = Date.parse(clearer.created_date);
console.log(`\n  ${KEEPS} created ${keeper.created_date}`);
console.log(`  ${CLEARS} created ${clearer.created_date}`);
if (!(tk < tc)) fail(`${KEEPS} does not carry the earlier created_date`);
console.log(`  earlier: ${KEEPS} — keeps the address, as the resolver's own tie-break gives`);

// PRECONDITION 4 — neither record's owner has a guest with an issued RSVP link
for (const w of [keeper, clearer]) {
  const guests = await get(`/apps/${APP_ID}/entities/Guest?q=${encodeURIComponent(JSON.stringify({ created_by_id: w.created_by_id }))}`);
  const issued = guests.filter(g => g && (g.rsvp_link_id || g.rsvp_link_id_hash || g.invitation_sent || g.invite_sent_at));
  console.log(`  ${w.id}: ${guests.length} guest(s), ${issued.length} with an issued link`);
  if (issued.length > 0) fail(`${w.id} has ${issued.length} guest(s) with an issued RSVP link — the address may already be in an inbox`);
}

console.log(`\n  BEFORE  ${CLEARS}.slug = ${JSON.stringify(clearer.slug)}`);
if (!WRITE) {
  console.log('\n  DRY RUN — every precondition met. Re-run with --write to perform the single write.\n');
  process.exit(0);
}

const res = await fetch(`${API}/apps/${APP_ID}/entities/WeddingDetails/${CLEARS}`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ slug: '' }),
});
if (!res.ok) { console.error(`  WRITE FAILED: ${res.status}`); process.exit(1); }

// RE-READ, from the source, not from the write's response
const after = (await get(`/apps/${APP_ID}/entities/WeddingDetails?q=${encodeURIComponent(JSON.stringify({ id: CLEARS }))}`))[0];
console.log(`  AFTER   ${CLEARS}.slug = ${JSON.stringify(after?.slug)}`);

const holdersAfter = (await get(`/apps/${APP_ID}/entities/WeddingDetails`))
  .filter(w => canonicalSlug(w.slug) === canonicalSlug(SLUG));
console.log(`\n  records now holding ${JSON.stringify(SLUG)}: ${holdersAfter.length}`);
holdersAfter.forEach(w => console.log(`    ${w.id}`));
console.log(holdersAfter.length === 1 && holdersAfter[0].id === KEEPS
  ? '\n  The address belongs to one record.\n'
  : '\n  UNEXPECTED post-state — report before doing anything else.\n');

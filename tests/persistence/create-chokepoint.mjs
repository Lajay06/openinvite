/**
 * tests/persistence/create-chokepoint.mjs
 *
 * A WEDDING RECORD IS CREATED IN ONE PLACE, AND ONLY WHEN THERE IS NONE.
 *
 * ── NULL MEANT TWO THINGS ──────────────────────────────────────────────────
 *
 * Twenty-two client call sites held `if (recordId) update else create`, and
 * every one of their loads wrapped the read in a catch that showed a toast and
 * let the form render anyway. So `recordId` was null both when the account had
 * no record AND when the read had failed, and the create could not tell them
 * apart. A couple whose read failed once, then typed into the form behind the
 * toast, got a second record — and because every surface resolves the NEWEST
 * owned record, the second one silently became their wedding while the one
 * holding their work stopped being resolved anywhere.
 *
 * `if (loading) return (…)` is in most of those files and does not help: it is
 * a RENDER guard that draws a spinner, and `setLoading(false)` runs after a
 * failed load too. Reading it as a save guard is how the first pass at this
 * enumeration classified twelve unsafe files as safe.
 *
 * ── TWO HALVES, AND THE SECOND IS THE ONE THAT MATTERS ─────────────────────
 *
 * Part 1 is a grep: no `WeddingDetails.create(` outside the helper. That keeps
 * the chokepoint a chokepoint, and it is the cheap half.
 *
 * Parts 2-4 RUN the helper against a mocked read, because the property is
 * behavioural and a source match would pass on a helper that imports `strict`
 * and ignores it. A failed read must THROW rather than create — that is the
 * whole point, and it is the one case no amount of reading the source proves.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'src');
const HELPER = 'src/lib/createMyWeddingDetails.js';

const jsFiles = (dir) => readdirSync(dir).flatMap((e) => {
  const p = join(dir, e);
  return statSync(p).isDirectory() ? jsFiles(p) : (/\.(jsx?|mjs)$/.test(p) ? [p] : []);
});

/**
 * The helper's logic, executed against an injected reader and entity client.
 *
 * READ FROM THE FILE, NOT RE-TYPED. A copy of the branch would be a test of
 * the copy: it would stay green while the real helper changed underneath it,
 * which is the failure mode this whole session has been about. The source is
 * loaded, its two calls are rewritten onto the injected doubles, and the
 * result is evaluated — so what runs below is this file's actual body.
 */
async function runHelperWith({ read, update, create }) {
  const src = readFileSync(join(ROOT, HELPER), 'utf8');
  const body = src
    .replace(/^import .*$/gm, '')
    .replace('export async function createMyWeddingDetails', 'return async function createMyWeddingDetails');
  // eslint-disable-next-line no-new-func
  const make = new Function('getMyWeddingDetails', 'base44', body);
  const fn = make(read, { entities: { WeddingDetails: { update, create } } });
  return fn({ some: 'payload' });
}

export async function runCreateChokepoint() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  // ── 1. the chokepoint is a chokepoint ─────────────────────────────────────
  const strays = [];
  for (const abs of jsFiles(SRC)) {
    const rel = abs.slice(ROOT.length + 1);
    if (rel === HELPER) continue;
    const hits = (readFileSync(abs, 'utf8').match(/WeddingDetails\.create\(/g) || []).length;
    if (hits) strays.push(`${rel} (${hits})`);
  }
  check('no WeddingDetails.create outside the helper', strays.length === 0,
    strays.length ? strays.join(', ') : 'every create routes through createMyWeddingDetails');

  const callers = jsFiles(SRC).filter((p) => p.slice(ROOT.length + 1) !== HELPER
    && /createMyWeddingDetails\(/.test(readFileSync(p, 'utf8')));
  // PRESENCE BEFORE PROPERTIES: "no strays" is also true of a codebase that
  // creates nothing at all, which would pass the check above and mean the
  // swap had deleted the feature rather than routed it.
  check('  and the call sites still exist', callers.length >= 18,
    `${callers.length} file(s) call the helper`);
  const helperSrc = readFileSync(join(ROOT, HELPER), 'utf8');
  check('  the helper reads in strict mode', /getMyWeddingDetails\(\{ strict: true \}\)/.test(helperSrc),
    'strict is what makes a failed read distinguishable from none');

  // ── 2. a failed read THROWS, and creates nothing ──────────────────────────
  let created = 0, updated = 0, threw = null;
  try {
    await runHelperWith({
      read: async () => { throw new Error('/api/my-wedding-details failed (503)'); },
      update: async () => { updated += 1; },
      create: async () => { created += 1; return { id: 'new' }; },
    });
  } catch (e) { threw = e.message; }
  check('a failed read throws', !!threw, threw || 'it returned instead of throwing');
  check('  and creates nothing', created === 0, `${created} create(s)`);
  check('  and updates nothing', updated === 0, `${updated} update(s)`);

  // ── 3. an existing record is UPDATED, never duplicated ────────────────────
  created = 0; updated = 0;
  let updatedId = null;
  const got = await runHelperWith({
    read: async () => ({ id: 'existing-1', couple1Name: 'Ada' }),
    update: async (id) => { updated += 1; updatedId = id; },
    create: async () => { created += 1; return { id: 'new' }; },
  });
  check('an existing record is updated', updated === 1 && updatedId === 'existing-1', `update(${updatedId})`);
  check('  and never duplicated', created === 0, `${created} create(s)`);
  check('  and the caller gets that record back', got?.id === 'existing-1', `returned ${got?.id}`);

  // ── 4. only a confirmed none creates ──────────────────────────────────────
  created = 0; updated = 0;
  const fresh = await runHelperWith({
    read: async () => null,
    update: async () => { updated += 1; },
    create: async () => { created += 1; return { id: 'brand-new' }; },
  });
  check('a confirmed none creates', created === 1, `${created} create(s)`);
  check('  and updates nothing', updated === 0, `${updated} update(s)`);
  check('  and the caller gets the new record', fresh?.id === 'brand-new', `returned ${fresh?.id}`);

  // ── 5. the wizard's own read stopped swallowing ───────────────────────────
  const onboarding = readFileSync(join(ROOT, 'src/pages/Onboarding.jsx'), 'utf8');
  check('the wizard reads its record strictly too',
    /const draft = await getMyWeddingDetails\(\{ strict: true \}\)/.test(onboarding)
    && !/getMyWeddingDetails\(\)\.catch\(\(\) => null\)/.test(onboarding),
    'a failed read there is the error state, not a silent create');

  return results;
}

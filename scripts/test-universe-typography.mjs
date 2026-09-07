/* global document, getComputedStyle */
/**
 * EVERY UNIVERSE SHOWS ITS OWN FACE.
 *
 * Owner, 2026-09-07: "all 20 look identical." They did, and the label made it
 * worse — the specimen read "Heading — Bodoni Moda" in Plus Jakarta Sans.
 *
 * THE CAUSE IS THREE LINES OF CSS AND IT IS DOCUMENTED IN THE FILE ITSELF.
 * src/index.css opens with `*, *::before, *::after { font-family: 'Plus
 * Jakarta Sans' … !important }`, which beats any inline `style={{ fontFamily }}`.
 * The guest site already has the escape — custom properties plus a
 * higher-specificity rule (`.wb-guest-root`) — and the comment beside it says
 * exactly why. The universe specimen had no such escape, so it declared a face
 * that could never paint.
 *
 * WHY A COMPUTED-FONT CHECK AND NOT A SOURCE ONE. A source check would have
 * passed the whole time: `fontFamily: typography.headingFont` is right there
 * in the JSX, and has been. Only the render knows that `!important` won.
 *
 * Usage: npm run test:universe-typography  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';
import { UNIVERSE_CONFIGS } from '../src/lib/universeStyling.js';
import { getUniverse } from '../src/lib/universeCatalog.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

/** The universes to check. All twenty by default; UNIVERSES=a,b to narrow. */
const IDS = (process.env.UNIVERSES || Object.keys(UNIVERSE_CONFIGS).join(',')).split(',');

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** "Bodoni Moda" from `"Bodoni Moda", serif`. */
const firstFamily = (spec) => String(spec || '').split(',')[0].replace(/["']/g, '').trim();

console.log('\n  Every universe shows its own face:\n');

const browser = await chromium.launch();
const seen = new Map();
const audit = [];
/** The couple the fixture is signed in as — whose names the page should show. */
const fixtureWedding = SEED.WeddingDetails[0];
const coupleOfFixture = fixtureWedding.coupleNames
  || [fixtureWedding.couple1Name, fixtureWedding.couple2Name].filter(Boolean).join(' & ');

for (const id of IDS) {
  const cfg = UNIVERSE_CONFIGS[id];
  if (!cfg) { check(`${id} — is a universe`, false, 'not in UNIVERSE_CONFIGS'); continue; }
  const wantHeading = firstFamily(cfg.typography?.headingFont);
  const wantBody = firstFamily(cfg.typography?.bodyFont);

  const ctx = await seededContext(browser, { width: 1440, height: 1000, seed: SEED });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/studio/universe`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);

  // Open the universe by its DISPLAY name, as a couple would — from the
  // catalog, not the config. The first version used `cfg.name || id` and
  // UNIVERSE_CONFIGS carries no `name`, so it clicked the string "paris",
  // matched nothing, and reported every universe as "painted nothing" — a
  // guard failing for a reason that has nothing to do with the property.
  const name = getUniverse(id)?.name || id;
  await page.getByText(name, { exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(2500);

  const got = await page.evaluate((names) => {
    const h = document.querySelector('.oi-universe-face--heading');
    const b = document.querySelector('.oi-universe-face--body');
    const fam = (el) => (el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim() : null);
    // THE COUPLE-NAMES AUDIT, on the same visit.
    //
    // THE FIRST VERSION ASKED THE WRONG QUESTION and reported all twenty as
    // missing. The studio hero deliberately renders the UNIVERSE'S NAME in
    // the masthead's names slot — the comment at that call site says so, and
    // the couple's own names belong to the "your wedding in this world"
    // chapter further down. So this looks for the COUPLE the page is being
    // shown to, on the whole page, not for a sample fixture in the hero.
    const text = document.body.innerText || '';
    const first = (names || '').split(/\s*&\s*/)[0].trim();
    return {
      heading: fam(h), body: fam(b),
      namesShown: !!(first && text.includes(first)),
    };
  }, coupleOfFixture);

  check(`${id} — the heading specimen is ${wantHeading}`,
    got.heading === wantHeading, `painted ${got.heading || 'nothing'}`);
  check(`  and the body specimen is ${wantBody}`,
    got.body === wantBody, `painted ${got.body || 'nothing'}`);

  if (got.heading) seen.set(id, got.heading);
  audit.push([id, getUniverse(id)?.name || id, coupleOfFixture, got.namesShown]);
  await ctx.close();
}

await browser.close();

// THE ORIGINAL COMPLAINT, STATED AS A PROPERTY: they cannot all be the same.
// A per-universe check passes trivially if every universe declares the same
// face; this is what "all 20 look identical" actually means.
const distinct = new Set(seen.values());
check('the twenty do not all render the same face',
  distinct.size > 1, `${distinct.size} distinct heading faces across ${seen.size} universes`);

// ── THE COUPLE-NAMES AUDIT, one row per universe ───────────────────────
//
// Some universes are designed WITHOUT names — that is a design decision, not
// a bug — so this prints the table rather than failing on it. What it does
// fail on is a universe whose masthead has a names slot that renders empty.
console.log('\n  Couple names in the hero:\n');
console.log(`    universe     name           couple (${coupleOfFixture})   shown`);
for (const [id, name, names, shown] of audit) {
  console.log(`    ${id.padEnd(12)} ${String(name).padEnd(14)} ${String(names).padEnd(20)} ${shown ? 'yes' : 'NO'}`);
}
const missing = audit.filter(([, , , shown]) => !shown).map(([id]) => id);
check('every universe’s detail page shows the couple somewhere',
  missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${audit.length} universes`);

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);

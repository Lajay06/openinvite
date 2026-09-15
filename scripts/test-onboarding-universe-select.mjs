/* global document */
/**
 * SELECT IS THE ANSWER, SO SELECT ADVANCES.
 *
 * Choosing a universe used to set state and leave the couple where they were,
 * with a Continue at the bottom of the grid they then had to find. On a phone
 * that control is below the fold, so the tap that answered the question looked
 * like it had done nothing.
 *
 * ── WHAT "ADVANCED" MEANS, MEASURED THREE WAYS ─────────────────────────────
 *
 * The wizard is one route, so a URL change proves nothing here. This asserts
 * the step indicator moved, the universe grid is gone, and — the part that
 * matters — the CHOICE WAS RECORDED, read back from the draft the wizard
 * persists rather than from the screen. A step that advances without keeping
 * the answer is worse than one that does not advance, because the couple has
 * no way to know.
 *
 * ── AND THAT THE CONTROL IS GONE ───────────────────────────────────────────
 *
 * Pinned, because leaving it would be the defect in a new form: a button that
 * sat disabled until you chose, then stayed on screen asking to be pressed for
 * something already done. Skip is asserted PRESENT in the same breath — a
 * couple who wants none of these still needs a way past, and a guard that only
 * counted buttons would be satisfied by removing both.
 */
import { chromium } from 'playwright';
import { seededContext, ONBOARDING_SEED, ONBOARDING_USER } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4196';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const stepOf = (page) => page.evaluate(() =>
  ((document.body.innerText || '').match(/Step\s+(\d+)\s+of\s+\d+/i) || [])[1] || null);

const browser = await chromium.launch();

for (const width of [390, 1440]) {
  console.log(`\n  The universe picker at ${width}\n`);
  const ctx = await seededContext(browser, { width, height: 950, seed: ONBOARDING_SEED, user: ONBOARDING_USER });
  const page = await ctx.newPage();
  // Every write the wizard makes, read off the REQUEST rather than from
  // component state — the question is what was persisted, not what a variable
  // held. The harness's own onEntity hook carries the entity name and nothing
  // else, so it cannot answer this; the request can.
  const writes = [];
  page.on('request', (r) => {
    if (!/entities\/WeddingDetails/.test(r.url())) return;
    if (r.method() === 'GET') return;
    try { writes.push(JSON.parse(r.postData() || '{}')); } catch { /* not json */ }
  });
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const step = async (fn) => { await fn(); await page.waitForTimeout(1300); };
  await step(() => page.getByRole('button', { name: 'Get started', exact: true }).first().click({ timeout: 8000 }).catch(() => {}));
  await page.getByPlaceholder('Your name').fill('Ada').catch(() => {});
  await page.getByPlaceholder("Partner's name").fill('Alan').catch(() => {});
  await step(() => page.getByRole('button', { name: /^Continue/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^We haven't set a date yet/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^Not sure yet/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: 'Celebration', exact: false }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^Continue/ }).first().click({ timeout: 8000 }).catch(() => {}));
  // Wedding type: open a section, take a pill, continue.
  await step(() => page.getByRole('button', { name: /^Vibe$/ }).first().click({ timeout: 8000 }).catch(() => {}));
  const pill = page.getByRole('button').filter({ hasNotText: /Style|Ceremony type|Vibe|Back|Continue/ });
  if (await pill.count() > 0) await step(() => pill.first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^Continue/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^Got it, let's go/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await page.waitForTimeout(2500);

  const selects = page.getByRole('button', { name: 'Select', exact: true });
  const tiles = await selects.count();
  // PRESENCE BEFORE PROPERTIES: a picker that never rendered advances nothing.
  check('the universe picker was reached', tiles > 0, `${tiles} Select control(s)`);
  if (!tiles) { await ctx.close(); continue; }

  const before = await stepOf(page);
  check('  the step it is on was read', !!before, `Step ${before}`);

  // ── the control that should not be there, and the one that should ─────────
  const continues = await page.getByRole('button', { name: /^Continue/ }).count();
  check('  there is no Continue on this step', continues === 0,
    continues ? `${continues} Continue control(s) still present` : 'Select is the only way forward');
  const skips = await page.getByRole('button', { name: /^Skip for now/ }).count();
  check('    but Skip is still offered', skips > 0, `${skips} skip control(s) — none of these is a valid answer too`);

  // ── the tap, and WHICH universe it was ────────────────────────────────────
  //
  // The tile announces itself as "Preview the <name> universe", so the guard
  // knows what it is about to choose and can demand that exact id back.
  const chosen = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim() === 'Select');
    const tile = btn?.closest('[aria-label]');
    const m = (tile?.getAttribute('aria-label') || '').match(/Preview the (.+?) universe/i);
    return m ? m[1].toLowerCase() : null;
  });
  check('  the tile it is about to choose was identified', !!chosen, chosen || 'no aria-label on the tile');

  writes.length = 0;
  await selects.first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2600);

  const after = await stepOf(page);
  check('  tapping Select advances the wizard', !!after && after !== before, `Step ${before} -> Step ${after}`);
  // EXPLORE, NOT SELECT. The step after this one is the fork, and its two
  // cards each carry a button labelled "Select" — so counting Select controls
  // reported "still on the picker" on a wizard that had advanced correctly.
  // Explore belongs to the universe tiles and to nothing else.
  const explores = await page.getByRole('button', { name: 'Explore', exact: true }).count();
  check('    and the picker is behind them', explores === 0,
    explores ? `${explores} tile(s) still on screen` : 'no universe tiles remain');

  // ── and the answer was kept ───────────────────────────────────────────────
  // THE ONE THAT WAS TAPPED, not merely a universe. buildWeddingDetailsPayload
  // writes `data.activeUniverse || 'london'`, so a step that advanced WITHOUT
  // carrying the choice still persists a truthy id — and a guard asking only
  // "was something recorded" passes on it. A plant that dropped the id from
  // onNext went green here until this asked for equality.
  const recorded = [...new Set(writes.map((w) => w && w.activeUniverse).filter(Boolean))];
  check('  the choice was recorded, not just displayed', recorded.length > 0,
    recorded.length ? `activeUniverse: ${recorded.join(', ')}` : 'no write carried activeUniverse');
  check('    and it is the universe that was tapped', !!chosen && recorded.includes(chosen),
    `tapped ${chosen}, recorded ${recorded.join(', ') || 'nothing'}`);

  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

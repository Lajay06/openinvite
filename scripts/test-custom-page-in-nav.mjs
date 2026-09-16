/* global document */
/**
 * A PAGE A COUPLE MAKES IS A PAGE THEIR GUESTS CAN REACH.
 *
 * A custom page has to be three things at once, and it has been none of them at
 * different times:
 *
 *   in the page list      so the couple can see and edit it
 *   in the navigation     so a guest can get to it
 *   in the order          so it can be moved, like every other page
 *
 * ── THE TWO WAYS IT HAS BROKEN BEFORE ──────────────────────────────────────
 *
 * Both are recorded in the code this guard defends, and both were silent:
 *
 *   MultiPageWeddingWebsite  `withAlwaysOnPages` was given WEDDING_PAGES alone,
 *                            so a couple's own slug was dropped from
 *                            enabledPages, `pageIsAvailable` was false for it,
 *                            and the route served InvitationNotAvailable — the
 *                            couple's own new page telling their guests the
 *                            invitation was not available.
 *   WeddingWebsiteNav        the label was looked up in WEDDING_PAGES alone and
 *                            anything without one was filtered out, so every
 *                            new page was silently dropped from the couple's
 *                            own navigation.
 *
 * Neither threw. Both produced a page that existed, saved, and could not be
 * reached — which is why this is a browser guard that MAKES one and then looks
 * for it, rather than a source check on either fix.
 *
 * AND IT LOOKS IN TWO PLACES, because they are not one place. The builder's
 * preview resolves a page through the builder's own state; the gate a guest
 * meets is `pageIsAvailable` in MultiPageWeddingWebsite, which the preview
 * never runs. A plant of the FIRST bug above left every builder-side check
 * green. So the last section opens the couple's published address with the
 * record the builder actually wrote.
 *
 * ── ORDER IS enabledPages, AND THAT IS THE WHOLE DESIGN ────────────────────
 *
 * There is no separate order field: the couple's drag order IS enabledPages,
 * and the nav reads the same array. So "it appears at the end of the order" and
 * "it appears in the nav" are the same fact checked twice, deliberately — if
 * they ever stop being the same fact, something has grown a second list.
 */
import { chromium } from 'playwright';
import { seededContext, PUBLISHED_WEDDING, SEED } from './lib/renderHarness.mjs';
import { pickGuestSafeFields } from '../api/_lib/guestSafeWedding.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4201';
const PAGE_NAME = 'Our Dogs';
const PAGE_SLUG = 'our-dogs';
// A sentence only this fixture would contain, so finding it on the page means
// the couple's own block travelled, not that something else said the word.
const BLOCK_TEXT = 'They are both rescues and they will be at the ceremony.';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 950 });
const page = await ctx.newPage();

// Every write, so "it is in the order" is read from what was persisted rather
// than from what the screen happens to show.
const writes = [];
page.on('request', (r) => {
  if (!/entities\/WeddingDetails/.test(r.url()) || r.method() === 'GET') return;
  try { writes.push(JSON.parse(r.postData() || '{}')); } catch { /* not json */ }
});

// ── A STUB THAT REMEMBERS, BECAUSE A RELOAD OTHERWISE PROVES NOTHING ───────
//
// The harness answers every write with a 200 and forgets it, so a reload came
// back to the seeded record and the couple's page simply vanished — which
// reads as "the page did not persist" when it is the fixture that did not.
// This keeps one record in memory, merges each write into it, and serves it
// back, so "reload and it is still where I put it" is a real question.
const record = { ...(SEED.WeddingDetails[0] || {}) };
await page.route((u) => /\/api\/my-wedding-details/.test(typeof u === 'string' ? u : u.href), (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) }));
await page.route((u) => /entities\/WeddingDetails/.test(typeof u === 'string' ? u : u.href), async (route) => {
  const req = route.request();
  if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([record]) });
  try { Object.assign(record, JSON.parse(req.postData() || '{}')); } catch { /* not json */ }
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) });
});

await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(8000);

const bodyHas = (text) => page.evaluate((t) => (document.body.innerText || '').includes(t), text);

check('the builder opened', await page.locator('.wb-builder-header').count() > 0, 'header present');
// PRESENCE BEFORE PROPERTIES: the page must not already exist, or every check
// below passes without anything having been created.
check('  and the page does not exist yet', !(await bodyHas(PAGE_NAME)), `"${PAGE_NAME}" is not on screen`);

// ── make it, the way a couple does ─────────────────────────────────────────
await page.getByRole('button', { name: /Add page|New page/i }).first().click({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.getByPlaceholder('e.g. Wedding Party, Our Pets').first().fill(PAGE_NAME).catch(() => {});
await page.waitForTimeout(500);
const slugShown = await page.getByPlaceholder('page-url').first().inputValue().catch(() => '');
check('  the slug is derived from the name', slugShown === PAGE_SLUG, `"${slugShown}"`);
await page.getByRole('button', { name: 'Create page', exact: true }).first().click({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(3000);

// ── 1. in the page list ────────────────────────────────────────────────────
check('the new page is in the page list', await bodyHas(PAGE_NAME), `"${PAGE_NAME}"`);

// ── 2. in the order, read from what was saved ──────────────────────────────
const orders = writes.map((w) => w && w.enabledPages).filter(Array.isArray);
const lastOrder = orders[orders.length - 1] || [];
check('  and in enabledPages, which IS the order', lastOrder.includes(PAGE_SLUG),
  lastOrder.length ? lastOrder.join(' > ') : 'no enabledPages write seen');
check('    at the end, not in the middle of the couple\'s order', lastOrder[lastOrder.length - 1] === PAGE_SLUG,
  `last is "${lastOrder[lastOrder.length - 1]}"`);
check('    and home is still first', lastOrder[0] === 'home', `first is "${lastOrder[0]}"`);

// ── 3. in the navigation a guest sees ──────────────────────────────────────
await page.getByRole('button', { name: 'Preview', exact: true }).first().click({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(4000);
const inNav = await page.evaluate((name) => {
  const frame = document.querySelector('[data-preview-frame]') || document.body;
  const nav = frame.querySelector('nav');
  return !!nav && (nav.innerText || '').toLowerCase().includes(name.toLowerCase());
}, PAGE_NAME);
check('  and a guest can see it in the navigation', inNav, inNav ? `"${PAGE_NAME}" is a nav link` : 'not in the nav');

// ── 3b. ONE LIST, NOT TWO ──────────────────────────────────────────────────
//
// Owner report, Run 5 T1: the new page "cannot be dragged into the main page
// list". It could not. The built-ins rendered from WEDDING_PAGES and the
// couple's own pages rendered in a separate section under a "Custom" divider,
// so a custom page could never sit BETWEEN two built-ins however the drag
// wrote `enabledPages`. The row was draggable; the list was not one list.
//
// Asserted on the ROWS AS RENDERED, not on the stored order: the stored order
// was already right, which is exactly why this went unnoticed.
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(1200);
const listShape = await page.evaluate((name) => {
  const rows = [...document.querySelectorAll('[draggable="true"]')].map((d) => (d.innerText || '').trim().split('\n')[0]);
  // A divider whose only word is "Custom" is the second list announcing itself.
  const customLabel = [...document.querySelectorAll('*')]
    .filter((e) => e.children.length === 0 && /^Custom$/i.test((e.innerText || '').trim())).length;
  return { rows, customLabel, index: rows.findIndex((r) => r.includes(name)) };
}, PAGE_NAME);
check('the couple sees one page list, not two', listShape.customLabel === 0,
  listShape.customLabel ? 'a "Custom" divider still splits the list' : 'no separate section');
check('  and the new page is a row in it', listShape.index !== -1,
  listShape.index !== -1 ? `row ${listShape.index + 1} of ${listShape.rows.length}` : `rows: ${listShape.rows.join(' · ')}`);
// IT IS LAST BECAUSE IT WAS MADE LAST, not because custom pages are pinned
// below. The next check is the one that tells those two apart.
check('    in the position the couple created it', listShape.index === listShape.rows.length - 1,
  `${listShape.rows.join(' · ')}`);

// ── 3c. AND ITS POSITION SURVIVES A REORDER AND A RELOAD ───────────────────
//
// The drag writes `enabledPages`; the render reads it. Moving the page up and
// reloading proves the two agree — a list that renders custom pages in their
// own section would put it back at the bottom no matter what was stored.
// A REAL DRAG. Dispatching DragEvent by hand does not reach React's handlers
// — the first version of this check did exactly that and reported the product
// broken. Playwright's dragTo performs the mouse sequence the browser turns
// into the events the component listens for.
const rows = page.locator('[draggable="true"]');
const from = rows.filter({ hasText: PAGE_NAME }).first();
const to = rows.nth(1);
const moved = await from.dragTo(to).then(() => true).catch(() => false);
await page.waitForTimeout(3000);
const afterDrag = await page.evaluate((name) => {
  const rows = [...document.querySelectorAll('[draggable="true"]')].map((d) => (d.innerText || '').trim().split('\n')[0]);
  return { rows, index: rows.findIndex((r) => r.includes(name)) };
}, PAGE_NAME);
check('  the page can be dragged up among the built-in pages', moved && afterDrag.index === 1,
  `now row ${afterDrag.index + 1}: ${afterDrag.rows.join(' · ')}`);

const orderAfterDrag = writes.map((w) => w && w.enabledPages).filter(Array.isArray).pop() || [];
check('    and the move was written to enabledPages', orderAfterDrag[1] === PAGE_SLUG,
  orderAfterDrag.join(' > ') || 'no write seen');

await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(8000);
const afterReload = await page.evaluate((name) => {
  const rows = [...document.querySelectorAll('[draggable="true"]')].map((d) => (d.innerText || '').trim().split('\n')[0]);
  return { rows, index: rows.findIndex((r) => r.includes(name)) };
}, PAGE_NAME);
check('    and it is still there after a reload', afterReload.index === 1,
  `row ${afterReload.index + 1}: ${afterReload.rows.join(' · ')}`);

// ── 4. it is draggable, like every other page ──────────────────────────────
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(1500);
const draggable = await page.evaluate((name) => {
  for (const el of document.querySelectorAll('[draggable="true"]')) {
    if ((el.innerText || '').trim().toLowerCase().includes(name.toLowerCase())) return true;
  }
  return false;
}, PAGE_NAME);
check('  and the couple can reorder it', draggable, draggable ? 'the row is draggable' : 'the row cannot be picked up');

// ── 5. AND THE PUBLISHED ADDRESS SERVES IT ─────────────────────────────────
//
// THE BUILDER'S PREVIEW IS NOT THE ROUTE GATE, and a plant proved it before
// this guard shipped: putting the first historical bug back exactly as it
// shipped — `WEDDING_PAGES.map(p => p.slug)` in place of
// `allPageSlugs(weddingDetails)` in MultiPageWeddingWebsite — left every check
// above GREEN. The preview resolves a page through the builder's own state and
// never runs `pageIsAvailable`, so a guard that stops at the preview cannot
// see the defect that sends a guest to "This invitation isn't available".
//
// So the record the builder SAVED is handed back through /api/wedding-by-slug
// — the one source MultiPageWeddingWebsite reads — and the couple's own
// address is opened the way a guest opens it. The fixture supplies the rest of
// a published wedding; the two fields under test are the couple's own.
const savedCustomPages = writes.map((w) => w && w.customPages).filter(Array.isArray).pop() || [];
check('the saved record carries the page in customPages',
  savedCustomPages.some((p) => p && p.slug === PAGE_SLUG),
  savedCustomPages.map((p) => p && p.slug).join(', ') || 'no customPages write seen');

const guest = await ctx.newPage();
// A PAGE route, which Playwright matches before the harness's context route,
// so the guest site reads what was written rather than the static fixture.
await guest.route(
  (u) => /\/api\/wedding-by-slug/.test(typeof u === 'string' ? u : u.href),
  // THROUGH THE ENDPOINT'S OWN FUNCTION, NOT AROUND IT.
  //
  // This handed the page `{ ...PUBLISHED_WEDDING, enabledPages, customPages }`
  // directly, and that payload could not occur: /api/wedding-by-slug answers
  // with pickGuestSafeFields(), whose allowlist did not list `customPages` at
  // all. So this guard proved a custom page reached the guest nav using a
  // response the product never sends, and went green for a month while the
  // live site served "This invitation isn't available" for the couple's own
  // page.
  //
  // A fixture that cannot occur is not evidence. Everything below now passes
  // through the same filter the endpoint uses, so a field the API will not
  // send cannot reach this page either.
  (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(pickGuestSafeFields({
      ...PUBLISHED_WEDDING, enabledPages: lastOrder, customPages: savedCustomPages,
      // WORDS ON THE PAGE, so `customPageContent` is proved to arrive too.
      // Without a block the page renders its title either way, and the field
      // could be dropped from the allowlist with nothing noticing — which is
      // exactly what a plant showed.
      customPageContent: { [PAGE_SLUG]: { blocks: [
        { id: 'cp1', type: 'paragraph', order: 0, content: { text: BLOCK_TEXT } },
      ] } },
    })),
  }),
);
await guest.goto(`${BASE}/w/${PUBLISHED_WEDDING.slug}/${PAGE_SLUG}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await guest.waitForTimeout(5000);
const guestText = await guest.evaluate(() => document.body.innerText || '');
const refused = /isn.t available/i.test(guestText);
check('  the couple\'s own address is not refused', !refused,
  refused ? 'served "This invitation isn\'t available"' : 'the page rendered');
check('    and it renders the page the couple named', guestText.includes(PAGE_NAME), `"${PAGE_NAME}"`);
check('    and the words the couple wrote on it', guestText.includes(BLOCK_TEXT),
  guestText.includes(BLOCK_TEXT) ? 'the block rendered' : 'customPageContent did not reach the page');
const inGuestNav = await guest.evaluate((name) => {
  const nav = document.querySelector('nav');
  return !!nav && (nav.innerText || '').toLowerCase().includes(name.toLowerCase());
}, PAGE_NAME);
check('    and the published nav links to it', inGuestNav,
  inGuestNav ? `"${PAGE_NAME}" is a nav link` : 'not in the published nav');

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

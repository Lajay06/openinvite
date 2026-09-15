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
import { seededContext, PUBLISHED_WEDDING } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4201';
const PAGE_NAME = 'Our Dogs';
const PAGE_SLUG = 'our-dogs';

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
  (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ...PUBLISHED_WEDDING, enabledPages: lastOrder, customPages: savedCustomPages }),
  }),
);
await guest.goto(`${BASE}/w/${PUBLISHED_WEDDING.slug}/${PAGE_SLUG}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await guest.waitForTimeout(5000);
const guestText = await guest.evaluate(() => document.body.innerText || '');
const refused = /isn.t available/i.test(guestText);
check('  the couple\'s own address is not refused', !refused,
  refused ? 'served "This invitation isn\'t available"' : 'the page rendered');
check('    and it renders the page the couple named', guestText.includes(PAGE_NAME), `"${PAGE_NAME}"`);
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

/* global document */
/**
 * A CUSTOM PAGE OPENS ASKING TO BE FILLED, AND WHAT YOU PUT IN IT PERSISTS.
 *
 * This is the fourth thing the owner reported and the one the earlier PR
 * could not do: adding blocks to a custom page. It needed a field, because
 * there was nowhere for the blocks to go.
 *
 * ── TWO DEFECTS, AND EITHER ALONE LOOKS LIKE THE OTHER ──────────────────────
 *
 * 1. RENDER. RealWebsitePreview and MultiPageWeddingWebsite both resolved a
 *    custom slug to WeddingCustomPage and then handed it every prop EXCEPT
 *    currentPage. That component finds its own record by slug and returns null
 *    when it cannot, so a page the couple had just created rendered the nav
 *    and then nothing — no title, no affordance, nothing to click. On the
 *    canvas AND on the published site.
 *
 * 2. STORAGE. NewPageModal stored `sections: []` on the page record and
 *    WeddingCustomPage read `page.blocks`. Neither could ever have persisted:
 *    `customPages` declares its item properties, and Base44 strips every key a
 *    properties-bearing schema does not name. `customPageContent` is a bare
 *    object, which keeps what it is handed.
 *
 * So the guard checks BOTH, and checks the write, not just the screen: the
 * save payload is read off the wire and asserted to carry the block under
 * customPageContent — and to carry no blocks on the catalog record, which is
 * where they would be silently dropped.
 *
 * ── AND THE GUEST SEES IT ───────────────────────────────────────────────────
 *
 * The published site is a different component with the same bug, so it is
 * visited separately, at its own /w/ route, with the blocks seeded. A pass
 * that only ever looked at the builder would have called defect 1 fixed while
 * every guest still saw a blank page.
 *
 * Usage: npm run test:custom-page-blocks  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, dismissEntrance, SEED, PUBLISHED_WEDDING } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const SLUG = 'welcome-drinks';
const PAGE = { id: SLUG, name: 'Welcome drinks', slug: SLUG, template: 'blank' };
const seedWith = (extra = {}) => ({
  ...SEED,
  WeddingDetails: [{
    ...SEED.WeddingDetails[0],
    customPages: [PAGE],
    enabledPages: ['home', 'our-story', 'celebration', 'rsvp', SLUG],
    ...extra,
  }],
});

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

console.log('\n  A custom page you can actually put something on:\n');

const browser = await chromium.launch();

// ── the builder ─────────────────────────────────────────────────────────────
{
  const ctx = await seededContext(browser, { width: 1440, height: 900, seed: seedWith() });
  const page = await ctx.newPage();

  // The save payload, read off the wire. detailsRef is what doSave serialises,
  // so this is the couple's data as Base44 would receive it.
  const writes = [];
  page.on('request', (r) => {
    if (r.method() !== 'PUT' && r.method() !== 'POST') return;
    if (!/\/entities\/WeddingDetails/.test(r.url())) return;
    try { writes.push(JSON.parse(r.postData() || '{}')); } catch { /* not ours */ }
  });

  await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);

  const opened = await page.getByText('Welcome drinks', { exact: true }).first()
    .click().then(() => true).catch(() => false);
  await page.waitForTimeout(2500);

  // PRESENCE BEFORE PROPERTIES: without the title on the canvas, every
  // assertion below would be measuring an empty page and calling it clean.
  const heading = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h1, h2')].map((e) => (e.innerText || '').trim()).filter(Boolean);
    return h[0] || '';
  });
  check('the custom page renders its own title on the canvas',
    opened && /welcome drinks/i.test(heading), heading || '(the page rendered nothing at all)');

  const adds = page.getByRole('button', { name: 'Add a section' });
  const addCount = await adds.count();
  check('an empty custom page opens with an add-block affordance', addCount > 0,
    `${addCount} insert point(s)`);

  if (addCount > 0) {
    await adds.first().click().catch(() => {});
    await page.waitForTimeout(1200);
    const libraryOpen = await page.getByText('Paragraph', { exact: true }).count() > 0;
    check('  and it opens the component library', libraryOpen,
      libraryOpen ? 'the catalog is on screen' : 'nothing opened');

    if (libraryOpen) {
      await page.getByText('Paragraph', { exact: true }).first().click().catch(() => {});
      await page.waitForTimeout(1500);
      const placeholder = await page.getByText(/Paragraph — click to add text/i).count();
      check('  and the chosen block lands on the custom page', placeholder > 0,
        placeholder > 0 ? 'the block is on the canvas' : 'nothing was added');
    } else {
      check('  and the chosen block lands on the custom page', false, 'the library never opened');
    }
  } else {
    check('  and it opens the component library', false, 'there was nothing to click');
    check('  and the chosen block lands on the custom page', false, 'there was nothing to click');
  }

  // Save, and read what went out.
  await page.getByRole('button', { name: 'Save', exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(2500);

  const last = writes[writes.length - 1] || {};
  const stored = last.customPageContent?.[SLUG]?.blocks;
  check('the save payload carries the block under customPageContent',
    Array.isArray(stored) && stored.length === 1 && stored[0].type === 'paragraph',
    stored ? JSON.stringify(stored).slice(0, 90) : `customPageContent absent from the payload (${writes.length} write(s) seen)`);

  // The catalog is a catalog. A block written here would be stripped by
  // Base44 without a word, which is the whole reason for the other field.
  const catalog = Array.isArray(last.customPages) ? last.customPages[0] || {} : {};
  check('  and the catalog record still carries no blocks of its own',
    !('blocks' in catalog) && !('sections' in catalog),
    Object.keys(catalog).join(', ') || '(no customPages in the payload)');

  await ctx.close();
}

// ── the published site, which is a different component with the same bug ────
//
// The guest site does not read the seeded entity — it reads
// /api/wedding-by-slug, which the harness answers with PUBLISHED_WEDDING. So
// that one response is overridden here rather than the seed, and the entrance
// overlay is dismissed, or every guest route reads as "AN INVITATION" and
// nothing else.
{
  const guestWedding = {
    ...PUBLISHED_WEDDING,
    customPages: [PAGE],
    enabledPages: [...PUBLISHED_WEDDING.enabledPages, SLUG],
    customPageContent: {
      [SLUG]: { blocks: [{ id: 'b1', type: 'paragraph', order: 0, content: { text: 'Drinks on the terrace from six.' } }] },
    },
  };
  const ctx = await seededContext(browser, { width: 1440, height: 900, seed: seedWith() });
  await dismissEntrance(ctx);
  await ctx.route((url) => /\/api\/wedding-by-slug/.test(typeof url === 'string' ? url : url.href),
    (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(guestWedding) }));

  const page = await ctx.newPage();
  await page.goto(`${BASE}/w/${guestWedding.slug}/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4500);
  const text = await page.evaluate(() => document.body.innerText || '');
  check('a guest opening the custom page sees its title', /welcome drinks/i.test(text),
    text.split('\n').filter((l) => l.trim())[0] || '(nothing rendered)');
  check('  and the blocks the couple put on it', /Drinks on the terrace from six\./.test(text),
    /Drinks on the terrace/.test(text) ? 'the paragraph is on the page' : 'the page rendered without its blocks');
  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);

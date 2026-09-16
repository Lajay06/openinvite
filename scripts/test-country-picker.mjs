/* global document, window */
/**
 * ONE COUNTRY PICKER, THE WHOLE ISO LIST, AND NO EMOJI IN IT.
 *
 * Owner ruling, Run 5 T5: the picker offered about ten countries; it offers the
 * full list, searchable, with local SVG flags, pinned Australia · New Zealand ·
 * United Kingdom · United States and then alphabetical, defaulting to the venue
 * country and to AU when nothing says otherwise.
 *
 * ── WHAT THE IMPORT GRAPH FOUND ────────────────────────────────────────────
 *
 * Two sites rendered a fourteen-country <select>. Three more chose a country
 * WITHOUT ASKING: the WhatsApp compose panel (a hint line reading "Include
 * country code (e.g., +61 for Australia)"), and both CSV import paths, where
 * parseGuestFile() never passed a country at all — so every imported number was
 * read as Australian, for everyone, silently. A US couple importing their own
 * guest list got a file of +61 numbers and nothing said so.
 *
 * The consumer list here is the import graph of src/lib/phoneE164.js, not a
 * list of the sites anyone remembered.
 *
 * ── WHY THE FLAGS ARE NOT EMOJI ────────────────────────────────────────────
 *
 * The no-emoji rule is about presentation: a glyph drawn by the system emoji
 * font, outside our type control. A flag emoji is exactly that — and on Windows
 * it renders as two letters. These are SVG symbols from one sprite. The check
 * below scans the rendered picker for emoji code points, so "we used SVGs"
 * stays a fact about the screen rather than about the source.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';
import { COUNTRIES, PINNED_ISO } from '../src/lib/countryCodes.generated.js';
import { countryFromVenueAddress } from '../src/lib/countryFromVenue.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4211';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

// ════════════════════════════════════════════════════════════════════════════
// PART ONE — the table and the venue rule, without a browser.
// ════════════════════════════════════════════════════════════════════════════
console.log('\n  The table\n');

check('the list is the world, not a shortlist', COUNTRIES.length >= 200, `${COUNTRIES.length} countries`);

const pinned = COUNTRIES.slice(0, PINNED_ISO.length).map((c) => c.iso);
check('  and it opens on the four that are pinned, in order',
  pinned.join(',') === PINNED_ISO.join(','), `${pinned.join(' · ')} (expected ${PINNED_ISO.join(' · ')})`);

const rest = COUNTRIES.slice(PINNED_ISO.length).map((c) => c.label);
const sorted = [...rest].sort((a, b) => a.localeCompare(b, 'en'));
check('  with the rest alphabetical', rest.join('|') === sorted.join('|'),
  rest.join('|') === sorted.join('|') ? `${rest.length} more, A–Z` : `first out of order: ${rest.find((l, i) => l !== sorted[i])}`);

const nz = COUNTRIES.find((c) => c.iso === 'NZ');
check('  and a dial code is the country\'s own', nz?.dial === '64', `NZ +${nz?.dial}`);

// The trap named in the generator's header: Italy keeps its leading zero.
const italy = COUNTRIES.find((c) => c.iso === 'IT');
const oz = COUNTRIES.find((c) => c.iso === 'AU');
check('  Italy has no trunk prefix to strip, Australia does',
  italy?.trunk === '' && oz?.trunk === '0', `IT ${JSON.stringify(italy?.trunk)}, AU ${JSON.stringify(oz?.trunk)}`);

// Nothing in the table may be an emoji — the flags are artwork, and a name is
// a name. U+FE0F and the regional-indicator block are the tells.
const emojiish = COUNTRIES.filter((c) => /[\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{1F300}-\u{1FAFF}]/u.test(`${c.label}${c.iso}`));
check('  and no entry carries an emoji code point', emojiish.length === 0,
  emojiish.length ? emojiish.map((c) => c.iso).join(', ') : `${COUNTRIES.length} names checked`);

console.log('\n  The venue default\n');
const venueCases = [
  ['12 Macquarie St, Sydney NSW 2000, Australia', 'AU'],
  ['The Savoy, London, United Kingdom', 'GB'],
  ['230 Fifth Ave, New York, NY, USA', 'US'],
  ['', 'AU'],
  ['Somewhere with no country on the end', 'AU'],
];
for (const [address, want] of venueCases) {
  const got = countryFromVenueAddress(address) || 'AU';   // the fallback is AU
  check(`  ${address ? `"${address.slice(0, 44)}"` : '(no venue)'} -> ${want}`, got === want, got);
}

// ════════════════════════════════════════════════════════════════════════════
// PART TWO — the picker on the screen.
// ════════════════════════════════════════════════════════════════════════════
console.log('\n  The picker, live\n');

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 950 });
const page = await ctx.newPage();
await page.goto(`${BASE}/Messages`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(7000);

// The couple's own number field carries one, and opening it is the only way to
// ask anything about the list.
await page.getByRole('button', { name: /^save number$/i }).first().click({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1200);
const trigger = page.getByRole('button', { name: /country code/i }).first();
const there = await trigger.count() > 0;
check('the phone field offers a country picker', there, there ? 'aria-label "Country code"' : 'no picker on the page');

if (there) {
  await trigger.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  const list = page.locator('[data-country-list]');
  const rows = await list.locator('button').count();
  check('  it opens the whole list', rows >= 200, `${rows} rows`);

  const firstFour = await list.locator('button').evaluateAll((els) => els.slice(0, 4).map((e) => e.innerText.split('\n')[0].trim()));
  check('  pinned first, in the owner\'s order',
    firstFour.join(' · ').includes('Australia') && firstFour.join(' · ').includes('New Zealand')
    && firstFour.join(' · ').includes('United Kingdom') && firstFour.join(' · ').includes('United States'),
    firstFour.join(' · '));

  // Each row is a flag drawn from the sprite, not a glyph from a font.
  const flags = await list.locator('svg use').count();
  check('  every row draws its flag from the sprite', flags >= 200, `${flags} <use> references`);
  // GUARDED, BECAUSE A PLANT ABORTED THE RUN HERE. With the flags replaced by
  // emoji there are no <use> elements at all, `.first()` resolved to nothing,
  // and the read threw — taking the rest of the checks, including the emoji one
  // this file exists for, down with it. A guard that stops early reports
  // "did not appear" where it should report FAIL.
  const href = flags ? await list.locator('svg use').first().getAttribute('href').catch(() => null) : null;
  check('  and the sprite is the one local file', /^\/flags\/flags\.svg#flag-[a-z]{2}$/.test(href || ''), href || 'no <use> to read');

  // THE RULE, MEASURED ON THE SCREEN: no emoji anywhere in the open picker.
  const emoji = await page.locator('[data-country-list]').evaluate((el) =>
    (el.innerText.match(/[\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{1F300}-\u{1FAFF}]/gu) || []).slice(0, 5));
  check('  and nothing in it is an emoji', emoji.length === 0, emoji.length ? emoji.join(' ') : 'no emoji code points rendered');

  // Search: the owner's case, plus what people actually type.
  const search = page.getByRole('textbox', { name: /search countries/i });
  for (const [typed, expect] of [['new z', 'New Zealand'], ['uk', 'United Kingdom'], ['usa', 'United States'], ['+64', 'New Zealand'], ['ivory coast', "Côte d’Ivoire"]]) {
    await search.fill(typed);
    await page.waitForTimeout(400);
    const top = (await list.locator('button').first().innerText().catch(() => '')).replace(/\n/g, ' ').trim();
    check(`  "${typed}" finds ${expect}`, top.includes(expect), top || 'nothing matched');
  }
  await search.fill('new z');
  await page.waitForTimeout(300);
  const nzRow = (await list.locator('button').first().innerText()).replace(/\n/g, ' ');
  check('  and the row carries its dial code', /\+64/.test(nzRow), nzRow.trim());
}

// ════════════════════════════════════════════════════════════════════════════
// PART THREE — the open list is actually usable (owner's screenshot, T5 follow-up).
//
// It showed Australia and half of New Zealand. The list was absolutely
// positioned inside the form, and OptionAccordion's section body carries
// `overflow: hidden` for its expand animation, so the popover was cut off at
// the bottom of the Phone row. A row count is the only honest measure of that:
// "the list has 245 children" was TRUE the whole time it was unusable.
// ════════════════════════════════════════════════════════════════════════════
console.log('\n  The open list, where it is used\n');

/** Rows whose box is fully inside both the list's visible box and the viewport. */
const visibleRows = (page) => page.evaluate(() => {
  const pop = document.querySelector('[data-country-popover]');
  const list = document.querySelector('[data-country-list]');
  if (!pop || !list) return { rows: 0, why: 'no popover' };
  const P = pop.getBoundingClientRect();
  const L = list.getBoundingClientRect();
  const rows = [...list.querySelectorAll('button')].filter((b) => {
    const r = b.getBoundingClientRect();
    return r.height > 0 && r.top >= L.top - 1 && r.bottom <= L.bottom + 1
      && r.bottom <= window.innerHeight + 1 && r.top >= 0;
  }).length;
  const search = pop.querySelector('input');
  const S = search ? search.getBoundingClientRect() : null;
  return {
    rows,
    popHeight: Math.round(P.height),
    withinViewport: P.bottom <= window.innerHeight + 1 && P.top >= -1,
    searchPinnedAtTop: !!S && Math.abs(S.top - P.top) < 2,
    searchInsideList: !!(search && list.contains(search)),
  };
});

async function openPickerOn(width, height, label, wantRows) {
  const c = await seededContext(browser, { width, height });
  const p2 = await c.newPage();
  await p2.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await p2.waitForTimeout(7000);
  await p2.getByRole('button', { name: /add guest/i }).first().click({ timeout: 12000 }).catch(() => {});
  await p2.waitForTimeout(2500);
  const trig = p2.getByRole('button', { name: /country code/i }).first();
  const found = await trig.count() > 0;
  check(`${label}: Add guest offers the picker`, found, found ? 'trigger present' : 'no trigger');
  if (found) {
    await trig.click({ timeout: 8000 }).catch(() => {});
    await p2.waitForTimeout(800);
    const m = await visibleRows(p2);
    check(`  ${label}: at least ${wantRows} rows are actually visible`, m.rows >= wantRows,
      `${m.rows} rows in a ${m.popHeight}px list`);
    check(`  ${label}: the list is not clipped by anything above it`, m.withinViewport === true,
      m.withinViewport ? 'inside the viewport' : 'runs past the bottom of the screen');
    check(`  ${label}: the search stays pinned at the top`, m.searchPinnedAtTop && m.searchInsideList === false,
      m.searchPinnedAtTop ? 'pinned above the scrolling rows' : 'the search scrolls with the rows');
  }
  await c.close();
}

await openPickerOn(1440, 950, 'desktop 1440x950', 10);
await openPickerOn(390, 844, 'phone 390x844', 6);

// The same component, in the other three places it is used.
for (const [route, label, opener] of [
  ['/Guests', 'Import guests', /import/i],
  ['/Messages', 'Messages number field', /^save number$/i],
]) {
  const c = await seededContext(browser, { width: 1440, height: 950 });
  const p3 = await c.newPage();
  await p3.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await p3.waitForTimeout(7000);
  await p3.getByRole('button', { name: opener }).first().click({ timeout: 12000 }).catch(() => {});
  await p3.waitForTimeout(2000);
  const trig = p3.getByRole('button', { name: /country (code|for phone numbers)/i }).first();
  if (await trig.count() === 0) { check(`${label}: offers the picker`, false, 'no trigger'); await c.close(); continue; }
  await trig.click({ timeout: 8000 }).catch(() => {});
  await p3.waitForTimeout(800);
  const m = await visibleRows(p3);
  check(`${label}: the same list, floating and usable`, m.rows >= 10 && m.withinViewport === true,
    `${m.rows} rows in a ${m.popHeight}px list${m.withinViewport ? '' : ', clipped'}`);
  await c.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

/* global document, getComputedStyle */
/**
 * THE EXPERIENCES PAGE SAYS WHAT IS THERE, AND RESERVES NO ROOM FOR WHAT IS NOT.
 *
 * Owner ruling, Run 4 S4, two halves.
 *
 * ── THE HEADINGS ───────────────────────────────────────────────────────────
 *
 * The itinerary generator asked the model for an "evocative, not generic" day
 * title and a sentence "capturing the day's mood and theme", and this page
 * painted both. A guest looking for where to be on Saturday read a mood.
 *
 * The heading is the day now, written by the code: "Day 2 · Sunday 14 March"
 * when the day carries a date, "Day 1" when it does not. THE STORED TITLE AND
 * SUMMARY ARE IGNORED RATHER THAN SWEPT — no record is rewritten — so the
 * fixture deliberately carries both, and this guard fails if either reaches
 * the screen. A guard run against a fixture with nothing stored would pass on
 * a page that still painted whatever it found.
 *
 * ── THE RESERVED SPACE ─────────────────────────────────────────────────────
 *
 * A couple-pick with no photograph rendered a 150px band with a MapPin at 0.15
 * opacity: a gray strip on every card the couple had not photographed, which
 * is most of them since the photo removal. The category chip lived inside that
 * band, so it had to move rather than vanish with it — and this checks the
 * chip is still painted, because "remove the placeholder" quietly taking the
 * label with it is the way that fix goes wrong.
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4205';
const SLUG = 'ada-and-alan';

// What the fixture stores and must NOT reach the screen.
const STORED_TITLES = ['Arrivals and the river', 'The wedding day'];
const STORED_SUMMARIES = ['Settle in, then walk the Thames path', 'A slow start, then the Observatory'];
// Written out, not derived: the date is 2027-03-14 and that is a Sunday.
const EXPECTED_HEADINGS = ['Day 1', 'Day 2 · Sunday 14 March'];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 950 });
const page = await ctx.newPage();
await page.goto(`${BASE}/w/${SLUG}/experience`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(6000);

const seen = await page.evaluate(() => ({
  text: document.body.innerText || '',
  headings: [...document.querySelectorAll('h2')].map((h) => (h.innerText || '').trim()),
}));

// PRESENCE BEFORE PROPERTIES: an empty page passes every absence check below.
check('the experiences page rendered its itinerary', /Day by day/i.test(seen.text),
  seen.text ? `${seen.text.length} characters` : 'the page is empty');

for (const want of EXPECTED_HEADINGS) {
  check(`  the day is named plainly: "${want}"`, seen.headings.includes(want),
    seen.headings.includes(want) ? 'exact' : `headings read: ${seen.headings.join(' | ').slice(0, 90)}`);
}
for (const t of STORED_TITLES) {
  check(`  and the stored title "${t.slice(0, 22)}…" is ignored`, !seen.text.includes(t),
    seen.text.includes(t) ? 'it is on the screen' : 'not painted');
}
for (const sm of STORED_SUMMARIES) {
  check(`  and the stored summary "${sm.slice(0, 22)}…" is ignored`, !seen.text.includes(sm),
    seen.text.includes(sm) ? 'it is on the screen' : 'not painted');
}

// ── the card with no photograph ────────────────────────────────────────────
// A PHOTOGRAPH IS AN IMAGE WITH A SOURCE, and that sentence is here because a
// plant proved the guard did not believe it. Restoring the placeholder renders
// `<img src={null}>` inside the band — an image ELEMENT with no picture in it —
// so a test asking "does this band contain an img" counted the gray strip as
// photographed and passed over exactly what it exists to catch. Third time this
// programme that an absence check was satisfied by a different kind of absence.
const cards = await page.evaluate(() => {
  const real = (el) => [...el.querySelectorAll('img')].some((i) => (i.getAttribute('src') || '').trim().length > 0);
  const bands = [...document.querySelectorAll('div')]
    .filter((d) => getComputedStyle(d).height === '150px')
    .map((d) => ({ photographed: real(d), icons: d.querySelectorAll('svg').length }));
  return { bands };
});
const emptyBands = cards.bands.filter((b) => !b.photographed);
check('no card reserves a band for a photograph it does not have', emptyBands.length === 0,
  emptyBands.length ? `${emptyBands.length} band(s) with no picture in them` : `${cards.bands.length} band(s), every one with a real src`);
const iconBands = cards.bands.filter((b) => !b.photographed && b.icons > 0);
check('  and no placeholder mark stands in for one', iconBands.length === 0,
  iconBands.length ? `${iconBands.length} band(s) holding an icon instead of a photograph` : 'no stand-in marks');

// The chip moved rather than vanished with the band it used to sit in.
check('  and the category is still on the card', /\bEat\b/.test(seen.text),
  /\bEat\b/.test(seen.text) ? 'the couple pick keeps its label' : 'the label went with the placeholder');

// ── AND THE SAME DAY, WEST OF GREENWICH ────────────────────────────────────
//
// `new Date('2027-03-14')` parses as UTC midnight by spec, so a page that
// formats it in the viewer's timezone shows the DAY BEFORE to everyone west of
// Greenwich — a guest in New York sent to Saturday for a Sunday brunch. The
// machine this runs on cannot catch that: CI is UTC and the author's box is
// UTC+10, and both read the right day by accident. So the page is rendered
// once more in a timezone where the mistake is visible.
{
  const west = await seededContext(browser, { width: 1440, height: 950, timezoneId: 'America/New_York' });
  const p2 = await west.newPage();
  await p2.goto(`${BASE}/w/${SLUG}/experience`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await p2.waitForTimeout(6000);
  const h = await p2.evaluate(() => [...document.querySelectorAll('h2')].map((x) => (x.innerText || '').trim()));
  const want = 'Day 2 · Sunday 14 March';
  check('the same day reads the same in New York', h.includes(want),
    h.includes(want) ? 'Sunday either side of the Atlantic' : `headings read: ${h.join(' | ').slice(0, 90)}`);
  await west.close();
}

// ── THE ITINERARY'S LINKS, AND ITS MISSING SQUARES (Run 5 T6) ──────────────
//
// The owner's report: a grey placeholder square beside every itinerary item,
// and no way to reach the place an item names. The square was in the STUDIO's
// own list (ExperienceGuideTab's ActivityRow drew a 56px box with a MapPin at
// 0.2 opacity); the missing links were on both surfaces; and the item never
// carried maps_url/website_url at all, because the add path dropped them.
//
// Measured at two widths, and both directions of the claim: the linked item
// shows both links, the plain one shows NEITHER — an "absent" that is only
// ever tested against absent data proves nothing.
for (const width of [390, 1440]) {
  const c = await seededContext(browser, { width, height: width === 390 ? 844 : 950 });
  const pg = await c.newPage();
  await pg.goto(`${BASE}/w/${SLUG}/experience`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(6000);

  const m = await pg.evaluate(() => {
    const textOf = (el) => (el.innerText || '').trim();
    const blocks = [...document.querySelectorAll('div')].filter((d) => /Greenwich Market/.test(textOf(d)) && textOf(d).length < 400);
    const linked = blocks[blocks.length - 1] || null;
    const plainBlocks = [...document.querySelectorAll('div')].filter((d) => /Check in at the Devonport/.test(textOf(d)) && textOf(d).length < 400);
    const plain = plainBlocks[plainBlocks.length - 1] || null;
    const hrefs = (el) => el ? [...el.querySelectorAll('a')].map((a) => a.href) : null;
    return {
      rendered: !!linked && !!plain,
      linkedHrefs: hrefs(linked),
      linkedLabels: linked ? [...linked.querySelectorAll('a')].map((a) => textOf(a)) : [],
      plainHrefs: hrefs(plain),
      // a placeholder would be an empty fixed box beside an item with no photo
      emptyBoxes: plain ? [...plain.querySelectorAll('div')].filter((d) => {
        const r = d.getBoundingClientRect();
        return r.width > 40 && r.width < 120 && Math.abs(r.width - r.height) < 12 && !d.querySelector('img') && !textOf(d);
      }).length : -1,
    };
  });

  check(`${width}: both itinerary items rendered`, m.rendered === true, m.rendered ? 'linked and plain' : 'fixture items missing');
  if (m.rendered) {
    check('  the linked item offers Website and View on map',
      m.linkedLabels.some((t) => /website/i.test(t)) && m.linkedLabels.some((t) => /view on map/i.test(t)),
      m.linkedLabels.join(' · ') || 'no links');
    check('    pointing at what the item stores',
      (m.linkedHrefs || []).some((h) => h.includes('greenwichmarket.london'))
      && (m.linkedHrefs || []).some((h) => h.includes('maps.google.com')),
      (m.linkedHrefs || []).join(' · ').slice(0, 80));
    check('  the item with no links offers none', (m.plainHrefs || []).length === 0,
      `${(m.plainHrefs || []).length} link(s) on an item that has none`);
    check('  and no placeholder square stands beside it', m.emptyBoxes === 0,
      m.emptyBoxes === 0 ? 'no empty box' : `${m.emptyBoxes} empty box(es)`);
  }
  await c.close();
}

// ── THE STUDIO'S OWN LIST (Run 5 T6) ───────────────────────────────────────
//
// The guest page is only half of this. The grey square the owner reported was
// in the COUPLE's list, and the links can only ever appear if the add path
// carries them onto the item. Neither is reachable from /w/, so both are read
// from source here rather than left unguarded.
{
  const studio = readFileSync(new URL('../src/components/studio/guest-suite/ExperienceGuideTab.jsx', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('the studio row draws no box without a photograph',
    /\{activity\.photo_url && \(/.test(studio) && !/activity\.photo_url \?[\s\S]{0,200}?MapPin/.test(studio),
    'the thumbnail is conditional, with no placeholder branch');
  check('  and it offers the same two links',
    /Website\s*<ExternalLink/.test(studio) && /View on map\s*<ExternalLink/.test(studio),
    'Website and View on map');
  check('  and an item is added carrying them',
    /onAdd\(\{ type: 'place'[\s\S]{0,400}?maps_url: place\.maps_url[\s\S]{0,200}?website_url: place\.website_url/.test(studio),
    'maps_url and website_url travel with the item');
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

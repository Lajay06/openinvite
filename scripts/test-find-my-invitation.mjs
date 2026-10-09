/* global document, window */
/**
 * "FIND MY INVITATION" IS THERE FOR A STRANGER AND GONE FOR A GUEST.
 *
 * Item 3 of goals/2026-10-09-reply-lifecycle.md. One quiet line on the home
 * tab, pointing at the RSVP tab's email bridge, for a visitor the site does
 * not recognise.
 *
 * ── WHY THREE UNIVERSES AND NOT ONE ───────────────────────────────────────
 *
 * WeddingHomePage.jsx reaches its twenty universes by three different routes,
 * and a link added to the wrong place would appear in one and not the others:
 *
 *   · london   a BESPOKE branch, written out in full in that file
 *   · amalfi   one of ten that delegate to GenericMastheadHero
 *   · tulum    the ONLY universe with no layout value, so the only one that
 *              falls through to the DEFAULT branch. That branch was also the
 *              only hero still holding an /rsvp href, a pill reading "RSVP",
 *              which item 3 removed.
 *
 * Counting in one universe would have proved nothing about the other
 * nineteen, which is exactly how the link could have been built into a hero
 * and looked correct.
 *
 * ── AND THE HERO RESTRAINT IS PINNED ──────────────────────────────────────
 *
 * P5 hero restraint: "Logistics leave the hero, they do not leave the site."
 * The link renders from the wrapper, below the masthead, outside every
 * branch. So no hero may carry an /rsvp href, and that is asserted on the
 * source rather than inferred from the counts: a second link inside a hero
 * would make the count two, but a link that MOVED into a hero would keep the
 * count at one and still reverse the decision.
 *
 * Usage: npm run test:find-my-invitation   (needs a server; CAPTURE_BASE_URL)
 */
import { readFileSync } from 'fs';
import { chromium } from 'playwright';
import { seededContext, SEED, PUBLISHED_WEDDING, RSVP_TOKEN } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';
const SLUG = PUBLISHED_WEDDING.slug;

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** How many of the link are on the page, and what the first one says. */
const readLink = (page) => page.evaluate(() => {
  const links = [...document.querySelectorAll('[data-find-my-invitation]')];
  const first = links[0];
  const cs = first ? window.getComputedStyle(first) : null;
  return {
    count: links.length,
    text: first ? (first.innerText || '').trim() : null,
    href: first ? first.getAttribute('href') : null,
    // A TEXT LINK, NOT A BUTTON: no fill, no border, and underlined. Read off
    // the painted styles rather than the source, because an inline style can
    // be overridden by a universe's own stylesheet.
    hasBorder: cs ? cs.borderStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0 : false,
    hasFill: cs ? !['rgba(0, 0, 0, 0)', 'transparent'].includes(cs.backgroundColor) : false,
    radius: cs ? parseFloat(cs.borderTopLeftRadius) || 0 : 0,
    underlined: cs ? cs.textDecorationLine.includes('underline') : false,
    fontFamily: cs ? cs.fontFamily : null,
  };
});

const UNIVERSES = [
  ['london', 'a bespoke branch'],
  ['amalfi', 'a GenericMastheadHero universe'],
  ['tulum', 'the default branch, the one that had the pill'],
];

const browser = await chromium.launch();

console.log('\n  Find my invitation, across the three render routes:\n');

for (const [universe, why] of UNIVERSES) {
  const published = { ...PUBLISHED_WEDDING, activeUniverse: universe };

  // ── UNRECOGNISED: the line is there, exactly once ────────────────────────
  {
    const ctx = await seededContext(browser, { width: 1280, height: 900, seed: SEED, published });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/w/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(4500);
    const l = await readLink(page);
    check(`${universe} (${why}): a stranger sees the link exactly once`, l.count === 1, `${l.count} found`);
    if (l.count === 1) {
      check('  it reads "Find my invitation"', l.text === 'Find my invitation', `"${l.text}"`);
      check('  and points at the RSVP tab', l.href === `/w/${SLUG}/rsvp`, l.href);
      check('  styled as a text link, not a button',
        !l.hasBorder && !l.hasFill && l.radius === 0 && l.underlined,
        `border ${l.hasBorder}, fill ${l.hasFill}, radius ${l.radius}, underlined ${l.underlined}`);
      check('  in the universe\'s own body face', !!l.fontFamily && l.fontFamily !== 'none', l.fontFamily);
    } else {
      check('  it reads "Find my invitation"', false, 'no link');
      check('  and points at the RSVP tab', false, 'no link');
      check('  styled as a text link, not a button', false, 'no link');
      check('  in the universe\'s own body face', false, 'no link');
    }
    await ctx.close();
  }

  // ── RECOGNISED: the line is gone entirely ────────────────────────────────
  //
  // ?rsvp=<token> is consumed by MultiPageWeddingWebsite's own useState
  // initialiser, before any effect in the tree, so recognition is settled on
  // the first render and this is not a race.
  {
    const ctx = await seededContext(browser, { width: 1280, height: 900, seed: SEED, published });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/w/${SLUG}?rsvp=${RSVP_TOKEN}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(4500);
    const l = await readLink(page);
    check(`  and a recognised guest sees it zero times`, l.count === 0, `${l.count} found`);
    await ctx.close();
  }
}

await browser.close();

// ── THE HERO RESTRAINT, ON THE SOURCE ──────────────────────────────────────
//
// Every branch in the file sits before the wrapper that renders the link, so
// the one permitted /rsvp href is the last one in the file. Anything earlier
// is inside a hero.
const home = readFileSync(new URL('../src/components/guest-website/pages/WeddingHomePage.jsx', import.meta.url), 'utf8');
const hrefs = [...home.matchAll(/\/rsvp`/g)].map((m) => m.index);
const wrapperAt = home.indexOf('function FindMyInvitation(');
check('exactly one /rsvp href in the home page', hrefs.length === 1, `${hrefs.length} found`);
check('  and it is the wrapper\'s, not a hero\'s',
  hrefs.length === 1 && wrapperAt > -1 && hrefs[0] > wrapperAt,
  hrefs.length === 1 ? `href at ${hrefs[0]}, wrapper at ${wrapperAt}` : 'see above');
const pillBack = /borderRadius: 999,[\s\S]{0,200}RSVP\s*<\/a>/.test(home);
// THE DETAIL REPORTS THE STATE, NOT THE HOPE. This read 'pill gone'
// unconditionally, so a plant that put the pill back printed a FAIL whose
// detail still said it was gone.
check('  the default branch no longer renders an RSVP pill',
  !pillBack, pillBack ? 'a pill is back in a hero' : 'pill gone');

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);

/**
 * tests/persistence/hero-bare-switch.mjs
 *
 * A COUPLE CAN HAVE THE PHOTOGRAPH BY ITSELF.
 *
 * "Show names" already took the couple's names off the hero. It left the
 * kicker — "Join us as we celebrate…" — and the monogram behind, so there was
 * no combination of switches that produced a bare image. A couple with a
 * portrait they had chosen carefully could not get our furniture off it.
 *
 * ── IT USED TO BE ONE SWITCH FOR TWO THINGS. IT IS NOT ANY MORE ────────────
 *
 * This guard was written when "Show welcome text" governed the welcome line
 * AND the mark, on the argument that a monogram floating alone over a
 * photograph with no text is not a state anyone asked for. Item 11 of
 * goals/2026-10-08-site-fixes-batch-1.md reversed that: "Show welcome text
 * must hide only the welcome text; today it also hides the mark."
 *
 * THE CONSEQUENCE THE ITEM DID NOT NAME, and the reason this file changed
 * rather than lost a check: the BARE HERO used to be two switches and is now
 * three. Names off and welcome off used to leave the photograph alone; they
 * now leave the monogram on it, so reaching a bare image also needs "Show
 * mark" off. The promise this file was written to defend — a couple can have
 * their photograph by itself — still holds, by a longer route, and that route
 * is what section 3 below asserts.
 *
 * ── ABSENT MEANS ON, AND THAT IS THE WHOLE CONTRACT ────────────────────────
 *
 * heroDisplay's existing rule, and the reason this file tests `undefined`
 * explicitly: every couple already has a hero. A switch stored as `undefined`
 * that read as OFF would be a migration disguised as a default — every
 * existing site losing its welcome line the day this ships.
 *
 * ── AND THE UPLOAD SURVIVES ────────────────────────────────────────────────
 *
 * Switching the welcome line off must not delete the couple's monogram. The
 * overlay keeps its own `enabled` flag as well, so someone who switched the
 * mark off by itself stays switched off when the words come back.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const withOverlay = (homeContent) => ({ homeContent: { overlay: { url: 'https://example.com/m.png' }, ...homeContent } });

export async function runHeroBareSwitch() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const { heroShowsWelcome, heroKickerOf, heroOverlayOf, heroShowsNames } = await import('../../src/lib/heroDisplay.js');
  const COPY = { heroKicker: 'Join us as we celebrate' };

  // ── 1. absent means on ────────────────────────────────────────────────────
  check('an untouched hero still shows its welcome line', heroShowsWelcome({}) === true, 'undefined !== false');
  check('  and still shows its mark', !!heroOverlayOf(withOverlay({})), 'the overlay survives an absent flag');
  check('  and the kicker is the universe\'s own', heroKickerOf({}, COPY) === COPY.heroKicker, COPY.heroKicker);

  // ── 2. off hides THE WELCOME LINE, and only it ────────────────────────────
  const off = withOverlay({ showWelcome: false });
  check('switching it off drops the welcome line', heroKickerOf(off, COPY) === '', 'no kicker');
  check('  and leaves the monogram alone', !!heroOverlayOf(off), 'two switches, two things');
  check('  and back on restores the line', heroKickerOf(withOverlay({ showWelcome: true }), COPY) === COPY.heroKicker,
    'reversible');

  // ── 3. THE BARE HERO, NOW A THREE-SWITCH ROUTE ────────────────────────────
  //
  // Names off, welcome off, mark off. The first two no longer take the
  // monogram with them, so the third is part of the route since item 11.
  const twoOff = withOverlay({ showWelcome: false, showNames: false });
  check('names and welcome off still print no text', heroKickerOf(twoOff, COPY) === '', 'no kicker');
  check('  but the monogram is still there, which is the new behaviour',
    !!heroOverlayOf(twoOff), 'the mark has its own switch');
  const bare = { homeContent: { overlay: { url: 'https://example.com/m.png', enabled: false }, showWelcome: false, showNames: false } };
  check('  and with the mark off as well the photograph is by itself',
    heroKickerOf(bare, COPY) === '' && heroOverlayOf(bare) === null && heroShowsNames(bare) === false,
    'three switches, bare image');

  // ── 4. the couple's upload is kept, not deleted ──────────────────────────
  check('switching off does not remove the uploaded mark',
    off.homeContent.overlay.url === 'https://example.com/m.png', 'a flag, never a removal');
  // AND THE INDIVIDUAL FLAG STILL WINS. Someone who turned the mark off by
  // itself must not have it reappear because the welcome line came back.
  const markOffWordsOn = { homeContent: { overlay: { url: 'x', enabled: false }, showWelcome: true } };
  check('  and a mark switched off individually stays off', heroOverlayOf(markOffWordsOn) === null,
    'overlay.enabled === false still wins');

  // ── 5. it is wired, in the panel and on the page ─────────────────────────
  const panel = read('src/components/website-builder/WBRightPanel.jsx');
  check('the builder offers the switch', /label="Show welcome text"/.test(panel), 'beside Show names');
  check('  and writes it where the others live', /updateNested\('homeContent', 'showWelcome'/.test(panel),
    'homeContent, like showNames and showDate');

  const page = read('src/components/guest-website/pages/WeddingHomePage.jsx');
  const rawKicker = (page.match(/kicker=\{copy\.heroKicker\}/g) || []).length;
  check('no hero prints the kicker without asking', rawKicker === 0,
    rawKicker ? `${rawKicker} site(s) still read copy.heroKicker directly` : 'all ten go through heroKickerOf');
  const gated = (page.match(/heroKickerOf\(weddingDetails, copy\)/g) || []).length;
  check('  and every one of them is gated', gated === 10, `${gated} hero(es)`);

  return results;
}

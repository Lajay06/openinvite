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
 * ── ONE SWITCH FOR TWO THINGS, AND WHY ─────────────────────────────────────
 *
 * The welcome line and the mark are not two decisions made separately: the
 * mark exists to sit with the words, and a monogram floating alone over a
 * photograph with no text is not a state anyone asked for. So "Show welcome
 * text" governs both.
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

  // ── 2. off hides BOTH ─────────────────────────────────────────────────────
  const off = withOverlay({ showWelcome: false });
  check('switching it off drops the welcome line', heroKickerOf(off, COPY) === '', 'no kicker');
  check('  and the monogram with it', heroOverlayOf(off) === null, 'one switch, two things');
  check('  and back on restores both', heroKickerOf(withOverlay({ showWelcome: true }), COPY) === COPY.heroKicker
    && !!heroOverlayOf(withOverlay({ showWelcome: true })), 'reversible');

  // ── 3. THE BARE HERO: both switches off leaves nothing on the image ───────
  const bare = withOverlay({ showWelcome: false, showNames: false });
  check('with both off the hero prints no welcome text', heroKickerOf(bare, COPY) === '', 'no kicker');
  check('  and carries no overlay element', heroOverlayOf(bare) === null, 'no mark');
  check('  and the names are off too', heroShowsNames(bare) === false, 'the photograph, by itself');

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

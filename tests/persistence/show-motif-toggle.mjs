/**
 * tests/persistence/show-motif-toggle.mjs
 *
 * THREE SWITCHES, THREE THINGS.
 *
 * Item 11 of goals/2026-10-08-site-fixes-batch-1.md: "Show welcome text must
 * hide only the welcome text; today it also hides the mark. Add a third
 * toggle, Show motif, default on, that hides the universe's motif for a plain
 * intro."
 *
 * ── THIS REVERSES A DECISION THE CODE ARGUED FOR ───────────────────────────
 *
 * src/lib/heroDisplay.js used to say the coupling was deliberate: "one switch
 * for two things... a monogram floating alone over a photo with no text is not
 * a state anyone asked for". The owner ruled the other way. The old reasoning
 * is still in that file, rewritten as history rather than deleted, so nobody
 * later reads the separation as an accident and re-couples them. This guard
 * pins the separation so that cannot happen quietly.
 *
 * ── WHICH MOTIF, SINCE THE WORD MEANS SEVERAL THINGS IN THIS REPO ──────────
 *
 * Not the couple's monogram: that is the MARK, and it has had its own switch
 * all along. The motif is the hairline EntranceMoment draws under its kicker,
 * the one decorative element of the intro a couple could not turn off. The
 * universe layouts (ZelligeDivider, ShanghaiCloud, VineRule and the rest) are
 * also called motifs and are NOT this switch's subject: they sit on the
 * celebration and RSVP pages, not the intro, and the guard asserts they are
 * untouched so a later reading cannot widen this item by accident.
 *
 * ── DEFAULTS ARE ON, WHICH IS THE WHOLE CONTRACT OF THIS FILE'S SUBJECT ────
 *
 * heroDisplay's own header: a switch stored as undefined has to mean ON, or
 * the day this ships every existing site loses something. Asserted for the
 * new switch exactly as the other three have it.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import {
  heroShowsMotif, heroShowsWelcome, heroShowsNames, heroShowsDate, heroOverlayOf,
} from '../../src/lib/heroDisplay.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const MARK = { url: 'https://example.com/monogram.png' };

export async function runShowMotifToggle() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, String(JSON.stringify(got)).slice(0, 60))
      : fail(label, String(JSON.stringify(want)).slice(0, 60), String(JSON.stringify(got)).slice(0, 60)));

  // ── ABSENT MEANS ON, FOR ALL FOUR ───────────────────────────────────────
  const fresh = {};
  check('a wedding with no switches set has all four on',
        [heroShowsNames(fresh), heroShowsDate(fresh), heroShowsWelcome(fresh), heroShowsMotif(fresh)],
        [true, true, true, true]);
  check('  and an empty homeContent is the same',
        heroShowsMotif({ homeContent: {} }), true);
  check('  only an explicit false turns the motif off',
        [heroShowsMotif({ homeContent: { showMotif: false } }),
         heroShowsMotif({ homeContent: { showMotif: true } }),
         heroShowsMotif({ homeContent: { showMotif: null } })],
        [false, true, true]);

  // ── THE SEPARATION ──────────────────────────────────────────────────────
  //
  // The mark survives the welcome line being switched off. This is the item.
  const welcomeOff = { homeContent: { showWelcome: false, overlay: MARK } };
  ok('the mark stays when the welcome line is switched off',
     heroOverlayOf(welcomeOff)?.url === MARK.url, 'decoupled');
  ok('  and the mark still has its own switch',
     heroOverlayOf({ homeContent: { showWelcome: false, overlay: { ...MARK, enabled: false } } }) === null,
     'Show mark still works');
  ok('  and an upload with no url is still nothing to draw',
     heroOverlayOf({ homeContent: { overlay: { enabled: true } } }) === null, 'no url');
  // AND THE MOTIF IS A THIRD, SEPARATE THING: switching it off touches
  // neither the welcome line nor the mark.
  const motifOff = { homeContent: { showMotif: false, overlay: MARK } };
  check('switching the motif off leaves the welcome line and the mark alone',
        [heroShowsWelcome(motifOff), heroOverlayOf(motifOff)?.url], [true, MARK.url]);

  // ── WHERE EACH SWITCH REACHES ───────────────────────────────────────────
  const entrance = code(read('src/components/guest-website/EntranceMoment.jsx'));
  ok('the intro draws its motif only when the switch is on',
     /\{showMotif && <HairlineRule/.test(entrance), 'gated');
  ok('  reading the details it already receives, with no new prop',
     /heroShowsMotif\(weddingDetails\)/.test(entrance), 'no prop threading');
  ok('  and the kicker above it is not gated by this switch',
     !/showMotif[\s\S]{0,80}\{kicker\}/.test(entrance), 'the welcome line has its own');

  const panel = code(read('src/components/website-builder/WBRightPanel.jsx'));
  ok('Content offers the third switch', /label="Show motif"/.test(panel), 'present');
  ok('  storing it beside the other two',
     /updateNested\('homeContent', 'showMotif'/.test(panel), 'homeContent');
  ok('  and the welcome switch no longer claims the monogram',
     /label="Show welcome text"[\s\S]{0,120}hint="The welcome line over your hero"/.test(panel),
     'hint corrected');

  // ── THE OTHER MOTIFS ARE NOT THIS SWITCH'S SUBJECT ──────────────────────
  for (const f of [
    'src/components/guest-website/pages/WeddingCelebrationPage.jsx',
    'src/components/guest-website/pages/WeddingRSVPPage.jsx',
    'src/components/guest-website/blocks/UniverseBlocks.jsx',
  ]) {
    ok(`${f.split('/').pop()} is untouched by the intro switch`,
       !/heroShowsMotif/.test(read(f)), 'not widened');
  }

  // ── AND THE REVERSAL IS RECORDED RATHER THAN SILENT ─────────────────────
  const lib = read('src/lib/heroDisplay.js');
  ok('heroDisplay records that the coupling was reversed, not forgotten',
     /IT USED TO HIDE THE MARK AS WELL, AND THE OWNER REVERSED THAT/.test(lib), 'history kept');

  return results;
}

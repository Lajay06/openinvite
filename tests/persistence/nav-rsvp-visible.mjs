/**
 * tests/persistence/nav-rsvp-visible.mjs
 *
 * RSVP MUST BE INSIDE THE VISIBLE SLICE AT 390px.
 *
 * The nav used to guarantee this BY CONSTRUCTION: RSVP was pinned, held out of
 * the overflow whatever else happened. Ruling R12 replaced the pin with a
 * position — fourth in a fixed order — which guarantees the same thing BY
 * ARITHMETIC, and arithmetic can be broken by an edit that looks unrelated.
 * Adding a page above RSVP, or lowering MAX_VISIBLE_LINKS, silently pushes the
 * one thing a guest is asked to do behind "More", two taps deep.
 *
 * So the accident is replaced by a check. This file fails BY NAME if that ever
 * stops being true, which is the whole reason the pin could be removed.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(__dir, '../../src/components/guest-website/WeddingWebsiteNav.jsx'), 'utf8');

export async function runNavRsvpVisible() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guest nav — the reply is never behind "More":\n');

  // ── THE ORDER IS THE COUPLE'S NOW, AND THIS STILL HOLDS ────────────────
  //
  // Owner ruling 2026-09-07: pages are reorderable, and the couple's order
  // drives the guest site's navigation. `NAV_ORDER` became `FALLBACK_ORDER` —
  // the shape a site with no stored order falls back to, and the shape
  // sub-links (Stay, Getting here) still use, since those are not pages.
  //
  // THE PROPERTY IS UNCHANGED, and it is the reason R12 existed at all:
  // appended-last is what a tail-slice takes FIRST, so on a 390px screen the
  // reply ended up behind "More", two taps deep. A couple may now drag RSVP
  // anywhere they like; the nav still PLACES it inside the visible slice.
  // So this checks the clamp rather than a fixed index — the guarantee moved
  // from a constant to an expression, and the expression is what to test.
  const maxMatch = /MAX_VISIBLE_LINKS\s*=\s*(\d+)/.exec(src);
  const orderMatch = /const FALLBACK_ORDER = \[([\s\S]*?)\]/.exec(src);

  // A GUARD THAT CANNOT FIND ITS INPUT MUST FAIL, NOT PASS.
  if (!maxMatch || !orderMatch) {
    check('the nav still declares MAX_VISIBLE_LINKS and FALLBACK_ORDER', false,
      `MAX=${!!maxMatch} FALLBACK_ORDER=${!!orderMatch}`);
    return results;
  }

  const max = Number(maxMatch[1]);
  const order = [...orderMatch[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  const rsvpIndex = order.indexOf('rsvp');

  check('the fallback order contains rsvp', rsvpIndex > -1, `index ${rsvpIndex}`);
  check(`rsvp is inside the visible slice of ${max} on a site with no stored order`,
    rsvpIndex > -1 && rsvpIndex < max,
    `rsvp at position ${rsvpIndex + 1}, slice shows ${max}`);
  // AND ON A SITE WITH ONE. Wherever the couple dragged RSVP, its insertion
  // point is clamped below the last visible slot — this is the line that now
  // carries R12's guarantee.
  check('rsvp is clamped into the visible slice whatever the couple chose',
    /Math\.min\(rsvpAt === -1 \? 3 : rsvpAt, MAX_VISIBLE_LINKS - 1, withoutRsvp\.length\)/.test(src),
    'the guarantee is an expression now, not a constant');
  check('  and the couple’s own order decides everything else',
    /const coupleOrder = Array\.isArray\(enabledPages\) && enabledPages\.length \? enabledPages : FALLBACK_ORDER/.test(src),
    'their arrangement, with one safety');

  // The worst case is a wedding with every page enabled: nothing can push RSVP
  // further right than its own index, so index < max is sufficient — but only
  // while the slice is taken from one ordered list. Guard that too.
  check('the visible slice is taken from one ordered list',
    /const visibleLinks = ordered\.slice\(0, MAX_VISIBLE_LINKS\)/.test(src),
    'ordered.slice(0, MAX_VISIBLE_LINKS)');

  return results;
}

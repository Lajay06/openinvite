/**
 * Trial-banner offsets.
 *
 * #529 made the trial banner render at EVERY width (it had been `hidden
 * lg:flex`). Nothing below `lg` had ever had to account for it, and three
 * assumptions that were previously unreachable all became wrong at once:
 *
 *   1. The banner positioned itself at TOP_BAR_H (48). That is the DESKTOP
 *      bar; the `flex lg:hidden` mobile bar is 64, so on a phone the banner's
 *      own first line sat behind the top bar.
 *   2. `.page-content` reserved a flat 64px below 1024px -- top bar only. The
 *      wrapped banner ends at 150px, so 70px of page, including the h1, was
 *      painted over.
 *   3. `contentTopOffset` reserved a hard-coded 36 for the banner. 36 was its
 *      minHeight, correct only while the sentence fits one line. Measured, it
 *      is 38 on one line and 86 wrapped -- so the constant was wrong on
 *      desktop too, and wrong by 50px at 390.
 *
 * The banner is the ONLY explanation an expired couple gets for why saving
 * stopped, so it obscuring the page it explains was the worst possible shape
 * for this bug.
 *
 * Geometry is verified in a browser at 390/768/1440 in the render pass; this
 * module pins the source-level invariants so they cannot silently regress.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const LAYOUT = strip(readFileSync(root('src/Layout.jsx'), 'utf8'));
const CSS = readFileSync(root('src/index.css'), 'utf8');

export async function runBannerOffset() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Trial-banner offsets — the banner never covers the page it explains:\n');

  check('the two top bars have separate named heights',
    /const TOP_BAR_H = 48;/.test(LAYOUT) && /const MOBILE_TOP_BAR_H = 64;/.test(LAYOUT), '48 desktop / 64 mobile');
  check('  the mobile bar uses the constant, not a literal',
    /height: MOBILE_TOP_BAR_H,/.test(LAYOUT) && !/height: 64,/.test(LAYOUT), 'no stray 64');
  check('the banner positions against whichever bar is on screen',
    /top: 'var\(--oi-top-bar-h\)'/.test(LAYOUT), 'CSS var, not TOP_BAR_H');
  check('  the var resolves 64 on mobile and 48 from lg up',
    /:root \{ --oi-top-bar-h: 64px; \}/.test(CSS)
      && /@media \(min-width: 1024px\) \{ :root \{ --oi-top-bar-h: 48px; \} \}/.test(CSS), 'both declared');

  check('the banner height is MEASURED, not assumed',
    /new ResizeObserver\(measure\)/.test(LAYOUT) && /getBoundingClientRect\(\)\.height/.test(LAYOUT), 'ResizeObserver');
  check('  the hard-coded 36 is gone',
    !/\(trialBanner \? 36 : 0\)/.test(LAYOUT), 'no constant reserve');
  check('  both offsets include the measured height',
    /const contentTopOffset = TOP_BAR_H \+ trialBannerH \+ bannerH;/.test(LAYOUT)
      && /const contentTopOffsetMobile = MOBILE_TOP_BAR_H \+ trialBannerH;/.test(LAYOUT), 'desktop + mobile');

  check('the mobile content offset is banner-aware',
    /padding-top: var\(--content-top-mobile, 64px\);/.test(CSS), 'no flat 64px');
  check('  it is published from JS',
    /'--content-top-mobile': `\$\{contentTopOffsetMobile\}px`/.test(LAYOUT), 'custom property set');

  check('the collaborator banner stacks below the trial banner',
    /topOffset=\{TOP_BAR_H \+ trialBannerH\}/.test(LAYOUT), 'no longer both pinned at 48');

  return results;
}

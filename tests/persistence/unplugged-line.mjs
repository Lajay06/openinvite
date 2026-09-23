/**
 * The Photographs row says the unplugged ask once.
 *
 * `linesFor('photography', p)` in src/lib/goodToKnow.js used to push the
 * platform's sentence ("We are having an unplugged ceremony — please keep
 * phones and cameras away until afterwards.") whenever the toggle was on,
 * and then the couple's own `message` underneath it. Every sample page said
 * the same thing twice in a row, and so did any couple who turned the toggle
 * on and wrote the note the editor's placeholder and Ava both invite them
 * to write.
 *
 * THE RULE. The couple's note replaces the platform sentence when it exists;
 * the platform speaks only when the couple said nothing. The four
 * combinations, with `display` on:
 *
 *   on  + note   -> one line, the note
 *   on  + empty  -> one line, the platform sentence
 *   off + note   -> one line, the note
 *   off + empty  -> no Photographs row; when it was the only section, the
 *                   page and its nav link go with it (both derive from
 *                   visibleSections().length, MultiPageWeddingWebsite.jsx:297,
 *                   RealWebsitePreview.jsx:157)
 *
 * The first case is the fix; the other three pin what already held, so the
 * one-line change cannot widen. The editors (GuestSuitePolicies.jsx,
 * PoliciesTab.jsx) show the couple the line guests will see, through this
 * same function, so the editor and the site cannot disagree.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';
import { linesFor, visibleSections } from '../../src/lib/goodToKnow.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '../..');
const SHARED = 'We are having an unplugged ceremony — please keep phones and cameras away until afterwards.';
const NOTE = 'Phones down for ten minutes. After that, go ahead.';

export async function runUnpluggedLine() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  The Photographs row says the unplugged ask once:\n');

  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const on = (message) => linesFor('photography', { display: true, unplugged: true, message });
  const off = (message) => linesFor('photography', { display: true, unplugged: false, message });

  check('toggle on + note -> one line, the note', eq(on(NOTE), [NOTE]), `${on(NOTE).length} line(s): ${JSON.stringify(on(NOTE)).slice(0, 90)}`);
  check('toggle on + empty -> one line, the platform sentence', eq(on(''), [SHARED]), `${on('').length} line(s)`);
  check('toggle off + note -> one line, the note', eq(off(NOTE), [NOTE]), `${off(NOTE).length} line(s)`);
  check('toggle off + empty -> no lines', eq(off(''), []), `${off('').length} line(s)`);

  // Only section, toggle off and empty: the section, the page and the nav link all go.
  const onlyPhoto = { photography: { display: true, unplugged: false, message: '' } };
  check('  and when Photographs was the only section, visibleSections() is empty', visibleSections(onlyPhoto).length === 0, `${visibleSections(onlyPhoto).length} section(s)`);
  const site = readFileSync(resolve(ROOT, 'src/components/guest-website/MultiPageWeddingWebsite.jsx'), 'utf8');
  const preview = readFileSync(resolve(ROOT, 'src/components/website-builder/RealWebsitePreview.jsx'), 'utf8');
  check('  the page and the nav link derive from visibleSections().length',
    /'good-to-know': visibleSections\(weddingDetails\?\.weddingPolicies\)\.length > 0/.test(site)
      && /hasGoodToKnow=\{visibleSections\(weddingDetails\?\.weddingPolicies\)\.length/.test(site)
      && /hasGoodToKnow=\{visibleSections\(details\?\.weddingPolicies\)\.length > 0\}/.test(preview),
    'site page, site nav, studio preview nav');

  // The editors show the couple the same line, through the same function.
  for (const f of ['src/pages/GuestSuitePolicies.jsx', 'src/components/studio/guest-suite/PoliciesTab.jsx']) {
    const src = readFileSync(resolve(ROOT, f), 'utf8');
    check(`${f.split('/').pop()} shows guests' line through linesFor('photography', …)`,
      /import \{[^}]*\blinesFor\b[^}]*\} from '@\/lib\/goodToKnow'/.test(src) && /linesFor\('photography', policies\.photography\)/.test(src),
      'same rule as the site');
  }

  return results;
}

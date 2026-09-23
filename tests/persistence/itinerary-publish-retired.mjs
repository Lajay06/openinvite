/**
 * Saving the itinerary is the end of it: the studio toggle is the only
 * visibility control, and the legacy publish flag converges to nothing.
 *
 * WHAT WAS THERE. The experience guide had its own Publish tab with a
 * "Publish guide" button and a switch, both writing experienceGuide.published.
 * The guest site reads that flag as one half of an OR:
 *
 *   pageIsAvailable = page === 'home'
 *     || enabledPages.includes(page)
 *     || subPageAvailability[page] === true     // 'experience' -> guide.published
 *
 * so the couple had two independent doors to the same page and no way to tell
 * which one was holding it open.
 *
 * THE RULING (option b, and why not option a). Nothing writes the flag any
 * more, but the READ STAYS. Dropping the read would have hidden the guide for
 * every couple who is published-but-not-enabled — a regression on live data
 * that cannot be enumerated without reading production rows. Keeping the read
 * is backwards compatible and self-converging: existing published guides stay
 * visible, no new record can acquire the flag, and the first time a couple
 * switches the page off in the studio the flag is cleared with it. Without
 * that last part the legacy flag would outvote the new control and a couple
 * could never take their guide down.
 *
 * NO MIGRATION, deliberately: no existing record is rewritten except by the
 * couple's own action, at the moment they act.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

export async function runItineraryPublishRetired() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  The itinerary has one visibility control, and the publish flag converges:\n');

  const tab = read('src/components/studio/guest-suite/ExperienceGuideTab.jsx');
  const panel = read('src/components/website-builder/WBLeftPanel.jsx');
  const site = read('src/components/guest-website/MultiPageWeddingWebsite.jsx');
  const preview = read('src/components/website-builder/RealWebsitePreview.jsx');

  // Nothing writes the flag any more.
  check('no control writes experienceGuide.published',
    !/onSaveField\('published'/.test(tab) && !/'published',\s*(true|v)\b/.test(tab),
    'no writer in the guide tab');
  check('  the Publish tab is gone', !/value="publish"/.test(tab) && !/>Publish</.test(tab), 'no publish tab');
  check('  and its setup fields survive under their own name',
    /<TabsTrigger value="setup">Setup<\/TabsTrigger>/.test(tab)
      && /heroPhotoUrl/.test(tab) && /editorialIntro/.test(tab),
    'hero photo and editorial intro still editable');

  // The read stays — that is what keeps already-published couples visible.
  check('the guest site still honours an existing published flag',
    /experience: weddingDetails\?\.experienceGuide\?\.published/.test(site)
      && /hasExperience=\{weddingDetails\?\.experienceGuide\?\.published\}/.test(site),
    'page availability and nav');
  check('  and so does the studio preview',
    /hasExperience=\{!!details\?\.experienceGuide\?\.published\}/.test(preview), 'preview nav');

  // Turning the page off clears the flag, so the toggle always wins.
  const toggle = panel.match(/const toggle = \(slug\) => \{[\s\S]*?\n {2}\};/);
  check('switching the experience page off clears the flag',
    !!toggle
      && /turningOff && slug === 'experience'/.test(toggle[0])
      && /onChange\('experienceGuide', \{ \.\.\.details\.experienceGuide, published: false \}\)/.test(toggle[0]),
    toggle ? 'cleared on toggle-off' : 'no toggle function');
  check('  and turning it on does not set it',
    !!toggle && !/published: true/.test(toggle[0]), 'never written up');

  return results;
}

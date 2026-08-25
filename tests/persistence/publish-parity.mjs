/**
 * What the dashboard promises, the site delivers.
 *
 * PUBLISH-PARITY. Four controls were found promising something that never
 * reached a guest: policies ("Display on website" → a section that did not
 * exist), the experience itinerary (delivered in the guest-safe payload and
 * discarded at the render), the live stream (no guest page at all), and
 * fontOverride (absent from the live Base44 schema). On a paid product that is
 * a trust problem before it is a bug list.
 *
 * This pins the two fixed here, and the promise text itself — because the
 * defect was never only the missing renderer. It was a sentence in the
 * dashboard that was not true.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { visibleSections, linesFor } from '../../src/lib/goodToKnow.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The shapes the dashboard actually writes, per GuestSuitePolicies' defaults. */
const REAL_POLICIES = {
  children:     { option: 'adults_only', message: 'We hope you understand.', display: true },
  dressCode:    { guidance: 'Garden formal.', weatherNote: 'It may be cool after sunset.', display: true },
  gifts:        { option: 'no_gifts', registryUrl: '', message: '', display: true },
  dietary:      { description: 'Vegetarian and gluten-free available.', contactName: 'Sam', contactEmail: 's@x.com', display: false },
  photography:  { unplugged: true, message: '', display: false },
  socialMedia:  { noCeremony: true, tagUs: true, hashtag: '#JS2027', message: '', display: false },
  lateArrival:  { policy: 'Doors close at 3pm sharp.', display: false },
  other:        { text: '', display: true },
};

export async function runPublishParity() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Publish parity — the dashboard promises no more than the site delivers:\n');

  // ── Good to know: the real function against the real shapes ─────────────
  const sections = visibleSections(REAL_POLICIES);
  const keys = sections.map((s) => s.key);

  check('a policy marked display:true reaches the guest page',
    keys.includes('children') && keys.includes('dressCode') && keys.includes('gifts'),
    keys.join(', ') || 'none');
  check('  and one marked display:false does not',
    !keys.includes('dietary') && !keys.includes('photography') && !keys.includes('lateArrival'),
    'display is honoured');
  // display:true with nothing written is not content. Rendering an empty
  // heading would be its own small broken promise.
  check('  and display:true with nothing written renders nothing',
    !keys.includes('other'), 'an empty section is not a section');

  check('the chosen option becomes a sentence, not a database value',
    linesFor('children', REAL_POLICIES.children)[0] === 'This is an adults-only celebration.',
    JSON.stringify(linesFor('children', REAL_POLICIES.children)[0]));
  check("  and the couple's own message follows it",
    linesFor('children', REAL_POLICIES.children).length === 2, 'option line + custom message');

  // CONTROL: the reader must be capable of returning nothing, or every
  // assertion above passes for a function that always returns content.
  check('  control: no policies at all yields no sections',
    visibleSections({}).length === 0 && visibleSections(undefined).length === 0, 'empty is empty');

  // ── the itinerary is actually read ──────────────────────────────────────
  const exp = strip(read('src/components/guest-website/pages/WeddingExperiencePage.jsx'));
  check('the experience page reads the itinerary',
    /guide\.itinerary\?\.schedule/.test(exp), 'delivered AND rendered');
  check('  and renders all three parts of a day',
    /morning/.test(exp) && /afternoon/.test(exp) && /evening/.test(exp), 'morning, afternoon, evening');
  check('  and survives a day with empty blocks',
    /BLOCKS\.some\(/.test(exp), 'filtered, not assumed');

  // ── the nav, on both the live site and the builder ──────────────────────
  for (const [file, label] of [
    ['src/components/guest-website/MultiPageWeddingWebsite.jsx', 'live site'],
    ['src/components/website-builder/RealWebsitePreview.jsx', 'builder preview'],
  ]) {
    check(`${label} passes hasGoodToKnow`,
      /hasGoodToKnow=\{visibleSections\(/.test(strip(read(file))), 'builder/publish parity');
  }
  const nav = strip(read('src/components/guest-website/WeddingWebsiteNav.jsx'));
  check('the nav offers Good to know, and calls the guide Experiences',
    /label: 'Good to know'/.test(nav) && /label: 'Experiences'/.test(nav) && !/label: 'Guide'/.test(nav),
    'N-1 and N-2');

  // ── THE PROMISE ITSELF ──────────────────────────────────────────────────
  // The original defect was a sentence that was not true. A renderer that
  // exists while the sentence still names a section that does not is only
  // half fixed.
  const promiseFiles = ['src/pages/GuestSuitePolicies.jsx', 'src/components/studio/guest-suite/PoliciesTab.jsx'];
  const liars = promiseFiles.filter((f) => /Policies section of your wedding website/.test(read(f)));
  check('no dashboard copy still promises a "Policies section"',
    liars.length === 0, liars.join(', ') || 'both updated');
  const namesReal = promiseFiles.every((f) => /Good to know section of your wedding website/.test(read(f)));
  check('  and both name the section that now exists',
    namesReal, promiseFiles.length + ' surfaces');

  return results;
}

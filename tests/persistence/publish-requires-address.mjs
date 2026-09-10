/**
 * tests/persistence/publish-requires-address.mjs
 *
 * A SITE CANNOT BE LIVE AT AN ADDRESS THAT DOES NOT EXIST.
 *
 * smoke01 read `websiteEnabled: true, slug: null` with no names on the record
 * and `claim-slug` answering `{slug: null, reason: 'no-names'}`. The builder
 * printed `openinvite.com.au/w/your-wedding/` beside a green dot, and the
 * Share tab would have sent that string to guests over WhatsApp, SMS and
 * Facebook.
 *
 * ── NOBODY PUBLISHED IT ─────────────────────────────────────────────────────
 *
 * That is the part worth writing down. StudioWebsite's DEFAULT carried
 * `websiteEnabled: true`, and WRITABLE_FIELDS is derived from DEFAULT's keys
 * minus `slug`. So `{ ...DEFAULT, ...existing }` gave every record without the
 * field a `true`, and the 2-second autosave persisted it. A couple who opened
 * the builder and typed one character went live — no button, no modal, no
 * decision.
 *
 * `slug` was excluded from that list on 2026-08-26 for the same reason, after
 * the same autosave was caught writing addresses keystroke by keystroke. The
 * rule then was "an address is claimed, not stored". Whether a site is LIVE is
 * the same kind of claim and was left in.
 *
 * ── WHY THIS IS A SOURCE GUARD AND NOT A BROWSER ONE ────────────────────────
 *
 * The three defects are three lines of code: a default, a writable-field list,
 * and two unguarded handlers. A browser guard would have to publish a wedding
 * to observe them, and the thing being asserted is that publishing CANNOT
 * happen — the cheapest honest check is that the gates are present in the
 * paths that write.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export async function runPublishRequiresAddress() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  // ── 1. the builder does not publish by accident ───────────────────────────
  const studio = read('src/pages/StudioWebsite.jsx');
  check('the builder is readable', studio.length > 5000, `${studio.length} chars`);
  // CODE, NOT COMMENTS — and this guard needed telling. The first version
  // matched anywhere in the file and reported back `websiteEnabled: true`
  // WHILE PASSING: the string it found was in the comment explaining that the
  // default had been changed. A check whose detail line contradicts its own
  // verdict is worse than one that fails.
  const code = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const studioCode = code(studio);
  const dflt = (studioCode.match(/websiteEnabled: (true|false)/) || [null, 'none'])[1];
  check('  its default is not published', dflt === 'false', `DEFAULT.websiteEnabled = ${dflt}`);
  check('  and the autosave cannot write it', /k !== 'slug' && k !== 'websiteEnabled'/.test(studio),
    'WRITABLE_FIELDS excludes both claims');

  // ── 2. both publish controls refuse without an address ────────────────────
  const modal = read('src/components/website-builder/PublishModal.jsx');
  check('the publish modal refuses without an address', /if \(!address\) \{/.test(modal),
    'the write is guarded, not just the button');
  check('  and says what to do about it', /Add your names first so your guest suite has an address/.test(modal)
    && /EventDetails/.test(modal), 'message + link to Event details');

  const share = read('src/components/studio/guest-suite/StudioShareTab.jsx');
  check('the Share tab refuses too', /if \(next && !details\?\.slug\)/.test(share),
    'the second control, which had no gate at all');

  // ── 3. no surface prints a placeholder as an address ──────────────────────
  //
  // TWO ARE ARGUED, NOT SWEPT. MockShared is the marketing mock pages, whose
  // "couple" is a fixture — there is no real address to get wrong.
  // UniverseWorldView keeps its fallback as a DISPLAY string behind
  // `websiteEnabled && slug`, and its own comment forbids it becoming an href.
  const ARGUED = new Set([
    'src/components/mocks/MockShared.jsx',
    'src/components/universe-studio/UniverseWorldView.jsx',
  ]);
  const SURFACES = [
    'src/pages/StudioWebsite.jsx',
    'src/pages/AvaStudioWebsite.jsx',
    'src/components/studio/guest-suite/StudioShareTab.jsx',
    'src/components/website-builder/PublishModal.jsx',
  ];
  for (const f of SURFACES) {
    // In code, not in the comment explaining why it is gone.
    const hit = /['"`]your-wedding['"`]/.test(code(read(f)));
    check(`${f.split('/').pop()} prints no placeholder address`, !hit, hit ? 'still there' : 'clean');
  }
  for (const f of ARGUED) {
    check(`  ${f.split('/').pop()} is argued, not swept`, read(f).includes('your-wedding'),
      f.includes('Mock') ? 'marketing fixture, no real couple' : 'display-only, behind websiteEnabled && slug');
  }

  // ── 4. the green dot is both halves ───────────────────────────────────────
  check('the builder\'s live dot needs an address too',
    /const isLive = Boolean\(details\?\.websiteEnabled && details\?\.slug\)/.test(studio),
    'websiteEnabled AND slug');
  check('  and the Share tab\'s does', /details\?\.websiteEnabled && hasAddress/.test(share), 'same pair');

  // ── 5. re-entry: routing only, and the precondition ───────────────────────
  const plan = read('src/pages/ChoosePlan.jsx');
  // ITS OWN MODULE, for the reason onboardingComplete.js has one: inside the
  // page it imported the authenticated client and a page of JSX, so the
  // predicate deciding whether a couple is sent back to setup could not be
  // run by anything. Pure in, boolean out, and now reachable from here.
  const { needsOnboarding } = await import(join(ROOT, 'src/lib/needsOnboarding.js')).catch(() => ({}));
  check('the re-entry gate is its own module, and runnable', typeof needsOnboarding === 'function',
    typeof needsOnboarding);
  check('  and the page uses it rather than its own copy', /from '@\/lib\/needsOnboarding'/.test(plan),
    'ChoosePlan imports it');
  if (typeof needsOnboarding === 'function') {
    // THE PLANT THE PACKAGE ASKS FOR, as a permanent check rather than a
    // one-off: a record WITH an address is never sent to the wizard, whatever
    // else is missing.
    const route = (w) => (needsOnboarding(w) ? 'WIZARD' : 'dashboard');
    check('  a record with a slug is NEVER routed to the wizard',
      needsOnboarding({ slug: 'ada-and-alan' }) === false,
      `slug set, no names, no onboarding flag -> ${route({ slug: 'ada-and-alan' })}`);
    check('    even with everything else absent',
      needsOnboarding({ slug: 'x', couple1Name: '', couple2Name: '', coupleNames: '' }) === false,
      `-> ${route({ slug: 'x', couple1Name: '', couple2Name: '', coupleNames: '' })}`);
    check('  a record with no slug and no names goes to the wizard',
      needsOnboarding({ slug: null }) === true, `smoke01's shape -> ${route({ slug: null })}`);
    check('  a record with names but no slug does not',
      needsOnboarding({ slug: null, couple1Name: 'Ada' }) === false, 'the address will follow from the names');
    check('    including the legacy joined field',
      needsOnboarding({ slug: null, coupleNames: 'Ada & Alan' }) === false, 'coupleNames "A & B"');
    check('  and a record that could not be read strands nobody',
      needsOnboarding(null) === false, 'null -> the dashboard');
  }
  check('  the gate writes nothing', !/needsOnboarding[\s\S]{0,400}?(update|create|save)\(/.test(plan),
    'read a record, return a route');

  return results;
}

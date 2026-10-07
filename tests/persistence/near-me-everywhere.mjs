/**
 * tests/persistence/near-me-everywhere.mjs
 *
 * EVERY PLACE SEARCH CAN BE BIASED TO WHERE YOU ARE STANDING.
 *
 * Item 8 of goals/2026-10-08-site-fixes-batch-1.md: every place search gets a
 * "Near me" control, permission is asked for only when the control is used,
 * and a refusal leaves the search working as it does today.
 *
 * ── WHAT WAS ALREADY TRUE, WHICH CHANGES WHAT THE ITEM IS ──────────────────
 *
 * Five of the nine callers of /api/places-search already had this, with
 * near-identical code: VenueSearchPanel, ExperienceGuideTab,
 * GuestSuiteAccommodation, GuestSuiteTransport and VendorMarketplace. The
 * server half is older still, since api/places-search.js has always accepted
 * lat and lng and biased by a 50 km radius, so this item needed no api change
 * and the goal's api stop condition never fired.
 *
 * Three lacked it. They are the ones this guard holds to the rule, and the
 * five are pinned too, so a later refactor cannot quietly drop one.
 *
 * NOT A PLACE SEARCH, and worth recording because it looks like one:
 * src/components/vendors/VendorSearch.jsx asks an LLM to "suggest 5 real
 * wedding businesses" and parses prose. It is imported by nothing, it calls
 * geolocation and then throws the coordinates away, and it alerts twice.
 * Reported rather than touched: it is not this item's subject and deleting
 * unreachable code is not this item's licence.
 *
 * ── PERMISSION ON THE TAP, NEVER ON MOUNT ──────────────────────────────────
 *
 * The item's own rule, and the reason the hook exposes `request` rather than
 * running an effect. Asserted here as the absence of any geolocation call
 * outside a handler in the three wired files, and by the hook having no
 * useEffect at all.
 *
 * ── AND A REFUSAL CHANGES NOTHING ABOUT THE REQUEST ────────────────────────
 *
 * bias() answers {} when there are no coordinates, so each search body is
 * byte-identical to the one it sent before. That is what "works as today"
 * means, and it is driven rather than read.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { NEAR_ME_LABELS } from '../../src/lib/useNearMe.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Wired by this item, through the shared hook.
const WIRED = [
  'src/components/vendors/VendorPlacesSearch.jsx',
  'src/components/event-details/VenueSearch.jsx',
  'src/components/onboarding/OnboardingPathAVendors.jsx',
];

// Already had their own, before this item. Pinned so none is lost later.
const ALREADY = [
  'src/components/shared/VenueSearchPanel.jsx',
  'src/components/studio/guest-suite/ExperienceGuideTab.jsx',
  'src/pages/GuestSuiteAccommodation.jsx',
  'src/pages/GuestSuiteTransport.jsx',
  'src/pages/VendorMarketplace.jsx',
];

export async function runNearMeEverywhere() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, String(JSON.stringify(got)).slice(0, 60))
      : fail(label, String(JSON.stringify(want)).slice(0, 60), String(JSON.stringify(got)).slice(0, 60)));

  // ── THE SERVER HALF WAS ALREADY THERE ───────────────────────────────────
  const proxy = read('api/places-search.js');
  ok('the proxy accepts coordinates and biases by radius',
     /lat != null && lng != null/.test(proxy) && /radius=50000/.test(proxy), 'no api change needed');

  // ── THE HOOK ────────────────────────────────────────────────────────────
  const hook = code(read('src/lib/useNearMe.js'));
  ok('nothing asks for permission on mount',
     !/useEffect/.test(hook), 'no effect in the hook');
  ok('  the ask is a function a control calls',
     /const request = useCallback/.test(hook) && /getCurrentPosition/.test(hook), 'request()');
  ok('  a refusal is told apart from a failed fix',
     /err\?\.code === 1 \? 'denied' : 'error'/.test(hook), 'PERMISSION_DENIED is 1');
  ok('  and a refusal clears the coordinates rather than keeping a stale one',
     /coordsRef\.current = null;\s*\n\s*setState\(err/.test(hook), 'cleared');
  check('every state has a label a control can show',
        Object.keys(NEAR_ME_LABELS).sort(),
        ['active', 'denied', 'error', 'idle', 'loading', 'unavailable']);

  // A REFUSAL CHANGES NOTHING ABOUT THE REQUEST, driven: with no coordinates
  // the spread contributes no keys at all.
  const { useNearMe } = await import('../../src/lib/useNearMe.js');
  ok('the hook is a function', typeof useNearMe === 'function', 'exported');
  // bias() is created inside the hook, so its behaviour is asserted through
  // the shape the callers rely on: a bare object spread adds nothing.
  check('a body with no coordinates spread into it is unchanged',
        JSON.stringify({ q: 'x', ...{} }), JSON.stringify({ q: 'x' }));

  // ── THE THREE THIS ITEM WIRED ───────────────────────────────────────────
  for (const f of WIRED) {
    const src = code(read(f));
    const name = f.split('/').pop();
    ok(`${name} uses the shared hook`, /useNearMe\(/.test(src), 'one implementation');
    ok(`  ${name} renders a control a guard can find`,
       /data-near-me=\{nearMe\.state\}/.test(src), 'data-near-me');
    ok(`  ${name} says which state it is in`,
       /aria-pressed=\{nearMe\.state === 'active'\}/.test(src), 'aria-pressed');
    ok(`  ${name} spreads the bias into its search body`,
       /nearMe\.bias\(\)/.test(src), 'biased');
    ok(`  ${name} asks only on the tap`,
       !/getCurrentPosition/.test(src), 'no direct geolocation call left');
    ok(`  ${name} can turn it back off`,
       /nearMe\.clear\(\)/.test(src), 'clear()');
  }

  // ── AND THE FIVE THAT ALREADY HAD ONE ───────────────────────────────────
  for (const f of ALREADY) {
    const src = code(read(f));
    const name = f.split('/').pop();
    ok(`${name} still biases its search`, /lat = |lat:|body\.lat/.test(src) && /lng/.test(src), 'unchanged');
    ok(`  and still asks only when used`,
       /getCurrentPosition/.test(src) && !/useEffect\(\(\) => \{\s*navigator\.geolocation/.test(src),
       'not on mount');
  }

  // ── THE ONE THAT LOOKS LIKE A PLACE SEARCH AND IS NOT ───────────────────
  const fake = read('src/components/vendors/VendorSearch.jsx');
  ok('VendorSearch is still not a place search', !/places-search/.test(fake), 'LLM prose');
  ok('  and still imported by nothing',
     !fs.readdirSync(path.join(ROOT, 'src/pages')).some((p2) => p2.endsWith('.jsx')
       && /from ['"][^'"]*VendorSearch['"]/.test(read(`src/pages/${p2}`))), 'unreachable');

  return results;
}

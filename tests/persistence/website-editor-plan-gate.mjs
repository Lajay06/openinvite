/**
 * tests/persistence/website-editor-plan-gate.mjs
 *
 * /website-editor IS GATED EXACTLY AS /studio/guest-suite IS.
 *
 * Fix batch 1, item 6. Both routes open the same StudioWebsite builder.
 * /studio/guest-suite refused an account without Ultra access through
 * canAccessUltra(user); /website-editor rendered StudioWebsite bare, so the
 * gate could be stepped around by typing the other address. Both now go
 * through GuestSuiteGate.jsx, which reads the rule from the place the studio
 * always read it (src/lib/trialStatus.js) and nothing from pricing.
 *
 * EVERY ROUTE INTO THE BUILDER is enumerated from App.jsx rather than named,
 * so a third route added later is held to the gate too.
 *
 * The plant: change the /website-editor route back to
 * element={<StudioWebsite />} and the first check goes red.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => stripComments(readFileSync(join(ROOT, p), 'utf8'));

export function runWebsiteEditorPlanGate() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  console.log('\n  One plan gate in front of the website builder:\n');

  const app = code('src/App.jsx');
  ok('/website-editor renders StudioWebsite inside GuestSuiteGate',
     /<Route path="\/website-editor" element=\{<GuestSuiteGate><StudioWebsite \/><\/GuestSuiteGate>\} \/>/.test(app), 'route element');
  const bare = [...app.matchAll(/<Route path="([^"]+)" element=\{<StudioWebsite\b[^}]*\} \/>/g)].map(m => m[1]);
  ok('  and no route renders StudioWebsite ungated', bare.length === 0, bare.join(', ') || 'none');

  const studio = code('src/pages/StudioGuestSuite.jsx');
  ok('/studio/guest-suite reads the gate from canAccessUltra(user)', /const canAccess = canAccessUltra\(user\);/.test(studio), 'trialStatus');
  ok('  and shows the shared Guest Suite paywall', /if \(!canAccess\) return <GuestSuiteUltraGate \/>;/.test(studio), 'GuestSuiteUltraGate');
  ok('  and the studio routes still render the gated StudioGuestSuite',
     ['/studio/guest-suite', '/studio/website'].every(p => new RegExp(`<Route path="${p}" element=\\{<StudioGuestSuite />\\} />`).test(app)), 'studio routes');

  const gate = code('src/components/studio/guest-suite/GuestSuiteGate.jsx');
  ok('GuestSuiteGate applies the same expression', /if \(!canAccessUltra\(user\)\) return <GuestSuiteUltraGate \/>;/.test(gate)
     && /import \{ canAccessUltra \} from '@\/lib\/trialStatus';/.test(gate), 'canAccessUltra from trialStatus');
  ok('  and reads nothing from pricing', !/planPricing|planGift|giftAuth/.test(gate) && !/planPricing/.test(app.slice(app.indexOf('GuestSuiteGate'), app.indexOf('GuestSuiteGate') + 200)), 'no pricing import');

  return results;
}

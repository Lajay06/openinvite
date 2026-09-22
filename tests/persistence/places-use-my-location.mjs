/**
 * "Use my location" actually changes the results.
 *
 * Four components search Google Places and all four offered the same control:
 * a button that calls navigator.geolocation, stores the coordinates in a REF,
 * and sets a state flag so the label reads "Using your location".
 *
 * A ref does not re-render, and none of the four re-ran the search. So the
 * button changed its own label and nothing else: the list on screen stayed
 * the unbiased one, and the coordinates first reached /api/places-search on
 * the guest's NEXT keystroke. To anyone using it, "use my location" did
 * nothing — which is how it was reported.
 *
 * The same holds in reverse: clearing the bias left the biased results on
 * screen under a label that said the bias was off.
 *
 * WHAT IS ASSERTED. For each of the four, in the geolocation success handler
 * and in clearGeo: the component's own search function is called again with
 * the query the guest already typed, guarded by the same two-character
 * minimum the search itself uses. Asserted on source because the behaviour is
 * a call the browser makes only after a real permission prompt — which a
 * headless run cannot grant, and a stubbed geolocation would be asserting
 * against the stub rather than the product.
 *
 * ALSO HERE, from the same audit: every <button> in VenueSearchPanel declares
 * type="button". Two did not — the result rows and the dropdown's Close — and
 * a button with no type inside a <form> is a submit button. Neither call site
 * wraps the panel in a form today, so this was latent rather than live; it is
 * fixed because the next caller should not have to know.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '../..');

/** file -> the search function each one must re-run, and the query state it reads. */
const ENTRY_POINTS = [
  ['src/components/shared/VenueSearchPanel.jsx', 'search', 'query'],
  ['src/pages/GuestSuiteAccommodation.jsx', 'search', 'query'],
  ['src/pages/GuestSuiteTransport.jsx', 'searchPlaces', 'query'],
  ['src/components/studio/guest-suite/ExperienceGuideTab.jsx', 'handleSearch', 'query'],
];

export async function runPlacesUseMyLocation() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  "Use my location" re-runs the search, in every Places entry point:\n');

  for (const [rel, fn, q] of ENTRY_POINTS) {
    const src = readFileSync(resolve(ROOT, rel), 'utf8');
    const name = rel.split('/').pop();

    // The success handler: from getCurrentPosition to the error callback.
    const success = src.match(/getCurrentPosition\(\s*([\s\S]*?)\n\s*(?:err|error|\()/);
    const body = success ? success[1] : '';
    check(`${name} re-searches once the coordinates arrive`,
      new RegExp(`${fn}\\(${q}\\)`).test(body) && /geoCoordsRef\.current = /.test(body),
      body ? (new RegExp(`${fn}\\(${q}\\)`).test(body) ? `calls ${fn}(${q})` : 'stores coords, never re-searches') : 'no success handler found');

    const clear = src.match(/const clearGeo = \(\) => \{[\s\S]*?\n {2}\};|const clearGeo = \(\) => \{[^}]*\};/);
    check(`  and re-searches when the bias is cleared`,
      !!clear && new RegExp(`${fn}\\(${q}\\)`).test(clear[0]),
      clear ? (new RegExp(`${fn}\\(${q}\\)`).test(clear[0]) ? `calls ${fn}(${q})` : 'clears the ref only') : 'no clearGeo');

    // Both re-runs respect the same minimum the search enforces, so an empty
    // box does not fire a request.
    const guarded = (t) => new RegExp(`${q}\\.trim\\(\\)\\.length >= 2\\) ${fn}\\(${q}\\)`).test(t);
    check(`  neither re-run fires on an empty box`,
      guarded(body) && !!clear && guarded(clear[0]), 'two-character minimum on both');
  }

  // Every button in the shared panel declares its type.
  const panel = readFileSync(resolve(ROOT, 'src/components/shared/VenueSearchPanel.jsx'), 'utf8');
  const untyped = (panel.match(/<button(?![^>]*type=)/g) || []).length;
  check('every button in VenueSearchPanel declares type="button"',
    untyped === 0, `${untyped} untyped`);

  return results;
}

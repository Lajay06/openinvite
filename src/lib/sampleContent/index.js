/**
 * src/lib/sampleContent/index.js
 *
 * The one door into sample content, and the place its safety properties live.
 *
 * THE FAILURE THIS IS BUILT AGAINST ALREADY HAPPENED. #576 ("stop publishing
 * words the couple never wrote") found three sites where our copy reached
 * guests as the couple's own — a tagline published in their first person while
 * the builder showed it as a grey placeholder, a draft default that was one
 * save away from being genuinely theirs in the database, and a music message
 * guests read while the editor showed something else. Sample content is that
 * same mechanism, on purpose, at thirteen pages of scale. So it is built as
 * though the accident already occurred, because it did.
 *
 * THREE PROPERTIES, ENFORCED HERE AND PINNED IN
 * tests/persistence/sample-content-never-published.mjs:
 *
 *   1. IT IS NEVER A RECORD. `getSampleWedding` returns a plain object for a
 *      component to render. Nothing here writes to Base44 and nothing here is
 *      shaped to be written: `slug` is null and `websiteEnabled` is false, so
 *      even a mistaken save produces a record that resolves to no address and
 *      publishes nothing. Base44's store is shared between previews and
 *      production (BASE44_PLATFORM_NOTES.md), so "it is only a preview" is not
 *      a safety argument here and never was.
 *
 *   2. IT IS MARKED, AND THE MARK CANNOT TRAVEL INTO A WRITE. `isSample()` reads
 *      a NON-ENUMERABLE `__sample` property. That is not a detail: the ruling is
 *      that no `is_sample` field is ever stored on a wedding record, and a plain
 *      key on a record-shaped object is one `JSON.stringify` away from being in
 *      a request body. Non-enumerable means `JSON.stringify`, `{...spread}` and
 *      `Object.keys` all drop it, so the marker is readable in memory and
 *      structurally incapable of reaching the database. Asserted, not intended.
 *
 *   3. NO SAMPLE SENTENCE IS ALSO A LIVE DEFAULT. This is the specific shape of
 *      #576: a string that is an example in one place and a published fallback
 *      in another. The guard asserts that no sentence in this directory appears
 *      anywhere else in src/. That assertion is what makes the whole idea safe;
 *      without it this file is a bag of strings waiting to become defaults.
 *
 * THE OMISSION FIXTURE IS NO LONGER A UNIVERSE. bali used to be it: placeholder
 * copy and no imagery, the control a published site is checked against to prove
 * none of this reaches a guest. On 2026-09-06 bali received eleven photographs
 * and became a universe a couple can choose and see filled, so the control moved
 * out whole to omissionFixture.js, under `__omission_fixture` — a key
 * `sampleUniverseIds()` omits and UNIVERSE_CONFIGS does not contain. The
 * published fixture chris-and-sia still runs against it. havana remains the
 * proof of the other half: what a universe looks like full.
 *
 * ALL TWENTY UNIVERSES NOW CARRY CONTENT. The last four — kyoto, aspen,
 * shanghai and bali — were blocked on photography until the owner uploaded
 * folders for them on 2026-09-06.
 */
import { SAMPLE_BALI } from './bali.js';
import { SAMPLE_KYOTO } from './kyoto.js';
import { SAMPLE_ASPEN } from './aspen.js';
import { SAMPLE_SHANGHAI } from './shanghai.js';
import { SAMPLE_OMISSION_FIXTURE } from './omissionFixture.js';
import { SAMPLE_HAVANA } from './havana.js';
import { SAMPLE_LONDON } from './london.js';
import { SAMPLE_TULUM } from './tulum.js';
import { SAMPLE_CAPRI } from './capri.js';
import { SAMPLE_MARRAKECH } from './marrakech.js';
import { SAMPLE_BROOKLYN } from './brooklyn.js';
import { SAMPLE_PARIS } from './paris.js';
import { SAMPLE_CAPETOWN } from './capetown.js';
import { SAMPLE_MYKONOS } from './mykonos.js';
import { SAMPLE_AMALFI } from './amalfi.js';
import { SAMPLE_SEDONA } from './sedona.js';
import { SAMPLE_TAJ } from './taj.js';
import { SAMPLE_EDINBURGH } from './edinburgh.js';
import { SAMPLE_MONACO } from './monaco.js';
import { SAMPLE_FLORENCE } from './florence.js';
import { SAMPLE_SEOUL } from './seoul.js';

/**
 * THE KEY THE STUDIO CANNOT SELECT.
 *
 * The omission fixture is registered in SAMPLES so the guard can read it
 * through the same door as everything else, and excluded from
 * `sampleUniverseIds()` so that nothing which ENUMERATES sample universes can
 * offer it. It is also not a key in UNIVERSE_CONFIGS, so it is not a universe:
 * `resolveUniverseConfig` has nothing to resolve and the picker has nothing to
 * draw. Both facts are asserted with planted failures in
 * tests/persistence/sample-content-never-published.mjs.
 *
 * The leading underscores are the smallest part of the guarantee and the most
 * visible: every universe id in this product is lowercase letters, so a key
 * shaped like this cannot collide with one by accident.
 */
export const OMISSION_FIXTURE_ID = '__omission_fixture';

const SAMPLES = {
  [OMISSION_FIXTURE_ID]: SAMPLE_OMISSION_FIXTURE,
  bali: SAMPLE_BALI,
  havana: SAMPLE_HAVANA,
  london: SAMPLE_LONDON,
  tulum: SAMPLE_TULUM,
  capri: SAMPLE_CAPRI,
  marrakech: SAMPLE_MARRAKECH,
  brooklyn: SAMPLE_BROOKLYN,
  paris: SAMPLE_PARIS,
  capetown: SAMPLE_CAPETOWN,
  mykonos: SAMPLE_MYKONOS,
  amalfi: SAMPLE_AMALFI,
  sedona: SAMPLE_SEDONA,
  taj: SAMPLE_TAJ,
  edinburgh: SAMPLE_EDINBURGH,
  monaco: SAMPLE_MONACO,
  florence: SAMPLE_FLORENCE,
  seoul: SAMPLE_SEOUL,
  kyoto: SAMPLE_KYOTO,
  aspen: SAMPLE_ASPEN,
  shanghai: SAMPLE_SHANGHAI,
};

/**
 * Universe ids that have sample content.
 *
 * THE FIXTURE IS NOT ONE. It is a control for the published-site checks, not a
 * universe a couple can choose, and anything that enumerates universes — a
 * picker, a report, a loop in a test — must not be handed it. Excluded here
 * rather than filtered at each call site, because a rule enforced at one
 * chokepoint is a rule and a rule enforced at seven is a habit.
 */
export function sampleUniverseIds() {
  return Object.keys(SAMPLES).filter((k) => k !== OMISSION_FIXTURE_ID);
}

/** True if this object is sample content rather than a couple's own data. */
export function isSample(weddingDetails) {
  return weddingDetails?.__sample === true;
}

/**
 * A renderable sample wedding for a universe, or null if that universe has none.
 *
 * Returns a fresh deep copy every call, so a component that mutates what it is
 * handed cannot corrupt the sample for the next reader — and cannot accidentally
 * accumulate a couple's edits into a module-level object that outlives them.
 *
 * The date is resolved AT READ TIME rather than stored. A literal future date in
 * the source ages into the past and a countdown starts rendering a negative
 * number some months after nobody is looking at this file any more.
 *
 * @param {string} universeId
 * @param {{ now?: Date }} [opts] injectable clock, so the guard can assert the
 *                                date behaviour without waiting a year
 */
export function getSampleWedding(universeId, { now } = {}) {
  const sample = SAMPLES[universeId];
  if (!sample) return null;

  const base = new Date(now || Date.now());
  const weddingDate = new Date(base.getFullYear(), base.getMonth() + 8, 14);

  const out = {
    ...structuredClone(sample),
    weddingDate: weddingDate.toISOString().slice(0, 10),
    // Restated here, not merely inherited, so the two facts that keep a sample
    // off a real address are visible at the exit rather than only at the source.
    slug: null,
    websiteEnabled: false,
  };

  // The source object declares `__sample: true` as an ordinary key so the file
  // reads honestly; the spread above copies it, and this REDEFINES it
  // non-enumerable on the way out. After this, `JSON.stringify(out)` has no
  // `__sample` in it, so the marker cannot ride a save into the database — the
  // ruling is that no is_sample field is ever STORED, and this is what makes
  // that structural rather than a promise.
  Object.defineProperty(out, '__sample', {
    value: true, enumerable: false, writable: false, configurable: false,
  });
  return out;
}

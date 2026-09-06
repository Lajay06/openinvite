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
 * THE TWO ORIGINAL UNIVERSES DO DIFFERENT JOBS, and both are still load
 * bearing. bali carries placeholder copy and NO imagery — it is the omission
 * fixture, the record a published site is checked against to prove none of
 * this reaches a guest, and the published bali fixture chris-and-sia is what
 * that check runs on. havana carries the owner's own photographs and is the
 * proof of the other half: what a universe looks like full.
 *
 * TWELVE OF TWENTY UNIVERSES NOW CARRY CONTENT. The remaining eight split in
 * two: taj, edinburgh, monaco, florence and seoul have photography and are a
 * copywriting job; kyoto, aspen and shanghai have no folder at all, so nothing
 * can be written for them until there are photographs to write against.
 */
import { SAMPLE_BALI } from './bali.js';
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

const SAMPLES = {
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
};

/** Universe ids that have sample content. */
export function sampleUniverseIds() {
  return Object.keys(SAMPLES);
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

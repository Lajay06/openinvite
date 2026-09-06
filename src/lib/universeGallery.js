/**
 * src/lib/universeGallery.js
 *
 * The four photographs the universe detail page shows.
 *
 * WHY A MODULE AND NOT FOUR LINES IN THE COMPONENT. Two reasons, and the
 * second is the one that matters. First, Node cannot import .jsx, so anything
 * defined inside UniverseWorldView can only be tested by rendering a page.
 * Second, this has real rules in it — the fixture is excluded, the hero is
 * excluded, duplicates are topped up — and a rule that lives inside a JSX
 * expression is a rule nobody can assert.
 *
 * WHERE THE PICTURES COME FROM. The universe's own sample block, through the
 * one door in src/lib/sampleContent/index.js. Our Story carries four
 * photographs for every universe; where two of those are the same asset (a
 * folder short enough that a slot had to be doubled), a Home photograph is
 * substituted so the row shows four different pictures wherever the folder
 * allows it. Four identical thumbnails in a row is not a gallery.
 *
 * THE HERO IS NEVER IN IT. It is directly above, full-bleed, on the same
 * screen. Repeating it four hundred pixels lower reads as a mistake.
 *
 * THE OMISSION FIXTURE IS NEVER IN IT. `__omission_fixture` is a test control,
 * not a universe; `sampleUniverseIds()` already omits it and this refuses it by
 * name as well, because a gallery is a rendering surface and a rendering
 * surface should not depend on someone else's filter staying correct.
 */
import { getSampleWedding, OMISSION_FIXTURE_ID } from './sampleContent/index.js';

/** How many photographs the row holds. One row, four columns. */
export const GALLERY_COUNT = 4;

/**
 * The rendered column is roughly a quarter of a 1200px content width, so ~290
 * CSS pixels; 640 covers that at device-pixel-ratio 2 with nothing to spare.
 * Every master in these folders is at least 1376px on its shortest useful edge,
 * so this never asks Cloudinary to upscale — which it will happily do, and
 * charge for: `w_1600` on a 1280px master measured 34% MORE bytes than no width
 * at all (see the Cloudinary work in #670).
 */
export const GALLERY_WIDTH = 640;

/** 4:5, the crop the row is laid out for. */
export const GALLERY_HEIGHT = 800;

const CLOUD_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload)\/([^/]*)\/(.+)$/;

/**
 * The Cloudinary public id inside a delivery URL, or null for anything that is
 * not one. Used to compare assets by IDENTITY rather than by URL string: the
 * same photograph appears as `w_1400` in Our Story and `w_2048` as the hero,
 * and comparing the URLs would call those two different pictures.
 */
export function publicIdOf(url) {
  const m = CLOUD_RE.exec(String(url || ''));
  return m ? m[3] : null;
}

/**
 * Re-transform a stored delivery URL to the gallery's own crop.
 *
 * The stored URLs carry `f_auto,q_auto,w_1400`, which is a wide image scaled
 * down — wrong shape for a square-ish tile and four times the bytes needed.
 * This REPLACES the transform rather than appending one: chained transforms
 * would apply in sequence and the first would already have thrown away the
 * pixels the crop wants.
 */
export function galleryUrl(url, { width = GALLERY_WIDTH, height = GALLERY_HEIGHT } = {}) {
  const m = CLOUD_RE.exec(String(url || ''));
  if (!m) return null;
  const [, base, , publicId] = m;
  return `${base}/c_fill,g_auto,f_auto,q_auto,w_${width},h_${height}/${publicId}`;
}

/**
 * Four gallery images for a universe, or [] when it has no sample block.
 *
 * NEVER THROWS. Every universe has a block today, but the component must
 * survive a universe id that has none — a new universe added to the config
 * before its copy is written is exactly the state this product has been in
 * four times this month.
 *
 * @param {string} universeId
 * @returns {Array<{ url: string, alt: string, publicId: string }>}
 */
export function universeGallery(universeId, universeName = universeId) {
  if (!universeId || universeId === OMISSION_FIXTURE_ID) return [];

  let sample = null;
  try { sample = getSampleWedding(universeId); } catch { return []; }
  if (!sample) return [];
  return selectGalleryPhotos(sample, universeName);
}

/**
 * The selection itself, taking a sample OBJECT rather than an id.
 *
 * SPLIT OUT BECAUSE A PLANT WENT UNDETECTED. Deleting the hero exclusion from
 * this function left the guard green: no universe's Our Story happens to
 * contain its own hero today, so the rule could be removed without any of the
 * twenty rows changing. A check that cannot fail on the data it is given is
 * not a check — it is P2's "a gate that passes by not running", one level in.
 *
 * With the sample injectable, the guard hands it a record whose Our Story DOES
 * contain the hero and asserts the hero is dropped. The rule is now exercised
 * rather than merely present, and the same plant goes red.
 */
export function selectGalleryPhotos(sample, universeName = '') {
  if (!sample) return [];
  const heroId = publicIdOf(sample.coverPhoto);

  const seen = new Set();
  const chosen = [];
  const consider = (url) => {
    if (chosen.length >= GALLERY_COUNT) return;
    const id = publicIdOf(url);
    if (!id || id === heroId || seen.has(id)) return;
    seen.add(id);
    chosen.push(url);
  };

  for (const url of sample.ourStoryContent?.photos || []) consider(url);
  // TOPPED UP FROM HOME, not padded with a repeat. A folder short enough to
  // double a slot gets its fourth picture from the two Home photographs; a
  // folder short enough that even those are doubles gets a shorter row, which
  // is honest, rather than the same photograph twice, which is not.
  for (const block of sample.homeContent?.blocks || []) {
    if (block?.type === 'photo') consider(block.content?.url);
  }

  return chosen.map((url, i) => ({
    url: galleryUrl(url),
    alt: `${universeName} — sample photograph ${i + 1}`,
    publicId: publicIdOf(url),
  })).filter((x) => x.url);
}

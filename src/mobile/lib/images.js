/**
 * src/mobile/lib/images.js
 *
 * Cloudinary delivery for the mobile app, and the image inventory.
 *
 * Every public id here is already in use somewhere in the repo (the
 * per-universe sample content, the marketing site). Nothing is invented.
 * The list of what is used and where is mirrored in MOBILE_APP.md.
 *
 * STILLS ONLY. No component derives motion from an image whose public id
 * starts with DTS_; `isStillOnly()` is how a caller checks.
 */
import { getSampleWedding } from '@/lib/sampleContent';
import { getUniverse } from '@/lib/universeCatalog';

export const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';

/** Parse a Cloudinary delivery URL back to its public id (with version, if present). */
export function publicIdOf(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/res\.cloudinary\.com\/dsr84xknv\/image\/upload\/(?:[^/]+\/)*?((?:v\d+\/)?[^?]+?)(?:\.(?:jpg|jpeg|png|webp|avif))?(?:\?.*)?$/);
  if (!m) return null;
  // The first path segment after upload/ may be a transform chain (contains a comma or starts with f_/q_/w_/c_).
  const raw = url.split('/image/upload/')[1] || '';
  const parts = raw.split('/');
  const isTransform = (s) => /,/.test(s) || /^(f_|q_|w_|h_|c_|g_|fl_|dpr_|ar_|e_|b_)/.test(s);
  const rest = parts.filter((p, i) => !(i === 0 && isTransform(p)));
  const id = rest.join('/').replace(/\.(jpg|jpeg|png|webp|avif)(\?.*)?$/, '').replace(/\?.*$/, '');
  return id || null;
}

export function isCloudinary(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com/dsr84xknv/');
}

export function isStillOnly(urlOrId) {
  const id = isCloudinary(urlOrId) ? publicIdOf(urlOrId) : urlOrId;
  return typeof id === 'string' && /(^|\/)DTS_/.test(id);
}

/**
 * A delivery URL for a slot: f_auto,q_auto,c_fill,g_auto at the slot's width
 * and height, for the given device pixel ratio. Non-Cloudinary URLs (the
 * couple's own uploads elsewhere, local statics) are returned unchanged.
 */
export function deliver(url, { width, height, dpr = 2 } = {}) {
  if (!isCloudinary(url)) return url;
  const id = publicIdOf(url);
  if (!id) return url;
  const w = Math.round(width * dpr);
  const h = height ? Math.round(height * dpr) : null;
  const t = ['f_auto', 'q_auto', 'c_fill', 'g_auto', `w_${w}`, h ? `h_${h}` : null].filter(Boolean).join(',');
  return `${CLOUD}/${t}/${id}`;
}

export function srcSetFor(url, { width, height } = {}) {
  if (!isCloudinary(url)) return undefined;
  return [2, 3].map((dpr) => `${deliver(url, { width, height, dpr })} ${dpr}x`).join(', ');
}

/**
 * The couple's own imagery, in order: cover photo, site photo blocks, Our
 * Story photos. Falls back to the sample content of their universe. Each
 * entry is a full delivery URL the caller passes through `deliver()`.
 */
export function coupleImages(details) {
  const own = imagesFrom(details);
  if (own.length) return own;
  const universeId = details?.activeUniverse;
  if (universeId) {
    const sample = getSampleWedding(universeId);
    const fromSample = imagesFrom(sample);
    if (fromSample.length) return fromSample;
    const still = getUniverse(universeId)?.imageUrl;
    if (still) return [still];
  }
  return [];
}

/** The couple's own imagery only: cover photo, site photo blocks, Our Story photos. */
export function ownImages(d) { return imagesFrom(d); }

function imagesFrom(d) {
  if (!d) return [];
  const out = [];
  const push = (u) => { if (u && typeof u === 'string' && !out.includes(u)) out.push(u); };
  push(d.coverPhoto);
  for (const b of d.homeContent?.blocks || []) {
    if (b?.type === 'photo' && b.content?.url) push(b.content.url);
    if (b?.type === 'full-width-image' && b.content?.url) push(b.content.url);
  }
  for (const p of d.ourStoryContent?.photos || []) push(typeof p === 'string' ? p : p?.url);
  return out;
}

/** The first image, or '' so a slot can fall back to a color panel. */
export function heroImageFor(details) {
  return coupleImages(details)[0] || '';
}

/**
 * The Home heroes: the cover and the Our Story photos, not the site's own
 * photo blocks, which belong to the Site tab preview (`siteImageFor`). So
 * a site block photo is never drawn on Home and on Site both.
 */
export function homeHeroImages(d) {
  if (!d) return [];
  const out = [];
  const push = (u) => { if (u && typeof u === 'string' && !out.includes(u)) out.push(u); };
  push(d.coverPhoto);
  for (const p of d.ourStoryContent?.photos || []) push(typeof p === 'string' ? p : p?.url);
  return out;
}

/** The Site tab preview: the site's first photo block, else the cover, else the universe sample. */
export function siteImageFor(d) {
  for (const b of d?.homeContent?.blocks || []) {
    if ((b?.type === 'photo' || b?.type === 'full-width-image') && b.content?.url) return b.content.url;
  }
  return heroImageFor(d);
}

/** Decorative slots live in src/mobile/images.ts; this re-export keeps the delivery helpers and the manifest in one import. */
export { IMAGES, imageUrl } from '../images';

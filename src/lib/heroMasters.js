/**
 * src/lib/heroMasters.js
 *
 * HOW WIDE EACH HERO'S MASTER ACTUALLY IS, so nothing asks Cloudinary for
 * more than exists.
 *
 * ── WHY A MAP AND NOT ONE SAFE NUMBER ───────────────────────────────────────
 *
 * There used to be a single constant, SCROLL_SAFE_WIDTH = 1376, chosen as the
 * smallest master across all twenty universes — tulum's. One number is
 * correct for one universe and wasteful for the other nineteen: with 4096px
 * masters in nineteen folders, a 1376-wide delivery into a 2880 device-pixel
 * hero is the softness this exists to remove. The floor is now per universe.
 *
 * ── WHY UPSCALING IS THE THING BEING PREVENTED ──────────────────────────────
 *
 * Cloudinary will happily upscale past a master and CHARGE for it: measured
 * in #670, `w_1600` on a 1280px master produced 34% MORE bytes than no width
 * at all, for a picture with no more detail in it. So every width here is a
 * ceiling, never a target.
 *
 * ── KEYED BY PUBLIC ID, NOT BY UNIVERSE ─────────────────────────────────────
 *
 * A universe-keyed map drifts the moment a hero is swapped and the width line
 * is not — which has happened here before: tulum's own dimension comments
 * described the pre-swap assets and were wrong for a week. Keyed by the asset
 * itself, a stale entry cannot be read at all: swap the public id and the
 * lookup misses, `heroDeliveryWidth` falls back to the conservative width,
 * and the guard says so.
 *
 * Measured from the Cloudinary Admin API on 2026-09-08, not copied from a
 * comment. Re-measure with the search expression `folder="heroes-jpg"` — note
 * this cloud uses dynamic folders, so a `prefix=` listing returns nothing.
 */

/** 1440 CSS px at device-pixel-ratio 2. Nothing needs more than this. */
export const HERO_TARGET_WIDTH = 2880;

/**
 * The width used when a hero's master is unknown. It is the old
 * SCROLL_SAFE_WIDTH: the smallest master across the twenty, and therefore the
 * only width that is safe for an asset we cannot measure.
 */
export const HERO_FALLBACK_WIDTH = 1376;

/** public_id → the master's real pixel size. */
export const HERO_MASTERS = {
  // heroes-jpg, the owner's 4K masters (2026-09-08). All 4096x2294.
  'aspen-hero_ldlksr': { width: 4096, height: 2294 },
  'bali-hero_qvcc3j': { width: 4096, height: 2294 },
  'brooklyn-hero_u3jq3l': { width: 4096, height: 2294 },
  // capetown's asset is `cape-town-`, hyphenated, where the universe id is
  // not. The one name in the folder that does not follow `<id>-hero_`.
  'cape-town-hero_zwhvzb': { width: 4096, height: 2294 },
  'capri-hero_kvgacu': { width: 4096, height: 2294 },
  'edinburgh-hero_jfsxk4': { width: 4096, height: 2294 },
  'florence-hero_in9ez4': { width: 4096, height: 2294 },
  'havana-hero_sl8fyk': { width: 4096, height: 2294 },
  'kyoto-hero_ozomyb': { width: 4096, height: 2294 },
  'london-hero_htbyky': { width: 4096, height: 2294 },
  'marrakech-hero_sbciuz': { width: 4096, height: 2294 },
  'monaco-hero_kwfou0': { width: 4096, height: 2294 },
  'mykonos-hero_koouyg': { width: 4096, height: 2294 },
  'paris-hero_afhg5f': { width: 4096, height: 2294 },
  'sedona-hero_lhnjr0': { width: 4096, height: 2294 },
  'seoul-hero_lbj8ji': { width: 4096, height: 2294 },
  'shanghai-hero_bkvfnb': { width: 4096, height: 2294 },
  'taj-hero_xrxxhf': { width: 4096, height: 2294 },
  'tulum-hero_pfdffd': { width: 4096, height: 2294 },

  // AMALFI IS NOT IN heroes-jpg. It is the one universe the owner has not
  // re-shot, so it keeps the master it had and is listed here for the same
  // reason as the rest: without an entry it would fall back to 1376 and get
  // SOFTER than it is today. This line goes when its 4K master lands.
  'hf_20260903_234805_e1dafa9c-c82b-4722-b83c-65208f20bf50_xxsczf': { width: 2752, height: 1536 },
};

/** The public id inside a Cloudinary delivery URL, or the string unchanged. */
export function heroPublicId(urlOrId) {
  const s = String(urlOrId || '');
  const m = /\/image\/upload\/(?:[^/]*\/)?(.+)$/.exec(s);
  return m ? m[1] : s;
}

/** The master width for a hero, or null when it is not one we have measured. */
export function heroMasterWidth(urlOrId) {
  return HERO_MASTERS[heroPublicId(urlOrId)]?.width ?? null;
}

/**
 * The width to actually request: what the surface wants, capped at what the
 * master holds. An unmeasured asset gets the conservative fallback rather
 * than the target, because the failure to avoid is asking for more than
 * exists — not asking for slightly less.
 */
export function heroDeliveryWidth(urlOrId, wanted = HERO_TARGET_WIDTH) {
  const master = heroMasterWidth(urlOrId);
  if (!master) return Math.min(wanted, HERO_FALLBACK_WIDTH);
  return Math.min(wanted, master);
}

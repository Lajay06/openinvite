/**
 * src/lib/heroFocus.js
 *
 * WHERE A HERO IS CROPPED FROM, per universe. Default centre; one override.
 *
 * ── THE CROP IS DONE BY CSS, NOT BY CLOUDINARY ──────────────────────────────
 *
 * This is the fact the whole file turns on, and it is easy to get wrong: the
 * hero URL is delivered at the master's own 16:9 and every hero surface then
 * does `object-fit: cover` in a container of its own shape. So on a phone —
 * a 390x844 portrait viewport against a 16:9 picture — the BROWSER takes a
 * narrow vertical slice, and which slice it takes is decided by
 * `object-position`, not by any `g_` in the URL. Gravity governs the tile and
 * gallery crops, which Cloudinary really does perform; it has no effect on
 * hero framing at all.
 *
 * A contact sheet built by asking Cloudinary for a portrait crop therefore
 * shows something the product never renders. That is how brooklyn's problem
 * was first measured, and the measurement was right about the symptom and
 * wrong about the cause.
 *
 * ── WHY A MAP OF OVERRIDES AND NOT A RULE ───────────────────────────────────
 *
 * universeGallery.js argues, correctly, against hand-set object-position for
 * the TILES: twenty slots whose contents change, where a position tuned to
 * one photograph is wrong for the next one uploaded into it. It draws the
 * line itself — "the art-directed marketing HEROES keep the how-to's
 * object-position path. Those are single, chosen images with a composition
 * someone decided." This is that path, on that side of the line.
 *
 * So the default stays `center` and every entry below is a deliberate,
 * owner-ruled exception to it. An entry is a claim that someone looked.
 */

/** The default. Twenty of twenty-one heroes want nothing else. */
export const HERO_FOCUS_DEFAULT = 'center';

/**
 * universe id → CSS object-position.
 *
 * brooklyn: the couple walks left of centre and a centred crop at 390 keeps
 * the man and loses the woman almost entirely — measured at 390x844, the
 * viewport the marketing scroll is actually read on. 36% puts both of them
 * mid-frame. It moves the 1440 crop by a few per cent of a picture that is
 * barely cropped there at all (16:9 into 1.6), so the desktop composition is
 * unchanged: same couple, same position, same bodega.
 */
export const HERO_FOCUS = {
  brooklyn: '36% center',
};

/** The object-position for a universe's hero. */
export function heroFocus(universeId) {
  return HERO_FOCUS[universeId] || HERO_FOCUS_DEFAULT;
}

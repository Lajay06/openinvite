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
 * ── HOW EACH VALUE WAS ARRIVED AT ───────────────────────────────────────────
 *
 * The rule is the owner's: at 390x844 the couple is whole and mid-frame, and
 * at 1440 the composition does not visibly move. The second half is nearly
 * free — a 16:9 picture in a 1.6 container is 89.6% visible, so the whole
 * range of object-position slides it by at most 5% of the frame.
 *
 * Each subject's horizontal extent was measured off the master against a
 * percentage ruler, and the value is
 *
 *     p = (c - f/2) / (1 - f),   f = containerRatio / imageRatio
 *
 * the object-position that centres the visible window on the subject centre
 * c. At 390x844 against a 1.786 master, f is 0.259 — the phone sees a quarter
 * of the picture's width, which is why a centred crop loses so many of them.
 *
 * CLOUDINARY'S FACE DETECTION WAS A SIGNAL, NOT THE ANSWER. It was read for
 * all twenty and it is wrong in both directions: it finds no face at all in
 * brooklyn, kyoto, monaco or seoul, and in havana it finds FOUR — the couple
 * plus two bystanders down the street — which drags the computed centre from
 * 50% to 37% and would have moved a hero that is correctly framed today. Every
 * value below is a human measurement that the detector was allowed to suggest.
 */
export const HERO_FOCUS = {
  // THE ONE THE RULE CANNOT FULLY MEET. amalfi is the universe with no new
  // master (2752x1536) and its couple spans 33-63% — thirty per cent of the
  // frame against a phone window of twenty-six. Somebody is losing something
  // at every value; centred it is the man's whole left arm, and 47% splits
  // the loss to about two per cent a side instead. Best available, not whole.
  amalfi: '47% center',
  // Couple 20-35%, walking left of centre with the beach open to the right.
  // A centred crop is empty sand and the tip of a surfboard.
  bali: '20% center',
  // Couple 26-50%, the widest subject of the twenty — it barely fits the
  // phone's 25.9% window, so this one has under a percent of margin a side.
  brooklyn: '34% center',
  // Couple 32-43% on the path; centred, the man is cut and only she remains.
  kyoto: '33% center',
  // Couple 30-40% against the car. Centred, the crop is the harbour.
  monaco: '30% center',
  // Couple 38-62% and only just narrower than the window: centred, the
  // woman's back is clipped by the right edge. Found by looking, not by the
  // detector — which put havana's centre at 37% because it counted two
  // bystanders down the street as part of the subject.
  havana: '54% center',
  // Couple 51-63%, running toward the camera on the right of the lane.
  mykonos: '59% center',
  // Couple 29-41%; centred, only the woman is in frame.
  shanghai: '30% center',
  // Couple 57-73% under the arcade; centred, the crop is columns.
  taj: '70% center',
};

/** The object-position for a universe's hero. */
export function heroFocus(universeId) {
  return HERO_FOCUS[universeId] || HERO_FOCUS_DEFAULT;
}

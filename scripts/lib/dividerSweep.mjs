/**
 * Divider-aware sweep leg.
 *
 * Why this exists: the feel-pass 1 border sweep planted a 0.08 BORDER as a
 * positive control, found it every time, reported zero leftovers, and was
 * read as "no dividers left at the old value". It was structurally incapable
 * of seeing a divider drawn as a 1px-high background fill, and 16 of those
 * were live at the time. The control validated the instrument; it said
 * nothing about the conclusion's coverage.
 *
 * Standing rule that came out of it: a positive control validates the
 * instrument, not the conclusion's coverage — an instrument structurally
 * blind to a species proves nothing about that species.
 *
 * So this leg hunts the OTHER species: elements whose rendered box is 1-2px
 * on one axis and whose visible colour comes from `background`, not a border.
 * It plants its own background-drawn divider as a control, and reports
 * CONTROL MISSING rather than a clean result if it cannot find it.
 */

/* global document, getComputedStyle */
// DIVIDER_SWEEP is never executed in Node — it is stringified and eval'd
// inside the page by the sweep harness, so `document` and `getComputedStyle`
// are the browser's, not this module's. The directive tells eslint that
// rather than leaving the file failing no-undef under the Node config.

/** Runs in the page. Returns {old, new, controlFound}. */
export const DIVIDER_SWEEP = (oldColours, newColours) => {
  const probe = document.createElement('div');
  probe.style.height = '1px';
  probe.style.width = '40px';
  probe.style.background = oldColours[0];
  probe.setAttribute('data-divider-probe', '1');
  document.body.appendChild(probe);

  const norm = (c) => c.replace(/\s+/g, '');
  const oldSet = new Set(oldColours.map(norm));
  const newSet = new Set(newColours.map(norm));

  let old = 0, fresh = 0, controlFound = false;
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    // a separator is thin on exactly one axis and not zero on the other
    const thin = (r.height > 0 && r.height <= 2 && r.width > 8)
              || (r.width  > 0 && r.width  <= 2 && r.height > 8);
    if (!thin) continue;
    const cs = getComputedStyle(el);
    // its colour must come from the fill, not a border
    const hasBorder = ['Top','Right','Bottom','Left']
      .some(s => parseFloat(cs['border' + s + 'Width']) > 0);
    if (hasBorder) continue;
    const bg = norm(cs.backgroundColor);
    if (oldSet.has(bg)) {
      old++;
      if (el.getAttribute('data-divider-probe')) controlFound = true;
    } else if (newSet.has(bg)) fresh++;
  }
  probe.remove();
  return { old, new: fresh, controlFound };
};

/** The colour pairs this codebase uses for separators, both ramps. */
export const RAMPS = {
  old: ['rgba(10, 10, 10, 0.08)', 'rgba(255, 255, 255, 0.08)'],
  new: ['rgba(10, 10, 10, 0.12)', 'rgba(255, 255, 255, 0.12)'],
};

/**
 * src/lib/tourSpotlight.js
 *
 * "TRY IT" HAS TO LAND ON SOMETHING, AND THIS IS HOW IT FINDS IT.
 *
 * The tour's chapters name a control in words, not in selectors:
 * `spotlight: 'guests-send-invitations'`. That is deliberate and it is the
 * goal's constraint, because src/lib/studioTour.js is imported by the mobile
 * shell too, and a CSS selector is a coupling to the web DOM that the shell
 * cannot honor. So the names live in the data and the mapping from name to
 * selector lives here, on the web side only.
 *
 * ── WHY IT WAITS ───────────────────────────────────────────────────────────
 *
 * "Try it" navigates and then highlights, and the target does not exist yet at
 * the moment of the click: the page is a lazy chunk that has not loaded. So
 * this polls for the element for a short window and gives up quietly. Giving up
 * quietly is the right failure: a couple who followed Try it and landed on the
 * right page has got most of the value, and an error about a missing selector
 * would be about our problem, not theirs.
 *
 * ── WHY A DATA ATTRIBUTE AND NOT A CLASS ───────────────────────────────────
 *
 * Every target is found by `[data-tour-target="<name>"]`, added to the control
 * itself. A class or a structural selector would break the first time someone
 * restyled the page, and it would break silently, which is the whole problem
 * with pointing at a UI from a distance. An attribute whose only purpose is to
 * be pointed at cannot be refactored away by accident: grep finds it.
 */

/** How long to keep looking for a target that has not rendered yet. */
const WAIT_MS = 4000;
const POLL_MS = 120;

/** How long the ring stays once it has been found. */
const HOLD_MS = 2600;

const ATTR = 'data-tour-target';
const RING_CLASS = 'oi-tour-spotlight';

/** Every name a chapter may ask for, so a typo in the data is findable. */
export const SPOTLIGHT_NAMES = [
  'theme-aesthetic-pills',
  'schedule-export',
  'guests-send-invitations',
  'music-create-playlist',
  'studio-my-universe',
  'ava-composer',
  'guest-suite-publish',
  'whats-here-control',
];

/**
 * Highlight a named control once it exists.
 *
 * @param {string} name        one of SPOTLIGHT_NAMES
 * @param {object} [options]
 * @param {boolean} [options.pulseOnly]  pulse without scrolling, for a control
 *   already on screen. Chapter 8 points at the "?" in the header the couple is
 *   already looking at, and scrolling to it would move the page for nothing.
 * @returns {Promise<boolean>} whether it was found
 */
export function spotlight(name, options = {}) {
  if (typeof document === 'undefined' || !name) return Promise.resolve(false);

  const started = Date.now();
  return new Promise((resolve) => {
    const attempt = () => {
      const el = document.querySelector(`[${ATTR}="${name}"]`);
      if (el) {
        if (!options.pulseOnly && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        el.classList.add(RING_CLASS);
        // REMOVED ON A TIMER, not left on. A permanent ring would read as a
        // state the control is in rather than as an answer to a question the
        // couple asked a moment ago.
        window.setTimeout(() => el.classList.remove(RING_CLASS), HOLD_MS);
        resolve(true);
        return;
      }
      if (Date.now() - started >= WAIT_MS) { resolve(false); return; }
      window.setTimeout(attempt, POLL_MS);
    };
    attempt();
  });
}

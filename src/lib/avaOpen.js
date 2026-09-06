/**
 * src/lib/avaOpen.js
 *
 * THE ONE WAY TO OPEN AVA.
 *
 * AvaButton has dispatched `new CustomEvent('openAva')` since it was written
 * (AvaButton.jsx:9) for any caller that gave it no onClick — and NOTHING HAS
 * EVER LISTENED FOR IT. Four buttons used that path: Account, Event details,
 * Polls and Q&A. All four did nothing at all when pressed. The owner reported
 * the Event details one; the other three were the same bug, unreported.
 *
 * A CustomEvent with no listener fails silently, which is why a dead button
 * survived in four places: nothing throws, nothing logs, and the only symptom
 * is a person pressing a button and being ignored.
 *
 * WHAT IT CARRIES. The page it was opened from, and optionally a question to
 * seed. Spec 3.2: "the pod knows what page it was opened from and treats that
 * as context, so 'is this enough?' on the Budget page is a budget question."
 * The page is read from the URL at dispatch time rather than passed by every
 * caller, so it cannot be forgotten or got wrong.
 */

export const AVA_OPEN_EVENT = 'openAva';

/**
 * Ask the Layout to open the pod.
 *
 * @param {object} [detail]
 * @param {string} [detail.page]          route; defaults to the current one
 * @param {string} [detail.seedQuestion]  a question to put in the box, unsent
 * @param {string} [detail.pageContext]   what this page is about, for the prompt
 */
export function openAva(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AVA_OPEN_EVENT, {
    detail: { page: window.location.pathname, ...detail },
  }));
}

/**
 * src/lib/publishState.js
 *
 * IS THE GUEST SUITE LIVE? ONE ANSWER, ONE VOCABULARY.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * Six places in the web app answered this question and three of them answered
 * it wrongly. The split was not a disagreement anyone had: it was the same
 * condition retyped six times, and half the retypings forgot the slug.
 *
 *   websiteEnabled && slug   StudioShareTab, PublishModal, UniverseWorldView
 *   websiteEnabled alone     WBRightPanel, StudioHub, journeySteps
 *
 * A wedding with `websiteEnabled: true` and no `slug` has no reachable URL,
 * because `/w/undefined` is not a site. So the second group told the couple
 * their website was "Live", badged it "Live" on the hub, and marked the journey
 * step complete, for something no guest could open. Owner ruling 2026-10-12:
 * live means BOTH, and those three were bugs.
 *
 * ── A STATE, NOT A BOOLEAN ────────────────────────────────────────────────
 *
 * A boolean cannot say which of the two ways it is not live, and that is the
 * difference the couple needs: "Hidden" is a choice they made and can undo
 * here, "No address yet" is work waiting elsewhere, in Event details. The one
 * site that got this right, StudioShareTab, already distinguished all three on
 * screen. The module makes that the only option rather than the best of six.
 *
 * ── THE SERVER DOES NOT USE THIS, DELIBERATELY ────────────────────────────
 *
 * api/guest-page.js, wedding-by-slug.js and wedding-poll-results.js test
 * `websiteEnabled !== true` on its own, and they are right to: each found the
 * row BY its slug, so a slug check there would be asking whether the thing it
 * just looked up by exists. Owner ruling 2026-10-12: those stay as they are.
 *
 * CORRECTION 2026-10-13. This paragraph also named api/send-invites.js, which
 * was wrong: that endpoint is scoped to `created_by_id`, not found by slug, so
 * nothing there has already established that an address exists. It refused an
 * unpublished wedding and let a wedding with NO address through, while
 * SendInvitesModal refused both. A client and a server disagreeing about who
 * may be sent to is the shape this module exists to remove, and the claim that
 * they agreed was mine. The endpoint is a send file, so it moves under its own
 * held PR.
 */

/** The three states, which are all the states there are. */
export const PUBLISH_STATE = Object.freeze({
  NO_ADDRESS: 'no_address',
  HIDDEN: 'hidden',
  LIVE: 'live',
});

/**
 * ADDRESS FIRST. A couple with no slug cannot be "hidden", because there is
 * nothing yet to hide; the toggle's position is not the interesting fact about
 * that wedding and reporting it would send them to the wrong screen.
 *
 * @param {{slug?: string, websiteEnabled?: boolean}|null|undefined} wedding
 * @returns {'no_address'|'hidden'|'live'}
 */
export function publishState(wedding) {
  if (!wedding?.slug) return PUBLISH_STATE.NO_ADDRESS;
  return wedding.websiteEnabled === true ? PUBLISH_STATE.LIVE : PUBLISH_STATE.HIDDEN;
}

/**
 * @returns {boolean} true only when a guest could open it right now
 */
export function isLive(wedding) {
  return publishState(wedding) === PUBLISH_STATE.LIVE;
}

/** The badge and chip wording, one spelling everywhere. */
export const PUBLISH_LABEL = Object.freeze({
  [PUBLISH_STATE.NO_ADDRESS]: 'No address yet',
  [PUBLISH_STATE.HIDDEN]: 'Hidden',
  [PUBLISH_STATE.LIVE]: 'Live',
});

/**
 * The sentence form, for the builder's right panel.
 *
 * "Guest Suite", never "Website": the product has one name for this thing and
 * the panel used the other one. The no-address case is not a sentence about the
 * Guest Suite at all, because the answer is somewhere else.
 */
export const PUBLISH_SENTENCE = Object.freeze({
  [PUBLISH_STATE.NO_ADDRESS]: 'No address yet',
  [PUBLISH_STATE.HIDDEN]: 'Guest Suite is hidden',
  [PUBLISH_STATE.LIVE]: 'Guest Suite is live',
});

/**
 * @returns {string} the label for a badge or chip
 */
export function publishLabel(wedding) {
  return PUBLISH_LABEL[publishState(wedding)];
}

/**
 * @returns {string} the sentence for the builder's right panel
 */
export function publishSentence(wedding) {
  return PUBLISH_SENTENCE[publishState(wedding)];
}

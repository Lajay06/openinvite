/**
 * src/lib/websitePasswordGate.js
 *
 * One place for the website password gate's client-side rules, because the
 * same toggle exists on four surfaces (StudioShareTab twice, PublishModal,
 * WBRightPanel) and they previously disagreed with each other — two wrote
 * sentinel values into websitePassword itself (`'password'` and `' '`) to
 * mean "enabled but unset", and the third wrote a websitePasswordEnabled
 * field that was not declared in Base44 and was therefore silently dropped
 * on every save.
 *
 * The contract now:
 *
 *   websitePasswordEnabled  — boolean, THE source of truth for gate on/off
 *   websitePassword         — the credential, never used to infer enabled
 *
 * Inferring "enabled" from the credential being non-empty is exactly what
 * forced the sentinels. Don't reintroduce it.
 *
 * INVARIANT — enabled=true with no credential must be unreachable.
 * `websitePasswordEnabled: true` is only ever persisted together with a
 * non-empty password. Flipping the switch on expresses an intent held in
 * local state; it is not written until a credential exists. The server
 * fails OPEN if it ever sees that combination anyway (see
 * api/_lib/guestSafeWedding.js and scratchpad/DECISION-LOG.md) — that is a
 * logged defensive line for a state this hook makes unreachable, not a
 * path normal use can take.
 */

import { useState, useEffect, useRef } from 'react';
import { putMyWeddingDetails } from '@/lib/resolveMyWedding';
import toast from 'react-hot-toast';

/** Debounce for persisting the credential as it is typed. */
const COMMIT_DELAY_MS = 500;

/**
 * The canonical read: is the gate actually on? Mirrors the server's
 * websiteGateIsOn() in api/_lib/guestSafeWedding.js — keep them in step.
 */
export function websiteGateIsOn(details) {
  // Reads websitePasswordIsSet, not websitePassword: as of Step 2b stage (iii)
  // the credential is a one-way hash and the endpoint never sends it to the
  // browser at all. The client gets one bit — is a credential stored — which
  // is all it needs.
  return !!details?.websitePasswordEnabled && !!details?.websitePasswordIsSet;
}

/**
 * Shared behaviour for every password-protection toggle + input pair.
 *
 * @param {object} details — the WeddingDetails record as the surface holds it
 * @param {(patch: object) => void} [onLocalUpdate] — optional; called with the
 *   patch after it persists, so a surface holding its own copy of `details`
 *   can stay in step. Persistence itself is NOT the surface's job.
 *
 * PERSISTENCE GOES THROUGH /api/my-wedding-details, ALWAYS. The credential is
 * hashed server-side (scrypt), so a surface writing
 * base44.entities.WeddingDetails.update({ websitePassword }) directly would
 * store plaintext and overwrite the hash. Routing every write through this
 * hook is what makes that impossible rather than merely discouraged. The
 * enabled flag rides along in the same request, so the two can never be
 * persisted apart.
 * @returns {{
 *   wantsProtection: boolean,   // what the switch shows
 *   toggle: (v: boolean) => void,
 *   password: string,           // the draft for a NEW credential
 *   setPassword: (v: string) => void,
 *   commitPassword: () => void, // flush immediately; wire to the input's onBlur
 *   incomplete: boolean,        // switch on, nothing stored, nothing typed
 *   hasStoredPassword: boolean, // a credential exists (value unknowable here)
 *   clearPassword: () => void,  // forget the stored credential; turns the gate off
 * }}
 */
export function useWebsitePasswordGate(details, onLocalUpdate) {
  const persistedEnabled = !!details?.websitePasswordEnabled;
  // The stored credential is a hash the server never sends back, so the only
  // thing knowable here is WHETHER one exists. Everything below is written in
  // terms of that bit plus a draft for a replacement — a "set new / clear"
  // model, because "show the couple their password" is no longer possible.
  const hasStoredPassword = !!details?.websitePasswordIsSet;

  // Local intent, seeded from what is persisted. Diverges from it only in the
  // window where the couple has flipped the switch on but not yet typed a
  // password — the state we refuse to save.
  const [wantsProtection, setWantsProtection] = useState(persistedEnabled);
  useEffect(() => { setWantsProtection(persistedEnabled); }, [persistedEnabled]);

  // The draft is a NEW credential being typed. It starts empty even when one
  // is already stored, because the stored value is unknowable — the input is
  // "set a new password", never "here is your current password".
  //
  // It is also persisted on a debounce rather than per keystroke: binding an
  // input straight to a value that only returns after an awaited network write
  // drops keystrokes (PublishModal did exactly that), and it spared a write —
  // and now an scrypt hash — per character.
  const [draft, setDraft] = useState('');

  const timer = useRef(null);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  useEffect(() => clear, []);

  /** enabled always rides in the SAME patch as the credential, so the two can
   *  never disagree in storage — written or cleared together, never apart.
   *  The server hashes `websitePassword`; what leaves here is plaintext over
   *  HTTPS in a POST/PUT body, and it is never stored plaintext anywhere. */
  const applyPatch = async (patch) => {
    try {
      await putMyWeddingDetails(patch);
      onLocalUpdate?.(patch);
    } catch (err) {
      // Never swallowed: a silent failure here means the couple believes their
      // site is locked when it is not, or vice versa.
      console.error('[websitePasswordGate] save failed:', err.message);
      toast.error('Could not save the password setting. Please try again.');
    }
  };

  const persist = (value, enabledIntent) => applyPatch({
    websitePassword: value,
    websitePasswordEnabled: enabledIntent && !!value.trim(),
  });

  const toggle = (v) => {
    clear();
    setWantsProtection(v);
    if (!v) {
      // Turning off keeps the credential, so turning it back on later doesn't
      // make the couple retype it. That is the whole reason the gate has its
      // own boolean rather than being inferred from the credential.
      applyPatch({ websitePasswordEnabled: false });
      return;
    }
    // Turning on is deliberately NOT persisted on its own. It becomes real
    // only once there is something to authenticate against — either a
    // credential already stored, or one typed now.
    if (draft.trim()) persist(draft, true);
    else if (hasStoredPassword) applyPatch({ websitePasswordEnabled: true });
  };

  const setPassword = (value) => {
    setDraft(value);
    clear();
    timer.current = setTimeout(() => persist(value, wantsProtection), COMMIT_DELAY_MS);
  };

  const commitPassword = () => {
    clear();
    if (draft.trim()) persist(draft, wantsProtection);
  };

  /** Forget the stored credential. Clears the gate with it — an enabled gate
   *  with nothing to check is the fail-open state the UI must never produce. */
  const clearPassword = () => {
    clear();
    setDraft('');
    setWantsProtection(false);
    applyPatch({ websitePassword: '', websitePasswordEnabled: false });
  };

  return {
    wantsProtection,
    toggle,
    password: draft,
    setPassword,
    commitPassword,
    // "Nothing to authenticate against" now means: none stored AND none typed.
    incomplete: wantsProtection && !hasStoredPassword && !draft.trim(),
    hasStoredPassword,
    clearPassword,
  };
}

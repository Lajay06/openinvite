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

/** Debounce for persisting the credential as it is typed. */
const COMMIT_DELAY_MS = 500;

/**
 * The canonical read: is the gate actually on? Mirrors the server's
 * websiteGateIsOn() in api/_lib/guestSafeWedding.js — keep them in step.
 */
export function websiteGateIsOn(details) {
  return !!details?.websitePasswordEnabled && !!details?.websitePassword?.trim();
}

/**
 * Shared behaviour for every password-protection toggle + input pair.
 *
 * @param {object} details — the WeddingDetails record as the surface holds it
 * @param {(patch: object) => void} applyPatch — persists a field patch. Takes
 *   a patch rather than (field, value) so enabling and setting the credential
 *   land in ONE write; two sequential writes would briefly persist the
 *   enabled-without-password state this hook exists to prevent.
 * @returns {{
 *   wantsProtection: boolean,   // what the switch shows
 *   toggle: (v: boolean) => void,
 *   password: string,           // the draft — bind the input to this
 *   setPassword: (v: string) => void,
 *   commitPassword: () => void, // flush immediately; wire to the input's onBlur
 *   incomplete: boolean,        // switch on, no credential yet — show a hint
 * }}
 */
export function useWebsitePasswordGate(details, applyPatch) {
  const persistedEnabled = !!details?.websitePasswordEnabled;
  const persistedPassword = details?.websitePassword || '';

  // Local intent, seeded from what is persisted. Diverges from it only in the
  // window where the couple has flipped the switch on but not yet typed a
  // password — the state we refuse to save.
  const [wantsProtection, setWantsProtection] = useState(persistedEnabled);
  useEffect(() => { setWantsProtection(persistedEnabled); }, [persistedEnabled]);

  // The credential is edited as a LOCAL draft and persisted on a debounce.
  // Binding the input straight to the persisted value drops keystrokes on any
  // surface whose applyPatch awaits the network before the new value comes
  // back down (PublishModal does exactly that) — the field would show only
  // the first character typed. It also spared a write per keystroke.
  const [draft, setDraft] = useState(persistedPassword);
  useEffect(() => { setDraft(persistedPassword); }, [persistedPassword]);

  const timer = useRef(null);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  useEffect(() => clear, []);

  /** enabled always rides in the SAME patch as the credential, so the two can
   *  never disagree in storage — written or cleared together, never apart. */
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
    // only once there is something to authenticate against.
    if (draft.trim()) persist(draft, true);
  };

  const setPassword = (value) => {
    setDraft(value);
    clear();
    timer.current = setTimeout(() => persist(value, wantsProtection), COMMIT_DELAY_MS);
  };

  const commitPassword = () => {
    clear();
    if (draft !== persistedPassword) persist(draft, wantsProtection);
  };

  return {
    wantsProtection,
    toggle,
    password: draft,
    setPassword,
    commitPassword,
    incomplete: wantsProtection && !draft.trim(),
  };
}

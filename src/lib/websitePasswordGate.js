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

import { useState, useEffect } from 'react';

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
 *   password: string,
 *   setPassword: (v: string) => void,
 *   incomplete: boolean,        // switch on, no credential yet — show a hint
 * }}
 */
export function useWebsitePasswordGate(details, applyPatch) {
  const persistedEnabled = !!details?.websitePasswordEnabled;
  const password = details?.websitePassword || '';

  // Local intent, seeded from what is persisted. Diverges from it only in the
  // window where the couple has flipped the switch on but not yet typed a
  // password — the state we refuse to save.
  const [wantsProtection, setWantsProtection] = useState(persistedEnabled);
  useEffect(() => { setWantsProtection(persistedEnabled); }, [persistedEnabled]);

  const toggle = (v) => {
    setWantsProtection(v);
    if (!v) {
      // Turning off keeps the credential, so turning it back on later doesn't
      // make the couple retype it. That is the whole reason the gate has its
      // own boolean rather than being inferred from the credential.
      applyPatch({ websitePasswordEnabled: false });
      return;
    }
    // Turning on is deliberately NOT persisted here. It becomes real in
    // setPassword, once there is something to authenticate against.
    if (password.trim()) applyPatch({ websitePasswordEnabled: true });
  };

  const setPassword = (value) => {
    // enabled rides along in the same patch, so the two can never disagree in
    // storage: a credential and its switch are written or cleared together.
    applyPatch({
      websitePassword: value,
      websitePasswordEnabled: wantsProtection && !!value.trim(),
    });
  };

  return {
    wantsProtection,
    toggle,
    password,
    setPassword,
    incomplete: wantsProtection && !password.trim(),
  };
}

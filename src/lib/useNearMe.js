/**
 * src/lib/useNearMe.js
 *
 * ONE "NEAR ME", FOR EVERY PLACE SEARCH THAT STILL LACKS ONE.
 *
 * Item 8 of goals/2026-10-08-site-fixes-batch-1.md: every place search gets a
 * control that biases results to the browser's location, permission is asked
 * for only when the control is used, and a refusal leaves the search working
 * exactly as it does today.
 *
 * ── WHAT WAS ALREADY TRUE WHEN I STARTED ───────────────────────────────────
 *
 * Five of the nine place searches already had this, with near-identical code
 * in each: VenueSearchPanel, ExperienceGuideTab, GuestSuiteAccommodation,
 * GuestSuiteTransport and VendorMarketplace. The server half has been there
 * even longer, since api/places-search.js has accepted lat and lng with a
 * 50 km radius from the start, so nothing about this item needed an api
 * change. Three searches lacked it, and this hook exists so they do not become
 * copies six, seven and eight of the same twenty lines.
 *
 * The five existing copies are deliberately NOT refactored here. Each sits in
 * a component with its own search function and its own debounce, and rewriting
 * five working flows to prove a point about duplication is a bigger change
 * than the item asks for. If one of them is touched later, this is what it
 * should become.
 *
 * ── PERMISSION IS ASKED FOR ON THE TAP, NEVER ON MOUNT ─────────────────────
 *
 * That is the item's own rule and it is the reason this is a hook with a
 * `request` function rather than an effect: nothing here runs until a person
 * presses something. A browser prompt on page load is the kind of thing a
 * couple remembers about a product.
 *
 * ── A REFUSAL IS A STATE, NOT AN ERROR ─────────────────────────────────────
 *
 * 'denied', 'unavailable' and 'error' are all reported so a control can say
 * what happened, and in every one of them `coords` stays null, so the caller's
 * search body is the body it would have sent anyway. There is no path where a
 * failed lookup changes the request.
 *
 * ── AND THE LESSON ALREADY PAID FOR IN VenueSearchPanel ────────────────────
 *
 * That file carries a comment worth repeating: coordinates in a ref do not
 * re-render, so the first version changed the button's label and nothing else,
 * and the bias first took effect on the guest's NEXT keystroke. `onReady` is
 * part of this hook's surface for that reason: the caller re-runs the query
 * the person already typed.
 */

import { useCallback, useRef, useState } from 'react';

/** idle, loading, active, denied, unavailable, error. */
export function useNearMe({ onReady } = {}) {
  const [state, setState] = useState('idle');
  // A REF, NOT STATE, because a search function reads it synchronously after
  // onReady fires; a state write would not be visible yet.
  const coordsRef = useRef(null);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState('unavailable');
      return;
    }
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setState('active');
        onReady?.();
      },
      (err) => {
        // PERMISSION_DENIED is 1. The other codes are a position the device
        // could not fix, which is not the same thing to say to a person.
        coordsRef.current = null;
        setState(err?.code === 1 ? 'denied' : 'error');
      },
      { timeout: 8000, maximumAge: 300000 },
    );
  }, [onReady]);

  const clear = useCallback(() => {
    coordsRef.current = null;
    setState('idle');
    onReady?.();
  }, [onReady]);

  /** Spread into a search body: {} when there is nothing to bias with. */
  const bias = useCallback(() => (coordsRef.current
    ? { lat: coordsRef.current.lat, lng: coordsRef.current.lng }
    : {}), []);

  return { state, request, clear, bias, coordsRef };
}

/** What the control says, so three call sites cannot word it three ways. */
export const NEAR_ME_LABELS = {
  idle: 'Near me',
  loading: 'Finding you…',
  active: 'Using your location',
  denied: 'Location blocked',
  unavailable: 'Location unavailable',
  error: 'Could not find you',
};

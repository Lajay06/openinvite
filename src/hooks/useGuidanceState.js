import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { readGuidanceState, tourSeen, panelDismissed } from '@/lib/guidanceState';

/**
 * The couple's guidance state, loaded once and written through their own token.
 *
 * ── NEVER WRITE ON A WEDDING THAT HAS NOT LOADED ───────────────────────────
 *
 * The goal's words, and the reason `ready` exists. Until the record is in hand
 * there is no id to write against and no existing `dismissed` array to append
 * to — a write then would either fail or, worse, succeed with an empty array
 * and erase whatever the couple had already dismissed. Both writers below
 * refuse while `ready` is false, and they refuse silently: this is a help
 * system, and a toast about a failed bookkeeping write would be noise about
 * something the couple did not ask for.
 *
 * ── THE COUPLE'S OWN TOKEN, NOT THE ENDPOINT ───────────────────────────────
 *
 * `putMyWeddingDetails` writes through /api/my-wedding-details, whose
 * WRITABLE_FIELDS is the encrypted + hashed + two plaintext fields and does not
 * include this one. Rather than widen a server endpoint for a bookkeeping
 * field, this writes with base44.entities.WeddingDetails.update — owner-scoped
 * RLS, the couple's own session, the same route Music.jsx uses for its own
 * plaintext object. No admin key anywhere near it.
 *
 * ── OPTIMISTIC, BECAUSE THE GUARANTEE IS ABOUT THIS SESSION TOO ────────────
 *
 * Local state updates before the write resolves. A couple who dismisses a
 * panel must not see it again while the round trip is in flight, and a tour
 * that reappeared for a second because the PUT was slow would be the exact
 * complaint this field was added to fix.
 */
export function useGuidanceState() {
  const [state, setState] = useState(null);      // null until loaded
  const [ready, setReady] = useState(false);
  const recordId = useRef(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        const record = await getMyWeddingDetails();
        if (!alive.current) return;
        if (record?.id) {
          recordId.current = record.id;
          setState(readGuidanceState(record));
          setReady(true);
          return;
        }
        // No record: a signed-in account that never finished onboarding. There
        // is nothing to remember against, so guidance reads as "not yet" and
        // writes are refused rather than creating a record as a side effect of
        // showing a tip.
        setState(readGuidanceState(null));
      } catch {
        setState(readGuidanceState(null));
      }
    })();
    return () => { alive.current = false; };
  }, []);

  const persist = useCallback(async (next) => {
    if (!next || !ready || !recordId.current) return;
    setState(next);
    try {
      await base44.entities.WeddingDetails.update(recordId.current, { guidanceState: next });
    } catch {
      // Silent on purpose — see the header. The couple's view already reflects
      // the choice; the worst case is they see the panel again next session.
    }
  }, [ready]);

  const markTourSeen = useCallback(() => persist(tourSeen(state)), [persist, state]);
  const dismiss = useCallback((path) => persist(panelDismissed(state, path)), [persist, state]);

  return { ready, state, markTourSeen, dismiss };
}

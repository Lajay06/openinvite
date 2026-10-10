import { useEffect, useRef } from 'react';
import { useOnline } from '../shell/OfflineBanner';

/**
 * src/mobile/lib/saveStatus.js
 *
 * THE SUBTITLE ON AN AUTO-SAVING FORM, and the retry it promises.
 *
 * The three auto-saving forms all said "Could not save. Check your
 * connection." — the same misplaced blame the load errors carried
 * (ui/ErrorState.jsx), on a phone that was online. Worse here than there:
 * a save failure is the couple's typing at stake, so the sentence has to
 * be right about whether their work is safe.
 *
 * Two things had to be true before the copy could be:
 *
 * 1. THE PAYLOAD HAD TO SURVIVE. Every flush emptied `pending` BEFORE the
 *    await and never put it back, so a failed save dropped the patch
 *    entirely: the screen said "Could not save" and there was nothing left
 *    to save even if the couple waited. Each form now restores its pending
 *    jobs on failure, with anything queued since layered on top so the
 *    newer edit wins.
 * 2. THE RETRY HAD TO EXIST. "It will save when you reconnect" is a
 *    promise; `useSaveSubtitle` keeps it, re-running the form's own flush
 *    on the transition back to online. It fires on the transition only,
 *    never on mount, so a form opened while offline does not save
 *    something the couple has not touched.
 *
 * The copy then says only what is true: online, the change did not save
 * and is named; offline, it is not saved YET and will go when the
 * connection is back. Neither ever implies it saved.
 */
export function useSaveSubtitle({ status, what, retry }) {
  const online = useOnline();
  // Read through a ref so an inline `retry` does not re-run the effect.
  const retryRef = useRef(retry);
  retryRef.current = retry;
  const statusRef = useRef(status);
  statusRef.current = status;
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) { wasOffline.current = true; return; }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    if (statusRef.current === 'failed') retryRef.current?.();
  }, [online]);

  if (status === 'saving') return 'Saving';
  if (status === 'saved') return 'Saved';
  if (status !== 'failed') return null;
  return online
    ? `Changes to ${what} did not save`
    : `Offline. Changes to ${what} will save when you reconnect`;
}

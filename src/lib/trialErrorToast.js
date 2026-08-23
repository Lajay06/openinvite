/**
 * One place that turns a blocked write into something a couple can act on.
 *
 * Two sources produce the same condition and must read identically:
 *   - the SDK guard throwing TrialExpiredError (direct entity writes)
 *   - a 403 { code: 'TRIAL_EXPIRED' } from api/_lib/trialGuard.js (endpoints)
 *
 * A couple should never be able to tell which layer stopped them, and neither
 * should say anything hostile: nothing is being withheld. Their work is
 * readable and exportable; what ended is the ability to keep changing it.
 */
import toast from 'react-hot-toast';
import { TRIAL_EXPIRED_CODE } from './trialWriteGuard';

export const TRIAL_EXPIRED_MESSAGE =
  'Your free trial has ended. Your work is safe and yours — upgrade to keep planning.';

/** @returns {boolean} true when this was a trial block and has been surfaced. */
export function isTrialExpiredError(err) {
  return err?.code === TRIAL_EXPIRED_CODE
    || err?.name === 'TrialExpiredError'
    || err?.response?.data?.code === TRIAL_EXPIRED_CODE;
}

export function showTrialExpiredToast() {
  toast(TRIAL_EXPIRED_MESSAGE, { icon: '🔓', duration: 8000 });
}

/** Returns true when handled, so callers can skip their generic error path. */
export function handleTrialExpired(err) {
  if (!isTrialExpiredError(err)) return false;
  showTrialExpiredToast();
  return true;
}

/**
 * Server-side trial enforcement (TT-2).
 *
 * Until this, gating was ENTIRELY client-side: not one mutating endpoint
 * consulted plan or trial state, so an expired account could write freely from
 * the console or by calling the API directly. A UI lock is not a lock.
 *
 * SCOPE, stated honestly. This guards requests that flow through OUR
 * endpoints. It does not -- cannot -- guard the ~174 direct
 * base44.entities.* writes the client makes straight to Base44. Those move
 * behind endpoints in the hosted-functions rebuild, and full enforcement
 * lands with it. What this does cover is the crown jewels: the guest list and
 * the wedding details.
 *
 * The expiry maths is IMPORTED, not reimplemented. api/ already imports from
 * ../src/lib in five places, and trialStatus.js is pure, so the server and the
 * browser evaluate one function over the same stored fields. A second copy
 * here would drift, which is the bug TT-1 just finished removing.
 *
 * Never trusts the client: `plan`, `trialStartedAt` and `created_date` come
 * from the User record verifyBase44User fetched, not from the request.
 */
import { getTrialStatus } from '../../src/lib/trialStatus.js';

/** Methods that change stored data. GET/HEAD/OPTIONS always pass. */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const TRIAL_EXPIRED_CODE = 'TRIAL_EXPIRED';

/**
 * @returns {true} when the request was rejected (the caller should return
 *          immediately), {false} when it may proceed.
 */
export function rejectIfTrialExpired(req, res, user) {
  if (!MUTATING.has(String(req.method || '').toUpperCase())) return false;

  const { trialExpired, isPaid } = getTrialStatus(user);
  if (isPaid || !trialExpired) return false;

  // A distinct code, not a bare 403: the client maps it to the calm upgrade
  // prompt. An indistinguishable 403 would surface as "something went wrong",
  // which is both unhelpful and untrue -- nothing went wrong.
  res.status(403).json({
    error: 'Your free trial has ended. Your work is safe and yours — upgrade to keep planning.',
    code: TRIAL_EXPIRED_CODE,
  });
  return true;
}

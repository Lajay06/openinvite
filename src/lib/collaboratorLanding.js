/**
 * src/lib/collaboratorLanding.js
 *
 * WHERE A COLLABORATOR-ONLY ACCOUNT GOES WHEN IT SIGNS IN WITHOUT THE LINK.
 *
 * Owner ruling 2026-10-13, for an account with no wedding of its own, the plan
 * step not done, onboarding not done and no paid plan:
 *   1. At least one active accepted grant: straight into the collaborator view
 *      of the most recently accepted wedding, writing nothing, exactly as the
 *      accept link does. No plan page, no trial, no onboarding.
 *   2. Every grant revoked: the normal plan page.
 *   3. More than one active grant: the most recent wins for now. A picker is
 *      a later item.
 *   4. Account shows one line, "Planning a wedding of your own? Start here.",
 *      only for an account with an active grant that has not done the plan
 *      step. Choosing to start is always theirs.
 *
 * The server decides which wedding (api/collaborator-context.js with no
 * ownerUserId); this file only asks and builds the URL.
 */

import { COLLABORATOR_PAGE_MAP, COLLABORATOR_PERMISSION_KEYS, collaboratorCan } from './collaboratorPageMap.js';

/**
 * The plan step is not done: none of the three things ChoosePlan.jsx's
 * isPastPlanStep checks. Kept in step with it by
 * tests/persistence/collaborator-login-routing.mjs.
 */
export function planStepNotDone(user) {
  return !(user?.plan_step_completed || user?.onboardingCompleted || user?.plan === 'pro' || user?.plan === 'ultra');
}

/**
 * The wedding this account helps with: { ownerUserId, permissions }, or null
 * when every grant is revoked, there are none, or the answer cannot be had.
 * Never throws: when in doubt, the plan page, as for anyone else.
 */
export async function fetchMyCollaboration(token) {
  if (!token) return null;
  try {
    const res = await fetch('/api/collaborator-context', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.ownerUserId ? { ownerUserId: body.ownerUserId, permissions: body.permissions || {} } : null;
  } catch {
    return null;
  }
}

/** The first page the grant can view, in the map's order, as the accept page lands. */
export function collaboratorLandingUrl(ownerUserId, permissions) {
  const key = COLLABORATOR_PERMISSION_KEYS.find(k => collaboratorCan(permissions, k, 'view')) || COLLABORATOR_PERMISSION_KEYS[0];
  return `${COLLABORATOR_PAGE_MAP[key].route}?collabOwner=${encodeURIComponent(ownerUserId)}`;
}

export const START_YOUR_OWN_LEAD = 'Planning a wedding of your own?';
export const START_YOUR_OWN_LINK = 'Start here.';

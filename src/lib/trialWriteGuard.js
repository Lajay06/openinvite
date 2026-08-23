/**
 * Client-side write guard for expired trials (TT-3).
 *
 * WHAT THIS IS, PLAINLY: a UX boundary, not enforcement. It runs in the
 * browser and a determined person with the console can step around it. Real
 * enforcement is TT-2 (server checks on api/my-guests, my-wedding-details and
 * my-guest-links -- the crown jewels) and, for everything else, the
 * hosted-functions rebuild that moves the remaining writes behind endpoints.
 * Until then enforcement is deliberately LAYERED and the gap is documented,
 * not discovered.
 *
 * WHY HERE. The app makes ~174 direct base44.entities.* writes from ~40
 * components. Gating those individually would mean 174 edits and a permanent
 * invitation to miss one. The SDK client is constructed in exactly one place,
 * so wrapping it is one guard covering all of them -- and it creates the seam
 * the hosted-functions rebuild will harden.
 *
 * READS ARE NEVER TOUCHED. list/filter/get stay open, which is what makes an
 * expired couple's data still theirs: every export is a pure read, and they
 * keep working.
 */
import { getTrialStatus } from './trialStatus.js';

const MUTATING = new Set(['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'upsert']);

export const TRIAL_EXPIRED_CODE = 'TRIAL_EXPIRED';

export class TrialExpiredError extends Error {
  constructor() {
    super('Your free trial has ended. Your work is safe and yours — upgrade to keep planning.');
    this.name = 'TrialExpiredError';
    this.code = TRIAL_EXPIRED_CODE;
  }
}

/** The signed-in user as the app already caches it (Layout.jsx reads the same key). */
function currentUser() {
  if (typeof localStorage === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('oi_user') || 'null'); } catch { return null; }
}

/** Read fresh on every call: a couple who upgrades mid-session must not stay locked. */
export function writesAreBlocked() {
  const user = currentUser();
  if (!user) return false;              // signed out or unknown: never block
  return getTrialStatus(user).trialExpired;
}

/**
 * Wraps `client.entities` so mutating calls throw TrialExpiredError once the
 * trial has ended. Everything else passes through untouched.
 */
export function guardEntityWrites(entities) {
  if (!entities || typeof entities !== 'object') return entities;
  const entityCache = new Map();

  return new Proxy(entities, {
    get(target, entityName, receiver) {
      const entity = Reflect.get(target, entityName, receiver);
      if (!entity || typeof entity !== 'object' || typeof entityName !== 'string') return entity;
      if (entityCache.has(entityName)) return entityCache.get(entityName);

      const wrapped = new Proxy(entity, {
        get(t, method, r) {
          const value = Reflect.get(t, method, r);
          if (typeof value !== 'function') return value;
          if (typeof method !== 'string' || !MUTATING.has(method)) return value.bind(t);
          return (...args) => {
            if (writesAreBlocked()) throw new TrialExpiredError();
            return value.apply(t, args);
          };
        },
      });
      entityCache.set(entityName, wrapped);
      return wrapped;
    },
  });
}

/**
 * Client write lock for expired trials (TT-3).
 *
 * A UX boundary, not enforcement -- it runs in the browser. Enforcement is
 * TT-2's server checks plus the hosted-functions rebuild. What this guard buys
 * is ONE gate instead of 174: the SDK client is built in a single place, so
 * wrapping it covers every direct base44.entities.* write in the app.
 *
 * The assertion that matters most is the negative one: READS MUST NOT BE
 * TOUCHED. Every export is a pure read, and an expired couple keeping access
 * to their own data is the whole promise ("viewing and exporting stays free,
 * forever"). A guard that caught reads would break the thing it exists to
 * protect.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { guardEntityWrites, TrialExpiredError, TRIAL_EXPIRED_CODE } from '../../src/lib/trialWriteGuard.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const CLIENT = readFileSync(resolve(__dir, '../../src/api/base44Client.js'), 'utf8');
const LAYOUT = readFileSync(resolve(__dir, '../../src/Layout.jsx'), 'utf8');
const DAY = 86400000;

/** Drives the guard through localStorage, exactly as the app does. */
function setUser(user) {
  globalThis.localStorage = {
    getItem: (k) => (k === 'oi_user' ? JSON.stringify(user) : null),
    setItem() {}, removeItem() {},
  };
}

function fakeEntities(log) {
  const entity = {
    create: (...a) => { log.push('create'); return 'created'; },
    update: (...a) => { log.push('update'); return 'updated'; },
    delete: (...a) => { log.push('delete'); return 'deleted'; },
    list:   (...a) => { log.push('list');   return ['row']; },
    filter: (...a) => { log.push('filter'); return ['row']; },
    get:    (...a) => { log.push('get');    return 'row'; },
  };
  return { Guest: entity, Budget: entity, Note: entity };
}

export async function runTrialClientLock() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Client write lock — one chokepoint, reads untouched:\n');

  // ── expired: writes blocked ──────────────────────────────────────────────
  setUser({ plan: 'free', trialStartedAt: new Date(Date.now() - 30 * DAY).toISOString() });
  {
    const log = []; const e = guardEntityWrites(fakeEntities(log));
    for (const m of ['create', 'update', 'delete']) {
      let threw = null;
      try { e.Guest[m]({}); } catch (err) { threw = err; }
      check(`expired: Guest.${m}() is blocked`,
        threw instanceof TrialExpiredError && threw.code === TRIAL_EXPIRED_CODE,
        threw ? threw.code : 'NOT BLOCKED');
    }
    check('  no write reached the SDK', log.length === 0, `${log.length} calls through`);

    // THE negative: reads must still work
    const reads = [];
    for (const m of ['list', 'filter', 'get']) {
      try { e.Guest[m](); reads.push(m); } catch { /* blocked */ }
    }
    check('expired: reads ALL still work (every export is a pure read)',
      reads.length === 3, reads.join(', '));
    check('  and they reached the SDK', log.filter(x => ['list','filter','get'].includes(x)).length === 3, log.join(','));
  }

  // ── active trial and paid: nothing blocked ───────────────────────────────
  for (const [label, user] of [
    ['active trial', { plan: 'free', trialStartedAt: new Date(Date.now() - 2 * DAY).toISOString() }],
    ['paid ultra',   { plan: 'ultra', created_date: new Date(Date.now() - 400 * DAY).toISOString() }],
    ['signed out',   null],
  ]) {
    setUser(user);
    const log = []; const e = guardEntityWrites(fakeEntities(log));
    let threw = null;
    try { e.Budget.create({}); } catch (err) { threw = err; }
    check(`${label}: writes pass through`, !threw && log.includes('create'), threw ? threw.code : 'created');
  }

  // ── the wiring, and the honesty of its description ───────────────────────
  check('the guard is applied where the client is built (one chokepoint)',
    /client\.entities = guardEntityWrites\(client\.entities\)/.test(CLIENT), 'base44Client.js');
  check('  the file says plainly it is a UX boundary, not enforcement',
    /UX boundary, NOT enforcement/.test(CLIENT), 'stated at-site');
  check('the expiry banner carries no data-hostage language',
    /Your work is safe and yours/.test(LAYOUT) && !/unlock your data/i.test(LAYOUT), 'canon copy');

  return results;
}

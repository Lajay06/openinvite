/**
 * tests/persistence/collaborator-read-caller.mjs
 *
 * OWNER-SCOPED COLLABORATOR READS GO THROUGH THE HOSTED FUNCTION, AND A
 * MISSING SECRET IS A CALM EMPTY PAGE.
 *
 * Item 7 of goals/2026-10-10-collaborators-safe-and-truthful.md, PR 2.
 * api/collaborator-data.js and api/collaborator-budget.js read the nine
 * owner-scoped entities through base44/functions/collaboratorRead, which the
 * admin key cannot. Owner, 2026-10-12: Preview has neither COLLAB_FN_SECRET nor
 * COLLAB_HASH_KEY, so without either the caller reads nothing and calls
 * nothing past checking who is signed in, logs
 * "collaborator reads not configured" with no ids, and the collaborator sees
 * the calm empty state, never an error. Preview is tested here, stubbed, never
 * with a live call.
 *
 * DRIVEN over a stubbed Base44: the real handlers, the real grant check, the
 * real hashing.
 *
 * The plant: collaborator-data.js without its not-configured check turns the
 * "nothing past the sign-in check" checks red. Proven by hand and recorded in the PR body.
 */

import fs from 'fs';
import { pass, fail } from './_shared.mjs';

const KEY = '0123456789abcdef'.repeat(4);
const FN_SECRET = 'fn-secret-for-the-guard-only';
const USERS = { 'tok-friend': { id: 'collab-1', email: 'friend@example.com' } };

export async function runCollaboratorReadCaller() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const prior = { admin: process.env.BASE44_ADMIN_KEY, hash: process.env.COLLAB_HASH_KEY, fn: process.env.COLLAB_FN_SECRET };
  process.env.BASE44_ADMIN_KEY = 'test-admin-key-not-a-real-credential';
  process.env.COLLAB_HASH_KEY = KEY;
  process.env.COLLAB_FN_SECRET = FN_SECRET;

  const { hashId } = await import('../../api/_lib/collaboratorAuth.js');
  const dataMod = await import('../../api/collaborator-data.js');
  const budgetHandler = (await import('../../api/collaborator-budget.js')).default;

  const calls = [];
  let fnStatus = 200;
  const grants = [];
  const realFetch = globalThis.fetch;
  const realLog = console.log;
  const realErr = console.error;
  const logs = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const bearer = String(init.headers?.Authorization || '').replace(/^Bearer /, '');
    calls.push({ path: u.pathname, bearer, headers: init.headers || {}, body: init.body });
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.pathname.endsWith('/entities/User/me')) return USERS[bearer] ? json(200, USERS[bearer]) : json(401, {});
    if (u.pathname.endsWith('/entities/CollaboratorGrant')) return json(200, grants);
    if (u.pathname.endsWith('/functions/collaboratorRead')) {
      if (fnStatus !== 200) return json(fnStatus, { error: 'x' });
      const { page } = JSON.parse(init.body);
      const data = page === 'Seating' ? { Table: [{ id: 't1', name: 'Table one' }], VenueAsset: [] } : { Budget: [{ id: 'b1', item_name: 'Venue' }] };
      return json(200, { data });
    }
    if (u.pathname.endsWith('/entities/Guest')) return json(200, [{ id: 'g1', created_by_id: 'owner-1', name: 'Guest' }]);
    if (u.pathname.endsWith('/entities/WeddingDetails')) return json(200, [{ id: 'w1', created_by_id: 'owner-1', created_date: '2026-01-01T00:00:00Z', partner1Name: 'Alex', partner2Name: 'Sam' }]);
    // An owner-scoped entity read with the admin key: Base44's real answer.
    return json(200, []);
  };

  let ipn = 1;
  const run = async (handler, query) => {
    const req = { method: 'GET', query, headers: { authorization: 'Bearer tok-friend', 'x-forwarded-for': `198.51.100.${ipn++}` } };
    const res = { _status: 200, _json: null, setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; } };
    // Only the handler's own lines are captured, never the guard's.
    console.log = (...a) => { logs.push(a.join(' ')); };
    console.error = (...a) => { logs.push(a.join(' ')); };
    try { await handler(req, res); } finally { console.log = realLog; console.error = realErr; }
    return res;
  };
  const data = (q) => run(dataMod.default, q);
  const seating = { ownerUserId: 'owner-1', page: 'Seating' };

  try {
    console.log('\n  Not configured, as on Preview: no call, a calm empty page:\n');
    for (const [label, unset] of [['COLLAB_FN_SECRET', () => delete process.env.COLLAB_FN_SECRET], ['COLLAB_HASH_KEY', () => { process.env.COLLAB_HASH_KEY = 'short'; }]]) {
      calls.length = 0; logs.length = 0;
      unset();
      const r = await data(seating);
      const b = await run(budgetHandler, { ownerUserId: 'owner-1' });
      ok(`without ${label}: both endpoints answer 200`, r._status === 200 && b._status === 200, `${r._status}, ${b._status}`);
      ok('  with empty lists for every entity the page reads',
         JSON.stringify(r._json?.data) === '{"Guest":[],"Table":[],"VenueAsset":[]}' && JSON.stringify(b._json?.budget) === '[]', JSON.stringify(r._json?.data));
      // The sign-in check stays first, so a stranger still gets a 401.
      const beyondSignIn = calls.filter(c => !c.path.endsWith('/entities/User/me'));
      ok('  and nothing past the sign-in check: no grant read, no data, no function call',
         beyondSignIn.length === 0, beyondSignIn.map(c => c.path).join(', ') || `${calls.length} sign-in check(s) only`);
      ok('  the log says not configured, and nothing else', logs.length === 2 && logs.every(l => l === dataMod.NOT_CONFIGURED), JSON.stringify(logs));
      process.env.COLLAB_FN_SECRET = FN_SECRET;
      process.env.COLLAB_HASH_KEY = KEY;
    }

    console.log('\n  Configured: owner-scoped entities through the function, as the collaborator:\n');
    grants.push({ owner_user_id_hash: hashId('owner-1'), collaborator_user_id_hash: hashId('collab-1'), event_type: 'grant',
      permissions: { Seating: { view: true }, Budget: { view: true } }, created_date: '2026-10-01T00:00:00Z' });
    calls.length = 0; logs.length = 0;
    const r = await data(seating);
    const fnCalls = calls.filter(c => c.path.endsWith('/functions/collaboratorRead'));
    ok('Seating reads 200 with the function\'s rows', r._status === 200 && r._json?.data?.Table?.[0]?.id === 't1', JSON.stringify(r._json?.data?.Table));
    ok('  one function call, carrying the collaborator\'s own token', fnCalls.length === 1 && fnCalls[0].bearer === 'tok-friend', `${fnCalls.length} call(s)`);
    ok('  and the shared secret header', fnCalls[0]?.headers['X-Collab-Fn-Secret'] === FN_SECRET, 'X-Collab-Fn-Secret');
    ok('  with the owner and the page, nothing about who is asking', fnCalls[0]?.body === JSON.stringify({ ownerUserId: 'owner-1', page: 'Seating' }), fnCalls[0]?.body);
    ok('  open Guest still comes from the admin-key read', r._json?.data?.Guest?.[0]?.id === 'g1', 'Guest');
    const adminScoped = calls.filter(c => /\/entities\/(Budget|Schedule|Music|Invitation|Table|VenueAsset|RegistryItem|Vendor|MoodboardItem)\b/.test(c.path));
    ok('  and no owner-scoped entity is read with the admin key', adminScoped.length === 0, adminScoped.map(c => c.path).join(', ') || 'none');
    const b = await run(budgetHandler, { ownerUserId: 'owner-1' });
    ok('Budget reads its rows through the function too', b._status === 200 && b._json?.budget?.[0]?.id === 'b1', JSON.stringify(b._json?.budget));

    console.log('\n  A failed function call is the same calm page:\n');
    fnStatus = 500; logs.length = 0;
    const failed = await data(seating);
    ok('the function failing: still 200, its entities empty, open data kept',
       failed._status === 200 && JSON.stringify(failed._json?.data?.Table) === '[]' && failed._json?.data?.Guest?.length === 1, `status ${failed._status}`);
    const failedBudget = await run(budgetHandler, { ownerUserId: 'owner-1' });
    ok('  and the budget empty', failedBudget._status === 200 && JSON.stringify(failedBudget._json?.budget) === '[]', `status ${failedBudget._status}`);
    const joined = logs.join('\n');
    ok('  the log names the failure, with no id, token or secret',
       /collaborator read failed \(500\)/.test(joined) && !/owner-1|collab-1|tok-friend|fn-secret|[0-9a-f]{64}/.test(joined), JSON.stringify(logs));
    fnStatus = 200;

    console.log('\n  No grant, no call:\n');
    grants.length = 0; calls.length = 0;
    const denied = await data(seating);
    ok('without a grant: 403, and the function is never called',
       denied._status === 403 && !calls.some(c => c.path.endsWith('/functions/collaboratorRead')), `status ${denied._status}`);

    console.log('\n  In step with the function:\n');
    const entry = fs.readFileSync(new URL('../../base44/functions/collaboratorRead/entry.ts', import.meta.url), 'utf8');
    const block = entry.slice(entry.indexOf('export const ENTITY_FIELDS'), entry.indexOf('};', entry.indexOf('export const ENTITY_FIELDS')));
    const fnEntities = [...block.matchAll(/^\s{2}(\w+): \[/mg)].map(m => m[1]).sort();
    ok('OWNER_SCOPED_ENTITIES is exactly the function\'s entities',
       JSON.stringify([...dataMod.OWNER_SCOPED_ENTITIES].sort()) === JSON.stringify(fnEntities), fnEntities.join(','));
  } finally {
    globalThis.fetch = realFetch;
    console.log = realLog;
    console.error = realErr;
    for (const [k, env] of [['admin', 'BASE44_ADMIN_KEY'], ['hash', 'COLLAB_HASH_KEY'], ['fn', 'COLLAB_FN_SECRET']]) {
      if (prior[k] === undefined) delete process.env[env]; else process.env[env] = prior[k];
    }
  }

  return results;
}

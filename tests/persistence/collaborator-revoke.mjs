/**
 * tests/persistence/collaborator-revoke.mjs
 *
 * REMOVING A COLLABORATOR ENDS THEIR ACCESS.
 *
 * Item 1a of goals/2026-10-10-collaborators-safe-and-truthful.md. Before it,
 * CollaborateModal's delete touched only the Collaborator record, which no
 * server path reads: access is the latest CollaboratorGrant event, and nothing
 * wrote a revoke. A removed collaborator kept reading the wedding.
 *
 * ── THE ENDPOINTS ARE DRIVEN, NOT GREPPED ───────────────────────────────────
 *
 * api/collaborator-revoke.js and api/collaborator-data.js are imported and
 * called with a stubbed fetch over an in-memory CollaboratorGrant table, so
 * what is asserted is what a request DOES: grant, remove through the endpoint,
 * and the next collaborator-data request is a 403. No credential, no network.
 *
 * The plant the owner asked for: a collaboratorAuth that ignores revoke (the
 * `latest.event_type !== 'grant'` check dropped) turns check (ii) red. Proven
 * by hand on c/collaborator-revoke and recorded in the PR body.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function mockReqRes({ method = 'POST', query = {}, body = {}, token, ip } = {}) {
  const req = {
    method, query, body,
    headers: { 'x-forwarded-for': ip || '203.0.113.41', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  };
  const res = {
    _status: 200, _json: null,
    setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; },
  };
  return { req, res };
}

/** Key order is not part of the contract, so compare entries sorted. */
const sameShape = (x, y) => {
  const norm = (o) => JSON.stringify(Object.entries(o || {}).sort(([a], [b]) => a.localeCompare(b)));
  return norm(x) === norm(y);
};

const USERS = {
  'tok-owner': { id: 'owner-1', email: 'owner@example.com' },
  'tok-other-owner': { id: 'owner-2', email: 'other@example.com' },
  'tok-collab': { id: 'collab-1', email: 'friend@example.com' },
  'tok-collab-b': { id: 'collab-2', email: 'planner@example.com' },
};

/** In-memory Base44: User/me by token, CollaboratorGrant list and create, every other entity empty. */
function installFakeBase44() {
  const grants = [];
  const writes = [];
  let clock = Date.parse('2026-10-11T00:00:00Z');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method || 'GET';
    const bearer = (init.headers?.Authorization || '').replace(/^Bearer /, '');
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.pathname.endsWith('/entities/User/me')) {
      return USERS[bearer] ? json(200, USERS[bearer]) : json(401, { error: 'no' });
    }
    if (u.pathname.endsWith('/entities/CollaboratorGrant')) {
      if (method === 'POST') {
        const row = { ...JSON.parse(init.body), id: `g${grants.length + 1}`, created_date: new Date(clock += 1000).toISOString() };
        grants.push(row);
        writes.push({ bearer, row });
        return json(200, row);
      }
      const q = JSON.parse(u.searchParams.get('q') || '{}');
      return json(200, grants.filter(r => Object.entries(q).every(([k, v]) => r[k] === v)));
    }
    return json(200, []);
  };
  return { grants, writes, restore: () => { globalThis.fetch = realFetch; } };
}

export async function runCollaboratorRevoke() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const priorKey = process.env.BASE44_ADMIN_KEY;
  process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'test-admin-key-not-a-real-credential';
  // Collaborator hashes and invite links use COLLAB_HASH_KEY, never the admin key.
  const priorHashKey = process.env.COLLAB_HASH_KEY;
  process.env.COLLAB_HASH_KEY = '0123456789abcdef'.repeat(4);

  const { hashId, getCollaborationFor } = await import('../../api/_lib/collaboratorAuth.js');
  const revokeHandler = (await import('../../api/collaborator-revoke.js')).default;
  const dataHandler = (await import('../../api/collaborator-data.js')).default;

  const fake = installFakeBase44();
  try {
    const KEY = process.env.BASE44_ADMIN_KEY;
    const seedGrant = (ownerId, collabId, email, permissions, created_date) => {
      fake.grants.push({
        id: `seed${fake.grants.length + 1}`,
        owner_user_id_hash: hashId(ownerId),
        collaborator_user_id_hash: hashId(collabId),
        collaborator_email_hash: hashId(email),
        event_type: 'grant', permissions, created_date,
      });
    };
    const seedRevoke = (ownerId, collabId, email, created_date) => {
      fake.grants.push({
        id: `seed${fake.grants.length + 1}`,
        owner_user_id_hash: hashId(ownerId),
        collaborator_user_id_hash: hashId(collabId),
        collaborator_email_hash: hashId(email),
        event_type: 'revoke', created_date,
      });
    };
    const reset = () => { fake.grants.length = 0; fake.writes.length = 0; };
    const call = async (handler, opts) => { const { req, res } = mockReqRes(opts); await handler(req, res); return res; };
    const schedule = { Schedule: { view: true, edit: false } };

    // ── (i) LATEST EVENT WINS, ACROSS EVERY SEQUENCE ────────────────────────
    console.log('\n  Collaborator access follows the latest event:\n');
    reset();
    seedGrant('owner-1', 'collab-1', 'friend@example.com', schedule, '2026-10-01T00:00:00Z');
    ok('grant: access with the granted permissions',
       (await getCollaborationFor('collab-1', 'owner-1', KEY))?.permissions?.Schedule?.view === true, 'Schedule view');
    seedRevoke('owner-1', 'collab-1', 'friend@example.com', '2026-10-02T00:00:00Z');
    ok('grant, revoke: no access', (await getCollaborationFor('collab-1', 'owner-1', KEY)) === null, 'null');
    seedGrant('owner-1', 'collab-1', 'friend@example.com', schedule, '2026-10-03T00:00:00Z');
    ok('grant, revoke, grant: access again', !!(await getCollaborationFor('collab-1', 'owner-1', KEY)), 're-invited');
    seedGrant('owner-1', 'collab-1', 'friend@example.com', { Music: { view: true, edit: false } }, '2026-10-04T00:00:00Z');
    const updated = await getCollaborationFor('collab-1', 'owner-1', KEY);
    ok('a permission update replaces the permissions, not merges them',
       updated?.permissions?.Music?.view === true && !updated?.permissions?.Schedule, JSON.stringify(updated?.permissions));
    seedRevoke('owner-1', 'collab-1', 'friend@example.com', '2026-10-04T00:00:00Z');
    ok('a grant and a revoke with the same created_date resolve to the revoke',
       (await getCollaborationFor('collab-1', 'owner-1', KEY)) === null, 'tie, revoke after grant');
    reset();
    seedRevoke('owner-1', 'collab-1', 'friend@example.com', '2026-10-05T00:00:00Z');
    seedGrant('owner-1', 'collab-1', 'friend@example.com', schedule, '2026-10-05T00:00:00Z');
    ok('  and in the other row order too',
       (await getCollaborationFor('collab-1', 'owner-1', KEY)) === null, 'tie, grant after revoke');
    reset();
    seedGrant('owner-1', 'collab-1', 'friend@example.com', schedule, '2026-10-01T00:00:00Z');
    ok('a grant from one owner gives nothing on another owner\'s wedding',
       (await getCollaborationFor('collab-1', 'owner-2', KEY)) === null, 'owner-2');

    // ── (ii) GRANT, REMOVE, AND THE NEXT REQUEST IS A 403 ───────────────────
    console.log('\n  Removing a collaborator ends their access (the plant):\n');
    reset();
    seedGrant('owner-1', 'collab-1', 'friend@example.com', schedule, '2026-10-01T00:00:00Z');
    const dataReq = { method: 'GET', token: 'tok-collab', query: { ownerUserId: 'owner-1', page: 'Schedule' }, ip: '203.0.113.42' };
    const before = await call(dataHandler, dataReq);
    ok('before removal, collaborator-data serves the granted page', before._status === 200, `status ${before._status}`);

    const removed = await call(revokeHandler, { token: 'tok-owner', body: { action: 'revoke', email: ' Friend@Example.com ' } });
    ok('the owner\'s removal is accepted and writes one revoke',
       removed._status === 200 && removed._json?.written === 1 && fake.writes.length === 1, JSON.stringify(removed._json));
    const w = fake.writes[0];
    ok('  written with the owner\'s own token, not the admin key',
       w?.bearer === 'tok-owner', w?.bearer);
    ok('  keyed to the owner, the collaborator and the lowercased email',
       w?.row.event_type === 'revoke' && w?.row.owner_user_id_hash === hashId('owner-1')
       && w?.row.collaborator_user_id_hash === hashId('collab-1') && w?.row.collaborator_email_hash === hashId('friend@example.com'),
       'hashed ids');
    const after = await call(dataHandler, dataReq);
    ok('after removal, the next collaborator-data request is a 403', after._status === 403, `status ${after._status}`);

    // ── NOBODY ELSE CAN REMOVE, AND A BAD REQUEST WRITES NOTHING ────────────
    console.log('\n  Only the owner\'s own grants are touched:\n');
    reset();
    seedGrant('owner-1', 'collab-1', 'friend@example.com', schedule, '2026-10-01T00:00:00Z');
    const foreign = await call(revokeHandler, { token: 'tok-other-owner', body: { action: 'revoke', email: 'friend@example.com' } });
    ok('another owner removing the same email writes nothing',
       foreign._status === 200 && fake.writes.length === 0, JSON.stringify(foreign._json));
    ok('  and the collaborator keeps access to the first owner\'s wedding',
       !!(await getCollaborationFor('collab-1', 'owner-1', KEY)), 'still granted');
    const anon = await call(revokeHandler, { body: { action: 'revoke', email: 'friend@example.com' } });
    ok('an unauthenticated request is a 401 and writes nothing', anon._status === 401 && fake.writes.length === 0, `status ${anon._status}`);
    const noEmail = await call(revokeHandler, { token: 'tok-owner', body: { action: 'revoke' } });
    ok('a request with no email is a 400 and writes nothing', noEmail._status === 400 && fake.writes.length === 0, `status ${noEmail._status}`);
    const badAction = await call(revokeHandler, { token: 'tok-owner', body: { action: 'grant', email: 'friend@example.com' } });
    ok('an unknown action is a 400 and writes nothing', badAction._status === 400 && fake.writes.length === 0, `status ${badAction._status}`);
    const getReq = await call(revokeHandler, { method: 'GET', token: 'tok-owner' });
    ok('GET is a 405', getReq._status === 405, `status ${getReq._status}`);

    // ── PERMISSION EDITS ────────────────────────────────────────────────────
    console.log('\n  A permission edit changes what the server allows:\n');
    reset();
    seedGrant('owner-1', 'collab-1', 'friend@example.com', schedule, '2026-10-01T00:00:00Z');
    const edit = await call(revokeHandler, { token: 'tok-owner', body: {
      action: 'permissions', email: 'friend@example.com',
      permissions: { Music: { view: true }, Schedule: { view: false }, NotAPage: { view: true }, Seating: { edit: true, extra: 'x' } },
    } });
    const eRow = fake.writes[0]?.row;
    ok('an edit on an accepted collaborator writes one grant', edit._status === 200 && edit._json?.written === 1 && eRow?.event_type === 'grant', JSON.stringify(edit._json));
    ok('  carrying only known pages and only booleans, with edit implying view',
       sameShape(eRow?.permissions, { Music: { view: true, edit: false }, Schedule: { view: false, edit: false }, Seating: { view: true, edit: true } }),
       JSON.stringify(eRow?.permissions));
    const music = await call(dataHandler, { ...dataReq, query: { ownerUserId: 'owner-1', page: 'Music' }, ip: '203.0.113.43' });
    const sched = await call(dataHandler, { ...dataReq, ip: '203.0.113.43' });
    ok('  and the server now serves the new page and refuses the old one',
       music._status === 200 && sched._status === 403, `Music ${music._status}, Schedule ${sched._status}`);
    reset();
    const pending = await call(revokeHandler, { token: 'tok-owner', body: { action: 'permissions', email: 'new@example.com', permissions: schedule } });
    ok('an edit on a pending invite writes nothing and says pending, so the modal resends',
       pending._status === 200 && pending._json?.pending === true && fake.writes.length === 0, JSON.stringify(pending._json));

    // ── (iii) RECONCILE ─────────────────────────────────────────────────────
    console.log('\n  Opening the modal revokes collaborators removed before this goal:\n');
    reset();
    seedGrant('owner-1', 'collab-1', 'friend@example.com', schedule, '2026-10-01T00:00:00Z');
    seedGrant('owner-1', 'collab-2', 'planner@example.com', schedule, '2026-10-01T00:00:00Z');
    seedGrant('owner-1', 'collab-3', 'gone@example.com', schedule, '2026-10-01T00:00:00Z');
    seedRevoke('owner-1', 'collab-3', 'gone@example.com', '2026-10-02T00:00:00Z');
    seedGrant('owner-2', 'collab-9', 'theirs@example.com', schedule, '2026-10-01T00:00:00Z');
    const rec = await call(revokeHandler, { token: 'tok-owner', body: { action: 'reconcile', emails: ['FRIEND@example.com'] } });
    ok('reconcile revokes exactly the orphaned grant',
       rec._status === 200 && rec._json?.revoked === 1 && fake.writes.length === 1
       && fake.writes[0].row.collaborator_user_id_hash === hashId('collab-2') && fake.writes[0].row.event_type === 'revoke',
       JSON.stringify(rec._json));
    ok('  the orphan loses access', (await getCollaborationFor('collab-2', 'owner-1', KEY)) === null, 'planner revoked');
    ok('  a collaborator with a current record keeps access', !!(await getCollaborationFor('collab-1', 'owner-1', KEY)), 'friend kept');
    ok('  an already revoked grant gets no second revoke',
       !fake.writes.some(x => x.row.collaborator_user_id_hash === hashId('collab-3')), 'collab-3 untouched');
    ok('  another owner\'s grants are never touched', (await getCollaborationFor('collab-9', 'owner-2', KEY))?.permissions?.Schedule?.view === true, 'owner-2 kept');
    const again = await call(revokeHandler, { token: 'tok-owner', body: { action: 'reconcile', emails: ['friend@example.com'] } });
    ok('  and a second reconcile writes nothing', again._json?.revoked === 0 && fake.writes.length === 1, JSON.stringify(again._json));
    const notList = await call(revokeHandler, { token: 'tok-owner', body: { action: 'reconcile' } });
    ok('a reconcile with no email list is a 400, never "revoke everyone"', notList._status === 400 && fake.writes.length === 1, `status ${notList._status}`);
  } finally {
    fake.restore();
    if (priorKey === undefined) delete process.env.BASE44_ADMIN_KEY;
    else process.env.BASE44_ADMIN_KEY = priorKey;
    if (priorHashKey === undefined) delete process.env.COLLAB_HASH_KEY; else process.env.COLLAB_HASH_KEY = priorHashKey;
  }

  // ── THE MODAL REVOKES BEFORE IT DELETES ─────────────────────────────────
  console.log('\n  CollaborateModal goes through the endpoint first:\n');
  const modal = stripComments(read('src/components/layout/CollaborateModal.jsx'), { trailing: true });
  const removeFn = modal.slice(modal.indexOf('const handleRemove'), modal.indexOf('return (', modal.indexOf('const handleRemove')));
  ok('removal calls collaborator-revoke before deleting the record',
     removeFn.indexOf("action: 'revoke'") > -1 && removeFn.indexOf("action: 'revoke'") < removeFn.indexOf('Collaborator.delete'), 'revoke, then delete');
  ok('  and window.confirm is gone', !/window\.confirm/.test(modal), 'inline confirm');
  ok('  the inline confirm copy is as ruled',
     modal.includes('? They lose access straight away.') && />Remove</.test(modal) && />Keep</.test(modal), 'Remove / Keep');
  ok('  and a failure says so in the ruled words', modal.includes("'That did not save. Try again.'"), 'SAVE_FAILED');
  ok('a permission edit goes through the endpoint before updating the record',
     modal.indexOf("action: 'permissions'") > -1 && modal.indexOf("action: 'permissions'") < modal.indexOf('Collaborator.update('), 'permissions, then update');
  ok('reconcile runs only after a successful load', /if \(data\) \{\s*changeAccess\(\{ action: 'reconcile'/.test(modal), 'guarded by data');

  return results;
}

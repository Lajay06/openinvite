/**
 * tests/persistence/collaborator-schedule-write.mjs
 *
 * A COLLABORATOR WITH EDIT ON SCHEDULE CHANGES THE OWNER'S SCHEDULE, AND
 * NOTHING ELSE; A CREATE NEVER LEAVES A ROW THE OWNER CANNOT SEE.
 *
 * Item 7's first write PR, owner rulings 2026-10-12 and 2026-10-13. Four
 * parts, all driven over fakes, never a live call:
 *   1. base44/functions/collaboratorWrite, bundled with esbuild and run in
 *      Node: the conditions (grant with edit on the page from the token's own
 *      identity, the allowlist, the owner's rows only, counts not ids, both
 *      secrets and the header), and no create at all: the probe showed a
 *      hosted function cannot stamp a new row as the owner (owner ruling
 *      2026-10-13), so a collaborator changes and removes, never adds.
 *   2. api/collaborator-write.js over a stubbed Base44: fails closed when not
 *      configured, refuses without edit, forwards the collaborator's token.
 *   3. collaboratorWrite in collaboratorContext.jsx, executed.
 *   4. ScheduleHub, read statically: every write goes through it, and the
 *      page is read only unless the server said canEdit.
 *
 * The plants, proven by hand and recorded in the PR body: the function
 * accepting view as edit; the function accepting a create again; ScheduleHub
 * read only regardless of canEdit.
 */

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const KEY = '0123456789abcdef'.repeat(4);
const FN_SECRET = 'fn-secret-for-the-guard-only';
const hash = (raw) => crypto.createHmac('sha256', KEY).update(String(raw)).digest('hex');
const readJsonc = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/^\s*\/\/.*$/mg, ''));

async function loadFunction() {
  const esbuild = await import('esbuild');
  const out = await esbuild.build({
    entryPoints: [path.join(ROOT, 'base44/functions/collaboratorWrite/entry.ts')], bundle: true, write: false,
    platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{
      name: 'stub-sdk',
      setup(b) {
        b.onResolve({ filter: /^npm:@base44\/sdk/ }, () => ({ path: 'sdk', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export function createClientFromRequest() { throw new Error("not in the guard"); }', loader: 'js' }));
      },
    }],
  });
  const file = path.join(os.tmpdir(), `oi-collab-write-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(file, out.outputFiles[0].text);
  try { return await import(pathToFileURL(file).href); } finally { fs.rmSync(file, { force: true }); }
}

export async function runCollaboratorScheduleWrite() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  let fn;
  try { fn = await loadFunction(); } catch (err) {
    ok('the write function bundles and loads', false, err.message.split('\n')[0]);
    return results;
  }
  const { handle, EDIT_PAGES, NOT_CONFIGURED, ACTIONS } = fn;

  // ── the fake Base44 ──────────────────────────────────────────────────────
  let currentMe = null;
  let seq = 0;
  const store = {};
  const touched = new Set();
  const grants = [];
  const entityApi = (name) => {
    store[name] = store[name] || [];
    return {
      filter: async (q) => { touched.add(`${name}:read`); return name === 'CollaboratorGrant' ? grants : store[name].filter(r => Object.entries(q || {}).every(([k, v]) => r[k] === v)); },
      create: async (data) => {
        touched.add(`${name}:create`);
        const row = { ...data, id: `${name}-${++seq}`, created_date: new Date().toISOString() };
        store[name].push(row);
        return row;
      },
      update: async (id, data) => { touched.add(`${name}:update`); const r = store[name].find(x => x.id === id); Object.assign(r, data); return r; },
      delete: async (id) => { touched.add(`${name}:delete`); store[name] = store[name].filter(x => x.id !== id); return {}; },
    };
  };
  const client = (me) => ({
    auth: { me: async () => me },
    asServiceRole: { entities: new Proxy({}, { get: (_, name) => entityApi(name) }) },
  });
  const secrets = (over = {}) => (name) => ({ COLLAB_FN_SECRET: FN_SECRET, COLLAB_HASH_KEY: KEY, ...over })[name];
  const logs = [];
  const call = async (body, { me = { id: 'collab-1', role: 'user' }, header = FN_SECRET, sec = secrets() } = {}) => {
    currentMe = me;
    const req = new Request('https://fn.example/collaboratorWrite', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(header ? { 'X-Collab-Fn-Secret': header } : {}) }, body: JSON.stringify(body),
    });
    const res = await handle(req, { client: client(me), getSecret: sec, log: (l) => logs.push(l) });
    let json = null; try { json = await res.json(); } catch { /* none */ }
    return { status: res.status, json };
  };
  const grant = (permissions, created_date, event_type = 'grant') => grants.push({
    owner_user_id_hash: hash('owner-1'), collaborator_user_id_hash: hash('collab-1'), event_type, permissions, created_date,
  });
  const base = { ownerUserId: 'owner-1', page: 'Schedule' };

  // ── 1b. the conditions ───────────────────────────────────────────────────
  console.log('\n  Every write is checked, from the token\'s own identity:\n');
  store.Schedule = [{ id: 'own-row', created_by_id: 'owner-1', event_name: 'Ceremony', start_time: '15:00' }];
  const upd = { ...base, action: 'update', id: 'own-row', data: { start_time: '16:00' } };
  const noFn = await call(upd, { sec: secrets({ COLLAB_FN_SECRET: undefined }) });
  ok('no COLLAB_FN_SECRET: 503, "not configured" logged, nothing touched', noFn.status === 503 && logs.includes(NOT_CONFIGURED) && touched.size === 0, `status ${noFn.status}`);
  ok('no header, as a browser would call it: 401', (await call(upd, { header: null })).status === 401, 'header required');
  ok('a page not on the edit list: 400', (await call({ ownerUserId: 'owner-1', page: 'Budget', action: 'update', id: 'own-row', data: { item_name: 'x' } })).status === 400, 'Budget stays view only');
  ok('an action that is not update or delete: 400', (await call({ ...base, action: 'list', id: 'own-row' })).status === 400, 'two actions');
  ok('no grant: 403', (await call(upd)).status === 403, 'no grant');
  grant({ Schedule: { view: true } }, '2026-10-01T00:00:00Z');
  ok('a grant with view only: 403', (await call(upd)).status === 403, 'edit required');
  grant({ Schedule: { view: true, edit: true } }, '2026-10-02T00:00:00Z');
  grant(undefined, '2026-10-03T00:00:00Z', 'revoke');
  ok('a later revoke: 403', (await call(upd)).status === 403, 'latest wins');
  grant({ Schedule: { view: true, edit: true } }, '2026-10-04T00:00:00Z');
  ok('the owner calling as a collaborator: 403', (await call(upd, { me: { id: 'owner-1' } })).status === 403, 'not this path');
  ok('a stranger naming the owner: 403', (await call(upd, { me: { id: 'collab-9' } })).status === 403, 'identity is the token\'s');

  console.log('\n  No create and no delete, whoever asks (owner rulings 2026-10-13 and 2026-10-14):\n');
  ok('the one action is update', JSON.stringify(ACTIONS) === '["update"]', ACTIONS.join(','));
  touched.clear();
  const made = await call({ ...base, action: 'create', data: { event_name: 'New' } });
  ok('a create with edit granted: 403, and nothing is read or written', made.status === 403 && touched.size === 0 && store.Schedule.length === 1, `status ${made.status}, ${touched.size} touch(es)`);
  const noHeaderCreate = await call({ ...base, action: 'create', data: { event_name: 'New' } }, { header: null, me: { id: 'admin-1', role: 'admin' } });
  ok('  nor for an admin without the header: the probe is gone', noHeaderCreate.status === 403 && (await call({ action: 'probe' }, { header: null, me: { id: 'admin-1', role: 'admin' } })).status !== 200, 'no exception left');
  const row = store.Schedule[0];

  console.log('\n  Updates and deletes reach the owner\'s rows only:\n');
  store.Schedule.push({ id: 'other-row', created_by_id: 'owner-2', event_name: 'Not theirs' });
  ok('an update to another owner\'s row: 404, unchanged',
     (await call({ ...base, action: 'update', id: 'other-row', data: { event_name: 'x' } })).status === 404 && store.Schedule.find(r => r.id === 'other-row').event_name === 'Not theirs', 'refused');
  ok('  a delete of it: refused, still there', (await call({ ...base, action: 'delete', id: 'other-row' })).status === 403 && store.Schedule.some(r => r.id === 'other-row'), 'refused');
  touched.clear();
  const up = await call({ ...base, action: 'update', id: row.id, data: { start_time: '17:00', created_by_id: 'collab-1', secret_extra: 'x' } });
  ok('an update to the owner\'s row: 200, allowlisted fields only, the stamp kept',
     up.status === 200 && row.start_time === '17:00' && row.created_by_id === 'owner-1' && !('secret_extra' in row), JSON.stringify(row));
  ok('  touching only Schedule and the grant read', [...touched].every(t => /^(Schedule|CollaboratorGrant):/.test(t)), [...touched].join(','));
  touched.clear();
  const del = await call({ ...base, action: 'delete', id: row.id });
  ok('  a delete of the owner\'s own row: 403 before anything is read, still there',
     del.status === 403 && touched.size === 0 && store.Schedule.some(r => r.id === row.id), `status ${del.status}`);
  ok('the log has outcomes and no owner id, collaborator id, row id or hash',
     !/owner-1|owner-2|collab-1|Schedule-\d|other-row|[0-9a-f]{64}/.test(logs.join('\n')), `${logs.length} line(s)`);

  console.log('\n  In step with the files it cannot import:\n');
  const map = await import('../../src/lib/collaboratorPageMap.js');
  ok('EDIT_PAGES is exactly COLLABORATOR_EDIT_PAGES', JSON.stringify(Object.keys(EDIT_PAGES)) === JSON.stringify(map.COLLABORATOR_EDIT_PAGES), Object.keys(EDIT_PAGES).join(','));
  ok('  and Schedule\'s fields are its mirror\'s declared fields',
     JSON.stringify([...EDIT_PAGES.Schedule.fields].sort()) === JSON.stringify(Object.keys(readJsonc('base44/entities/Schedule.jsonc').properties).filter(f => f !== 'is_test').sort()), EDIT_PAGES.Schedule.fields.length + ' fields');

  // ── 2. the endpoint ──────────────────────────────────────────────────────
  console.log('\n  api/collaborator-write.js:\n');
  const prior = { admin: process.env.BASE44_ADMIN_KEY, hash: process.env.COLLAB_HASH_KEY, fn: process.env.COLLAB_FN_SECRET };
  process.env.BASE44_ADMIN_KEY = 'test-admin-key-not-a-real-credential';
  process.env.COLLAB_HASH_KEY = KEY;
  process.env.COLLAB_FN_SECRET = FN_SECRET;
  const { hashId } = await import('../../api/_lib/collaboratorAuth.js');
  const writeMod = await import('../../api/collaborator-write.js');
  const realFetch = globalThis.fetch;
  const realLog = console.log, realErr = console.error;
  const calls = [];
  const epLogs = [];
  let epGrants = [];
  let fnStatus = 200;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const bearer = String(init.headers?.Authorization || '').replace(/^Bearer /, '');
    calls.push({ path: u.pathname, bearer, headers: init.headers || {}, body: init.body });
    const j = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.pathname.endsWith('/entities/User/me')) return bearer === 'tok-friend' ? j(200, { id: 'collab-1' }) : j(401, {});
    if (u.pathname.endsWith('/entities/CollaboratorGrant')) return j(200, epGrants);
    if (u.pathname.endsWith('/functions/collaboratorWrite')) return j(fnStatus, fnStatus === 200 ? { ok: true } : { error: 'x' });
    return j(200, []);
  };
  let ip = 1;
  const post = async (body) => {
    const req = { method: 'POST', body, headers: { authorization: 'Bearer tok-friend', 'x-forwarded-for': `198.51.100.${ip++}` } };
    const res = { _status: 200, _json: null, setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; } };
    console.log = (...a) => epLogs.push(a.join(' ')); console.error = (...a) => epLogs.push(a.join(' '));
    try { await writeMod.default(req, res); } finally { console.log = realLog; console.error = realErr; }
    return res;
  };
  try {
    const body = { ownerUserId: 'owner-1', page: 'Schedule', action: 'update', id: 'row-1', data: { start_time: '16:00' } };
    delete process.env.COLLAB_FN_SECRET; calls.length = 0;
    const nc = await post(body);
    ok('not configured: 503, the ruled words, nothing past sign-in, logged',
       nc._status === 503 && nc._json?.error === writeMod.SAVE_FAILED && calls.every(c => c.path.endsWith('/User/me')) && epLogs.includes(writeMod.WRITES_NOT_CONFIGURED), `status ${nc._status}`);
    process.env.COLLAB_FN_SECRET = FN_SECRET;
    epGrants = [{ owner_user_id_hash: hashId('owner-1'), collaborator_user_id_hash: hashId('collab-1'), event_type: 'grant', permissions: { Schedule: { view: true } }, created_date: '2026-10-01T00:00:00Z' }];
    calls.length = 0;
    const vo = await post(body);
    ok('a view-only grant: 403, and the function is never called', vo._status === 403 && !calls.some(c => c.path.endsWith('/functions/collaboratorWrite')), `status ${vo._status}`);
    calls.length = 0;
    ok('a page not on the edit list: 400, no call', (await post({ ...body, page: 'Budget' }))._status === 400 && !calls.some(c => c.path.endsWith('/functions/collaboratorWrite')), 'Budget');
    epGrants[0].permissions = { Schedule: { view: true, edit: true } };
    calls.length = 0;
    ok('a create, even with edit: 400, and the function is never called',
       (await post({ ownerUserId: 'owner-1', page: 'Schedule', action: 'create', data: { event_name: 'x' } }))._status === 400 && !calls.some(c => c.path.endsWith('/functions/collaboratorWrite')), 'no create');
    calls.length = 0;
    const okRes = await post(body);
    const fnCall = calls.find(c => c.path.endsWith('/functions/collaboratorWrite'));
    ok('with edit: 200, one function call with the collaborator\'s token and the secret header',
       okRes._status === 200 && fnCall?.bearer === 'tok-friend' && fnCall?.headers['X-Collab-Fn-Secret'] === FN_SECRET, `status ${okRes._status}`);
    ok('  the body names the owner, page, action, row and data, nothing about who is asking',
       fnCall?.body === JSON.stringify({ ownerUserId: 'owner-1', page: 'Schedule', action: 'update', id: 'row-1', data: { start_time: '16:00' } }), fnCall?.body);
    fnStatus = 409; epLogs.length = 0;
    const failed = await post(body);
    ok('the function refusing: the ruled words, and a log with no id or token',
       failed._status >= 400 && failed._json?.error === 'That did not save. Try again.' && !/owner-1|collab-1|row-1|tok-friend/.test(epLogs.join('\n')), JSON.stringify(epLogs));
  } finally {
    globalThis.fetch = realFetch;
    for (const [k, env] of [['admin', 'BASE44_ADMIN_KEY'], ['hash', 'COLLAB_HASH_KEY'], ['fn', 'COLLAB_FN_SECRET']]) {
      if (prior[k] === undefined) delete process.env[env]; else process.env[env] = prior[k];
    }
  }

  // ── 3. the client helper, executed ───────────────────────────────────────
  console.log('\n  collaboratorWrite in the app:\n');
  const ctxSrc = fs.readFileSync(path.join(ROOT, 'src/lib/collaboratorContext.jsx'), 'utf8');
  const start = ctxSrc.indexOf('export async function collaboratorWrite(');
  const helper = new Function('fetch', 'localStorage', `${ctxSrc.slice(start, ctxSrc.indexOf('\n}\n', start) + 2).replace('export async function', 'async function')}\nreturn collaboratorWrite;`);
  let sent = null;
  const write = helper(async (url, init) => { sent = { url, init }; return { ok: true }; }, { getItem: () => 'tok-friend' });
  await write({ ownerUserId: 'owner-1', page: 'Schedule', action: 'delete', id: 'row-1' });
  ok('it posts to /api/collaborator-write with the signed-in token', sent?.url === '/api/collaborator-write' && sent.init.method === 'POST' && sent.init.headers.Authorization === 'Bearer tok-friend', sent?.url);
  const failing = helper(async () => ({ ok: false }), { getItem: () => 'tok' });
  let threw = false; try { await failing({ ownerUserId: 'o', page: 'Schedule', action: 'delete', id: 'x' }); } catch { threw = true; }
  ok('  and throws on a refusal, so the page\'s own "could not save" runs', threw, 'throws');

  // ── 4. ScheduleHub ───────────────────────────────────────────────────────
  console.log('\n  ScheduleHub:\n');
  const hub = stripComments(fs.readFileSync(path.join(ROOT, 'src/pages/ScheduleHub.jsx'), 'utf8'), { trailing: true });
  ok('read only unless the server said canEdit', /const readOnly = isCollaborating && !collabCanEdit;/.test(hub) && /setCollabCanEdit\(canEdit === true\);/.test(hub), 'canEdit');
  const writer = (hub.match(/const Schedule = isCollaborating\s*\?\s*\{([\s\S]*?)\}\s*:\s*ScheduleEntity;/) || [])[1] || '';
  ok('  in a collaborator session Schedule is the collaborator write path, update only',
     /update: \(id, data\) => collaboratorWrite\(/.test(writer) && !/delete|create/.test(writer)
     && /^const ScheduleEntity = base44\.entities\.Schedule;$/m.test(hub), 'no create');
  ok('  Add event is not offered in a collaborator session', /\{!readOnly && !isCollaborating && \(\s*<button onClick=\{handleAddEvent\}/.test(hub), 'hidden');
  ok('  nor Add a moment: RunSheet gets no onAdd, and shows its button only with one',
     /onAdd=\{isCollaborating \? undefined : \(ev\) => \{/.test(hub)
     && /actions=\{!readOnly && active && onAdd \? \(/.test(stripComments(fs.readFileSync(path.join(ROOT, 'src/components/schedule/RunSheet.jsx'), 'utf8'), { trailing: true })), 'hidden');
  ok('  and every write site goes through that Schedule; the one direct create is the couple\'s own approval',
     (hub.match(/ScheduleEntity\.(create|update|delete)\(/g) || []).length === 1
     && /createItem=\{async \(d\) => \(await ScheduleEntity\.create\(d\)\)\.id\}/.test(hub)
     && (hub.match(/\bSchedule\.(create|update|delete)\(/g) || []).length === 5, `${(hub.match(/\bSchedule\.(create|update|delete)\(/g) || []).length} site(s)`);
  ok('  no Delete for a collaborator in the list or the run sheet',
     /onDelete=\{readOnly \|\| isCollaborating \? undefined : \(e\) => handleDelete\(e\.sourceId\)\}/.test(hub)
     && /onDelete=\{isCollaborating \? undefined : \(r\) => handleDelete\(r\.id\)\}/.test(hub)
     && /\.\.\.\(onDelete \? \[\{ label: 'Delete', onClick: \(\) => onDelete\(r\), danger: true \}\] : \[\]\)/.test(stripComments(fs.readFileSync(path.join(ROOT, 'src/components/schedule/RunSheet.jsx'), 'utf8'), { trailing: true })), 'no remove');

  const runSheet = stripComments(fs.readFileSync(path.join(ROOT, 'src/components/schedule/RunSheet.jsx'), 'utf8'), { trailing: true });
  ok('in any collaborator session the run sheet\'s empty state is "Nothing on the schedule yet." with no button',
     /export const COLLABORATOR_EMPTY = 'Nothing on the schedule yet\.';/.test(runSheet)
     && /\{collaborating \? COLLABORATOR_EMPTY : <>/.test(runSheet) && /empty=\{collaborating \? COLLABORATOR_EMPTY : showingAll/.test(runSheet)
     && /collaborating=\{isCollaborating\}/.test(hub), 'view or edit');
  ok('  while the owner keeps the approved lines', runSheet.includes('No events yet. Add one from List and tag it as part of an event') && runSheet.includes('puts the first thing on it.'), 'unchanged');

  return results;
}

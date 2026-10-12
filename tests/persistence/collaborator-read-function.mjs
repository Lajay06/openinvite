/**
 * tests/persistence/collaborator-read-function.mjs
 *
 * THE HOSTED COLLABORATOR READ CHECKS THE GRANT ITSELF, AND SENDS ONLY THE
 * ALLOWLIST.
 *
 * Item 7 of goals/2026-10-10-collaborators-safe-and-truthful.md, PR 1.
 * base44/functions/collaboratorRead/entry.ts is a Deno function. It is bundled
 * here with esbuild (it ships with Vite) and its handle() is run in Node over a
 * fake Base44 client: the real grant check, the real hashing, the real
 * projection. Only the SDK import is stubbed, and handle() never touches it.
 *
 * Two halves:
 *   1. Driven: the owner's four conditions (grant checked per call from the
 *      token's own identity, allowlist only, counts not ids, secrets required)
 *      plus: it never writes.
 *   2. In step: PAGE_ENTITIES against src/lib/collaboratorPageMap.js and the
 *      RLS mirrors, ENTITY_FIELDS against the entity mirrors, latestEvent
 *      against collaboratorAuth.js. A Deno function cannot import those files,
 *      so drift is caught here instead.
 *
 * The plant: the function without its permission check turns the "no grant",
 * "revoked" and "wrong page" checks red. Proven by hand and recorded in the
 * PR body.
 */

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const ENTRY = path.join(ROOT, 'base44/functions/collaboratorRead/entry.ts');
const KEY = '0123456789abcdef'.repeat(4);
const FN_SECRET = 'fn-secret-for-the-guard-only';

async function loadFunction() {
  const esbuild = await import('esbuild');
  const out = await esbuild.build({
    entryPoints: [ENTRY], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{
      name: 'stub-sdk',
      setup(b) {
        b.onResolve({ filter: /^npm:@base44\/sdk/ }, () => ({ path: 'sdk', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export function createClientFromRequest() { throw new Error("not in the guard"); }', loader: 'js' }));
      },
    }],
  });
  const file = path.join(os.tmpdir(), `oi-collab-read-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(file, out.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(file, { force: true });
  }
}

const readJsonc = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/^\s*\/\/.*$/mg, ''));
const hash = (raw) => crypto.createHmac('sha256', KEY).update(String(raw)).digest('hex');

export async function runCollaboratorReadFunction() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  let fn;
  try {
    fn = await loadFunction();
  } catch (err) {
    ok('the function bundles and loads', false, err.message.split('\n')[0]);
    return results;
  }
  const { handle, PAGE_ENTITIES, ENTITY_FIELDS, SYSTEM_FIELDS, NOT_CONFIGURED, latestEvent } = fn;

  // ── the fake Base44 ──────────────────────────────────────────────────────
  const grants = [];
  const writes = [];
  const reads = [];
  const rows = {
    Budget: [
      { id: 'b1', created_by_id: 'owner-1', created_by: 'owner@example.com', item_name: 'Venue', budgeted_amount: 100, secret_extra: 'x' },
      { id: 'b2', created_by_id: 'owner-1', item_name: 'Test row', is_test: true },
      { id: 'b3', created_by_id: 'owner-2', item_name: 'Someone else' },
    ],
    Schedule: [{ id: 's1', created_by_id: 'owner-1', event_name: 'Ceremony' }],
  };
  const entityApi = (name) => ({
    // Returns every row whatever the query, so the function's own owner
    // re-check is what is tested, not the fake's filter.
    filter: async (q) => { reads.push(name); return name === 'CollaboratorGrant' ? grants : (rows[name] || []); },
    create: async () => { writes.push(name); return {}; },
    update: async () => { writes.push(name); return {}; },
    delete: async () => { writes.push(name); return {}; },
  });
  const client = (meId) => ({
    auth: { me: async () => (meId ? { id: meId } : null) },
    asServiceRole: { entities: new Proxy({}, { get: (_, name) => entityApi(name) }) },
  });
  const secrets = (over = {}) => (name) => ({ COLLAB_FN_SECRET: FN_SECRET, COLLAB_HASH_KEY: KEY, ...over })[name];
  const logs = [];
  const call = async ({ meId = 'collab-1', body = { ownerUserId: 'owner-1', page: 'Budget' }, header = FN_SECRET, method = 'POST', sec = secrets() } = {}) => {
    const req = new Request('https://fn.example/collaboratorRead', {
      method, headers: { 'Content-Type': 'application/json', ...(header ? { 'X-Collab-Fn-Secret': header } : {}) },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    });
    const res = await handle(req, { client: client(meId), getSecret: sec, log: (l) => logs.push(l) });
    let json = null;
    try { json = await res.json(); } catch { /* none */ }
    return { status: res.status, json };
  };
  const grant = (collabId, permissions, created_date, event_type = 'grant') => grants.push({
    owner_user_id_hash: hash('owner-1'), collaborator_user_id_hash: hash(collabId), event_type, permissions, created_date,
  });

  // ── 1. driven ────────────────────────────────────────────────────────────
  console.log('\n  Nothing is read without both secrets and the caller\'s header:\n');
  const before = reads.length;
  const noFn = await call({ sec: secrets({ COLLAB_FN_SECRET: undefined }) });
  ok('no COLLAB_FN_SECRET: 503, and "not configured" is logged', noFn.status === 503 && logs.includes(NOT_CONFIGURED), `status ${noFn.status}`);
  const noKey = await call({ sec: secrets({ COLLAB_HASH_KEY: undefined }) });
  ok('  no COLLAB_HASH_KEY: 503', noKey.status === 503, `status ${noKey.status}`);
  const shortKey = await call({ sec: secrets({ COLLAB_HASH_KEY: 'abc' }) });
  ok('  a COLLAB_HASH_KEY that is not 64 hex characters: 503', shortKey.status === 503, `status ${shortKey.status}`);
  const noHeader = await call({ header: null });
  ok('no X-Collab-Fn-Secret, as a browser would call it: 401', noHeader.status === 401, `status ${noHeader.status}`);
  const badHeader = await call({ header: 'wrong' });
  ok('  a wrong one: 401', badHeader.status === 401, `status ${badHeader.status}`);
  ok('  and none of those read anything', reads.length === before, `${reads.length - before} read(s)`);
  ok('GET: 405', (await call({ method: 'GET' })).status === 405, 'POST only');
  ok('a page that is not a permission key: 400', (await call({ body: { ownerUserId: 'owner-1', page: 'Guests' } })).status === 400, 'Guests is open, not here');
  ok('  and an inherited name is not a page either', (await call({ body: { ownerUserId: 'owner-1', page: 'constructor' } })).status === 400, 'own keys only');

  console.log('\n  The grant is checked on every call, from the token\'s own identity:\n');
  ok('no identity behind the token: 401', (await call({ meId: null })).status === 401, 'auth.me() null');
  ok('no grant: 403', (await call()).status === 403, 'nothing for this pair');
  grant('collab-1', { Budget: { view: true } }, '2026-10-01T00:00:00Z');
  const granted = await call();
  ok('a grant with view on the page: 200', granted.status === 200, `status ${granted.status}`);
  ok('  a stranger naming the same owner: 403', (await call({ meId: 'collab-9' })).status === 403, 'identity is the token\'s');
  ok('  a body naming the granted collaborator changes nothing', (await call({ meId: 'collab-9', body: { ownerUserId: 'owner-1', page: 'Budget', collaboratorUserId: 'collab-1' } })).status === 403, 'body ignored');
  ok('  the owner calling as a collaborator: 403', (await call({ meId: 'owner-1' })).status === 403, 'not this path');
  ok('a grant without this page: 403', (await call({ body: { ownerUserId: 'owner-1', page: 'Vendors' } })).status === 403, 'Vendors not granted');
  grant('collab-1', undefined, '2026-10-02T00:00:00Z', 'revoke');
  ok('a later revoke: 403', (await call()).status === 403, 'latest event wins');
  grant('collab-1', { Budget: { view: true } }, '2026-10-02T00:00:00Z');
  ok('  a grant tied with the revoke: still 403', (await call()).status === 403, 'a tie goes to the revoke');
  grant('collab-1', { Budget: { view: true } }, '2026-10-03T00:00:00Z');

  console.log('\n  Only the owner\'s rows, only the allowlist:\n');
  const r = await call();
  const budget = r.json?.data?.Budget || [];
  ok('only the owner\'s rows, test rows out', JSON.stringify(budget.map(x => x.id)) === '["b1"]', budget.map(x => x.id).join(','));
  const allowed = new Set([...SYSTEM_FIELDS, ...ENTITY_FIELDS.Budget]);
  ok('  every field returned is on the allowlist', budget.every(row => Object.keys(row).every(k => allowed.has(k))), Object.keys(budget[0] || {}).join(','));
  ok('  created_by, created_by_id and an undeclared field never leave it',
     budget.every(row => !('created_by' in row) && !('created_by_id' in row) && !('secret_extra' in row)), 'stripped');
  ok('  and only the page\'s own entities come back', JSON.stringify(Object.keys(r.json?.data || {})) === '["Budget"]', Object.keys(r.json?.data || {}).join(','));

  console.log('\n  Counts, never ids, and never a write:\n');
  const joined = logs.join('\n');
  ok('the log carries counts', /"counts":\{"Budget":1\}/.test(joined), 'Budget: 1');
  ok('  and no owner id, collaborator id, row id or hash', !/owner-1|collab-1|collab-9|"b1"|[0-9a-f]{64}/.test(joined), `${logs.length} line(s)`);
  ok('no create, update or delete was ever called', writes.length === 0, `${writes.length} write(s)`);

  // ── 2. in step ───────────────────────────────────────────────────────────
  console.log('\n  In step with the files it cannot import:\n');
  const { COLLABORATOR_PAGE_MAP } = await import('../../src/lib/collaboratorPageMap.js');
  const ownerScoped = (e) => {
    try { return JSON.stringify(readJsonc(`base44/entities/${e}.jsonc`).rls?.read) === '{"created_by_id":"{{user.id}}"}'; } catch { return false; }
  };
  const expected = {};
  for (const [key, def] of Object.entries(COLLABORATOR_PAGE_MAP)) {
    const scoped = (def.entities || []).filter(ownerScoped);
    if (scoped.length) expected[key] = scoped;
  }
  ok('PAGE_ENTITIES is exactly the page map\'s owner-scoped entities',
     JSON.stringify(PAGE_ENTITIES) === JSON.stringify(expected), JSON.stringify(expected));
  const drift = Object.entries(ENTITY_FIELDS).filter(([e, fields]) =>
    JSON.stringify([...fields].sort()) !== JSON.stringify(Object.keys(readJsonc(`base44/entities/${e}.jsonc`).properties).filter(f => f !== 'is_test').sort()));
  ok('ENTITY_FIELDS matches every entity mirror\'s declared fields', drift.length === 0, drift.map(([e]) => e).join(', ') || `${Object.keys(ENTITY_FIELDS).length} entities`);
  const { latestEvent: vercelLatest } = await import('../../api/_lib/collaboratorAuth.js');
  const seq = [
    { event_type: 'grant', created_date: '2026-01-01T00:00:00Z' },
    { event_type: 'revoke', created_date: '2026-01-02T00:00:00Z' },
    { event_type: 'grant', created_date: '2026-01-02T00:00:00Z' },
  ];
  ok('latestEvent agrees with collaboratorAuth.js, ties included',
     latestEvent(seq).event_type === vercelLatest(seq).event_type && latestEvent(seq.slice(0, 1)).event_type === 'grant', latestEvent(seq).event_type);

  return results;
}

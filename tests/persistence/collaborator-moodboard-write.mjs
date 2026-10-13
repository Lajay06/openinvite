/**
 * tests/persistence/collaborator-moodboard-write.mjs
 *
 * A COLLABORATOR WITH EDIT ON MOODBOARD CHANGES AND REMOVES THE OWNER'S
 * ITEMS, AND NEVER ADDS ONE.
 *
 * Item 7's second write PR, under the rule the Schedule probe set (owner
 * ruling 2026-10-13): a hosted function cannot stamp a new row as the owner,
 * so a collaborator changes and removes, never adds.
 *
 * DRIVEN: base44/functions/collaboratorWrite on the Moodboard page, bundled
 * and run over a fake Base44, never a live call. STATIC, comments stripped:
 * Moodboard.jsx and MoodboardGrid.jsx in a collaborator session.
 *
 * The plants, proven by hand and recorded in the PR body: Moodboard's toolbar
 * shown in a collaborator session; Moodboard read only regardless of canEdit.
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
const read = (p) => stripComments(fs.readFileSync(path.join(ROOT, p), 'utf8'), { trailing: true });

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
  const file = path.join(os.tmpdir(), `oi-collab-moodboard-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(file, out.outputFiles[0].text);
  try { return await import(pathToFileURL(file).href); } finally { fs.rmSync(file, { force: true }); }
}

export async function runCollaboratorMoodboardWrite() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  let fn;
  try { fn = await loadFunction(); } catch (err) {
    ok('the write function bundles and loads', false, err.message.split('\n')[0]);
    return results;
  }
  const { handle, EDIT_PAGES } = fn;

  const store = { MoodboardItem: [
    { id: 'mine', created_by_id: 'owner-1', title: 'Peonies', category: 'flowers' },
    { id: 'theirs', created_by_id: 'owner-2', title: 'Not theirs' },
  ] };
  const touched = new Set();
  const grants = [];
  const entityApi = (name) => {
    store[name] = store[name] || [];
    return {
      filter: async (q) => { touched.add(`${name}:read`); return name === 'CollaboratorGrant' ? grants : store[name].filter(r => Object.entries(q || {}).every(([k, v]) => r[k] === v)); },
      create: async () => { touched.add(`${name}:create`); return {}; },
      update: async (id, data) => { touched.add(`${name}:update`); Object.assign(store[name].find(x => x.id === id), data); return {}; },
      delete: async (id) => { touched.add(`${name}:delete`); store[name] = store[name].filter(x => x.id !== id); return {}; },
    };
  };
  const client = (me) => ({ auth: { me: async () => me }, asServiceRole: { entities: new Proxy({}, { get: (_, name) => entityApi(name) }) } });
  const secrets = (name) => ({ COLLAB_FN_SECRET: FN_SECRET, COLLAB_HASH_KEY: KEY })[name];
  const logs = [];
  const call = async (body, me = { id: 'collab-1' }) => {
    const req = new Request('https://fn.example/collaboratorWrite', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Collab-Fn-Secret': FN_SECRET }, body: JSON.stringify(body),
    });
    const res = await handle(req, { client: client(me), getSecret: secrets, log: (l) => logs.push(l) });
    return res.status;
  };
  const grant = (permissions, created_date) => grants.push({
    owner_user_id_hash: hash('owner-1'), collaborator_user_id_hash: hash('collab-1'), event_type: 'grant', permissions, created_date,
  });
  const base = { ownerUserId: 'owner-1', page: 'Moodboard' };

  console.log('\n  The function on Moodboard: change and remove the owner\'s items, never add:\n');
  ok('Moodboard writes MoodboardItem, its declared fields and no others',
     EDIT_PAGES.Moodboard?.entity === 'MoodboardItem'
     && JSON.stringify([...EDIT_PAGES.Moodboard.fields].sort()) === JSON.stringify(Object.keys(readJsonc('base44/entities/MoodboardItem.jsonc').properties).filter(f => f !== 'is_test').sort()),
     (EDIT_PAGES.Moodboard?.fields || []).length + ' fields');
  ok('no grant: 403', (await call({ ...base, action: 'update', id: 'mine', data: { title: 'x' } })) === 403, 'no grant');
  grant({ Moodboard: { view: true } }, '2026-10-01T00:00:00Z');
  ok('view only: 403', (await call({ ...base, action: 'update', id: 'mine', data: { title: 'x' } })) === 403, 'edit required');
  grant({ Moodboard: { view: true, edit: true }, Schedule: { view: true } }, '2026-10-02T00:00:00Z');
  touched.clear();
  ok('a create with edit granted: 403, nothing read or written',
     (await call({ ...base, action: 'create', data: { title: 'New' } })) === 403 && touched.size === 0, `${touched.size} touch(es)`);
  ok('edit on Moodboard does not reach Schedule', (await call({ ownerUserId: 'owner-1', page: 'Schedule', action: 'update', id: 'mine', data: { event_name: 'x' } })) === 403, 'per page');
  ok('another owner\'s item: 404, unchanged',
     (await call({ ...base, action: 'update', id: 'theirs', data: { title: 'x' } })) === 404 && store.MoodboardItem.find(r => r.id === 'theirs').title === 'Not theirs', 'refused');
  touched.clear();
  const mine = store.MoodboardItem.find(r => r.id === 'mine');
  ok('an update to the owner\'s item: 200, allowlisted fields only, the stamp kept',
     (await call({ ...base, action: 'update', id: 'mine', data: { title: 'Garden roses', created_by_id: 'collab-1', secret_extra: 'x' } })) === 200
     && mine.title === 'Garden roses' && mine.created_by_id === 'owner-1' && !('secret_extra' in mine), JSON.stringify(mine));
  ok('  touching only MoodboardItem and the grant read', [...touched].every(t => /^(MoodboardItem|CollaboratorGrant):/.test(t)), [...touched].join(','));
  ok('a delete of the owner\'s item: 200, gone', (await call({ ...base, action: 'delete', id: 'mine' })) === 200 && !store.MoodboardItem.some(r => r.id === 'mine'), 'deleted');
  ok('the log has no owner id, collaborator id, item id or hash', !/owner-1|owner-2|collab-1|"mine"|theirs|[0-9a-f]{64}/.test(logs.join('\n')), `${logs.length} line(s)`);

  console.log('\n  Moodboard in a collaborator session:\n');
  const page = read('src/pages/Moodboard.jsx');
  const writer = (page.match(/const MoodboardItem = isCollaborating\s*\?\s*\{([\s\S]*?)\}\s*:\s*MoodboardItemEntity;/) || [])[1] || '';
  ok('the writer is update and delete through collaboratorWrite, no create',
     /update: \(id, data\) => collaboratorWrite\(\{ ownerUserId: collab\.ownerUserId, page: 'Moodboard', action: 'update', id, data \}\)/.test(writer)
     && /delete: \(id\) => collaboratorWrite\(/.test(writer) && !/create/.test(writer)
     && /^const MoodboardItemEntity = base44\.entities\.MoodboardItem;$/m.test(page), 'change and remove');
  ok('  read only unless the server said canEdit', /const readOnly = isCollaborating && !collabCanEdit;/.test(page) && /setCollabCanEdit\(canEdit === true\);/.test(page), 'canEdit');
  ok('  no Upload, Add inspiration or Export in a session', /\{!readOnly && !isCollaborating && \(\s*<div className="flex flex-wrap items-center gap-\[10px\]">/.test(page), 'toolbar hidden');
  ok('  no drop to upload', /if \(!readOnly && !isCollaborating && !uploading && e\.dataTransfer\.files\.length\)/.test(page), 'drop refused');
  ok('  no new board', /onCreateBoard=\{handleCreateBoard\} readOnly=\{readOnly \|\| isCollaborating\}/.test(page), 'board create hidden');
  ok('  and the cards keep Edit and Delete when edit is granted', /onDeleteItem=\{readOnly \? undefined : handleDeleteItem\} onUpdateItem=\{readOnly \? undefined : handleUpdateItem\}/.test(page), 'change and remove');
  const grid = read('src/components/moodboard/MoodboardGrid.jsx');
  ok('the empty state in a session is "Nothing on the moodboard yet." and asks for nothing',
     /export const COLLABORATOR_EMPTY = 'Nothing on the moodboard yet\.';/.test(grid) && /if \(items\.length === 0 && collaborating\) \{/.test(grid)
     && /<MoodboardGrid collaborating=\{isCollaborating\}/.test(page), 'collaborator empty state');
  ok('  while the owner keeps the approved lines', grid.includes('Your moodboard is empty') && grid.includes('Start adding inspiration images to bring your wedding vision to life'), 'unchanged');

  return results;
}

/**
 * tests/persistence/collaborator-suggestions.mjs
 *
 * A COLLABORATOR SUGGESTS; ONLY THE COUPLE DECIDES, AND ONLY THE COUPLE'S OWN
 * ITEM COUNTS AS APPROVED.
 *
 * Owner ruling 2026-10-14, suggest and approve: api/collaborator-suggestions.js
 * over CollaboratorSuggestion (create null, read null, update and delete by the
 * creator). Create is open, so the rows are trusted by who wrote them:
 *   - a decision counts only when the couple wrote it; a collaborator's approve
 *     changes nothing, and a collaborator's decline does not hide anything;
 *   - an approve counts only when its item exists and is the couple's;
 *   - a suggest row counts only when its writer is the collaborator it names,
 *     and, for the couple, while that collaborator may still suggest.
 *
 * DRIVEN over a fake Base44 that keeps the entity's rules: anyone creates, the
 * creator alone updates and deletes, and created_by_id is the token's user.
 * The real handler, the real hashing, the real AES-256-GCM.
 *
 * The plants, proven by hand and recorded in the PR body: counting a decision
 * whoever wrote it; counting an approve whose item is missing.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const KEY = '0123456789abcdef'.repeat(4);
const USERS = {
  'tok-owner': { id: 'owner-1', email: 'couple@example.com', full_name: 'Alex Smith' },
  'tok-collab': { id: 'collab-1', email: 'ada@example.com', full_name: 'Ada Lovelace' },
  'tok-other': { id: 'collab-2', email: 'grace@example.com', full_name: 'Grace Hopper' },
  'tok-stranger': { id: 'stranger-9', email: 'x@example.com', full_name: 'Mallory' },
};

export async function runCollaboratorSuggestions() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const prior = { admin: process.env.BASE44_ADMIN_KEY, hash: process.env.COLLAB_HASH_KEY, enc: process.env.APP_ENC_KEY, fn: process.env.COLLAB_FN_SECRET };
  process.env.BASE44_ADMIN_KEY = 'test-admin-key-not-a-real-credential';
  process.env.COLLAB_HASH_KEY = KEY;
  process.env.APP_ENC_KEY = 'guard-only-enc-key';
  process.env.COLLAB_FN_SECRET = 'fn-secret-for-the-guard-only';

  const { hashId } = await import('../../api/_lib/collaboratorAuth.js');
  const mod = await import('../../api/collaborator-suggestions.js');

  // ── the fake Base44 ──────────────────────────────────────────────────────
  let seq = 0;
  const rows = [];
  const grants = [];
  const items = { MoodboardItem: [], Schedule: [] };
  const realFetch = globalThis.fetch;
  const realLog = console.log, realErr = console.error;
  const logs = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const m = init.method || 'GET';
    const bearer = String(init.headers?.Authorization || '').replace(/^Bearer /, '');
    const me = USERS[bearer];
    const j = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.pathname.endsWith('/entities/User/me')) return me ? j(200, me) : j(401, {});
    if (u.pathname.endsWith('/entities/CollaboratorGrant')) return j(200, grants);
    if (u.pathname.endsWith('/functions/collaboratorRead')) {
      const { page } = JSON.parse(init.body);
      return j(200, { data: { [page === 'Schedule' ? 'Schedule' : 'MoodboardItem']: items[page === 'Schedule' ? 'Schedule' : 'MoodboardItem'] } });
    }
    const sm = u.pathname.match(/\/entities\/CollaboratorSuggestion(?:\/([^/]+))?$/);
    if (sm) {
      const id = sm[1];
      if (m === 'GET') {
        const q = JSON.parse(u.searchParams.get('q') || '{}');
        return j(200, rows.filter(r => Object.entries(q).every(([k, v]) => r[k] === v)));
      }
      if (!me) return j(401, {});
      if (m === 'POST') { const r = { ...JSON.parse(init.body), id: `s${++seq}`, created_by_id: me.id, created_date: new Date(Date.now() + seq).toISOString() }; rows.push(r); return j(200, r); }
      const r = rows.find(x => x.id === id);
      if (!r) return j(404, {});
      if (r.created_by_id !== me.id) return j(403, {});
      if (m === 'PUT') { Object.assign(r, JSON.parse(init.body)); return j(200, r); }
      if (m === 'DELETE') { rows.splice(rows.indexOf(r), 1); return j(200, {}); }
    }
    const em = u.pathname.match(/\/entities\/(MoodboardItem|Schedule)$/);
    if (em && m === 'GET') {
      const q = JSON.parse(u.searchParams.get('q') || '{}');
      return j(200, items[em[1]].filter(r => r.created_by_id === me?.id && Object.entries(q).every(([k, v]) => r[k] === v)));
    }
    return j(200, []);
  };
  let ip = 1;
  const call = async (token, method, args) => {
    const req = { method, headers: { authorization: `Bearer ${token}`, 'x-forwarded-for': `198.51.100.${ip++ % 250}` }, ...(method === 'GET' ? { query: args } : { body: args }) };
    const res = { _status: 200, _json: null, setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; } };
    console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' '));
    try { await mod.default(req, res); } finally { console.log = realLog; console.error = realErr; }
    return res;
  };
  const grant = (collabId, permissions, created_date, event_type = 'grant') => grants.push({
    owner_user_id_hash: hashId('owner-1'), collaborator_user_id_hash: hashId(collabId), event_type, permissions, created_date,
  });
  const collabList = async (page = 'Moodboard') => (await call('tok-collab', 'GET', { ownerUserId: 'owner-1', page }))._json?.suggestions || [];
  const coupleList = async (page = 'Moodboard') => (await call('tok-owner', 'GET', { page }))._json?.suggestions || [];
  const suggest = (token, title, page = 'Moodboard') => call(token, 'POST', { action: 'suggest', ownerUserId: 'owner-1', page, data: page === 'Moodboard' ? { title, image_url: 'https://img.example/x.jpg', category: 'flowers', secret_extra: 'x' } : { event_name: title, start_time: '15:00' } });

  try {
    // ── not configured ─────────────────────────────────────────────────────
    console.log('\n  Not configured, as on Preview:\n');
    delete process.env.APP_ENC_KEY;
    const ncGet = await call('tok-collab', 'GET', { ownerUserId: 'owner-1', page: 'Moodboard' });
    const ncPost = await suggest('tok-collab', 'Peonies');
    ok('a read is calm and empty, a write is the ruled words', ncGet._status === 200 && JSON.stringify(ncGet._json) === '{"suggestions":[]}' && ncPost._status === 503 && ncPost._json?.error === mod.SAVE_FAILED, `${ncGet._status}, ${ncPost._status}`);
    ok('  and nothing was written', rows.length === 0, `${rows.length} row(s)`);
    process.env.APP_ENC_KEY = 'guard-only-enc-key';

    // ── who may suggest ────────────────────────────────────────────────────
    console.log('\n  Who may suggest:\n');
    ok('a page that takes no suggestions: 400', (await call('tok-collab', 'POST', { action: 'suggest', ownerUserId: 'owner-1', page: 'Budget', data: { item_name: 'x' } }))._status === 400, 'Budget');
    ok('no grant: 403', (await suggest('tok-collab', 'Peonies'))._status === 403, 'refused');
    grant('collab-1', { Moodboard: { view: true } }, '2026-10-01T00:00:00Z');
    ok('a view-only grant: 403', (await suggest('tok-collab', 'Peonies'))._status === 403 && rows.length === 0, 'view only cannot suggest');
    grant('collab-1', { Moodboard: { view: true, edit: true }, Schedule: { view: true, edit: true } }, '2026-10-02T00:00:00Z');
    const sent = await suggest('tok-collab', 'Peonies');
    const s1 = rows[0];
    ok('with the grant to suggest: 200, one suggest row written with the collaborator\'s own token', sent._status === 200 && rows.length === 1 && s1.event_type === 'suggest' && s1.created_by_id === 'collab-1', `status ${sent._status}`);
    ok('  ids hashed under COLLAB_HASH_KEY, the item and the name sealed', s1.owner_user_id_hash === hashId('owner-1') && s1.collaborator_user_id_hash === hashId('collab-1')
       && !/Peonies|Ada|img\.example/.test(JSON.stringify(s1)) && /^v1\./.test(s1.payload_enc), 'sealed');
    const mine = await collabList();
    ok('the collaborator sees it, waiting, with only the page\'s fields', mine.length === 1 && mine[0].status === 'pending' && mine[0].data.title === 'Peonies' && !('secret_extra' in mine[0].data) && mine[0].from === 'Ada', JSON.stringify(mine[0]));
    let theirs = await coupleList();
    ok('the couple sees it, from Ada, waiting', theirs.length === 1 && theirs[0].from === 'Ada' && theirs[0].data.title === 'Peonies', `${theirs.length} pending`);

    // ── decisions only count from the couple ───────────────────────────────
    console.log('\n  Only the couple decides:\n');
    await call('tok-collab', 'GET', {});
    const forge = (token, event_type, extra = {}) => globalThis.fetch(`https://base44.app/api/apps/x/entities/CollaboratorSuggestion`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ owner_user_id_hash: hashId('owner-1'), collaborator_user_id_hash: hashId('collab-1'), page: 'Moodboard', event_type, suggestion_id: s1.id, ...extra }),
    });
    items.MoodboardItem.push({ id: 'item-by-collab', created_by_id: 'collab-1', title: 'Peonies' });
    await forge('tok-collab', 'approve', { payload_enc: mod.sealPayload({ itemId: 'item-by-collab' }, { owner_user_id_hash: hashId('owner-1'), collaborator_user_id_hash: hashId('collab-1'), page: 'Moodboard' }) });
    ok('a collaborator-written approve changes nothing: still waiting for both', (await collabList())[0].status === 'pending' && (await coupleList()).length === 1, 'pending');
    await forge('tok-collab', 'decline');
    ok('a collaborator-written decline does not hide it from the couple', (await coupleList()).length === 1 && (await collabList())[0].status === 'pending', 'still shown');
    await forge('tok-stranger', 'decline');
    ok('  nor does a stranger\'s', (await coupleList()).length === 1, 'still shown');
    const before = rows.length;
    const asOwnSpace = await call('tok-collab', 'POST', { action: 'decide', page: 'Moodboard', suggestionId: s1.id, decision: 'approve', itemId: 'item-by-collab' });
    const naming = await call('tok-collab', 'POST', { action: 'decide', ownerUserId: 'owner-1', page: 'Moodboard', suggestionId: s1.id, decision: 'approve', itemId: 'item-by-collab' });
    ok('the collaborator cannot decide through the endpoint either', asOwnSpace._status === 404 && naming._status === 400 && rows.length === before, `${asOwnSpace._status}, ${naming._status}`);

    // ── a forged suggestion ────────────────────────────────────────────────
    await globalThis.fetch('https://base44.app/api/apps/x/entities/CollaboratorSuggestion', {
      method: 'POST', headers: { Authorization: 'Bearer tok-stranger' },
      body: JSON.stringify({ owner_user_id_hash: hashId('owner-1'), collaborator_user_id_hash: hashId('collab-1'), page: 'Moodboard', event_type: 'suggest', payload_enc: 'v1.x.y.z' }),
    });
    ok('a suggest row written by someone else in the collaborator\'s name is not shown', (await coupleList()).length === 1 && (await collabList()).length === 1, 'genuine only');

    // ── approve: only the couple's own item counts ─────────────────────────
    console.log('\n  Approved means the couple\'s own item exists:\n');
    ok('approve without an item: refused', (await call('tok-owner', 'POST', { action: 'decide', page: 'Moodboard', suggestionId: s1.id, decision: 'approve' }))._status === 409, '409');
    ok('approve naming the collaborator\'s item: refused', (await call('tok-owner', 'POST', { action: 'decide', page: 'Moodboard', suggestionId: s1.id, decision: 'approve', itemId: 'item-by-collab' }))._status === 409, '409');
    items.MoodboardItem.push({ id: 'item-1', created_by_id: 'owner-1', title: 'Peonies' });
    const appr = await call('tok-owner', 'POST', { action: 'decide', page: 'Moodboard', suggestionId: s1.id, decision: 'approve', itemId: 'item-1' });
    const apprRow = rows.find(r => r.event_type === 'approve' && r.created_by_id === 'owner-1');
    ok('approve after the couple created it: 200, written with the couple\'s token', appr._status === 200 && !!apprRow && mod.openPayload(apprRow)?.itemId === 'item-1', `status ${appr._status}`);
    ok('  it leaves the couple\'s list and reads Added for the collaborator', (await coupleList()).length === 0 && (await collabList())[0].status === 'approved', 'approved');
    items.MoodboardItem = items.MoodboardItem.filter(r => r.id !== 'item-1');
    ok('  and if the item is gone, it is not approved any more', (await collabList())[0].status === 'pending', 'item checked on every read');
    items.MoodboardItem.push({ id: 'item-1', created_by_id: 'owner-1', title: 'Peonies' });

    // ── edit, withdraw, decline ────────────────────────────────────────────
    console.log('\n  Their own suggestions, while waiting:\n');
    await suggest('tok-collab', 'Candles');
    const s2 = rows.filter(r => r.event_type === 'suggest' && r.created_by_id === 'collab-1').pop();
    ok('an edit to their own waiting suggestion: 200, resealed', (await call('tok-collab', 'POST', { action: 'edit', ownerUserId: 'owner-1', page: 'Moodboard', suggestionId: s2.id, data: { title: 'Tall candles', image_url: 'https://img.example/y.jpg' } }))._status === 200
       && (await collabList()).find(x => x.id === s2.id)?.data.title === 'Tall candles', 'edited');
    ok('  an edit to an approved one: 404', (await call('tok-collab', 'POST', { action: 'edit', ownerUserId: 'owner-1', page: 'Moodboard', suggestionId: s1.id, data: { title: 'x', image_url: 'y' } }))._status === 404, 'settled');
    grant('collab-2', { Moodboard: { view: true, edit: true } }, '2026-10-02T00:00:00Z');
    ok('  another collaborator cannot withdraw it', (await call('tok-other', 'POST', { action: 'withdraw', ownerUserId: 'owner-1', page: 'Moodboard', suggestionId: s2.id }))._status === 404 && rows.some(r => r.id === s2.id), 'not theirs');
    const dec = await call('tok-owner', 'POST', { action: 'decide', page: 'Moodboard', suggestionId: s2.id, decision: 'decline' });
    ok('the couple declines it: 200, gone from their list, Not added for the collaborator',
       dec._status === 200 && !(await coupleList()).some(x => x.id === s2.id) && (await collabList()).find(x => x.id === s2.id)?.status === 'declined', 'declined');
    ok('  and a declined one cannot be withdrawn', (await call('tok-collab', 'POST', { action: 'withdraw', ownerUserId: 'owner-1', page: 'Moodboard', suggestionId: s2.id }))._status === 404, 'settled');
    await suggest('tok-collab', 'Lanterns');
    const s3 = rows.filter(r => r.event_type === 'suggest' && r.created_by_id === 'collab-1').pop();
    ok('withdrawing their own waiting suggestion deletes it', (await call('tok-collab', 'POST', { action: 'withdraw', ownerUserId: 'owner-1', page: 'Moodboard', suggestionId: s3.id }))._status === 200 && !rows.some(r => r.id === s3.id), 'withdrawn');

    // ── revoke ─────────────────────────────────────────────────────────────
    await suggest('tok-collab', 'Ribbons');
    grant('collab-1', undefined, '2026-10-05T00:00:00Z', 'revoke');
    ok('after a revoke, the couple no longer sees that collaborator\'s suggestions', !(await coupleList()).some(x => x.data.title === 'Ribbons'), 'hidden');
    ok('  and the collaborator cannot suggest', (await suggest('tok-collab', 'More'))._status === 403, '403');
    grant('collab-1', { Moodboard: { view: true, edit: true }, Schedule: { view: true, edit: true } }, '2026-10-06T00:00:00Z');

    // ── Schedule ───────────────────────────────────────────────────────────
    console.log('\n  The same on Schedule:\n');
    await suggest('tok-collab', 'First dance', 'Schedule');
    const ss = rows.filter(r => r.page === 'Schedule' && r.event_type === 'suggest').pop();
    items.Schedule.push({ id: 'sched-1', created_by_id: 'owner-1', event_name: 'First dance' });
    ok('a Schedule suggestion approved with the couple\'s own event',
       (await call('tok-owner', 'POST', { action: 'decide', page: 'Schedule', suggestionId: ss.id, decision: 'approve', itemId: 'sched-1' }))._status === 200
       && (await collabList('Schedule')).find(x => x.id === ss.id)?.status === 'approved', 'approved');

    ok('no log line carries an id, a hash, a name or a title', !/owner-1|collab-1|collab-2|stranger|[0-9a-f]{64}|Ada|Peonies|item-1|s\d+"/.test(logs.join('\n')), `${logs.length} line(s)`);

    // ── the pages ──────────────────────────────────────────────────────────
    console.log('\n  The pages:\n');
    const mood = stripComments(fs.readFileSync(path.join(ROOT, 'src/pages/Moodboard.jsx'), 'utf8'), { trailing: true });
    const hub = stripComments(fs.readFileSync(path.join(ROOT, 'src/pages/ScheduleHub.jsx'), 'utf8'), { trailing: true });
    const data = stripComments(fs.readFileSync(path.join(ROOT, 'api/collaborator-data.js'), 'utf8'), { trailing: true });
    ok('collaborator-data.js says whether they may suggest', /canSuggest: hasPagePermission\(collaboration\.permissions, page, 'suggest'\)/.test(data), 'canSuggest');
    for (const [name, src, label] of [['Moodboard', mood, 'Suggest an item'], ['ScheduleHub', hub, 'Suggest an event']]) {
      ok(`${name}: the suggest button only for a collaborator who may suggest`, new RegExp(`isCollaborating && collabCanSuggest && \\(\\s*<button[\\s\\S]{0,400}${label}`).test(src), label);
      ok(`  the couple's panel only outside a collaborator session, approving with their own create`, /\{!isCollaborating && \(\s*(<div[^>]*>\s*)?<SuggestionsPanel/.test(src) && /createItem=\{async \(d\) => \(await (MoodboardItem|ScheduleEntity)\.create\(/.test(src), 'couple');
    }
  } finally {
    globalThis.fetch = realFetch;
    console.log = realLog; console.error = realErr;
    for (const [k, env] of [['admin', 'BASE44_ADMIN_KEY'], ['hash', 'COLLAB_HASH_KEY'], ['enc', 'APP_ENC_KEY'], ['fn', 'COLLAB_FN_SECRET']]) {
      if (prior[k] === undefined) delete process.env[env]; else process.env[env] = prior[k];
    }
  }

  return results;
}

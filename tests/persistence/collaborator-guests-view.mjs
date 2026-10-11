/**
 * tests/persistence/collaborator-guests-view.mjs
 *
 * A COLLABORATOR CAN VIEW THE GUEST LIST, AND ONLY VIEW IT.
 *
 * Item 6 of goals/2026-10-10-collaborators-safe-and-truthful.md. The endpoint
 * returned 503 to everything. It now serves GET to a collaborator with view on
 * Guests, shaped exactly like the owner's own read (api/my-guests.js) minus
 * every derived field, and refuses PUT and DELETE with the ruled copy.
 *
 * DRIVEN over a stubbed Base44: the real handler, the real grant check, the
 * real mergeGuestPii. The encrypted row is built with the same guestPii module
 * instance the handler decrypts with, so it is a genuine blob whatever key the
 * run holds.
 *
 * The plant: the handler without its derived-field strip turns the "no token,
 * no blob" checks red. Proven by hand and recorded in the PR body.
 */

import { pass, fail } from './_shared.mjs';

const USERS = {
  'tok-friend': { id: 'collab-1', email: 'friend@example.com' },
  'tok-stranger': { id: 'collab-9', email: 'stranger@example.com' },
};

export async function runCollaboratorGuestsView() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const priorKey = process.env.BASE44_ADMIN_KEY;
  process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'test-admin-key-not-a-real-credential';
  const { hashId } = await import('../../api/_lib/collaboratorAuth.js');
  const { buildGuestPiiBlob } = await import('../../api/_lib/guestPii.js');
  const { TOKEN_FIELDS } = await import('../../api/_lib/rsvpTokenCrypto.js');
  const mod = await import('../../api/collaborator-guests.js');
  const handler = mod.default;

  const grants = [];
  const writes = [];
  const tokenCols = {
    rsvp_link_id: 'plain-token', rsvp_link_id_enc: 'enc-token', rsvp_link_id_hash: 'hash-token',
    plus_one_rsvp_link_id: 'p1', plus_one_rsvp_link_id_enc: 'p1enc', plus_one_rsvp_link_id_hash: 'p1hash',
  };
  const guests = [
    { id: 'g1', created_by_id: 'owner-1', name: 'Plain Name', email: 'plain@example.com', rsvp_status: 'yes', ...tokenCols },
    { id: 'g2', created_by_id: 'owner-1', name: 'stale plaintext', email: null, rsvp_status: 'pending',
      encrypted_guest_pii: buildGuestPiiBlob({ name: 'Blob Name', email: 'blob@example.com' }) },
    { id: 'g3', created_by_id: 'owner-1', name: 'Test Row', is_test: true },
    { id: 'g4', created_by_id: 'owner-2', name: 'Someone Else' },
  ];

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method || 'GET';
    const bearer = String(init.headers?.Authorization || '').replace(/^Bearer /, '');
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.hostname !== 'base44.app') throw new Error(`unexpected network call to ${u.hostname}`);
    if (method !== 'GET') { writes.push({ method, path: u.pathname }); return json(200, {}); }
    if (u.pathname.endsWith('/entities/User/me')) return USERS[bearer] ? json(200, USERS[bearer]) : json(401, {});
    if (u.pathname.endsWith('/entities/CollaboratorGrant')) {
      const q = JSON.parse(u.searchParams.get('q') || '{}');
      return json(200, grants.filter(r => Object.entries(q).every(([k, v]) => r[k] === v)));
    }
    // Returns every guest regardless of the query, so the handler's own
    // ownership re-check is what is tested, not the stub's filter.
    if (u.pathname.endsWith('/entities/Guest')) return json(200, guests);
    if (u.pathname.endsWith('/entities/WeddingDetails')) return json(200, [{ id: 'w1', created_by_id: 'owner-1', created_date: '2026-01-01T00:00:00Z', partner1Name: 'Alex', partner2Name: 'Sam' }]);
    return json(200, []);
  };

  const grant = (collabId, permissions, created_date, event_type = 'grant') => grants.push({
    owner_user_id_hash: hashId('owner-1'), collaborator_user_id_hash: hashId(collabId),
    collaborator_email_hash: hashId('friend@example.com'), event_type, permissions, created_date,
  });
  let ipn = 100;
  const call = async (method, token, query = { ownerUserId: 'owner-1' }, body = {}) => {
    const req = { method, query, body, headers: { 'x-forwarded-for': `203.0.113.${ipn++}`, ...(token ? { authorization: `Bearer ${token}` } : {}) } };
    const res = { _status: 200, _json: null, setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; } };
    await handler(req, res);
    return res;
  };

  try {
    console.log('\n  A collaborator with view on Guests reads the owner\'s list:\n');
    grant('collab-1', { Guests: { view: true, edit: true } }, '2026-10-01T00:00:00Z');
    const r = await call('GET', 'tok-friend');
    const list = r._json?.guests || [];
    ok('GET with a valid grant is a 200', r._status === 200, `status ${r._status}`);
    ok('  it returns only that owner\'s guests, test rows excluded',
       JSON.stringify(list.map(g => g.id).sort()) === JSON.stringify(['g1', 'g2']), list.map(g => g.id).join(','));
    ok('  no row carries any RSVP token field',
       list.every(g => TOKEN_FIELDS.every(f => !(f in g))), TOKEN_FIELDS.length + ' fields checked');
    ok('  no row carries the encrypted PII blob', list.every(g => !('encrypted_guest_pii' in g)), 'blob stripped');
    ok('  has_rsvp_token is kept, as the owner\'s read keeps it',
       list.find(g => g.id === 'g1')?.has_rsvp_token === true && list.find(g => g.id === 'g2')?.has_rsvp_token === false, 'true / false');
    const g2 = list.find(g => g.id === 'g2');
    ok('  PII is resolved from the blob exactly as the owner\'s read does',
       g2?.name === 'Blob Name' && g2?.email === 'blob@example.com', `${g2?.name}, ${g2?.email}`);
    ok('  and canEdit is false even with edit granted', r._json?.canEdit === false, String(r._json?.canEdit));

    console.log('\n  Everyone else gets nothing:\n');
    const anon = await call('GET', null);
    ok('no token: 401', anon._status === 401, `status ${anon._status}`);
    const stranger = await call('GET', 'tok-stranger');
    ok('no grant: 403', stranger._status === 403 && !stranger._json?.guests, `status ${stranger._status}`);
    grants.length = 0;
    grant('collab-1', { Schedule: { view: true } }, '2026-10-01T00:00:00Z');
    const noGuests = await call('GET', 'tok-friend');
    ok('a grant without Guests: 403', noGuests._status === 403 && !noGuests._json?.guests, `status ${noGuests._status}`);
    grants.length = 0;
    grant('collab-1', { Guests: { view: true } }, '2026-10-01T00:00:00Z');
    grant('collab-1', undefined, '2026-10-02T00:00:00Z', 'revoke');
    const revoked = await call('GET', 'tok-friend');
    ok('a revoked grant: 403', revoked._status === 403 && !revoked._json?.guests, `status ${revoked._status}`);

    console.log('\n  Nobody changes the list through here:\n');
    grants.length = 0;
    grant('collab-1', { Guests: { view: true, edit: true } }, '2026-10-01T00:00:00Z');
    const put = await call('PUT', 'tok-friend', {}, { ownerUserId: 'owner-1', guestId: 'g1', updates: { name: 'x' } });
    ok('PUT is a 403 with the ruled words, even with edit granted',
       put._status === 403 && put._json?.error === 'Collaborators can view the guest list but not change it.', `status ${put._status}`);
    const del = await call('DELETE', 'tok-friend', { ownerUserId: 'owner-1', guestId: 'g1' });
    ok('DELETE is a 403 with the same words', del._status === 403 && del._json?.error === mod.READ_ONLY_MESSAGE, `status ${del._status}`);
    ok('  and no write ever reached Base44', writes.length === 0, `${writes.length} write(s)`);
  } finally {
    globalThis.fetch = realFetch;
    if (priorKey === undefined) delete process.env.BASE44_ADMIN_KEY; else process.env.BASE44_ADMIN_KEY = priorKey;
  }

  return results;
}

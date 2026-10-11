/**
 * tests/persistence/collaborator-invite-live.mjs
 *
 * COLLABORATORINVITE ROUND-TRIPS ON THE LIVE ENTITY, AND LEAVES NOTHING BEHIND.
 *
 * The stubbed guard (collaborator-invite-resend.mjs) proves what the endpoints
 * do with the rows. What only a live run can prove is that the entity keeps
 * what they write: a field Base44 does not declare is dropped with a 200, and
 * the read that decides a link would then see nothing. So this writes one row
 * with the harness account's own token, reads it back field by field, marks it
 * superseded as its creator, and deletes it.
 *
 * TEST ROWS. The entity's is_test description names scripts/test-persistence.mjs
 * as the only writer of test rows: every row created here sets is_test true,
 * and every one is deleted in the finally, whatever happened above it.
 * Product reads exclude is_test, so a cleanup that fails can still never
 * decide a real link.
 *
 * Live credential: listed in LIVE_CREDENTIAL_GUARDS. Lane terminals never run
 * it; the owner does, through npm run test:persistence.
 */

import { APP_ID, api, pass, fail, cleanupEntity } from './_shared.mjs';

export async function runCollaboratorInviteLive(token) {
  const results = [];
  console.log('\n  CollaboratorInvite, live round trip (is_test rows, cleaned up):\n');

  const created = [];
  try {
    const hex = (c) => c.repeat(64);
    const body = {
      wedding_id_hash: hex('a'),
      owner_user_id_hash: hex('b'),
      collaborator_email_hash: hex('c'),
      invite_token_hash: hex('d'),
      status: 'sent',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      resend_count: 2,
      is_test: true,
    };
    const row = await api('POST', `/apps/${APP_ID}/entities/CollaboratorInvite`, body, token);
    if (row?.id) created.push(row.id);

    const back = await api('GET', `/apps/${APP_ID}/entities/CollaboratorInvite/${row.id}`, undefined, token);
    for (const field of Object.keys(body)) {
      const want = field === 'expires_at' ? new Date(body[field]).getTime() : body[field];
      const got = field === 'expires_at' ? new Date(back?.[field]).getTime() : back?.[field];
      results.push(got === want
        ? pass(`CollaboratorInvite.${field} persists`, String(back?.[field]).slice(0, 24))
        : fail(`CollaboratorInvite.${field} persists`, body[field], back?.[field]));
    }

    const q = encodeURIComponent(JSON.stringify({ owner_user_id_hash: hex('b'), collaborator_email_hash: hex('c') }));
    const listed = await api('GET', `/apps/${APP_ID}/entities/CollaboratorInvite?q=${q}`, undefined, token);
    const rows = Array.isArray(listed) ? listed : (listed?.data || listed?.results || []);
    results.push(rows.some(r => r.id === row.id)
      ? pass('the pair query finds the row', `${rows.length} row(s)`)
      : fail('the pair query finds the row', row.id, rows.map(r => r.id)));

    await api('PUT', `/apps/${APP_ID}/entities/CollaboratorInvite/${row.id}`, { status: 'superseded' }, token);
    const after = await api('GET', `/apps/${APP_ID}/entities/CollaboratorInvite/${row.id}`, undefined, token);
    results.push(after?.status === 'superseded'
      ? pass('its creator can mark it superseded', after.status)
      : fail('its creator can mark it superseded', 'superseded', after?.status));
  } catch (err) {
    console.log(`  ❌ FAIL  CollaboratorInvite live round trip, error: ${err.message}`);
    results.push(false);
  } finally {
    for (const id of created) await cleanupEntity(token, 'CollaboratorInvite', id);
  }

  return results;
}

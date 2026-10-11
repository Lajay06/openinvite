/**
 * tests/persistence/collaborator-invite-live.mjs
 *
 * COLLABORATORINVITE ROUND-TRIPS ON THE LIVE ENTITY, AND LEAVES NOTHING BEHIND.
 *
 * The stubbed guard (collaborator-invite-resend.mjs) proves what the endpoints
 * do with the rows. What only a live run can prove is that the entity keeps
 * what they write: a field Base44 does not declare is dropped with a 200, and
 * the read that decides a link would then see nothing. So this writes one row,
 * reads it back field by field, marks it superseded as its creator, and
 * deletes it.
 *
 * ── FOUR FACTS, OWNER RULING 2026-10-11 ─────────────────────────────────────
 *
 * 1. It runs only when the owner runs it. Enforced here as: it refuses when CI
 *    or GITHUB_ACTIONS is set, and refuses unless the process was started by
 *    scripts/test-persistence.mjs. It is listed in LIVE_CREDENTIAL_GUARDS, so
 *    CI never imports it, and lane terminals never run it. A script cannot
 *    prove which human is at the keyboard; what it can prove is these two
 *    checks plus fact 2, whose password lives only in the owner's .env.local.
 * 2. Only with the smoke account's token. Before any write it reads User/me
 *    with the token it was given and refuses unless the email is exactly
 *    la.jay06+smoke01@gmail.com.
 * 3. Every row it writes carries is_test true. The body is checked before the
 *    write, and the created row is checked after it: a row that comes back
 *    without is_test true is deleted at once and the run fails.
 * 4. Cleanup deletes only rows whose ids it created in this run, never by
 *    query. The ids are collected from each create response and deleted one
 *    by one in a finally, whatever happened above.
 *
 * If any of 1 to 3 cannot be confirmed, it writes nothing, fails, and says
 * which one. Product reads exclude is_test, so even a cleanup that fails can
 * never decide a real link.
 */

import { APP_ID, api, pass, fail, cleanupEntity } from './_shared.mjs';

const SMOKE_EMAIL = 'la.jay06+smoke01@gmail.com';

export async function runCollaboratorInviteLive(token) {
  const results = [];
  console.log('\n  CollaboratorInvite, live round trip (is_test rows, cleaned up):\n');

  const refuse = (why) => {
    console.log(`  ❌ REFUSING  collaborator-invite-live: ${why}. Nothing was written.`);
    results.push(false);
    return results;
  };
  // Fact 1: not CI, and started by the owner's runner.
  if (process.env.CI || process.env.GITHUB_ACTIONS) return refuse('CI is set; this guard runs only when the owner runs it');
  if (!/scripts[\\/]test-persistence\.mjs$/.test(process.argv[1] || '')) {
    return refuse('not started by scripts/test-persistence.mjs');
  }
  // Fact 2: the token is the smoke account's, read from the token itself.
  let me = null;
  try { me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token); } catch { /* refused below */ }
  if (String(me?.email || '').toLowerCase() !== SMOKE_EMAIL) {
    return refuse('the token is not the smoke account (la.jay06+smoke01)');
  }

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
    // Fact 3, before the write.
    if (body.is_test !== true) throw new Error('refusing to write a row without is_test true');
    const row = await api('POST', `/apps/${APP_ID}/entities/CollaboratorInvite`, body, token);
    if (row?.id) created.push(row.id);
    // Fact 3, after the write: the finally deletes it by id either way.
    if (row?.is_test !== true) throw new Error('the created row did not come back with is_test true');

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
    // Fact 4: by id, only the ids this run created. Never a query.
    for (const id of created) await cleanupEntity(token, 'CollaboratorInvite', id);
  }

  return results;
}

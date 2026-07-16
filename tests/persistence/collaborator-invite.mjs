/**
 * tests/persistence/collaborator-invite.mjs
 *
 * Covers feat/manage-collaborators-invite. Schema fields, the on-brand
 * invite email, AND the real permission-enforcement mechanism
 * (CollaboratorGrant) are exercised here via the actual handler functions
 * (mirrors plus-one-identity.mjs's convention — direct import + mock
 * req/res, the same code path a real request hits).
 *
 * Collaborator's own RLS stays owner-scoped/untouched (confirmed
 * empirically, again, that the admin key can neither read nor write it) —
 * enforcement instead goes through CollaboratorGrant, a small append-only
 * entity (create:null/read:null, same shape as RsvpResponse/PollVote)
 * storing HMAC-hashed id pairs. See api/_lib/collaboratorAuth.js and
 * api/_lib/collaboratorInviteToken.js for the full design rationale.
 *
 * Only ONE real test account exists in this harness (BASE44_TEST_EMAIL),
 * so the "collaborator" role below is played by that SAME account
 * accepting its own invite (self-collaboration) — same one-account
 * convention already used in ownership.mjs. This still exercises every
 * real code path (signing, verification, the actual CollaboratorGrant
 * write/read, the actual permission check) with a genuine bearer token
 * throughout; it just can't prove two distinct humans, only the mechanism.
 */

import { APP_ID, api, pass, fail, cleanupEntity } from './_shared.mjs';
import { renderCollaboratorInviteEmail } from '../../src/lib/collaboratorEmailTemplate.js';
import { signInvite, verifyInvite } from '../../api/_lib/collaboratorInviteToken.js';
import collaboratorAcceptHandler from '../../api/collaborator-accept.js';
import collaboratorGuestsHandler from '../../api/collaborator-guests.js';
import collaboratorBudgetHandler from '../../api/collaborator-budget.js';

function mockReqRes({ method = 'GET', query = {}, body = {}, token } = {}) {
  const req = {
    method, query, body,
    headers: { 'x-forwarded-for': '203.0.113.9', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  };
  const res = {
    _status: 200, _json: null,
    setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; },
  };
  return { req, res };
}

export async function runCollaboratorInvite(token) {
  const results = [];

  console.log('\n  Collaborator invite — schema round-trip (owner\'s own token, the only path that works today):\n');

  let collaboratorId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/Collaborator`, {
      name: '__PERSISTENCE_TEST_COLLABORATOR__',
      email: 'collaborator-sentinel@example.com',
      permissions: { Guests: { view: true, edit: false } },
      status: 'pending',
      invite_token: `test-collab-token-${Date.now()}`,
    }, token);
    collaboratorId = created.id;

    results.push(created.status === 'pending' && !!created.invite_token
      ? pass('Collaborator.status/invite_token persist on create (owner\'s own token)', `status=${created.status}`)
      : fail('Collaborator.status/invite_token persist on create', 'pending + a token', `${created.status}/${created.invite_token}`));

    const back = await api('GET', `/apps/${APP_ID}/entities/Collaborator/${collaboratorId}`, undefined, token);
    results.push(back.permissions?.Guests?.view === true && back.permissions?.Guests?.edit === false
      ? pass('Collaborator.permissions round-trips correctly', JSON.stringify(back.permissions))
      : fail('Collaborator.permissions round-trips correctly', '{Guests:{view:true,edit:false}}', JSON.stringify(back.permissions)));
  } catch (err) {
    console.log(`  ❌ FAIL  collaborator schema round-trip — error: ${err.message}`);
    results.push(false, false);
  } finally {
    if (collaboratorId) await cleanupEntity(token, 'Collaborator', collaboratorId);
  }

  // ── Email template — pure render, on-brand ──────────────────────────────
  console.log('\n  Collaborator invite email — on-brand render:\n');
  {
    const { subject, html } = renderCollaboratorInviteEmail({
      collaboratorName: 'Jamie Test', coupleNames: 'Alex & Sam',
      acceptUrl: 'https://openinvite.com.au/collaborate/accept/abc123',
      permissions: { Guests: { view: true, edit: true }, Budget: { view: true, edit: false } },
    });
    results.push(subject.includes("Alex & Sam")
      ? pass('Subject includes the couple\'s names', subject)
      : fail('Subject includes the couple\'s names', 'contains "Alex & Sam"', subject));
    results.push(html.includes('#E03553')
      ? pass('Email HTML uses the brand accent colour', '#E03553 present')
      : fail('Email HTML uses the brand accent colour', '#E03553 present', 'not found'));
    results.push(html.includes('Plus Jakarta Sans')
      ? pass('Email HTML declares Plus Jakarta Sans (with safe fallback)', 'found')
      : fail('Email HTML declares Plus Jakarta Sans', 'found', 'not found'));
    results.push(!/[A-Z]{4,}/.test(html.replace(/<[^>]+>/g, '').replace(/DOCTYPE|UTF-8/g, ''))
      ? pass('Email copy has no ALL CAPS text (sentence case, per DESIGN_SPEC)', 'none found')
      : fail('Email copy has no ALL CAPS text', 'none found', 'found'));
    results.push(html.includes('abc123') && html.includes('Accept invitation')
      ? pass('Email includes the accept link and a single clear CTA', 'found')
      : fail('Email includes the accept link and CTA', 'found', 'not found'));
  }

  // ── Signed invite token — tamper detection (pure function) ──────────────
  console.log('\n  Collaborator invite token — signature verification:\n');
  {
    const payload = { ownerUserId: 'owner-123', email: 'jamie@example.com', name: 'Jamie', permissions: { Guests: { view: true } }, iat: Date.now() };
    const goodToken = signInvite(payload);
    const decoded = verifyInvite(goodToken);
    results.push(decoded?.email === payload.email && decoded?.ownerUserId === payload.ownerUserId
      ? pass('A correctly-signed invite verifies and round-trips its payload', JSON.stringify(decoded))
      : fail('A correctly-signed invite verifies and round-trips its payload', JSON.stringify(payload), JSON.stringify(decoded)));

    const tampered = goodToken.slice(0, -4) + 'XXXX';
    results.push(verifyInvite(tampered) === null
      ? pass('A tampered signature is rejected (verifyInvite returns null)', 'null')
      : fail('A tampered signature is rejected', 'null', JSON.stringify(verifyInvite(tampered))));

    results.push(verifyInvite('not-a-real-token') === null
      ? pass('A malformed token is rejected', 'null')
      : fail('A malformed token is rejected', 'null', JSON.stringify(verifyInvite('not-a-real-token'))));
  }

  // ── CollaboratorGrant — real handlers, real bearer token throughout ─────
  // Self-collaboration (see file header) — this account is both the
  // "owner" (genuinely owns the test Guest/Budget rows below) and the
  // "collaborator" accepting its own invite. Every call below is the real
  // collaborator-accept.js/collaborator-guests.js/collaborator-budget.js
  // handler, invoked exactly as a real request would.
  console.log('\n  CollaboratorGrant — real accept/enforce handlers, one account playing both roles:\n');
  {
    let testGuestId = null;
    let testBudgetId = null;
    let grantId = null;
    try {
      const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
      const myId = me.id;
      const myEmail = me.email;

      const guest = await api('POST', `/apps/${APP_ID}/entities/Guest`, { name: '__PERSISTENCE_TEST_COLLAB_GUEST__', is_test: true }, token);
      testGuestId = guest.id;
      const budgetLine = await api('POST', `/apps/${APP_ID}/entities/Budget`, { category: 'venue', item_name: '__PERSISTENCE_TEST_COLLAB_BUDGET__', budgeted_amount: 500, is_test: true }, token);
      testBudgetId = budgetLine.id;

      const permissions = { Guests: { view: true, edit: false } };
      const signedToken = signInvite({ ownerUserId: myId, email: myEmail, name: 'Persistence Test Collaborator', permissions, iat: Date.now() });

      // Accept — real handler, real bearer token.
      const { req: acceptReq, res: acceptRes } = mockReqRes({ method: 'POST', body: { token: signedToken }, token });
      await collaboratorAcceptHandler(acceptReq, acceptRes);
      results.push(acceptRes._status === 200 && acceptRes._json?.ownerUserId === myId
        ? pass('collaborator-accept.js creates a real CollaboratorGrant via the invitee\'s own token', `200 ${JSON.stringify(acceptRes._json)}`)
        : fail('collaborator-accept.js creates a real CollaboratorGrant', '200 {ok:true}', `${acceptRes._status} ${JSON.stringify(acceptRes._json)}`));

      // Happy path — view guests through the real endpoint.
      // collaborator-guests.js deliberately filters out is_test rows (the
      // same anti-leak convention every other endpoint follows), so our
      // is_test:true test guest never appears in its response — that's
      // correct, not a bug. Prove completeness instead: the collaborator's
      // view must match exactly what the owner's own token sees, filtered
      // the same way.
      const { req: viewReq, res: viewRes } = mockReqRes({ query: { ownerUserId: myId }, token });
      await collaboratorGuestsHandler(viewReq, viewRes);
      const ownersOwnGuests = await api('GET', `/apps/${APP_ID}/entities/Guest?q=${encodeURIComponent(JSON.stringify({ created_by_id: myId }))}`, undefined, token);
      const ownerNonTestCount = (Array.isArray(ownersOwnGuests) ? ownersOwnGuests : (ownersOwnGuests?.data || [])).filter(g => !g.is_test).length;
      const viewDiag = `status=${viewRes._status} collaboratorSawCount=${viewRes._json?.guests?.length} ownerNonTestCount=${ownerNonTestCount} canEdit=${viewRes._json?.canEdit} error=${viewRes._json?.error}`;
      results.push(viewRes._status === 200 && viewRes._json?.guests?.length === ownerNonTestCount && viewRes._json?.canEdit === false
        ? pass('View-only collaborator sees the owner\'s full non-test guest list via collaborator-guests.js GET', viewDiag)
        : fail('View-only collaborator sees the owner\'s full non-test guest list', 'counts match, canEdit:false', viewDiag));

      // Denial 1 — guest write rejected (no edit permission).
      const { req: writeReq, res: writeRes } = mockReqRes({ method: 'PUT', body: { ownerUserId: myId, guestId: testGuestId, updates: { name: 'HACKED' } }, token });
      await collaboratorGuestsHandler(writeReq, writeRes);
      results.push(writeRes._status === 403
        ? pass('Guest write rejected for a view-only collaborator', `403 ${JSON.stringify(writeRes._json)}`)
        : fail('Guest write rejected for a view-only collaborator', 403, `${writeRes._status} ${JSON.stringify(writeRes._json)}`));

      // Denial 2 — Budget read rejected (no Budget permission at all).
      const { req: budgetReq, res: budgetRes } = mockReqRes({ query: { ownerUserId: myId }, token });
      await collaboratorBudgetHandler(budgetReq, budgetRes);
      results.push(budgetRes._status === 403
        ? pass('Budget read rejected — no Budget permission granted', `403 ${JSON.stringify(budgetRes._json)}`)
        : fail('Budget read rejected', 403, `${budgetRes._status} ${JSON.stringify(budgetRes._json)}`));

      // Denial 3 — tampered signature rejected at accept time too (not just lookup).
      const tamperedToken = signedToken.slice(0, -4) + 'XXXX';
      const { req: badAcceptReq, res: badAcceptRes } = mockReqRes({ method: 'POST', body: { token: tamperedToken }, token });
      await collaboratorAcceptHandler(badAcceptReq, badAcceptRes);
      results.push(badAcceptRes._status === 404
        ? pass('collaborator-accept.js rejects a tampered signature', `404 ${JSON.stringify(badAcceptRes._json)}`)
        : fail('collaborator-accept.js rejects a tampered signature', 404, `${badAcceptRes._status} ${JSON.stringify(badAcceptRes._json)}`));

      // Find the grant row we created so it can be cleaned up (CollaboratorGrant.read is null; scoped by created_by_id via our own token).
      const grants = await api('GET', `/apps/${APP_ID}/entities/CollaboratorGrant?q=${encodeURIComponent(JSON.stringify({ created_by_id: myId }))}`, undefined, token);
      const grantRows = Array.isArray(grants) ? grants : (grants?.data || []);
      const recent = grantRows.filter(g => new Date(g.created_date) > new Date(Date.now() - 5 * 60 * 1000));
      grantId = recent.length > 0 ? recent[recent.length - 1].id : null;
    } catch (err) {
      console.log(`  ❌ FAIL  CollaboratorGrant real-handler flow — error: ${err.message}`);
      results.push(false, false, false, false, false);
    } finally {
      if (testGuestId) await cleanupEntity(token, 'Guest', testGuestId);
      if (testBudgetId) await cleanupEntity(token, 'Budget', testBudgetId);
      if (grantId) await cleanupEntity(token, 'CollaboratorGrant', grantId);
    }
  }

  return results;
}

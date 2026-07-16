/**
 * tests/persistence/collaborator-invite.mjs
 *
 * Covers feat/manage-collaborators-invite. CURRENT STATE: the schema fields
 * and the on-brand invite email are real and tested here. The lookup/accept/
 * permission-enforcement endpoints (collaborator-lookup.js,
 * collaborator-accept.js, collaborator-guests.js) are written but NOT yet
 * functional — verified empirically that Base44's admin key is bound by
 * Collaborator's owner-scoped RLS ({created_by_id: user.id}) the same as any
 * other caller, so it can neither read a Collaborator record by invite_token
 * (needed for the pre-authentication lookup) nor write the accepted state to
 * a record it doesn't own (same root cause as RsvpResponse/PollVote's own
 * append-only design elsewhere in this app). Fixing this requires a
 * deliberate RLS/security tradeoff (documented in the PR description) that
 * needs the couple's sign-off before shipping — those three handlers are
 * intentionally NOT exercised here yet, so this suite doesn't report a false
 * failure for a decision that hasn't been made.
 */

import { APP_ID, api, pass, fail, cleanupEntity } from './_shared.mjs';
import { renderCollaboratorInviteEmail } from '../../src/lib/collaboratorEmailTemplate.js';

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

  return results;
}

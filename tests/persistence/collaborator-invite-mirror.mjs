/**
 * tests/persistence/collaborator-invite-mirror.mjs
 *
 * THE COLLABORATORINVITE MIRROR IS THE ENTITY THE OWNER RULED, HASHES ONLY.
 *
 * Item 1b of goals/2026-10-10-collaborators-safe-and-truthful.md. The owner
 * added CollaboratorInvite live on 2026-10-11, in the shape of
 * CollaboratorGrant: create null, read null, update and delete by the creator
 * only. Because read is open, every identifying field is an HMAC digest and the
 * row must never grow a field that could hold a raw email, id or token.
 *
 * RULE 12: base44/entities/*.jsonc mirrors the live schema. This mirror was
 * written from the live export of the same day and compared byte for byte.
 * This guard pins what matters about it, so a later edit that widens the RLS
 * or adds a plaintext field fails here by name.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);

function loadMirror(name) {
  const text = readFileSync(root(`base44/entities/${name}.jsonc`), 'utf8');
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''));
}

export async function runCollaboratorInviteMirror() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  console.log('\n  CollaboratorInvite mirror, hashes only:\n');
  const inv = loadMirror('CollaboratorInvite');
  const grant = loadMirror('CollaboratorGrant');
  const props = inv.properties || {};
  const names = Object.keys(props).sort();

  ok('the entity is named CollaboratorInvite', inv.name === 'CollaboratorInvite', inv.name);
  ok('it declares exactly the ruled fields',
     JSON.stringify(names) === JSON.stringify(['collaborator_email_hash', 'expires_at', 'invite_token_hash', 'is_test', 'owner_user_id_hash', 'resend_count', 'status', 'wedding_id_hash']),
     names.join(', '));

  const hashed = ['wedding_id_hash', 'owner_user_id_hash', 'collaborator_email_hash', 'invite_token_hash'];
  // THE KEY NAME CHANGED ON 2026-10-14, and so did what this can assert.
  //
  // It pinned HMAC-SHA256(BASE44_ADMIN_KEY, which was what the mirror said and
  // was never what the code did: these four are keyed with COLLAB_HASH_KEY
  // (api/_lib/collaboratorAuth.js). The mirror now reads from Base44 live,
  // where the key name is correct, so this pins the correct one.
  ok('every identifying field is a hash string described as HMAC-SHA256 under COLLAB_HASH_KEY',
     hashed.every(f => props[f]?.type === 'string' && /HMAC-SHA256\(COLLAB_HASH_KEY/.test(props[f]?.description || '')),
     hashed.join(', '));
  const plain = names.filter(n => !hashed.includes(n));
  ok('  and every other field is a status, a time, a count or the test flag, none of which can hold an email, id or token',
     JSON.stringify(plain) === JSON.stringify(['expires_at', 'is_test', 'resend_count', 'status'])
     && props.expires_at?.format === 'date-time' && props.resend_count?.type === 'integer' && props.is_test?.type === 'boolean',
     plain.join(', '));
  ok('no field name says email, token or id without saying hash',
     names.every(n => !/(email|token|_id)$/.test(n) || n.endsWith('_hash')), names.join(', '));

  ok('status is the ruled enum, defaulting to sent',
     JSON.stringify(props.status?.enum) === JSON.stringify(['sent', 'superseded', 'revoked']) && props.status?.default === 'sent',
     JSON.stringify(props.status?.enum));
  ok('required: the four hashes, status and expires_at',
     JSON.stringify([...(inv.required || [])].sort()) === JSON.stringify(['collaborator_email_hash', 'expires_at', 'invite_token_hash', 'owner_user_id_hash', 'status', 'wedding_id_hash']),
     (inv.required || []).join(', '));

  ok('RLS is create null, read null, update and delete by the creator only',
     inv.rls?.create === null && inv.rls?.read === null
     && inv.rls?.update?.created_by_id === '{{user.id}}' && inv.rls?.delete?.created_by_id === '{{user.id}}'
     && Object.keys(inv.rls.update).length === 1 && Object.keys(inv.rls.delete).length === 1,
     JSON.stringify(inv.rls));
  ok('  which is exactly CollaboratorGrant\'s RLS', JSON.stringify(inv.rls) === JSON.stringify(grant.rls), 'same shape');

  return results;
}

/**
 * scripts/collab-grants-rebuild.ts
 *
 * ONE-TIME REBUILD OF COLLABORATOR GRANTS UNDER COLLAB_HASH_KEY.
 *
 * Owner ruling 2026-10-12. Collaborator hashes were keyed on BASE44_ADMIN_KEY
 * until the switch to COLLAB_HASH_KEY, so no grant made before it matches any
 * more. A hash cannot be re-keyed, only remade from the raw ids, and the raw
 * ids live on the couples' own Collaborator rows: created_by_id is the owner,
 * email is the collaborator's address, permissions are the grant, and
 * accepted_user_id, where present, is the collaborator's user id.
 *
 * Per Collaborator row:
 *   accepted_user_id present   one grant event, with hashes made under
 *                              COLLAB_HASH_KEY, unless that pair already has
 *                              one (so a second run writes nothing)
 *   accepted_user_id empty     nothing written; counted as needing a fresh
 *                              invite. Owner ruling: those collaborators are
 *                              invited again. No code has ever written
 *                              accepted_user_id, so expect most or all rows here.
 *
 * Grants keyed on the old value are left where they are. Nothing can match
 * them, so they grant nothing.
 *
 * RUN BY THE OWNER ONLY, and only after the owner's go. It needs Base44's
 * privileged exec (it reads every couple's Collaborator rows) and the
 * COLLAB_HASH_KEY value, which it reads from the private secrets file and
 * never prints. It prints counts and Collaborator record ids, never an email,
 * a name or a user id.
 *
 *   Dry run, writes nothing:
 *     cat scripts/collab-grants-rebuild.ts | npx base44 exec --privileged --app-id 68731d183f075e406eda2236
 *   Write:
 *     cat scripts/collab-grants-rebuild.ts | REBUILD_APPLY=1 npx base44 exec --privileged --app-id 68731d183f075e406eda2236
 *
 * COLLAB_SECRETS_FILE overrides where the key is read from; the default is
 * ~/collab-secrets.env, the file the owner steps write.
 */

import { createHmac } from 'node:crypto';

declare const base44: any;

const SECRETS_FILE = Deno.env.get('COLLAB_SECRETS_FILE') || `${Deno.env.get('HOME')}/collab-secrets.env`;
const APPLY = Deno.env.get('REBUILD_APPLY') === '1';

function readKey(): string {
  let text = '';
  try { text = Deno.readTextFileSync(SECRETS_FILE); } catch {
    console.error(`REFUSING: cannot read ${SECRETS_FILE}. Nothing was read or written.`);
    Deno.exit(2);
  }
  const line = text.split('\n').find((l) => l.startsWith('COLLAB_HASH_KEY='));
  const key = line ? line.slice('COLLAB_HASH_KEY='.length).trim() : '';
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    console.error('REFUSING: COLLAB_HASH_KEY in that file is missing or is not 64 hex characters. Nothing was read or written.');
    Deno.exit(2);
  }
  return key;
}

const KEY = readKey();
const hashId = (raw: string) => createHmac('sha256', KEY).update(String(raw)).digest('hex');
const normalizeEmail = (e: unknown) => String(e || '').trim().toLowerCase();

const rows: any[] = await base44.entities.Collaborator.list('-created_date', 5000);
const counts = { rows: rows.length, written: 0, alreadyThere: 0, needsInvite: 0, unusable: 0 };
const needsInvite: string[] = [];

for (const row of rows) {
  const owner = row.created_by_id;
  const email = normalizeEmail(row.email);
  if (!owner || owner === 'anonymous' || !email) { counts.unusable++; continue; }
  if (!row.accepted_user_id) { counts.needsInvite++; needsInvite.push(row.id); continue; }

  const grant = {
    owner_user_id_hash: hashId(owner),
    collaborator_user_id_hash: hashId(row.accepted_user_id),
    collaborator_email_hash: hashId(email),
    event_type: 'grant',
    permissions: row.permissions || {},
    granted_at: new Date().toISOString(),
  };
  const existing: any[] = await base44.entities.CollaboratorGrant.filter({
    owner_user_id_hash: grant.owner_user_id_hash,
    collaborator_user_id_hash: grant.collaborator_user_id_hash,
  });
  if (existing.some((r) => r.owner_user_id_hash === grant.owner_user_id_hash && r.collaborator_user_id_hash === grant.collaborator_user_id_hash)) {
    counts.alreadyThere++;
    continue;
  }
  if (APPLY) await base44.entities.CollaboratorGrant.create(grant);
  counts.written++;
}

console.log(APPLY ? 'WRITTEN.' : 'DRY RUN, nothing written. Set REBUILD_APPLY=1 to write.');
console.log(`  Collaborator rows read:        ${counts.rows}`);
console.log(`  grants ${APPLY ? 'written' : 'that would be written'}:  ${counts.written}`);
console.log(`  already rebuilt, skipped:      ${counts.alreadyThere}`);
console.log(`  need a fresh invite:           ${counts.needsInvite}`);
console.log(`  unusable (no owner or email):  ${counts.unusable}`);
if (needsInvite.length) console.log(`  Collaborator record ids needing a fresh invite: ${needsInvite.join(', ')}`);

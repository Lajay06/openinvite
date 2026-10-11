/**
 * tests/persistence/collaborator-hash-key.mjs
 *
 * COLLABORATOR HASHES AND INVITE LINKS USE COLLAB_HASH_KEY, NEVER THE ADMIN KEY.
 *
 * Owner ruling 2026-10-12: BASE44_ADMIN_KEY is a bearer credential and is never
 * a hashing key. api/_lib/collaboratorAuth.js, collaboratorInvites.js and
 * collaboratorInviteToken.js used it as one, for every grant, invite row and
 * invite link. They now use COLLAB_HASH_KEY, 32 random bytes as hex, set by the
 * owner in Vercel and in Base44 secrets so the hosted collaborator function
 * makes the same hashes.
 *
 * DRIVEN, not grepped, except for the one static check that the admin key's
 * name is gone from the code of the three files.
 *
 * The plant: collaboratorAuth.js hashing under BASE44_ADMIN_KEY again turns
 * "the admin key changes nothing" and the static check red. Proven by hand and
 * recorded in the PR body.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const FILES = ['api/_lib/collaboratorAuth.js', 'api/_lib/collaboratorInvites.js', 'api/_lib/collaboratorInviteToken.js'];
const KEY_A = '0123456789abcdef'.repeat(4);
const KEY_B = 'fedcba9876543210'.repeat(4);

export async function runCollaboratorHashKey() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const prior = { admin: process.env.BASE44_ADMIN_KEY, hash: process.env.COLLAB_HASH_KEY };
  const throws = (fn) => { try { fn(); return false; } catch { return true; } };

  try {
    process.env.BASE44_ADMIN_KEY = 'test-admin-key-not-a-real-credential';
    process.env.COLLAB_HASH_KEY = KEY_A;
    const { hashId } = await import('../../api/_lib/collaboratorAuth.js');
    const { signInvite, verifyInvite } = await import('../../api/_lib/collaboratorInviteToken.js');

    console.log('\n  Hashes are made with COLLAB_HASH_KEY:\n');
    const expected = crypto.createHmac('sha256', KEY_A).update('user-1').digest('hex');
    ok('hashId is HMAC-SHA256 under COLLAB_HASH_KEY', hashId('user-1') === expected, 'hex digest');
    process.env.BASE44_ADMIN_KEY = 'a-different-admin-key';
    ok('  and the admin key changes nothing', hashId('user-1') === expected, 'same digest');
    process.env.COLLAB_HASH_KEY = KEY_B;
    ok('  while a different COLLAB_HASH_KEY changes it', hashId('user-1') !== expected, 'new digest');

    console.log('\n  A missing or short key fails closed:\n');
    delete process.env.COLLAB_HASH_KEY;
    ok('hashId throws with no key', throws(() => hashId('user-1')), 'no empty-key hash');
    process.env.COLLAB_HASH_KEY = 'abc123';
    ok('  and with a key that is not 64 hex characters', throws(() => hashId('user-1')), 'refused');
    delete process.env.COLLAB_HASH_KEY;
    ok('signInvite throws with no key', throws(() => signInvite({ ownerUserId: 'o' })), 'nothing signed');
    process.env.COLLAB_HASH_KEY = KEY_A;
    const link = signInvite({ ownerUserId: 'owner-1', email: 'a@example.com', iat: Date.now() });
    delete process.env.COLLAB_HASH_KEY;
    ok('  and verifyInvite answers null, the same as a forged link', verifyInvite(link) === null, 'null');

    console.log('\n  Invite links:\n');
    process.env.COLLAB_HASH_KEY = KEY_A;
    ok('a link signed under the key verifies under it', verifyInvite(link)?.ownerUserId === 'owner-1', 'verified');
    process.env.COLLAB_HASH_KEY = KEY_B;
    ok('  and not under another key, so links signed before the switch die', verifyInvite(link) === null, 'null');
    process.env.COLLAB_HASH_KEY = KEY_A;
    const body = link.split('.')[0];
    const sig = link.split('.')[1];
    const plainHmac = crypto.createHmac('sha256', KEY_A).update(body).digest('base64url');
    ok('the signing key is derived, so a signature never equals an id hash', sig !== plainHmac, 'labeled key');

    console.log('\n  The admin key is gone from the three files:\n');
    for (const f of FILES) {
      const code = stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'), { trailing: true });
      ok(`  ${f} names no BASE44_ADMIN_KEY in code`, !/BASE44_ADMIN_KEY/.test(code), 'comments aside');
    }
    const revoke = stripComments(fs.readFileSync(path.join(ROOT, 'api/collaborator-revoke.js'), 'utf8'), { trailing: true });
    const tryAt = revoke.indexOf('try {');
    const hashAt = revoke.indexOf('hashId(caller.id)');
    ok('collaborator-revoke.js hashes inside its try, so a missing key is a clean 500',
       tryAt !== -1 && hashAt > tryAt, `try at ${tryAt}, hash at ${hashAt}`);
  } finally {
    if (prior.admin === undefined) delete process.env.BASE44_ADMIN_KEY; else process.env.BASE44_ADMIN_KEY = prior.admin;
    if (prior.hash === undefined) delete process.env.COLLAB_HASH_KEY; else process.env.COLLAB_HASH_KEY = prior.hash;
  }

  return results;
}

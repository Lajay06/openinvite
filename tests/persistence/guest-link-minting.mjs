/**
 * tests/persistence/guest-link-minting.mjs
 *
 * Track E, step 1: pins that RSVP tokens are minted and read SERVER-SIDE ONLY.
 *
 * Guest.rsvp_link_id is a bearer capability — api/_lib/rsvpAuth.js treats
 * whoever presents it as that guest. From E2 it is stored as an HMAC plus AES
 * ciphertext keyed by RSVP_TOKEN_KEY, a server-only secret, so a browser
 * CANNOT produce a valid stored value. A client that mints its own token would
 * write a row that no lookup can ever match: the guest's link would 404 and
 * nothing would report it, because writing a plaintext string into a column
 * still succeeds.
 *
 * That failure is silent, which is exactly why it is asserted mechanically
 * rather than left to review. Static source analysis — no network.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const SRC = path.resolve(new URL('../../src/', import.meta.url).pathname);

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

export async function runGuestLinkMinting() {
  const results = [];
  const files = walk(SRC);

  // (a) no client file may MINT a token.
  //
  // Matching `rsvp_link_id:` alone is wrong — it also hits object literals
  // that merely carry a server-returned token through to a consumer, which is
  // exactly what SendInvitesModal's ensureTokens now does and is fine. The
  // pattern that actually matters is GENERATION: a file that both produces a
  // random id and names a token field is minting one, whatever the surrounding
  // syntax. That combination has no legitimate client-side use.
  const TOKEN_FIELD = /\b(rsvp_link_id|plus_one_rsvp_link_id)\b/;
  const GENERATES = /crypto\.randomUUID\s*\(|randomBytes\s*\(|Math\.random\s*\(\)[\s\S]{0,80}toString\s*\(\s*36/;
  const minters = [];
  for (const f of files) {
    const code = stripComments(fs.readFileSync(f, 'utf8'));
    if (TOKEN_FIELD.test(code) && GENERATES.test(code)) minters.push(path.relative(SRC, f));
  }
  results.push(minters.length === 0
    ? pass('guest links — no client-side token minting', 'all minting via api/my-guest-links.js')
    : fail('guest links — no client-side token minting', 'none',
           `${minters.join(', ')} — the browser cannot produce a valid stored token from E2`));

  // (b) the endpoint and its client helper must both still exist and be wired.
  const helper = path.join(SRC, 'lib/guestLinks.js');
  const endpoint = path.resolve(new URL('../../api/my-guest-links.js', import.meta.url).pathname);
  const bothExist = fs.existsSync(helper) && fs.existsSync(endpoint);
  results.push(bothExist
    ? pass('guest links — endpoint and client helper both present', 'yes')
    : fail('guest links — endpoint and client helper both present', 'both',
           `helper=${fs.existsSync(helper)} endpoint=${fs.existsSync(endpoint)}`));

  // (c) the endpoint must use the CALLER's token, never the admin key. Handing
  //     out capabilities on an admin-key read would return other couples'
  //     guests, and gotcha #1 means an owner-scoped rule would not save us.
  const api = bothExist ? stripComments(fs.readFileSync(endpoint, 'utf8')) : '';
  const usesAdmin = /BASE44_ADMIN_KEY/.test(api);
  results.push(!usesAdmin && /callerFetch/.test(api)
    ? pass('guest links — endpoint reads/writes as the caller, not the admin key', 'callerFetch only')
    : fail('guest links — endpoint reads/writes as the caller, not the admin key', 'no admin key',
           `admin key referenced=${usesAdmin}`));

  // (d) consumers must go through the helper.
  const consumers = ['pages/Guests.jsx', 'components/games/GamesManager.jsx',
                     'components/messages/WhatsAppCompose.jsx', 'components/guests/SendInvitesModal.jsx'];
  const missing = consumers.filter(rel => {
    const p = path.join(SRC, rel);
    return !fs.existsSync(p) || !/fetchGuestLinks/.test(fs.readFileSync(p, 'utf8'));
  });
  results.push(missing.length === 0
    ? pass('guest links — every link consumer uses fetchGuestLinks', `${consumers.length} consumers`)
    : fail('guest links — every link consumer uses fetchGuestLinks', 'all',
           `${missing.join(', ')} — still building links locally`));

  return results;
}

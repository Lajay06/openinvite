/**
 * RSVP token minting (T1 / PR 1).
 *
 * THE GAP. Tokens were minted lazily by api/my-guest-links.js, and only for the
 * ids that endpoint was ASKED for. Every caller passes a NARROW selection -- a
 * send list, checked rows, a single guest -- never the whole list. So a guest
 * added and never invited had no `rsvp_link_id_enc`, and
 * api/rsvp-link-request.js requires that field to match. Such a guest received
 * the deliberately neutral `{sent:true}` response and no email, which is
 * indistinguishable from not being on the guest list at all. Opening the guest
 * list did NOT backfill them; nothing did.
 *
 * WHY NOT MINT ON REQUEST. `Guest.update` is owner-scoped, so the admin key
 * gets a flat 403 (BASE44_PLATFORM_NOTES.md). api/rsvp-link-request.js is an
 * anonymous endpoint with no caller token, so it cannot write to Guest at all.
 * Minting must happen couple-side, under the couple's own auth. That is why
 * this is proactive minting and not mint-on-request, and why no constant-time
 * floor was needed: the write cannot happen on that path, so there is no timing
 * branch to equalise.
 *
 * FIVE CREATION PATHS, not four. Hooking the UI would have missed two:
 *   1-3. Guests.jsx add, ImportGuestModal, AvaModal -> all api/my-guests.js
 *   4.   Onboarding.jsx -> Guest.bulkCreate, straight to the SDK
 *   5.   guest-contact-review.js approve -> creates a Guest server-side
 * Minting at the my-guests boundary covers 1-3 at once and cannot be missed by
 * a call site added later. 4 and 5 need their own, and have them.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => readFileSync(root(p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export async function runRsvpTokenMinting() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  RSVP token minting — every listed guest holds a token:\n');

  const guests = strip(read('api/my-guests.js'));
  check('guests are minted at the create boundary',
    /tokenPatch\(crypto\.randomUUID\(\), false\)/.test(guests), 'in the create payload');
  check('  it rides in the create payload, not a follow-up write',
    /\.\.\.buildGuestWriteFields\(\{\}, fields\),\s*\.\.\.tokenPatch/.test(guests), 'no extra PUT');
  check('  plus-one tokens stay lazy',
    !/tokenPatch\([^)]*,\s*true\)/.test(guests), 'only minted when there is a plus-one email');

  const review = strip(read('api/guest-contact-review.js'));
  check('collect-approval mints too (it bypasses my-guests)',
    /tokenPatch\(crypto\.randomUUID\(\), false\)/.test(review), 'approve branch');

  const onboarding = strip(read('src/pages/Onboarding.jsx'));
  check('onboarding sweeps its bulkCreate ids',
    /fetchGuestLinks\(newIds\)/.test(onboarding), 'bulkCreate bypasses my-guests');

  const publish = strip(read('src/components/website-builder/PublishModal.jsx'));
  check('publish sweeps EVERY guest id, not a selection',
    /Guest\.list\(\)/.test(publish) && /fetchGuestLinks\(ids\)/.test(publish), 'all ids');
  check('  and only on publish, never on unpublish',
    /if \(next\.websiteEnabled\)/.test(publish), 'guarded');

  // The anonymous path stays read-only. If this ever gains a write it becomes
  // both a 403 and a timing oracle for guest-list membership.
  const linkReq = strip(read('api/rsvp-link-request.js'));
  check('rsvp-link-request stays READ-ONLY',
    !/method:\s*'(PUT|POST|PATCH)'/.test(linkReq.replace(/resend\.emails\.send[\s\S]*?\}\);/g, '')),
    'no Guest write on the anonymous path');
  check('  and still answers neutrally',
    /const NEUTRAL = \{ sent: true \}/.test(linkReq), 'membership never revealed');

  // Deliberate absence, pinned: one live token is a 27-character legacy value
  // rather than a uuid, so any shape check would strand that guest forever.
  const auth = read('api/_lib/rsvpAuth.js');
  check('no shape check on tokens — the deliberate absence is pinned',
    !/\/\^\[0-9a-f-\]\{36\}\$\/|isUuid|\.length === 36|uuidRegex/.test(strip(auth))
      && /Nothing here inspects the token's SHAPE/.test(auth),
    'a 27-char legacy token must keep resolving');

  // ── THE WRITE-STOP: plaintext tokens are never created ──────────────────
  //
  // tokenPatch used to emit `[prefix]: token` -- the token itself, in a plain
  // column, beside its own ciphertext. That defeats RSVP_TOKEN_KEY for the row:
  // a reader of the row does not need the key. It survived because its comment
  // said "legacy plaintext -- E3 nulls this", which describes a ONE-TIME
  // MIGRATION of existing data and says nothing about what the function does.
  // #538 built on the helper without reading its write, so every guest created
  // after it minted a fresh plaintext capability.
  //
  // This is the durable half. The write can be reintroduced by an accident; the
  // probe cannot be undone silently.
  const crypto_ = strip(read('api/_lib/rsvpTokenCrypto.js'));
  check('tokenPatch NEVER emits the plaintext column',
    !/\[prefix\]:\s*token/.test(crypto_), 'no bare-prefix write');
  check('  it still writes hash and ciphertext together',
    /\[`\$\{prefix\}_hash`\]: hashToken\(token\)/.test(crypto_)
      && /\[`\$\{prefix\}_enc`\]: encryptToken\(token\)/.test(crypto_),
    'both, or a token cannot be resolved');
  check('  and the reason is recorded where the pen is',
    /never written/i.test(crypto_) || /ONE-TIME MIGRATION/i.test(read('api/_lib/rsvpTokenCrypto.js')),
    'so the comment cannot be misread again');

  // The sample-email invariant EmailTemplates depends on: with plaintext no
  // longer written, `guests.find(g => g.rsvp_link_id)` finds nothing and the
  // placeholder branch is taken. A preview must never carry a live capability.
  const tpl = strip(read('src/components/guests/EmailTemplates.jsx'));
  check('the email template preview falls back to a placeholder',
    /RSVP_BASE\}preview-token/.test(tpl), 'never a live token in a sample');
  // ── MINT-BACKFILL: tokens must never reach a client except deliberately ──
  //
  // Owner-side responses used to ship every guest's token ciphertext and hash to
  // the browser on every guest-list load, unread by any client code. Tokens are
  // BEARER CAPABILITIES: whoever holds one can answer as that guest.
  // api/my-guest-links.js is the ONE deliberate path by which a token reaches a
  // client -- rate limited, private/no-store, only the ids asked for.
  //
  // This assertion is the durable half of that fix. The strip can be undone by
  // an accident; the probe cannot be undone silently.
  check('owner-side responses strip the whole token family',
    /const TOKEN_COLUMNS = \[/.test(guests)
      && (guests.match(/'(?:plus_one_)?rsvp_link_id(?:_enc|_hash)?'/g) || []).length === 6,
    'all six columns');
  // Assert the three RESPONSE SITES, not a call count: `.map(stripTokenColumns)`
  // passes the function bare, so counting `stripTokenColumns(` misses the list
  // path entirely and reports a number that means nothing.
  check('  every owner-side response applies the strip',
    /\.map\(stripTokenColumns\)/.test(guests)
      && /json\(\{ guest: stripTokenColumns\(mergeGuestPii\(await created\.json\(\)\)\) \}\)/.test(guests)
      && /json\(\{ guest: stripTokenColumns\(mergeGuestPii\(await updated\.json\(\)\)\) \}\)/.test(guests),
    'list, create, update');
  check('  presence is exposed as a derived boolean, never the value',
    /has_rsvp_token: !!guest\.rsvp_link_id_enc/.test(guests), 'has_rsvp_token');
  // FLIPPED, not deleted. This asserted the OPPOSITE -- that the plaintext
  // columns were deliberately left in the response, on the belief that E3 had
  // nulled them. tokenPatch was still writing them (fixed in #540), so the
  // assertion was pinning a leak in place. The strip must cover all six.
  check('  the plaintext columns are stripped TOO',
    /'rsvp_link_id', 'rsvp_link_id_enc', 'rsvp_link_id_hash'/.test(guests)
      && /'plus_one_rsvp_link_id', 'plus_one_rsvp_link_id_enc', 'plus_one_rsvp_link_id_hash'/.test(guests),
    'all six columns, permanently');

  const guestsPage = strip(read('src/pages/Guests.jsx'));
  check('the backfill sweeps only guests that lack a token',
    /has_rsvp_token === false/.test(guestsPage) && /fetchGuestLinks\(missing\)/.test(guestsPage),
    'the filter is the guard');
  check('  and runs at most once per session',
    /tokenBackfillDone/.test(guestsPage), 'no repeated sweeps');
  check('  no missing token means no request at all',
    /if \(missing\.length === 0\) return;/.test(guestsPage), 'hot path unchanged');

  return results;
}

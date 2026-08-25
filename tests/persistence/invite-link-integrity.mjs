/**
 * An invitation is never built from a missing token (INVITE-URL-UNDEFINED).
 *
 * #539 stripped the token columns from /api/my-guests, so a Guest object in
 * the browser no longer carries rsvp_link_id. SendInvitesModal re-fetches real
 * tokens at send time, which is correct — but fetchGuestLinks returned {} on
 * ANY failure and logged to console only, and ensureTokens' `if (!l) return g`
 * kept the stripped, undefined value. buildRsvpUrl then concatenated it:
 * every selected guest was emailed ".../rsvp/undefined", which resolves to
 * "Invitation not found". No toast, no error, nothing in the UI.
 *
 * This is the worst-placed member of the silent-failure family (the others
 * being the CSV export overlay and the dead Copy links button) because an
 * invitation cannot be unsent: the damage lands on the couple's guests, not
 * on the couple's own data.
 *
 * Two independent layers, both pinned here:
 *   braces — ensureTokens aborts the send on a failed OR partial link fetch,
 *            naming how many links could not be created
 *   belt   — buildRsvpUrl refuses a falsy token outright
 *
 * The throw-on-failure assertions run the real function against a stubbed fetch
 * rather than grepping for it, so they fail if the behaviour regresses even
 * when the words survive.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => readFileSync(root(p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Runs fn with globals a browser module expects, then restores them. */
async function withBrowserGlobals(fetchImpl, fn) {
  const had = { fetch: globalThis.fetch, ls: globalThis.localStorage };
  globalThis.fetch = fetchImpl;
  globalThis.localStorage = { getItem: () => 'test-token' };
  try { return await fn(); }
  finally {
    globalThis.fetch = had.fetch;
    if (had.ls === undefined) delete globalThis.localStorage; else globalThis.localStorage = had.ls;
  }
}

export async function runInviteLinkIntegrity() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Invite links — a send aborts rather than mailing a dead link:\n');

  const { fetchGuestLinks } = await import('../../src/lib/guestLinks.js');

  // ── throw-on-failure mode: real behaviour, stubbed transport ─────────────────────
  const failing = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const throwing = async () => { throw new Error('network down'); };
  const okEmpty = async () => ({ ok: true, status: 200, json: async () => ({ links: {} }) });

  for (const [label, impl] of [['a non-ok response', failing], ['a network error', throwing]]) {
    const threw = await withBrowserGlobals(impl, async () => {
      try { await fetchGuestLinks(['g1'], { throwOnFailure: true }); return false; }
      catch { return true; }
    });
    check(`throwOnFailure: ${label} throws instead of returning {}`, threw, 'the send path cannot mistake failure for "no links"');

    const swallowed = await withBrowserGlobals(impl, async () => {
      try { return await fetchGuestLinks(['g1']); } catch { return 'threw'; }
    });
    // CONTROL: the default contract must NOT change — copy-links depends on it.
    check(`  default: ${label} still returns {} (unchanged for copy paths)`,
      swallowed !== 'threw' && typeof swallowed === 'object', JSON.stringify(swallowed));
  }

  // A successful-but-empty response is NOT a transport failure; the throw must
  // not throw there. Completeness is ensureTokens' job, and it names guests.
  const emptyOk = await withBrowserGlobals(okEmpty, async () => {
    try { return await fetchGuestLinks(['g1'], { throwOnFailure: true }); } catch { return 'threw'; }
  });
  check('throwOnFailure: a successful empty response does not throw', emptyOk !== 'threw',
    'partial-link detection belongs to the caller, which can name the guests');

  // ── the send path ──────────────────────────────────────────────────────
  const modal = strip(read('src/components/guests/SendInvitesModal.jsx'));

  check('buildRsvpUrl refuses a falsy token',
    /function buildRsvpUrl\(token\)\s*\{[\s\S]{0,200}?if \(!token\) throw/.test(modal),
    'belt — the caller should never reach it');

  check('the send asks for throw-on-failure link fetching',
    /fetchGuestLinks\([\s\S]{0,80}?throwOnFailure: true/.test(modal), 'failure is not silence');

  // Scoped to ensureTokens, not the file: a throw elsewhere must not satisfy this.
  const et = modal.slice(modal.indexOf('const ensureTokens'));
  const body = et.slice(0, et.indexOf('\n  };'));
  check('  ensureTokens counts guests still missing a link',
    /missingPrimary/.test(body) && /missingPlusOne/.test(body), 'primary and plus-one both');
  check('  and aborts naming how many could not be created',
    /throw new Error\(/.test(body) && /could not be created/.test(body) && /Nothing was sent/.test(body),
    'visible, counted, and explicit that nothing went out');

  // The abort must happen BEFORE any recipient is constructed, or it aborts
  // nothing. Ordering, not presence.
  const send = modal.slice(modal.indexOf('const handleSend'));
  const iEnsure = send.indexOf('await ensureTokens(');
  const iRecipients = send.indexOf('const recipients');
  const iWhatsApp = send.indexOf('buildWhatsAppUrl(');
  check('the abort precedes every email and WhatsApp URL built',
    iEnsure > -1 && iEnsure < iRecipients && iEnsure < iWhatsApp,
    `ensureTokens@${iEnsure} < recipients@${iRecipients}, whatsapp@${iWhatsApp}`);

  // No render-time call may throw: buildRsvpUrl outside a handler must be
  // guarded, or a missing token blanks the modal instead of blocking a send.
  const preview = modal.match(/const previewRsvpUrl = .*/)?.[0] || '';
  check('the render-time call site stays guarded',
    /\?\s*buildRsvpUrl\(/.test(preview), 'a throw during render would be worse than the bug');

  // ── the WhatsApp channel: same defect, different clothes ───────────────
  // rsvpLink fell back to '' and the template collapsed to "Please RSVP: "
  // with nothing after it — a dead invitation delivered to a guest, and just
  // as unrecallable as an emailed /rsvp/undefined.
  const wa = strip(read('src/components/messages/WhatsAppCompose.jsx'));

  check('WhatsApp: the link fetch throws on failure', /fetchGuestLinks\([\s\S]{0,80}?throwOnFailure: true/.test(wa),
    'a failed fetch is not an empty link');
  check('WhatsApp: an empty link is never substituted away',
    /if \(key === 'rsvp_link' && !value\) return;/.test(wa),
    'the placeholder stays visible instead of collapsing to nothing');

  const handler = wa.slice(wa.indexOf('const handleSend'));
  check('WhatsApp: send refuses a message with an unresolved link',
    /if \(message\.includes\(RSVP_PLACEHOLDER\)\) return;/.test(handler.slice(0, handler.indexOf('};'))),
    'hard stop, not just a disabled button');
  check('  and the button is disabled with it',
    /const sendBlocked = [\s\S]{0,120}?linkMissing/.test(wa) && /disabled=\{sendBlocked\}/.test(wa),
    'the control agrees with the guard');
  check('  and the couple is told why',
    /\{linkMissing && \(/.test(wa) && /could not create an invitation link/.test(wa),
    'never a silently dead button');

  return results;
}

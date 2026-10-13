/**
 * tests/persistence/mobile-send-path.mjs
 *
 * THE PHONE SENDS BY THE WEB'S RULES, IMPORTED, NOT RETYPED.
 *
 * Lane D's findings 1 to 3 of goals/2026-10-10-mobile-pass.md, ordered as one
 * PR on 2026-10-12. The shell's Send invites screen sent while the Guest Suite
 * was unpublished, sent one email per guest where the web sends one per
 * invitation, and did not skip an address that bounced. It also left slug and
 * websiteEnabled out of the request, which api/send-invites.js reads, so the
 * server refused every send the phone made.
 *
 * The ruling was to consume the web's send path rules, not reimplement them.
 * So this guard checks three things: the web still holds each rule where the
 * shell imports it from, the shell imports it from there, and the shell has no
 * second copy (by elimination: the bounce field and the household key never
 * appear in shell code at all).
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

function span(src, from, to) {
  const a = src.indexOf(from);
  if (a < 0) return '';
  const b = src.indexOf(to, a + from.length);
  return b < 0 ? src.slice(a) : src.slice(a, b);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'fixtures') walk(rel, out); }
    else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(rel);
  }
  return out;
}

export async function runMobileSendPath() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const web = code('src/components/guests/SendInvitesModal.jsx');
  const server = code('api/send-invites.js');
  const shell = code('src/mobile/screens/guests/SendInvitesScreen.jsx');
  const send = span(shell, 'const send = async', 'const failed = result');
  const test = span(shell, 'const sendTest = async', 'if (!canSend)');

  // ── THE RULES ARE STILL THE WEB'S, WHERE THE SHELL TAKES THEM FROM ────────
  ok("the web groups by invitation through household.js", /import \{ invitationsFor \} from '@\/lib\/household';/.test(web), 'SendInvitesModal.jsx');
  ok("the web skips bounces through emailBounce.js", /import \{ isBounced, bouncedSkippedSentence \} from '@\/components\/guests\/emailBounce';/.test(web), 'SendInvitesModal.jsx');
  ok('the web refuses an unpublished send on these two conditions',
     /if \(!wedding\?\.slug\)/.test(web) && /if \(wedding\?\.websiteEnabled !== true\)/.test(web), 'handleSend');
  ok('  and so does the server', /if \(wedding\.websiteEnabled !== true\)/.test(server), 'api/send-invites.js');

  // ── THE SHELL IMPORTS THEM ───────────────────────────────────────────────
  ok('the shell imports invitationsFor', /import \{ invitationsFor \} from '@\/lib\/household';/.test(shell), 'SendInvitesScreen.jsx');
  ok('the shell imports the bounce predicate and its words',
     /import \{ isBounced, bouncedSkippedSentence, BOUNCE_ROW_LABEL \} from '@\/components\/guests\/emailBounce';/.test(shell), 'SendInvitesScreen.jsx');
  const shellFiles = walk('src/mobile');
  const retyped = shellFiles.filter((f) => /email_bounce|household_id|householdIdOf/.test(code(f)));
  ok('no shell file retypes the bounce field or the household key', retyped.length === 0, retyped.join(', ') || 'none');

  // ── 1. UNPUBLISHED IS REFUSED ────────────────────────────────────────────
  // Since lane A's #1029 the shell takes the two conditions from
  // src/lib/publishState.js, which tests/persistence/mobile-publish-state.mjs
  // drives for real; here it is enough that the refusal reads that state.
  ok('the shell refuses on publishState.js\'s state',
     /const pubState = publishState\(wedding\);/.test(shell) && /const unpublished = pubState === PUBLISH_STATE\.NO_ADDRESS/.test(shell), 'unpublished');
  ok('  the send stops on it before a link is minted',
     /if \(unpublished\) \{ toast\.error\(unpublished\); return; \}/.test(send)
       && send.indexOf('if (unpublished)') > -1 && send.indexOf('if (unpublished)') < send.indexOf('ensureTokens('), 'send');
  ok('  the test send stops on it too', /if \(unpublished\) \{ toast\.error\(unpublished\); return; \}/.test(test), 'sendTest');
  ok('  the send buttons are off while it holds',
     /disabled=\{sending \|\| !!unpublished \|\| nEmails === 0\}/.test(shell) && /disabled=\{sending \|\| !!unpublished\}>Send \{nEmails\}/.test(shell), 'review and confirm');
  ok('  and the review says why', /\{unpublished && <div className="oi-m-card" data-unpublished>/.test(shell), 'step 4');
  ok('the request carries slug and websiteEnabled, as the web sends them',
     /const weddingPayload = \{[^}]*slug: wedding\?\.slug, websiteEnabled: wedding\?\.websiteEnabled/.test(shell), 'weddingPayload');

  // ── 2. ONE EMAIL PER INVITATION ──────────────────────────────────────────
  ok('the recipients are invitations grouped from the guests with links',
     /const invitations = invitationsFor\(withTokens\);/.test(send)
       && /const emailList = invitations\.filter\(\(i\) => i\.email && i\.lead\?\.rsvp_link_id\);/.test(send), 'emailList');
  ok('  each addressed to the lead, with the lead\'s link and events',
     /emailList\.map\(\(i\) => \(\{ email: i\.email, name: i\.name, rsvpUrl: buildRsvpUrl\(i\.lead\.rsvp_link_id\), rsvpToken: i\.lead\.rsvp_link_id, events: buildGuestEvents\(i\.lead\) \}\)\)/.test(send), 'recipient');
  ok('  and never one per guest', !/withTokens\.filter\(\(g\) => g\.email\)/.test(shell), 'no per-guest list');
  ok('the counts on screen are invitations',
     /const sendableInvitations = useMemo\(\(\) => invitationsFor\(sendableGuests\)/.test(shell)
       && /\['To', emailsCovering\]/.test(shell) && !/\['To', `\$\{selectedGuests\.length\} guest/.test(shell), 'review and confirm');

  // ── 3. A BOUNCED ADDRESS IS SKIPPED ──────────────────────────────────────
  ok('the sendable guests are the web\'s: not opted out, not bounced',
     /const sendable = list\.filter\(\(g\) => !g\.email_opt_out && !isBounced\(g\)\);/.test(send)
       && /const sendableGuests = selectedGuests\.filter\(\(g\) => !g\.email_opt_out && !isBounced\(g\)\);/.test(shell), 'send and review');
  ok('  links are minted for them only', /await ensureTokens\(sendable\)/.test(send), 'ensureTokens(sendable)');
  ok('  a bounced guest is listed as skipped, with the web\'s label',
     /bounced\.map\(\(g\) => \(\{ guest: g, status: 'skipped', why: BOUNCE_ROW_LABEL \}\)\)/.test(send)
       && (send.match(/\.\.\.notSent/g) || []).length === 2, 'on success and on failure');
  const webSentence = /`\$\{TYPE_LABELS\[type\]\} sent, \$\{nEmails\} email\$\{plural\(nEmails\)\} covering \$\{nPeople\} guest\$\{plural\(nPeople\)\}`/.test(web)
    && /\(nBounced > 0 \? `, \$\{bouncedSkippedSentence\(nBounced\)\}` : ''\)/.test(web);
  ok("the web's result sentence is still the one copied", webSentence, 'SendInvitesModal.jsx');
  ok('  and the shell says it, bounces included',
     /`\$\{TYPE_LABELS\[type\]\} sent, \$\{sent\} email\$\{plural\(sent\)\} covering \$\{sendable\.length\} guest\$\{plural\(sendable\.length\)\}`/.test(send)
       && /\(bounced\.length > 0 \? `, \$\{bouncedSkippedSentence\(bounced\.length\)\}` : ''\)/.test(send), 'toast');

  // ── AND THE GUEST LIST SHOWS IT, AND A FIX CLEARS IT ─────────────────────
  const list = code('src/mobile/screens/guests/GuestsScreen.jsx');
  const row = span(list, 'export function GuestRow', '\nexport function ');
  ok('a guest row says the address bounced',
     /isBounced\(guest\) && <div className="oi-m-row__sub" data-bounced style=\{\{ color: 'var\(--m-no\)' \}\}>\{BOUNCE_ROW_LABEL\}<\/div>/.test(row), 'GuestRow');
  ok('the detail says how to fix it',
     /isBounced\(guest\) \? BOUNCE_FIX_SENTENCE : 'Email'/.test(code('src/mobile/screens/guests/GuestDetailScreen.jsx')), 'Contact, Email');
  const container = code('src/mobile/screens/guests/GuestsContainer.jsx');
  ok('a changed address clears its bounce in the same save, as Guests.jsx does',
     /import \{ withBounceCleared \} from '@\/components\/guests\/emailBounce';/.test(container)
       && /await guestWrites\.update\(sheet\.guest\.id, withBounceCleared\(rest, sheet\.guest\)\);/.test(container)
       && /withBounceCleared\(restGuestData, editingGuest\)/.test(code('src/pages/Guests.jsx')), 'save');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileSendPath();
  process.exit(r.every(Boolean) ? 0 : 1);
}

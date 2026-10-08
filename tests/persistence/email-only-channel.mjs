/**
 * tests/persistence/email-only-channel.mjs
 *
 * EMAIL IS THE ONLY WAY THE SITE REACHES A GUEST.
 *
 * Item 12 of goals/2026-10-08-site-fixes-batch-1.md, part 12b, under the
 * owner's ruling: remove the Guests page bulk "Copy links" and the WhatsApp
 * channel from SendInvitesModal, and review SharePlaylist's link sharing,
 * removing it only if it shares the guest site.
 *
 * 12a took the same rule through the three studio surfaces and is pinned by
 * tests/persistence/event-details-no-address.mjs. This is the other half: the
 * two send paths and the music page.
 *
 * ── THE POSITIVE CHECKS ARE THE POINT OF THIS FILE ─────────────────────────
 *
 * An absence sweep is easy to write and easy to pass for the wrong reason. The
 * failure mode that matters here is not "a WhatsApp button survived", it is
 * "the email send went with it": a file can satisfy every pattern below by
 * being empty. So every removal is paired with something that must still be
 * there, and two of them are about surfaces the ruling deliberately did NOT
 * touch, because a sweep for the word "whatsapp" would take them.
 *
 * THE MESSAGES PAGE KEEPS ITS WHATSAPP, and that is asserted here rather than
 * left to chance. It opens a chat with a guest who has already written in,
 * from the couple's own device, which is a different act from handing out the
 * wedding site. src/lib/phoneE164.js stays with it.
 *
 * ── WHAT 12b COSTS, RECORDED HERE BECAUSE A GUARD OUTLIVES A PR BODY ───────
 *
 * Two routes close, and both were real:
 *
 *   The Guests page's "Copy links" copied RSVP links, `/rsvp/<token>`, not the
 *   site address. It was the only way to hand a specific guest their own RSVP
 *   page without emailing them, which is what a couple did for a guest with no
 *   email on file. There is now no route for that guest.
 *
 *   SharePlaylist's QR was meant for the tables, so a seated guest could
 *   request a song without being emailed anything. It pointed at
 *   /w/<slug>/music, which IS the guest site, which is why the ruling's
 *   condition caught it.
 *
 * Both are consequences of the ruling, not arguments against it. They are
 * written down so that whoever reopens the question starts from what was
 * actually given up.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

/**
 * Comments out, and only comments, and a comment must start its own line.
 *
 * The naive form of this expression eats `accept="audio/*"` and everything
 * after it as far as the next star-slash, which cost sixty lines of
 * WBRightPanel.jsx in 12a's guard before the positive check caught it. Every
 * file this guard reads carries a comment naming the control it removed, so
 * reading raw source would fail on the explanation.
 */
const code = (src) => src
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
  .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

export async function runEmailOnlyChannel() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE SEND MODAL: ONE CHANNEL ─────────────────────────────────────────
  const modal = code(read('src/components/guests/SendInvitesModal.jsx'));

  ok('the send modal opens no WhatsApp', !/wa\.me/.test(modal), 'no wa.me link built');
  ok('  and builds no WhatsApp message or URL',
     !/buildWhatsAppUrl|buildWhatsAppMessage|WhatsAppPreview/.test(modal), 'all three gone');
  ok('  and no longer needs the phone normaliser',
     !/toWaMe/.test(modal), 'phoneE164 is not imported here');
  ok('  and holds no channel to switch on',
     !/setChannel|channel === '/.test(modal), 'no channel state, no branches');
  ok('  and records the channel as a literal',
     /const channelStr = 'email';/.test(modal), "invite_channel: 'email'");
  // ONE CARD, AND IT IS EMAIL. The step stays, per the ruling, so what is
  // asserted is that nothing in it offers a second destination.
  ok('  and its channel step offers email and nothing else',
     /How this goes out/.test(modal) && !/Email \+ WhatsApp/.test(modal), 'one card');

  // THE EMAIL PATH MUST STILL BE THERE. Everything above is satisfied by an
  // empty file; these are not.
  ok('the email send itself is intact',
     /const recipients = \[/.test(modal) && /fetch\('\/api\/send-invites'/.test(modal),
     'recipients built, endpoint called');
  ok('  one email per invitation, addressed to the lead',
     /invitationsFor\(withTokens\)/.test(modal) && /i\.lead\?\.rsvp_link_id/.test(modal), 'grouped, tokenized');
  ok('  and the preview still renders the email',
     /title="Email preview"/.test(modal) && /srcDoc=\{previewEmailHtml\}/.test(modal), 'the iframe is there');
  ok('  and an invitation with no address is still named, not counted away',
     /No email yet/.test(modal) && /invitationsNoEmail\.map/.test(modal), 'one line each');

  // ── THE GUESTS PAGE: NO BULK COPY ───────────────────────────────────────
  const guests = code(read('src/pages/Guests.jsx'));
  ok('the guests page has no bulk copy control',
     !/Copy links/.test(guests) && !/handleCopyLinks/.test(guests), 'the button and its handler');
  ok('  and writes nothing to the clipboard',
     !/copyFromPromise|setCopyFallback/.test(guests), 'no clipboard path left');
  // THE TOKEN BACKFILL IS NOT THE COPY BUTTON, and it reads from the same
  // place. A sweep that took fetchGuestLinks out of this file would stop every
  // guest without a token from ever getting one, silently.
  ok('  while the token backfill still runs',
     /fetchGuestLinks\(missing\)/.test(guests), 'guests without a link still get one');
  ok('  and the send flow is still reachable from the selection bar',
     /openSendForSelection/.test(guests), 'email is the remaining action');

  // ── THE MUSIC PAGE: THE SHARE PANEL IS GONE ─────────────────────────────
  ok('SharePlaylist is deleted, not emptied',
     !exists('src/components/music/SharePlaylist.jsx'), 'the file is gone');
  const music = code(read('src/pages/Music.jsx'));
  ok('  and the music page does not import it',
     !/SharePlaylist/.test(music), 'no import, no render');
  ok('  and prints no address of its own',
     !/openinvite\.com\.au/.test(music) && !/\/w\/\$\{/.test(music), 'no URL, no slug');
  ok('  while the section still says how guests get there',
     /from the invitation you email them/.test(music), 'the question is answered, not dropped');

  // ── AND THE MESSAGES PAGE IS UNTOUCHED ──────────────────────────────────
  //
  // The overreach check. Everything above is about handing out the wedding
  // site; messaging a guest who has already written in is not that, and a
  // sweep for "whatsapp" would have taken it.
  const compose = code(read('src/components/messages/WhatsAppCompose.jsx'));
  ok('the messages page still opens a chat with a guest',
     /wa\.me/.test(compose) && /toWaMe/.test(compose), 'through the one normaliser');
  ok('  and the phone normaliser still exists for it',
     exists('src/lib/phoneE164.js'), 'phoneE164 kept');
  ok('  and the QR a guest scans to message the couple is still there',
     exists('src/components/messages/WhatsAppQRCode.jsx'), 'that QR points at the couple, not the site');

  return results;
}

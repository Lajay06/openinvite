/**
 * tests/persistence/collaborator-invite-email-layout.mjs
 *
 * THE COLLABORATOR INVITE EMAIL WEARS THE CODE EMAIL'S LAYOUT, WITH ITS OWN
 * HEADER PHOTO.
 *
 * Owner, 2026-10-13: a header photo, the Cloudinary image
 * DTS_QUIET_GLAMOUR_DTS_Studio_Photos_ID8370_coshvz delivered as
 * f_jpg,q_auto,w_1200 and shown 600 wide, alt "Openinvite"; the same full
 * logo and the same gray as the sign-up code email
 * (base44/emails/EmailVerification.html). The words are pinned elsewhere
 * (collaborator-truthful-permissions.mjs); this guard pins the frame.
 *
 * DRIVEN: the real renderCollaboratorInviteEmail, its HTML read.
 *
 * The plant: the photo row removed turns the photo checks red. Proven by hand
 * and recorded in the PR body.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const PHOTO = 'https://res.cloudinary.com/dsr84xknv/image/upload/c_fill,ar_2:1,g_north,w_1200,f_jpg,q_auto/DTS_QUIET_GLAMOUR_DTS_Studio_Photos_ID8370_coshvz';
// The logo is whatever the sign-up code email uses, read from that file: the
// two can never drift apart (owner, 2026-10-13).
const CODE_EMAIL = fs.readFileSync(path.join(ROOT, 'base44/emails/EmailVerification.html'), 'utf8');
const LOGO = (CODE_EMAIL.match(/<img src="(https:\/\/www\.openinvite\.com\.au\/email-assets\/[^"]+)"/) || [])[1] || 'missing from the code email';

export async function runCollaboratorInviteEmailLayout() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const { renderCollaboratorInviteEmail } = await import('../../src/lib/collaboratorEmailTemplate.js');
  const { html } = renderCollaboratorInviteEmail({
    collaboratorName: 'Ada Lovelace', coupleNames: 'Alex and Sam', acceptUrl: 'https://openinvite.com.au/collaborate/accept/x',
    permissions: { Guests: { view: true } },
  });

  console.log('\n  The header photo:\n');
  ok('the photo is DTS_QUIET_GLAMOUR_DTS_Studio_Photos_ID8370_coshvz, c_fill ar_2:1 g_north w_1200 f_jpg q_auto',
     (html.match(/<img [^>]*src="([^"]*DTS_QUIET_GLAMOUR[^"]*)"/) || [])[1] === PHOTO, PHOTO);
  ok('  shown at 600x300, alt "Openinvite"', new RegExp(`<img src="${PHOTO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" width="600" height="300" alt="Openinvite" style="display:block;width:100%;max-width:600px;height:auto;`).test(html), '600x300');
  ok('  and it sits right under the logo, above the heading', html.indexOf(LOGO) < html.indexOf(PHOTO) && html.indexOf(PHOTO) < html.indexOf('would love your help planning their wedding.'), 'order');

  console.log('\n  The heading and the body, no eyebrow:\n');
  const text = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, ' ');
  ok('no eyebrow line above the heading', !/you(&#39;|')re invited to collaborate/i.test(html), 'gone');
  ok('the heading: "Alex and Sam would love your help planning their wedding."', text.includes('Alex and Sam would love your help planning their wedding.'), 'heading');
  ok('the body starts "Hi Ada, they\'ve added you as a collaborator..."',
     text.includes("Hi Ada, they've added you as a collaborator on their Openinvite wedding planning dashboard. Accept the invite below to sign in (or create a free account) and get started."), 'body');
  const anon = renderCollaboratorInviteEmail({ collaboratorName: '', coupleNames: '', acceptUrl: 'https://x', permissions: {} }).html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  ok('  with no names: "A couple would love..." and "Hi there,"', anon.includes('A couple would love your help planning their wedding.') && anon.includes('Hi there, they'), 'fallbacks');

  console.log('\n  The code email\'s frame:\n');
  ok('the logo src is exactly the code email\'s, at 160x37', LOGO.startsWith('https://') && html.includes(`<img src="${LOGO}" width="160" height="37" alt="Openinvite"`), LOGO);
  ok('  not the mark alone', !/openinvite-icon-mark/.test(html), 'no mark-only image');
  const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
  const m = css.match(/:root\s*\{[\s\S]*?--background:\s*(\d+)\s+(\d+)%\s+(\d+)%;/);
  const gray = m && m[2] === '0' && m[3] === '96' ? '#F5F5F5' : 'token moved';
  ok('the page is the onboarding gray, --background in src/index.css', new RegExp(`<body style="[^"]*background:${gray};`).test(html) && html.includes(`style="background:${gray};padding:40px 16px;"`), gray);
  ok('  the card is white', /class="card" style="[^"]*background:#ffffff;/.test(html), 'white');
  ok('  and no cream, and not the shared shell\'s #F7F7F7', !/#f6f4f1|#F6F2EC|#F7F7F7/i.test(html), 'no other ground');

  console.log('\n  The accept page, no eyebrow either (owner, 2026-10-13):\n');
  const accept = fs.readFileSync(path.join(ROOT, 'src/pages/CollaboratorAccept.jsx'), 'utf8').replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/mg, '');
  ok('no "you\'re invited to collaborate" and no "invite not found" above a heading',
     !/invited to collaborate/i.test(accept) && !/>invite not found</i.test(accept), 'gone');
  ok('  and no small accent-colored, letter-spaced line anywhere on the page',
     !/fontWeight: 700, color: '#E03553', letterSpacing: '0\.1em'/.test(accept), 'no eyebrow style');

  return results;
}

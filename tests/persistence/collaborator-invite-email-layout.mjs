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
const PHOTO = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_jpg,q_auto,w_1200/DTS_QUIET_GLAMOUR_DTS_Studio_Photos_ID8370_coshvz';
const LOGO = 'https://www.openinvite.com.au/email-assets/openinvite-logo-on-light-2x.png';

export async function runCollaboratorInviteEmailLayout() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const { renderCollaboratorInviteEmail } = await import('../../src/lib/collaboratorEmailTemplate.js');
  const { html } = renderCollaboratorInviteEmail({
    collaboratorName: 'Ada Lovelace', coupleNames: 'Alex and Sam', acceptUrl: 'https://openinvite.com.au/collaborate/accept/x',
    permissions: { Guests: { view: true } },
  });

  console.log('\n  The header photo:\n');
  ok('the photo is DTS_QUIET_GLAMOUR_DTS_Studio_Photos_ID8370_coshvz as f_jpg,q_auto,w_1200, nothing else',
     (html.match(/<img [^>]*src="([^"]*DTS_QUIET_GLAMOUR[^"]*)"/) || [])[1] === PHOTO, PHOTO);
  ok('  shown 600 wide, alt "Openinvite"', new RegExp(`<img src="${PHOTO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" width="600" height="450" alt="Openinvite" style="display:block;width:100%;max-width:600px;height:auto;`).test(html), '600x450');
  ok('  and it sits right under the logo, above the invite', html.indexOf(LOGO) < html.indexOf(PHOTO) && html.indexOf(PHOTO) < html.indexOf("you're invited to collaborate"), 'order');

  console.log('\n  The code email\'s frame:\n');
  ok('the full logo, 160 wide, top left', html.includes(`<img src="${LOGO}" width="160" height="37" alt="Openinvite"`), 'lockup');
  ok('  not the mark alone', !/openinvite-icon-mark/.test(html), 'no mark-only image');
  const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
  const m = css.match(/:root\s*\{[\s\S]*?--background:\s*(\d+)\s+(\d+)%\s+(\d+)%;/);
  const gray = m && m[2] === '0' && m[3] === '96' ? '#F5F5F5' : 'token moved';
  ok('the page is the onboarding gray, --background in src/index.css', new RegExp(`<body style="[^"]*background:${gray};`).test(html) && html.includes(`style="background:${gray};padding:40px 16px;"`), gray);
  ok('  the card is white', /class="card" style="[^"]*background:#ffffff;/.test(html), 'white');
  ok('  and no cream, and not the shared shell\'s #F7F7F7', !/#f6f4f1|#F6F2EC|#F7F7F7/i.test(html), 'no other ground');

  return results;
}

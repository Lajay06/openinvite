/**
 * tests/persistence/verification-email-template.mjs
 *
 * OPENINVITE'S OWN SIGN-UP VERIFICATION EMAIL SAYS EXACTLY WHAT THE OWNER WROTE.
 *
 * base44/emails/EmailVerification.html mirrors the template written into
 * Base44 with "Customize application email" (owner ruling 2026-10-13, route 1).
 * Base44 cannot be told to stop sending its verification email, so its version
 * is replaced, not joined by a second. This guard pins the owner's words, the
 * photo, the code box and the footer, and refuses the off-brand elements the
 * Base44 default carried: the red header band and the all-caps wordmark.
 *
 * Static by nature: the file is the thing that ships.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

export async function runVerificationEmailTemplate() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const html = fs.readFileSync(path.join(ROOT, 'base44/emails/EmailVerification.html'), 'utf8');
  const body = html.replace(/<!--[\s\S]*?-->/g, '');
  const text = body.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

  console.log('\n  The owner\'s words, exactly:\n');
  ok('the subject line is the title: "Your Openinvite code"', /<title>Your Openinvite code<\/title>/.test(body), 'title');
  ok('the preheader: "It lasts ten minutes."', /display:none[^>]*>It lasts ten minutes\.<\/div>/.test(body), 'hidden, first');
  ok('the heading: "Nearly in."', /<h1[^>]*>Nearly in\.<\/h1>/.test(body), 'h1');
  ok('the body line', text.includes('Here is your code. Type it where you left off and you are through.'), 'body');
  ok('the line after the code', text.includes('It works for ten minutes. If you did not ask for it, ignore this and nothing happens.'), 'after');
  ok('and in that order: heading, body, code, closing line',
     text.indexOf('Nearly in.') < text.indexOf('Here is your code') && text.indexOf('Here is your code') < text.indexOf('{{otp_code}}') && text.indexOf('{{otp_code}}') < text.indexOf('It works for ten minutes'), 'order');

  console.log('\n  The code, the photo and the footer:\n');
  // BASE44'S PLACEHOLDER IS {{otp_code}}, read from the default template Base44
  // wrote into the app's code (2026-10-14). Any other name never fills, and
  // Base44 refuses a template without the code (missing_code).
  ok('the code is Base44\'s {{otp_code}}, once, in its box', (body.match(/\{\{otp_code\}\}/g) || []).length === 1, 'once');
  ok('  and no other placeholder name for it', !/\{\{\s*(code|verification_code|otp)\s*\}\}/.test(body), 'not {{code}}');
  ok('  at 40px, bold, letter-spaced, in Plus Jakarta Sans',
     /class="code" style="font-family:'Plus Jakarta Sans'[^"]*font-size:40px;font-weight:700;letter-spacing:12px;/.test(body), '40px');
  // THE GREY IS THE APP'S OWN TOKEN, read here rather than pinned as a hex:
  // the onboarding page's background, --background in src/index.css (owner,
  // 2026-10-13). If the token moves, this check moves with it.
  const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
  const m = css.match(/:root\s*\{[\s\S]*?--background:\s*(\d+)\s+(\d+)%\s+(\d+)%;/);
  const [hue, sat, light] = m ? [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100] : [0, 0, 0];
  const f = (n) => { const k = (n + hue / 30) % 12; const a = sat * Math.min(light, 1 - light);
    return Math.round(255 * (light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
  const grey = `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  ok('the grey comes from --background in src/index.css', !!m && grey === '#F5F5F5', `${m ? m.slice(1).join(' ') : 'missing'} -> ${grey}`);
  ok('  the code box is on that grey', new RegExp(`<td align="center" style="background:${grey};[^"]*">\\s*<div class="code"`).test(body), grey);
  ok('  and so is the page behind the card', new RegExp(`<body style="[^"]*background:${grey};`).test(body) && new RegExp(`style="background:${grey};padding:40px 16px;"`).test(body), grey);
  ok('  the card stays white and the code stays black', /class="card" style="[^"]*background:#ffffff;/.test(body) && /class="code" style="[^"]*color:#0A0A0A;/.test(body), 'white and black');
  ok('  and the old cream is gone, both values', !/#f6f4f1|#F6F2EC/i.test(body), 'no cream');
  ok('the photo is DTS_Tradition_Chris_Abatzis_Photos_ID9181_erzsi2 at 2:1, w_1200, f_auto, q_auto, anchored north so both figures show whole',
     body.includes('https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto,w_1200,c_fill,ar_2:1,g_north/DTS_Tradition_Chris_Abatzis_Photos_ID9181_erzsi2'), 'photo');

  console.log('\n  The full logo, not the mark alone:\n');
  // THE HOST MOVED ON 2026-10-14, and the move is the point.
  //
  // This pinned www.openinvite.com.au, which serves the file with
  // cross-origin-resource-policy: same-site. curl sees 200 and a valid PNG; a
  // browser, and therefore a mail client, refuses to render it cross-origin
  // (net::ERR_BLOCKED_BY_RESPONSE.NotSameSite). The logo was broken in every
  // inbox while every status check said it was fine.
  //
  // Cloudinary serves it with access-control-allow-origin: * and no CORP, so
  // the asset is the same bytes from a host that lets mail clients draw it.
  // Pinning the host is what keeps it from drifting back.
  ok('the logo is the full lockup PNG, about 160px wide, alt Openinvite',
     /<img src="https:\/\/res\.cloudinary\.com\/dsr84xknv\/image\/upload\/v\d+\/email-assets\/openinvite-logo-on-light-2x\.png" width="160" height="37" alt="Openinvite" style="display:block;width:160px;height:37px;border:0;" \/>/.test(body), 'lockup');
  ok('  and it is not served from a host that blocks it cross-origin',
     !/www\.openinvite\.com\.au\/email-assets/.test(body), 'not the same-site host');
  ok('  and the mark alone is gone', !/openinvite-icon-mark/.test(body), 'no mark-only image');
  ok('  and no SVG anywhere', !/\.svg\b|<svg/i.test(body), 'PNG only');
  const png = fs.readFileSync(path.join(ROOT, 'public/email-assets/openinvite-logo-on-light-2x.png'));
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  ok('  the PNG is 2x: 320 by 74, the asset\'s own proportions', png.slice(1, 4).toString() === 'PNG' && w === 320 && h === 74, `${w}x${h}`);
  ok('the footer closes as the house emails do', /Openinvite, Australia\. <a href="mailto:hello@openinvite\.com\.au"/.test(body), 'Australia and the support address');

  console.log('\n  Nothing of the Base44 default:\n');
  ok('no red header band', !/background(-color)?:\s*#e03553/i.test(body), 'no red block');
  ok('no all-caps wordmark', !/text-transform:\s*uppercase/i.test(body) && !/>\s*OPENINVITE\s*</.test(body), 'sentence case');
  ok('no em or en dash in the email', !/[–—]/.test(body), 'house style');

  return results;
}

/**
 * tests/persistence/gift-emails.mjs
 *
 * GIFTING V2, ITEM 2: THE TWO GIFT EMAILS, RENDERED, AND THE PREVIEW THAT
 * SENDS THEM ONLY TO THE OWNER'S TEST ADDRESS. goals/2026-10-11-gifting-v2.md.
 *
 * Every combination is rendered: both emails, Pro and Ultra, plain, serif and
 * handwriting. The rule the goal names is the first one checked: nothing a Pro
 * couple or giver reads names the Guest Suite, RSVP, song requests, the
 * registry or a website, in the HTML or the plain text. The preview endpoint
 * is driven with a stubbed sender, so the fixed recipient and the flag are
 * proved without sending anything.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export async function runGiftEmails() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Gifting v2, the two emails and their preview:\n');

  const emails = await import('../../api/_lib/giftEmails.js');
  const lib = await import('../../src/lib/giftingV2.js');
  const badge = await import('../../src/lib/planBadge.js');
  const preview = await import('../../api/gift-email-preview.js');
  const goal = readFileSync(resolve(ROOT, 'goals/2026-10-11-gifting-v2.md'), 'utf8');

  const base = { giver: 'Sam', names: 'Isla and Theo', email: 'isla.and.theo@example.com', note: 'For you two, with love, Sam', headlineKey: 'for_you', photoId: lib.DEFAULT_PHOTO_ID };
  const links = { to: 'couple@example.com', claimUrl: 'https://www.openinvite.com.au/gift/claim/t', editUrl: 'https://www.openinvite.com.au/gift/edit/t' };
  const all = [];
  for (const plan of ['pro', 'ultra']) for (const noteStyle of ['plain', 'serif', 'hand']) {
    all.push({ plan, noteStyle, kind: 'reveal', m: emails.buildRevealEmail({ ...base, plan, noteStyle }, links) });
    all.push({ plan, noteStyle, kind: 'confirmation', m: emails.buildConfirmationEmail({ ...base, plan, noteStyle }, links) });
  }
  check('twelve emails render: both kinds, both plans, all three note styles', all.length === 12 && all.every((e) => e.m.html.length > 2000 && e.m.text.length > 100));

  // ── the goal's rule, first ──────────────────────────────────────────────
  const FORBIDDEN = /Guest Suite|RSVP|song|registry|website/i;
  const proLeaks = all.filter((e) => e.plan === 'pro' && (FORBIDDEN.test(e.m.html) || FORBIDDEN.test(e.m.text) || FORBIDDEN.test(e.m.subject)));
  check('a Pro email never names the Guest Suite, RSVP, songs, the registry or a website', proLeaks.length === 0,
    proLeaks.map((e) => `${e.kind}/${e.noteStyle}`).join(', ') || '6 Pro emails, HTML, text and subject');
  check('  while the Ultra reveal names the Guest Suite', all.filter((e) => e.plan === 'ultra' && e.kind === 'reveal').every((e) => /Guest Suite/.test(e.m.html)));

  // ── the note styles, as ruled ───────────────────────────────────────────
  const noteOf = (e) => e.m.html;
  check('a plain note is live text, in Plus Jakarta Sans with Helvetica and Arial behind it',
    all.filter((e) => e.noteStyle === 'plain').every((e) => /white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;">For you two, with love, Sam<\/p>/.test(noteOf(e)) && /'Plus Jakarta Sans', Helvetica, Arial, sans-serif/.test(noteOf(e))));
  check('serif and handwriting notes are Cloudinary text images drawn for their box, never stretched, with the note as alt text',
    all.filter((e) => e.noteStyle !== 'plain').every((e) => /l_text:(Cormorant%20Garamond_47_line_spacing_3|Caveat_60_line_spacing_2):/.test(noteOf(e)) && /c_lpad,w_924,/.test(noteOf(e)) && !/c_fit|c_pad,/.test(noteOf(e)) && /alt="For you two, with love, Sam"/.test(noteOf(e))));

  // ── the plan, named by its badge, as an image ───────────────────────────
  const img = badge.PLAN_BADGE_EMAIL_IMAGE;
  check('the badge images are the uploaded renders of PlanBadge, one path per plan',
    /\/email-assets\/plan-badge-ultra\/3x-\d{14}\.png$/.test(img.ultra.url) && /\/email-assets\/plan-badge-pro\/3x-\d{14}\.png$/.test(img.pro.url));
  check('every email names its plan with the badge image, alt text the plan',
    all.every((e) => e.m.html.includes(`src="${img[e.plan].url}" alt="${e.plan === 'pro' ? 'Pro' : 'Ultra'}"`)));
  check('  and never as a drawn gradient a client might drop', all.every((e) => !/linear-gradient/.test(e.m.html)));

  // ── the confirmation's own parts ────────────────────────────────────────
  const conf = all.find((e) => e.kind === 'confirmation').m;
  check('the confirmation carries the claim link in its box and the edit page as an outlined button',
    conf.html.includes(lib.CONFIRM.linkBox) && conf.html.includes(`>${links.claimUrl}</a>`) && conf.html.includes(`href="${links.editUrl}"`) && /border:1\.5px solid/.test(conf.html));
  const sched = emails.buildConfirmationEmail({ ...base, plan: 'ultra' }, { ...links, sendDate: 'Saturday 14 November' });
  check('  and, when the reveal is scheduled, says when it will go instead', /We will send it on Saturday 14 November at 9 am where they are\./.test(sched.html) && !/We have sent it to/.test(sched.html));
  check('the confirmation photo is 2:1, the reveal photo 6:5', /ar_2:1/.test(conf.html) && /ar_6:5/.test(all[0].m.html));
  check('every email is from hello@openinvite.com.au with Reply-To there too', all.every((e) => e.m.from === 'Openinvite <hello@openinvite.com.au>' && e.m.replyTo === 'hello@openinvite.com.au'));
  const copy = [lib.CONFIRM.subject, lib.CONFIRM.preheader, lib.CONFIRM.heading, lib.CONFIRM.body, lib.CONFIRM.linkBox, lib.CONFIRM.forward, lib.CONFIRM.receipt, lib.CONFIRM.button, lib.CONFIRM.footer];
  const missing = copy.filter((t) => !goal.includes(t));
  check('the confirmation copy is the goal\'s, verbatim', missing.length === 0, missing.join(' | ') || `${copy.length} lines`);
  check('no em or en dash in either email', all.every((e) => !/[–—]/.test(e.m.html + e.m.text)));

  // ── the preview endpoint: the flag, POST, and one fixed recipient ───────
  const sent = [];
  const resend = { emails: { send: async (m) => { sent.push(m); return { error: null }; } } };
  const call = async (env, method, body) => {
    let status = 0; let json = null;
    const res = { status: (s) => { status = s; return { json: (j) => { json = j; return res; } }; } };
    await preview.default({ method, body }, res, { env, resend });
    return { status, json };
  };
  const off = await call({}, 'POST', {});
  check('the preview is a 404 with the flag off', off.status === 404 && sent.length === 0);
  const get = await call({ GIFTING_V2: '1' }, 'GET', {});
  check('  and refuses anything but POST', get.status === 405 && sent.length === 0);
  const ok = await call({ VERCEL_ENV: 'preview' }, 'POST', { plan: 'pro', noteStyle: 'hand', to: 'someone@else.com' });
  check('on a preview deploy it sends both emails', ok.status === 200 && sent.length === 2 && /gifted you Openinvite Pro/.test(sent[0].subject) && /on its way/.test(sent[1].subject));
  check('  to la.jay06+notiftest01 only, whatever the request asks', sent.every((m) => m.to === 'la.jay06+notiftest01@gmail.com') && preview.PREVIEW_RECIPIENT === 'la.jay06+notiftest01@gmail.com');
  check('  tagged as a preview', sent.every((m) => m.tags?.some((t) => t.name === 'kind' && t.value === 'gift_preview')));
  const src = readFileSync(resolve(ROOT, 'api/gift-email-preview.js'), 'utf8');
  check('the endpoint never reads a recipient from the request', !/req\.body[^\n]*\bto\b|body\.to|req\.query/.test(src));

  return r;
}

/**
 * tests/persistence/event-details-no-address.mjs
 *
 * THE DASHBOARD STOPS SHOWING THE SITE ADDRESS, AND THE CAPABILITY MOVES.
 *
 * Item 3 of goals/2026-10-08-site-fixes-batch-1.md, under the owner's ruling
 * of 2026-10-08: remove the whole "Your address" section from Event details,
 * do not delete ChangeAddressDialog, and give Settings a single "Change site
 * address" button beside Password protection with item 12.
 *
 * ── WHY THE WHOLE SECTION AND NOT THE ONE LINE ─────────────────────────────
 *
 * The item said "remove the line that shows openinvite.com.au/<slug>", and
 * that line sat under a heading called "Your address", beside a Change address
 * button, with an empty state behind it. Removing the line alone leaves a
 * heading with no address and a button to change something invisible, so the
 * reading was referred up and ruled on rather than guessed.
 *
 * ── THE CAPABILITY LANDED, AND THIS IS NOW BOTH HALVES ────────────────────
 *
 * Item 3 removed the only caller of ChangeAddressDialog and item 12a added the
 * new one: a single "Change site address" button beside Password protection in
 * src/components/studio/guest-suite/StudioShareTab.jsx. In between, the
 * component had no caller at all, which is exactly the state a later tidy-up
 * would delete as dead code, so the "still exists" check below stays whatever
 * else changes.
 *
 * THERE IS NO src/pages/Settings.jsx, which is what the item meant by
 * "Settings": the share controls it describes and Password protection live in
 * StudioShareTab, with more in src/components/website-builder/PublishModal.jsx
 * and WBRightPanel.jsx. 12a's ruling named StudioShareTab, so that is the page
 * this guard follows the capability to.
 *
 * ── WHAT 12a ASSERTS, AND WHY IT IS A SOURCE READ ─────────────────────────
 *
 * The question is "does any surface still hand a guest the site by link", and
 * the honest form of that is an absence across three files. A browser can only
 * visit the states it thinks to visit: it would have to open the builder's
 * Settings tab, the publish modal on each of its tabs, and the guest suite's
 * share tab, and a control behind a condition nobody rendered reads as absent
 * either way. Reading the source finds a surviving Copy button whether or not
 * anyone thought to look at the tab it sits on.
 *
 * The one thing this CANNOT see is whether the surviving controls still work,
 * which is what scripts/test-settings-tab.mjs and test-slug-claim.mjs already
 * browse for. Both still pass; neither reads anything 12a removed.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
/**
 * COMMENTS OUT, AND ONLY COMMENTS.
 *
 * This was one naive expression stripping every block-comment pair, and on
 * WBRightPanel.jsx it ate SIXTY LINES OF LIVE CODE, including the whole
 * password-protection block this guard is here to prove survived. The cause is
 * one attribute on the background-music file input: `accept="audio/*"`. Its
 * slash-star opens a comment as far as that regex is concerned, and the next
 * star-slash sits inside a real comment five dozen lines later.
 *
 * THE CHECK THAT CAUGHT IT WAS THE POSITIVE ONE. Every absence assertion
 * around it went green against a blanked-out file, which is exactly the shape
 * of a guard passing for the wrong reason: delete the thing it guards and it
 * still passes, because the text was gone before the test looked.
 *
 * So a comment has to START ITS OWN LINE here, which every real comment in
 * these files does and no attribute value can. JSX brace-comments are taken
 * first, because those open with a brace rather than at the margin.
 *
 * FOUR OTHER GUARDS read WBRightPanel.jsx through the same naive expression:
 * content-tab-page-scoped, guest-note-form, guest-suite-editor and
 * show-motif-toggle. They are reading the same blanked sixty lines. That is
 * REPORTED with this change rather than fixed inside it: the fix wants one
 * shared helper, and a PR about share controls is not where five guards
 * should quietly change which source they read.
 */
const code = (src) => src
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
  .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

export async function runEventDetailsNoAddress() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── ITEM 3: EVENT DETAILS ───────────────────────────────────────────────

  const page = code(read('src/pages/EventDetails.jsx'));
  ok('Event details renders no "Your address" heading', !/Your address/.test(page), 'gone');
  ok('  and no openinvite.com.au anywhere on the page',
     !/openinvite\.com\.au/.test(page), 'no URL printed');
  ok('  nor the slug under another label',
     !/data-wedding-address/.test(page), 'the marked element is gone');
  ok('  and no Change address control',
     !/data-change-address/.test(page) && !/Change address/.test(page), 'gone');
  // THE EMPTY STATE WENT TOO, because it is the same section in its other
  // state: a page that says "your address appears here" and never shows one
  // is worse than silence.
  ok('  and no empty state promising an address later',
     !/address appears here/i.test(page), 'gone');
  // NOTHING ELSE ON THE PAGE CHANGED, which the item asked for. The three
  // sections that bracketed the address are still in place and in order.
  const order = ['Couple', 'The date', 'Guest count'].map((h) => page.indexOf(`<SectionHeading>${h}`));
  ok('the sections around it are untouched and in order',
     order.every((i) => i > -1) && order[0] < order[1] && order[1] < order[2], order.join(' < '));

  // ── THE COMPONENT SURVIVES THE REMOVAL ──────────────────────────────────

  ok('ChangeAddressDialog still exists',
     exists('src/components/event-details/ChangeAddressDialog.jsx'), 'not deleted');
  ok('  and Event details no longer imports it',
     !/ChangeAddressDialog/.test(page), 'its caller moved');

  // ── ITEM 12a: THE THREE SHARING SURFACES ────────────────────────────────
  //
  // "StudioShareTab, PublishModal and WBRightPanel lose Copy, Copy Link,
  // WhatsApp and QR and any URL display; password protection untouched."
  //
  // Each file is read with comments STRIPPED, which matters more here than
  // usual: every one of these three carries a comment explaining why the
  // control it used to have is gone, and those comments name the control.
  // A guard reading raw source would fail on its own explanation.
  const SURFACES = [
    ['the guest suite share tab', 'src/components/studio/guest-suite/StudioShareTab.jsx'],
    ['the publish modal',         'src/components/website-builder/PublishModal.jsx'],
    ["the builder's right panel", 'src/components/website-builder/WBRightPanel.jsx'],
  ];
  for (const [what, file] of SURFACES) {
    const src = code(read(file));
    // A DISPLAY, NOT AN OCCURRENCE. The first version banned the literal
    // "openinvite.com.au" anywhere in the file and went red on PublishModal
    // for its `siteHost` fallback, used when there is no window, and for the
    // default email body, which is the one channel the ruling KEEPS. What has
    // to be gone is the address RENDERED: a label announcing it, or siteUrl
    // and the slug as JSX children. Those are what a couple read off a screen.
    ok(`${what} announces no URL`, !/YOUR URL|Your URL|Your site URL/.test(src), 'no such label');
    ok('  and renders neither the address nor the slug',
    // `[^$]` BEFORE EACH BRACE, and that is the whole difference between a
    // rendered address and a template literal. `${siteUrl || ...}` is the
    // default email body, which is the channel the ruling keeps; `{siteUrl ||
    // ...}` with no dollar is a JSX child, which is the thing being removed.
    // The first pass left the dollar out of this one pattern and went red on
    // the email body it is supposed to allow.
       !/[^$]\{siteUrl\}/.test(src) && !/[^$]\{siteUrl \|\|/.test(src)
         && !/openinvite\.com\.au\/w\/\{/.test(src) && !/>\{details\??\.slug/.test(src),
       'no address on screen');
    ok('  and copies nothing to the clipboard', !/clipboard/.test(src), 'no Copy control');
    ok('  and opens no WhatsApp, SMS or Facebook share',
       !/wa\.me|sms:\?body|facebook\.com\/sharer/.test(src), 'no third-party share');
    ok('  and draws no QR', !/qrcode|qrSvg|qrPng/.test(src), 'no encoder, no canvas');
    // PASSWORD PROTECTION IS THE THING THAT MUST SURVIVE, and it is asserted
    // positively rather than by the absence of a removal. A sweep that took
    // the password toggle with the share controls would pass every check
    // above it.
    ok('  and password protection is still here',
       /passwordGate/.test(src) && /wantsProtection/.test(src), 'the gate hook and its toggle');
  }

  // ── THE ONE CONTROL THAT TOUCHES THE ADDRESS ────────────────────────────
  const share = read('src/components/studio/guest-suite/StudioShareTab.jsx');
  const shareCode = code(share);
  ok('the share tab imports ChangeAddressDialog',
     /^import ChangeAddressDialog from/m.test(shareCode), 'a real import line');
  ok('  and renders it', /<ChangeAddressDialog/.test(shareCode), 'mounted');
  ok('  behind one "Change site address" button',
     (shareCode.match(/Change site address/g) || []).length === 1, 'exactly one');
  ok('  marked for the browser to find',
     /data-change-site-address/.test(shareCode), 'data-change-site-address');
  ok('  and that button is what opens the dialog',
     /data-change-site-address[\s\S]{0,120}setAddressOpen\(true\)/.test(shareCode)
       && /addressOpen &&[\s\S]{0,80}<ChangeAddressDialog/.test(shareCode), 'one opener, one dialog');
  // IT SITS IN THE PASSWORD CARD, which is where the ruling put it.
  //
  // ANCHORED ON THE CARD'S CONTENTS, NOT ON A CHARACTER COUNT. The first
  // version allowed 2200 characters between "Password Protection" and the
  // button and measured 2894, which is not a finding about the layout, it is
  // a finding about the number I guessed. The card holds exactly two other
  // controls, Password Protection and Hide from Search; a button after both of
  // them, and after the centre column has closed, is in that card and nowhere
  // else on the page.
  const pwAt = shareCode.indexOf('Password Protection');
  const hideAt = shareCode.indexOf('Hide from Search');
  const btnAt = shareCode.indexOf('Change site address');
  const emailAt = shareCode.indexOf('Email Your Guests');
  ok('  in the same card as password protection and Hide from search',
     pwAt > -1 && hideAt > pwAt && btnAt > hideAt, `password ${pwAt} < hide ${hideAt} < button ${btnAt}`);
  ok('  and not back in the email column',
     emailAt > -1 && btnAt > emailAt, 'after the centre column closes');

  // ── AND THE DIALOG TELLS THE TRUTH ABOUT LINKS ALREADY SENT ─────────────
  //
  // 12a's ruling offered a line to add IF the dialog did not warn about
  // already-sent invitations: "Changing the address breaks every invitation
  // link already sent." It is NOT added, because it is false: the old slug
  // goes onto previousSlugs and both resolvers read it. What the dialog said
  // instead was also false, in the other direction, claiming invitation links
  // "do not use this address" when buildGuestCtaUrl puts the slug in every
  // one. This pins the corrected sentence and the two facts under it.
  const dialog = code(read('src/components/event-details/ChangeAddressDialog.jsx'));
  ok('the address dialog no longer claims sent links avoid the address',
     !/do not use this address/.test(dialog), 'the false sentence is gone');
  ok('  and says they contain it and keep working',
     /do contain the old address/.test(dialog) && /redirects to the new one/.test(dialog), 'both halves');
  ok('  and does not claim they break',
     !/breaks every invitation link/.test(dialog), 'the offered line is not added');
  const tmpl = code(read('src/lib/emailTemplate.js'));
  ok('  which is true because the sent link carries the slug',
     /\/w\/|siteUrl/.test(tmpl) && /rsvp=/.test(tmpl), 'buildGuestCtaUrl appends ?rsvp= to the site URL');
  const changeApi = code(read('api/change-address.js'));
  ok('  and the old address is kept as an alias',
     /previousSlugs:\s*withAlias/.test(changeApi), 'change-address writes previousSlugs');
  for (const resolver of ['api/wedding-by-slug.js', 'api/guest-page.js']) {
    ok(`  and ${resolver.replace('api/', '')} resolves by it`,
       /previousSlugsOf/.test(code(read(resolver))), 'the alias is read on the way in');
  }

  return results;
}

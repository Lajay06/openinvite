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
 * ── THE COMPONENT IS DELIBERATELY UNCALLED UNTIL ITEM 12 ───────────────────
 *
 * Item 3 removes the only caller of ChangeAddressDialog; item 12 adds the new
 * one, a single "Change site address" button beside Password protection. In
 * between, the component has no caller at all, which is exactly the state a
 * later tidy-up would delete as dead code. So this guard pins that the file
 * still EXISTS, and says here why it looks orphaned.
 *
 * ITEM 12 EXTENDS THIS GUARD with the other half: that the sharing page opens
 * the dialog from that button, and that it prints no URL, no slug and no
 * copyable link. Those are NOT asserted yet, on purpose. A guard that fails
 * until a later item lands is a red gate on every PR in between, and the one
 * thing a guard must never be is a reason to ignore CI.
 *
 * WHICH PAGE THAT IS, for whoever picks item 12 up: there is no
 * src/pages/Settings.jsx. The share controls the item describes (Copy link,
 * Share on WhatsApp, QR code) and Password protection live in
 * src/components/studio/guest-suite/StudioShareTab.jsx, with more in
 * src/components/website-builder/PublishModal.jsx and WBRightPanel.jsx. Item
 * 12 names the page it means and this guard follows it there.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

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

  return results;
}

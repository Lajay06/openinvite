/**
 * tests/persistence/send-invites-page.mjs
 *
 * SEND INVITES IS A PAGE.
 *
 * Owner ruling 2026-09-07: "replace the half-width side panel with its own
 * route/page (full width), same steps and layout logic."
 *
 * THE FLOW IS NOT REBUILT, and that is the property this file protects. The
 * page hands the guests to the SAME component with `asPage` swapping the
 * chrome. A second flow would have been a second answer to "who are we
 * sending to, and what goes out" — the one question a send flow must not have
 * two of. Nothing about what is sent, or to whom, changes.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

export async function runSendInvitesPage() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Send invites is a page:\n');

  const page = code('src/pages/SendInvites.jsx');
  const flow = code('src/components/guests/SendInvitesModal.jsx');
  const guests = code('src/pages/Guests.jsx');
  const cfg = code('src/pages.config.js');

  // ── THE ROUTE ───────────────────────────────────────────────────────────
  check('PLANT: /SendInvites is a routed page',
    /"SendInvites": SendInvites/.test(cfg) && /import\('\.\/pages\/SendInvites'\)/.test(cfg),
    'in the Pages map, lazy like the rest');
  check('  the guest list navigates to it rather than opening a panel',
    /navigate\('\/SendInvites', \{ state: config \}\)/.test(guests) && !/<SendInvitesModal/.test(guests),
    'the sheet is gone from Guests.jsx');
  check('  and the selection travels with it',
    /goToSend\(selectedIds\.size > 0/.test(guests) && /location\.state \|\| \{\}/.test(page),
    'router state, so the flow starts on the guests that were ticked');
  check('  a direct visit is a valid state',
    /const config = location\.state \|\| \{\}/.test(page) && /initialType=\{config\.type \|\| 'invite'\}/.test(page),
    '/SendInvites with no state means everyone');

  // ── ONE FLOW, TWO FRAMES ────────────────────────────────────────────────
  check('PLANT: the page reuses the flow, it does not fork it',
    /<SendInvitesModal\s*\n?\s*asPage/.test(page), 'same component');
  check('  the frame is the only thing that changes',
    /function Shell\(\{ mounted, asPage, onClose, type, children \}\)/.test(flow)
      && /if \(asPage\)/.test(flow), 'a page frame or the sheet, same children');
  check('  the page frame is full width',
    /minHeight: 'calc\(100vh - 48px\)'/.test(flow) && !/width: 'min\(94vw, 1240px\)'[\s\S]{0,80}asPage/.test(flow),
    'no 1240px cap on the page');
  check('  all four steps are still one flow',
    ['step === 1', 'step === 2', 'step === 3', 'step === 4'].every((k) => flow.includes(k)),
    'Select guests · Compose · Channel · Review & send');
  check('  and the review step still comes before the send',
    flow.indexOf('step === 4') > flow.indexOf('step === 3')
      && /step < 4 \? \(/.test(flow), 'Next up to 4, Send only at 4');

  // ── WHAT A PAGE OWES THAT A PANEL DID NOT ───────────────────────────────
  check('PLANT: a page leaves, it does not close',
    /Back to guest list/.test(flow) && /asPage \?/.test(flow),
    'an × on a full-width page reads as a modal that forgot it is a page');
  check('PLANT: Next/Back and the test-send clear the Ava corner',
    (flow.match(/oi-ava-safe/g) || []).length >= 2 && /padding: '16px 96px 16px 32px'/.test(flow),
    'the collision the owner found');

  // ── AND NOTHING ABOUT THE SEND ITSELF MOVED ─────────────────────────────
  check('PLANT: the send path is untouched',
    (flow.match(/fetch\('\/api\/send-invites'/g) || []).length === 2,
    'the same two calls: the test send and the real one');

  return results;
}

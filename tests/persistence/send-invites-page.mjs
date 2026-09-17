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
 *
 * ── AND SAVE THE DATE IS A TYPE YOU CAN ACTUALLY PICK (Run 5 T14) ──────────
 *
 * The owner reported it missing from "Choose the email type". It was not
 * missing: `save_the_date` is the first key of TYPE_CONFIG, so EMAIL_TYPES has
 * always carried it and the drawer has always drawn a pill for it — an EMPTY
 * one, because TYPE_LABELS had no entry, and every use of
 * `TYPE_LABELS[type].toLowerCase()` (drawer title, toast, send button) throws
 * on undefined. An unlabelled chip that breaks the drawer if pressed is worse
 * than an absent one, and it is why "add it to the list" was the wrong fix:
 * the list was right and the NAME was missing.
 */
import { pass, fail } from './_shared.mjs';
import { EMAIL_TYPES } from '../../src/lib/emailTemplate.js';
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


  // ── SAVE THE DATE: FIRST, NAMED, AND RECORDED HONESTLY ──────────────────
  {
    const modal = code('src/components/guests/SendInvitesModal.jsx');
    const tmpl = code('src/lib/emailTemplate.js');

    // THE ARRAY THE DRAWER ACTUALLY MAPS, imported and read — not the source
    // order of TYPE_CONFIG. A plant proved the difference: filtering
    // `save_the_date` out of EMAIL_TYPES left every source-text check green
    // while the pill disappeared from the drawer. The list is the thing, so
    // the list is what is measured.
    check('save the date is the first type offered',
      EMAIL_TYPES[0] === 'save_the_date', `EMAIL_TYPES: ${EMAIL_TYPES.slice(0, 3).join(' · ')}…`);
    check('  and it is still in the list at all',
      EMAIL_TYPES.includes('save_the_date'), `${EMAIL_TYPES.length} types offered`);
    check('  and the drawer renders the list, not a copy of it',
      /EMAIL_TYPES\.map\(/.test(modal), 'EMAIL_TYPES.map — one source for the order');

    // The name it was missing. Without it the pill is blank AND the drawer
    // throws the moment the type is chosen.
    const labels = modal.slice(modal.indexOf('export const TYPE_LABELS'), modal.indexOf('export const TYPE_LABELS') + 500);
    check('  it has a label, so the pill is not blank', /save_the_date:\s*'Save the date'/.test(labels),
      /save_the_date/.test(labels) ? 'labelled' : 'TYPE_LABELS has no entry — the pill is empty and the drawer throws on select');
    check('  and it is the first label too', labels.indexOf('save_the_date') < labels.indexOf('invite:'),
      'the map reads in the order the drawer draws');
    check('  and a default filter, so choosing it does not throw',
      /save_the_date:\s*'(all|not_invited)'/.test(modal), 'TYPE_DEFAULT_FILTER covers it');

    // The card opens the drawer already on that type — the plumbing that
    // already existed, pinned so it cannot be quietly dropped.
    const gallery = code('src/components/guests/EmailTemplates.jsx');
    const guests = code('src/pages/Guests.jsx');
    const sendPage = code('src/pages/SendInvites.jsx');
    check('  the template card opens the drawer pre-selected',
      /onUseTemplate\?\.\(type\)/.test(gallery)
      && /onUseTemplate=\{\(t\) => goToSend\(\{ type: t \}\)\}/.test(guests)
      && /initialType=\{config\.type \|\| 'invite'\}/.test(sendPage),
      'card -> goToSend({type}) -> initialType');

    // THE RECORDING RULE, AND WHY IT IS NOT "LIKE AN INVITATION".
    const writesInvite = /if \(type === 'invite' \|\| type === 'reminder'\) \{/.test(modal);
    check('  a save-the-date does NOT mark guests invited', writesInvite,
      writesInvite ? 'only invite/reminder write invite_sent_at'
        : 'the write-back condition changed — a save-the-date may now be marking guests invited');
    check('    which is what keeps "Not yet invited" honest',
      /filter === 'not_invited'\) list = guests\.filter\(g => !g\.invite_sent_at\)/.test(modal),
      'the invitation send reads invite_sent_at, so an announcement must not set it');
  }

  return results;
}

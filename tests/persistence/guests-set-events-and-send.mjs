/**
 * tests/persistence/guests-set-events-and-send.mjs
 *
 * "SET EVENTS & SEND" IS REACHABLE FROM A GUEST ROW.
 *
 * Fix batch 1, item 1. Guests.jsx defined handleSetEventsAndSend (open
 * SetEventsModal for one guest, then the send flow with that guest selected)
 * and nothing called it: the inline button that used to reach it went when
 * the status chips replaced it, and the handler was left behind. A handler
 * with no caller reads exactly like a working feature in a code review, so
 * this reads the whole path rather than the handler alone.
 *
 * The plant: delete the onSetEventsAndSend prop from the <GuestList> call in
 * Guests.jsx and the first check goes red.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => stripComments(readFileSync(join(ROOT, p), 'utf8'));

export function runGuestsSetEventsAndSend() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  console.log('\n  Set events & send is wired from the row to the existing flow:\n');

  const page = code('src/pages/Guests.jsx');
  const list = code('src/components/guests/GuestList.jsx');

  const call = page.slice(page.indexOf('<GuestList'), page.indexOf('/>', page.indexOf('<GuestList')));
  ok('Guests.jsx hands handleSetEventsAndSend to GuestList',
     /onSetEventsAndSend=\{[^}]*handleSetEventsAndSend\}/.test(call), 'prop on the <GuestList> call');
  ok('  and withholds it when the page is read-only',
     /onSetEventsAndSend=\{readOnly[^}]*\?\s*undefined\s*:\s*handleSetEventsAndSend\}/.test(call), 'readOnly ? undefined');

  const handler = page.slice(page.indexOf('const handleSetEventsAndSend'), page.indexOf('const handleEditEvents'));
  ok('the handler opens the existing SetEventsModal for that one guest',
     /setSetEventsGuests\(\[guest\]\)/.test(handler) && /setAutoSendAfterSetEvents\(guest\.id\)/.test(handler), 'setSetEventsGuests([guest])');
  const saved = page.slice(page.indexOf('const handleSetEventsSaved'), page.indexOf('const handleSetEventsSaved') + 400);
  ok('  and saving it opens the existing send flow with that guest selected',
     /autoSendAfterSetEvents[\s\S]*goToSend\(\{\s*initialSelectedIds:\s*\[autoSendAfterSetEvents\]/.test(saved), 'goToSend');

  const sig = list.slice(list.indexOf('export default function GuestList'), list.indexOf('}) {', list.indexOf('export default function GuestList')));
  ok('GuestList accepts onSetEventsAndSend', /\bonSetEventsAndSend\b/.test(sig), 'in the props');
  const menu = list.slice(list.indexOf('<DropdownMenuContent'), list.indexOf('</DropdownMenuContent>'));
  ok('the row actions menu has an item that calls it',
     /<DropdownMenuItem[^>]*onClick=\{\(\) => onSetEventsAndSend\(guest\)\}/.test(menu), 'DropdownMenuItem');
  ok('  offered only to a guest who has not been sent an invitation, when there are events',
     /onSetEventsAndSend && !guest\.invite_sent_at && weddingEvents\.length > 0/.test(menu), 'invite_sent_at, weddingEvents');
  ok('  labeled "Set events & send"', /Set events &amp; send/.test(menu), 'label');

  return results;
}

/**
 * tests/persistence/delete-a-note.mjs
 *
 * A COUPLE CAN DELETE THEIR OWN NOTE, AND ONLY THEIR OWN.
 *
 * Item 5 of goals/2026-10-10-bounces-and-notes.md. The item names one thing to
 * guard, "a caller cannot delete another account's note", and that is the
 * check this file exists for; the rest is here because a delete is the one
 * irreversible action on the endpoint and the order of its gates is the whole
 * of its safety.
 *
 * WHY THE SERVER SCOPE NEEDS DRIVING, NOT READING. GuestMessage.read RLS is
 * null, so any authenticated account can fetch any note by id and the platform
 * will not stop it. The only boundary is the wedding_id match written in
 * api/guest-note-update.js. A guard that read that line as text would pass
 * against a handler that checked it AFTER deleting, or that compared the wrong
 * pair, so this drives the real handler through the deps seam and watches
 * whether a delete reaches the entity at all.
 *
 * THE FOREIGN NOTE IS REPORTED MISSING, NOT FORBIDDEN, and that is asserted as
 * a fact about the status code: a 403 would confirm to a prober that the id
 * exists, which is a different leak from the one the check prevents.
 *
 * A FRESH IP PER CALL. The endpoint rate limits 60 a minute per address and
 * this file makes more calls than that in a run.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from '../../api/guest-note-update.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

const MINE = 'wedding_mine';
const THEIRS = 'wedding_theirs';
const CALLER = 'user_caller';

/** The narrowest req/res pair the handler needs. */
function harness(body) {
  const res = {
    statusCode: null, payload: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(p) { this.payload = p; return this; },
  };
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer not-a-real-token', origin: 'https://openinvite.com.au' },
    socket: { remoteAddress: `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}` },
    body,
  };
  return { req, res };
}

/**
 * One call against a world of two weddings and two notes.
 * Everything the handler touches is recorded, including what it did NOT touch.
 */
async function call(body, { note, wedding = { id: MINE }, over = {} } = {}) {
  const deleted = [];
  const updated = [];
  const { req, res } = harness(body);
  const lines = [];
  const real = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...a) => lines.push(a.join(' '));
  console.warn = (...a) => lines.push(a.join(' '));
  console.error = (...a) => lines.push(a.join(' '));
  try {
    await handler(req, res, {
      hasKey: () => true,
      verify: async () => ({ id: CALLER }),
      list: async () => (wedding ? [{ ...wedding, created_date: '2026-01-01' }] : []),
      getOne: async (_e, id) => (note && note.id === id ? note : null),
      update: async (...a) => { updated.push(a); },
      remove: async (...a) => { deleted.push(a); },
      ...over,
    });
  } catch (err) {
    // A THROW IS A RED. The endpoint's own catch returns 500; anything
    // escaping it is a defect, and it must fail an assertion rather than take
    // this file down.
    return { status: 'THREW', body: { error: err.message }, deleted, updated, lines, threw: err };
  } finally {
    Object.assign(console, real);
  }
  return { status: res.statusCode, body: res.payload, deleted, updated, lines, threw: null };
}

const myNote = { id: 'note_mine', wedding_id: MINE, read: false };
const theirNote = { id: 'note_theirs', wedding_id: THEIRS, read: false };

export async function runDeleteANote() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const endpoint = code('api/guest-note-update.js');
  const live = stripComments(endpoint, { trailing: true });
  const page = code('src/pages/Messages.jsx');
  const entities = stripComments(code('api/_lib/base44Entities.js'), { trailing: true });

  // ── 1. The server scope, which is what the item asks to guard ─────────
  const foreign = await call({ noteId: theirNote.id, action: 'delete' }, { note: theirNote });
  ok('a caller cannot delete another account’s note',
     foreign.deleted.length === 0, `${foreign.deleted.length} delete(s) reached the entity`);
  ok('  and it is reported missing, not forbidden',
     foreign.status === 404 && foreign.body?.error === 'Note not found',
     `${foreign.status} ${foreign.body?.error}`);
  ok('  nor can they reach it by any other action',
     (await call({ noteId: theirNote.id, action: 'read' }, { note: theirNote })).status === 404
       && (await call({ noteId: theirNote.id, action: 'reply', replyText: 'hi' }, { note: theirNote })).status === 404,
     'read and reply refused too');

  const mine = await call({ noteId: myNote.id, action: 'delete' }, { note: myNote });
  ok('a caller can delete their own note',
     mine.status === 200 && mine.body?.ok === true, `${mine.status}`);
  ok('  and exactly one row goes, the one named',
     mine.deleted.length === 1 && mine.deleted[0][0] === 'GuestMessage' && mine.deleted[0][1] === myNote.id,
     JSON.stringify(mine.deleted));
  ok('  with nothing patched on the way',
     mine.updated.length === 0, `${mine.updated.length} update(s)`);
  ok('  and it is recorded in the log',
     mine.lines.some((l) => /note deleted by user_caller/.test(l)), mine.lines.join(' | ') || '(nothing logged)');

  const noSuchNote = await call({ noteId: 'note_ghost', action: 'delete' }, { note: null });
  ok('a note that does not exist deletes nothing',
     noSuchNote.status === 404 && noSuchNote.deleted.length === 0, `${noSuchNote.status}`);

  const noWedding = await call({ noteId: myNote.id, action: 'delete' }, { note: myNote, wedding: null });
  ok('an account with no wedding deletes nothing',
     noWedding.status === 404 && noWedding.deleted.length === 0
       && noWedding.body?.error === 'No wedding found for this account',
     `${noWedding.status} ${noWedding.body?.error}`);

  // A TEST WEDDING MUST NOT BE THE ONE THAT RESOLVES. The exclusion predates
  // this item, and a delete is why it matters more here than anywhere: if a
  // test row resolved, the ownership comparison would be made against the
  // wrong wedding and a real note would look foreign, or worse. Found by a
  // plant that removed the filter and went unnoticed.
  const withTestRow = await (async () => {
    const deleted = [];
    const { req, res } = harness({ noteId: myNote.id, action: 'delete' });
    await handler(req, res, {
      hasKey: () => true,
      verify: async () => ({ id: CALLER }),
      list: async () => [
        { id: 'wedding_test', is_test: true, created_date: '2026-06-01' },
        { id: MINE, created_date: '2026-01-01' },
      ],
      getOne: async () => myNote,
      update: async () => {},
      remove: async (...a) => { deleted.push(a); },
    });
    return { status: res.statusCode, deleted };
  })();
  ok('a test wedding is not the wedding that resolves, even when it is newer',
     withTestRow.status === 200 && withTestRow.deleted.length === 1,
     `${withTestRow.status}, ${withTestRow.deleted.length} delete(s)`);

  const anon = await call({ noteId: myNote.id, action: 'delete' }, { note: myNote, over: { verify: async () => null } });
  ok('an unauthenticated caller deletes nothing',
     anon.status === 401 && anon.deleted.length === 0, `${anon.status}`);

  const noKey = await call({ noteId: myNote.id, action: 'delete' }, { note: myNote, over: { hasKey: () => false } });
  ok('a server with no admin key deletes nothing',
     noKey.status === 500 && noKey.deleted.length === 0, `${noKey.status}`);

  const getMethod = await (async () => {
    const { req, res } = harness({ noteId: myNote.id, action: 'delete' });
    req.method = 'GET';
    const seen = [];
    await handler(req, res, { hasKey: () => true, verify: async () => ({ id: CALLER }), remove: async (...a) => seen.push(a) });
    return { status: res.statusCode, seen };
  })();
  ok('a GET deletes nothing',
     getMethod.status === 405 && getMethod.seen.length === 0, `${getMethod.status}`);

  const bogus = await call({ noteId: myNote.id, action: 'destroy' }, { note: myNote });
  ok('an action this endpoint does not know deletes nothing',
     bogus.status === 400 && bogus.deleted.length === 0, `${bogus.status}`);

  const noId = await call({ action: 'delete' }, { note: myNote });
  ok('a delete with no note id is refused',
     noId.status === 400 && noId.deleted.length === 0, `${noId.status}`);

  const broken = await call({ noteId: myNote.id, action: 'delete' },
    { note: myNote, over: { remove: async () => { throw new Error('base44 is down'); } } });
  ok('a failed delete is a 500, not an escaped throw',
     broken.threw === null && broken.status === 500, `${broken.status}`);

  // ── 2. The order of the gates ─────────────────────────────────────────
  //
  // The ownership check must sit ABOVE the delete in the source, not merely
  // return the right status: a handler that deleted first and then checked
  // would pass every assertion above except this one.
  const ownershipAt = live.indexOf("note.wedding_id !== wedding.id");
  const deleteAt = live.indexOf("await remove('GuestMessage'");
  ok('the ownership check is written above the delete, not beside it',
     ownershipAt > 0 && deleteAt > ownershipAt, `check at ${ownershipAt}, delete at ${deleteAt}`);
  ok('  and the delete is the only call that removes a row',
     (live.match(/await remove\(/g) || []).length === 1, 'one call site');
  ok('delete is a declared action on the existing endpoint, not a new route',
     /const ACTIONS = \['read', 'unread', 'reply', 'delete'\]/.test(live), 'ACTIONS');

  // ── 3. It really goes ─────────────────────────────────────────────────
  ok('the admin helper deletes rather than flagging',
     /adminFetch\('DELETE', entityPath\(entity, `\/\$\{encodeURIComponent\(id\)\}`\)\)/.test(entities),
     'DELETE');
  ok('  and nothing in the delete path writes a hidden flag instead',
     !/deleted(_at)?:\s/.test(live), 'no soft delete');

  // ── 4. The page ───────────────────────────────────────────────────────
  ok('the confirm sentence is the owner’s, verbatim',
     page.includes("const DELETE_CONFIRM = 'Delete this note? It goes for good.';"), 'verbatim');
  ok('  and it is what the confirm renders',
     /data-delete-confirm[\s\S]{0,600}\{DELETE_CONFIRM\}/.test(page), 'rendered');
  ok('  with Keep and Delete, in that order',
     /data-delete-confirm[\s\S]{0,1200}>\s*Keep\s*<[\s\S]{0,600}>\s*Delete\s*</.test(page),
     'Keep first');
  ok('the confirm is inline, not a modal',
     !/Dialog|AlertDialog|window\.confirm/.test(stripComments(page, { trailing: true })), 'in place');
  ok('each note carries its own quiet control',
     /data-delete-note/.test(page) && /confirmingDelete === message\.id/.test(page), 'per note');
  ok('  and opening it closes the reply form',
     /setConfirmingDelete\(confirmingDelete === message\.id \? null : message\.id\); setReplyingTo\(null\);/.test(page),
     'one question at a time');
  ok('the page deletes through the existing note endpoint',
     /updateNote\(messageId, \{ action: 'delete' \}\)/.test(page), 'guest-note-update');
  // REACHABILITY, NOT POSITION. This read as "loadMessages appears somewhere
  // after the delete", which a plant satisfied by putting `return;` between
  // the two: the text was still in the right order and the call was dead.
  // The span between them is now read for an early exit.
  const deleteCall = "await updateNote(messageId, { action: 'delete' });";
  const handleBody = (() => {
    const start = page.indexOf(deleteCall);
    const end = page.indexOf('loadMessages();', start);
    return start > 0 && end > start ? page.slice(start, end) : null;
  })();
  ok('the badge recounts, through the one place that invalidates it',
     handleBody !== null && !/\breturn\b/.test(stripComments(handleBody, { trailing: true }))
       && /queryKey: \[LAYOUT_QUERY_KEY\]/.test(page),
     handleBody === null ? '(no recount after the delete)' : 'reached, with no early exit');

  // ── 5. Copy rules ─────────────────────────────────────────────────────
  const copy = ['Delete this note? It goes for good.', 'Delete', 'Keep', 'Note deleted'];
  ok('no em or en dash in the delete copy',
     copy.every((t) => !/[—–]/.test(t)), copy.join(' / '));
  ok('  no exclamation mark, and nothing shouting',
     copy.every((t) => !/!/.test(t) && t !== t.toUpperCase()), copy.join(' / '));

  return results;
}

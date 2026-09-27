/**
 * A guest can send a note, and the couple can actually read it.
 *
 * ── THE GUARANTEE ─────────────────────────────────────────────────────────
 *
 * Goal 2026-09-27, item 2 as revised: three endpoints — an unauthenticated
 * write with song-request-submit's full protection set, a couple-authenticated
 * read scoped by the caller's own wedding_id that decrypts server-side, and a
 * couple-authenticated mark-read/save-reply. The address and the message text
 * live only inside encrypted_guest; guest_name holds a first name in plain
 * text; Messages.jsx comes off getMyRecords and off GuestMessage.update.
 *
 * ── WHAT IS ACTUALLY AT RISK ───────────────────────────────────────────────
 *
 * That the feature does nothing and looks like it works. That is not a
 * hypothetical here — it is what the previous version of this page WAS. The
 * Messages empty state promised notes "through the guest portal" and no code
 * had ever created a GuestMessage; the page rendered its empty state and the
 * empty state read as "no notes yet" rather than "no such route".
 *
 * There are four separate ways to rebuild exactly that:
 *
 *   1. WRITE THE ROW AND NEVER SCOPE IT. Base44 stamps every admin-key create
 *      created_by_id: "anonymous", so wedding_id is the only thing that ties a
 *      note to a couple. A row written without it is stored, returns 200, and
 *      is unreachable forever.
 *   2. READ IT THE OLD WAY. getMyRecords filters {created_by_id: me.id}, which
 *      "anonymous" can never match. One line reintroduced and the page is back
 *      to its empty state with every note in the database.
 *   3. STORE THE TEXT IN PLAIN SIGHT. GuestMessage.read RLS is null — it has to
 *      be — so any authenticated account can list the entity. If the address or
 *      the sentence is written to its plaintext column, the blob is decoration.
 *   4. STUB IT AND MEASURE THE STUB. The render harness answers /api/guest-*
 *      with a bare { ok: true } catch-all. A /api/guest-notes stub below that
 *      line never runs, and every render pass then measures the empty state.
 *
 * Each is a named check below. The crypto is driven for real — encrypt, then
 * decrypt, then assert the ciphertext does not contain the plaintext — rather
 * than asserting that a function named encrypt is called.
 *
 * ── WHAT THIS CANNOT PROVE ────────────────────────────────────────────────
 *
 * That an admin-key PUT succeeds against a live GuestMessage row now that
 * update RLS is null. No round trip runs in CI. That is a live-verification
 * step, named in the PR body, not a gap this file can close.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
/** Source with comments removed — a promise in a comment is not the code keeping it. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SUBMIT = strip(read('api/guest-note-submit.js'));
const NOTES = strip(read('api/guest-notes.js'));
const UPDATE = strip(read('api/guest-note-update.js'));
const MESSAGES = strip(read('src/pages/Messages.jsx'));
const HARNESS = read('scripts/lib/renderHarness.mjs');
const CONTRACTS = read('scripts/lib/stubContracts.mjs');
const HELPER = strip(read('api/_lib/base44Entities.js'));
const PII = strip(read('api/_lib/guestNotePii.js'));

export async function runGuestNoteEndpoints() {
  const r = [];
  const has = (label, src, needle) => r.push(
    src.includes(needle) ? pass(label) : fail(label, `source contains ${JSON.stringify(needle)}`, 'absent'));
  const lacks = (label, src, needle) => r.push(
    !src.includes(needle) ? pass(label) : fail(label, `source does NOT contain ${JSON.stringify(needle)}`, 'present'));

  // ── the three files exist at all ─────────────────────────────────────────
  for (const [name, src] of [['api/guest-note-submit.js', SUBMIT], ['api/guest-notes.js', NOTES],
                             ['api/guest-note-update.js', UPDATE], ['api/_lib/base44Entities.js', HELPER],
                             ['api/_lib/guestNotePii.js', PII]]) {
    r.push(src.length > 0 ? pass(`${name} exists`) : fail(`${name} exists`, 'a file', 'missing'));
  }

  // ── 1. the mirror declares what the endpoints write ──────────────────────
  //
  // BASE44 SILENTLY DROPS AN UNDECLARED FIELD on a custom entity, so a field
  // the mirror does not carry is a field that does not persist and returns 200
  // while not persisting. Read off the mirror, which RULE 12 keeps identical to
  // live.
  let schema = null;
  try { schema = JSON.parse(read('base44/entities/GuestMessage.jsonc').replace(/^\s*\/\/.*$/gm, '')); } catch { /* reported below */ }
  r.push(schema ? pass('GuestMessage mirror parses') : fail('GuestMessage mirror parses', 'valid JSON', 'unparseable'));
  for (const field of ['wedding_id', 'encrypted_guest', 'guest_name', 'read', 'replied', 'reply', 'reply_sent_at', 'channel']) {
    const declared = !!schema?.properties?.[field];
    r.push(declared ? pass(`GuestMessage declares ${field}`) : fail(`GuestMessage declares ${field}`, 'declared', 'absent'));
  }
  // READ AND UPDATE MUST BE null, and this is the check that would have caught
  // the original blocker: with either scoped on created_by_id, an anonymous row
  // is invisible or unwritable and the whole feature is a no-op.
  r.push(schema?.rls?.read === null
    ? pass('GuestMessage.read RLS is null', 'no session can match "anonymous"')
    : fail('GuestMessage.read RLS is null', null, schema?.rls?.read));
  r.push(schema?.rls?.update === null
    ? pass('GuestMessage.update RLS is null')
    : fail('GuestMessage.update RLS is null', null, schema?.rls?.update));

  // ── 2. the write scopes the row, and never in plain text ─────────────────
  has('submit stamps wedding_id from the resolved wedding', SUBMIT, 'wedding_id: wedding.id');
  has('submit stores the blob', SUBMIT, 'encrypted_guest: buildGuestNoteBlob({ email, message })');
  has("submit sets channel 'in_app'", SUBMIT, "channel: 'in_app'");
  has('submit sets read false', SUBMIT, 'read: false');
  // THE TWO PLAINTEXT COLUMNS ARE NEVER WRITTEN. Asserted as an absence,
  // because the failure mode is an addition: somebody "helpfully" storing the
  // address alongside the blob so a query can find it.
  lacks('submit never writes guest_email in plain text', SUBMIT, 'guest_email:');
  lacks('submit never writes message in plain text', SUBMIT, 'message: message');
  lacks('submit never writes message in plain text (shorthand)', SUBMIT, '\n      message,');

  // ── 3. the protection set is song-request-submit's, in full ──────────────
  for (const [label, needle] of [
    ['applyCors', 'applyCors(req, res)'],
    ['method check', "req.method !== 'POST'"],
    ['rate limit', "checkRateLimit(ip, 'guest-note'"],
    ['rate-limit headers', "res.setHeader('X-RateLimit-Remaining'"],
    ['429 on limit', 'res.status(429)'],
    ['sanitizeString on the message', 'sanitizeString(req.body?.message'],
    ['1000-character cap', 'MAX_MESSAGE_LENGTH = 1000'],
    ['required-field 400', 'res.status(400)'],
    ['a valid address is required', 'isValidEmail(email)'],
    ['Turnstile verified', 'verifyTurnstileToken(turnstileToken, ip'],
    ['admin key presence checked', 'hasAdminKey()'],
    ['wedding resolved by slug', 'resolveWeddingBySlug(rows, weddingSlug'],
    ['404 on an unresolved slug', 'Wedding not found.'],
    ['guest gate', 'guestGateBlocks(wedding, candidatePassword'],
    ['gate answers passwordRequired', 'passwordRequired: true'],
    ['notify called', 'notify({'],
  ]) has(`submit: ${label}`, SUBMIT, needle);

  // THE PASSWORD COMES FROM THE BODY, NEVER THE QUERY STRING (#449 — access
  // logs, history, referrers, shared-cache keys).
  has('submit reads the password from the body', SUBMIT, 'req.body?.password');
  lacks('submit never reads the password from the query', SUBMIT, 'req.query?.password');

  // notify's type must be one the enum holds, or Base44 refuses or stores junk.
  let notificationEnum = [];
  try {
    notificationEnum = JSON.parse(read('base44/entities/Notification.jsonc').replace(/^\s*\/\/.*$/gm, ''))
      ?.properties?.type?.enum || [];
  } catch { /* reported by the check below */ }
  const typeUsed = (SUBMIT.match(/type: '([a-z_]+)'/) || [])[1] || '';
  r.push(notificationEnum.includes(typeUsed)
    ? pass(`submit's notification type is in the enum`, typeUsed)
    : fail("submit's notification type is in the enum", notificationEnum.join('|'), typeUsed));
  // AND THE NOTE'S TEXT IS NOT IN IT. Notification has no encrypted field, so a
  // body carrying the sentence writes it back into plain text one entity over.
  lacks('the notification carries no message text', SUBMIT, 'body: message');

  // ── 4. the read is scoped, decrypts, and hands back no ciphertext ────────
  has('guest-notes requires a caller', NOTES, 'verifyBase44User(req)');
  has('guest-notes 401s without one', NOTES, "res.status(401).json({ error: 'Unauthorized' })");
  has('guest-notes scopes by wedding_id', NOTES, 'adminList(\'GuestMessage\', { wedding_id: wedding.id })');
  has('guest-notes excludes is_test', NOTES, 'filter(r => !r.is_test)');
  has('guest-notes decrypts server-side', NOTES, 'decorateGuestNote');
  has('guest-notes returns { notes }', NOTES, 'json({ notes })');
  lacks('guest-notes never scopes by created_by_id on GuestMessage', NOTES, "'GuestMessage', { created_by_id");

  // ── 5. the update verifies ownership before it writes ────────────────────
  has('guest-note-update requires a caller', UPDATE, 'verifyBase44User(req)');
  has('guest-note-update fetches the target row', UPDATE, "adminGetOne('GuestMessage', noteId)");
  has('guest-note-update refuses another wedding\'s note', UPDATE, 'note.wedding_id !== wedding.id');
  has('a foreign note reads as missing, not forbidden', UPDATE, "res.status(404).json({ error: 'Note not found' })");
  has('guest-note-update writes reply_sent_at', UPDATE, 'reply_sent_at: new Date().toISOString()');
  // ORDER, ASSERTED STRUCTURALLY: the ownership check must appear before any
  // update call, or the check is decoration.
  const ownIdx = UPDATE.indexOf('note.wedding_id !== wedding.id');
  const firstWrite = UPDATE.indexOf('adminUpdate(');
  r.push(ownIdx > -1 && firstWrite > ownIdx
    ? pass('the ownership check precedes every write')
    : fail('the ownership check precedes every write', 'check < write', `check@${ownIdx} write@${firstWrite}`));

  // ── 6. Messages.jsx is off the client entity entirely ────────────────────
  lacks('Messages.jsx no longer reads GuestMessage via getMyRecords', MESSAGES, "getMyRecords('GuestMessage'");
  lacks('Messages.jsx no longer calls GuestMessage.update', MESSAGES, 'GuestMessage.update(');
  lacks('Messages.jsx no longer holds a GuestMessage entity handle', MESSAGES, 'base44.entities.GuestMessage');
  has('Messages.jsx reads the endpoint', MESSAGES, "fetch('/api/guest-notes'");
  has('Messages.jsx writes through the endpoint', MESSAGES, "fetch('/api/guest-note-update'");
  // THE REPLY EMAIL STILL GOES OUT FIRST. reply_sent_at means "the email went
  // out", so a reply recorded before a successful send is a false record.
  const sendIdx = MESSAGES.indexOf("fetch('/api/send-guest-reply'");
  const recordIdx = MESSAGES.indexOf("action: 'reply'");
  r.push(sendIdx > -1 && recordIdx > sendIdx
    ? pass('the reply is emailed before it is recorded')
    : fail('the reply is emailed before it is recorded', 'send < record', `send@${sendIdx} record@${recordIdx}`));
  has('api/send-guest-reply.js is still the reply sender', MESSAGES, '/api/send-guest-reply');

  // ── 7. the harness answers the endpoint, above its own catch-all ─────────
  const stubIdx = HARNESS.indexOf("/api\\/guest-notes/.test(url)");
  const catchAllIdx = HARNESS.indexOf("/api\\/guest-/.test(url)");
  r.push(stubIdx > -1 && catchAllIdx > -1 && stubIdx < catchAllIdx
    ? pass('the guest-notes stub sits above the /api/guest- catch-all')
    : fail('the guest-notes stub sits above the /api/guest- catch-all', 'stub < catch-all', `stub@${stubIdx} catch-all@${catchAllIdx}`));
  has('the stub returns the { notes } envelope', HARNESS, 'json({ notes: seed.GuestMessage');
  has('a contract asserts that envelope', CONTRACTS, "match: '/api/guest-notes'");

  // ── 8. the crypto, driven for real ───────────────────────────────────────
  let pii = null;
  try { pii = await import('../../api/_lib/guestNotePii.js'); }
  catch (err) { r.push(fail('api/_lib/guestNotePii.js imports', 'a module', err.message)); }

  if (pii) {
    const email = 'grace@example.com';
    const message = 'Is there parking at the church?';
    const blob = pii.buildGuestNoteBlob({ email, message });

    r.push(typeof blob === 'string' && blob.length > 0
      ? pass('the blob is a non-empty string') : fail('the blob is a non-empty string', 'base64', typeof blob));
    // THE ACTUAL PROPERTY: the plaintext is not in the ciphertext. A test that
    // only round-trips would pass on a no-op "encryption" that returns JSON.
    r.push(!blob.includes(email) && !blob.includes('parking')
      ? pass('the plaintext does not appear in the blob')
      : fail('the plaintext does not appear in the blob', 'ciphertext', blob.slice(0, 60)));

    const back = pii.readGuestNoteBlob(blob);
    r.push(back?.email === email && back?.message === message
      ? pass('the blob round-trips') : fail('the blob round-trips', { email, message }, back));

    // A ROW THIS APP WROTE: blob set, both columns empty.
    const decorated = pii.decorateGuestNote({ id: 'n1', guest_name: 'Grace', encrypted_guest: blob, guest_email: '', message: '' });
    r.push(decorated.guest_email === email && decorated.message === message
      ? pass('decorate reads the blob over the empty columns')
      : fail('decorate reads the blob over the empty columns', { email, message }, decorated));
    r.push(!('encrypted_guest' in decorated)
      ? pass('decorate drops the ciphertext', 'the browser never receives it')
      : fail('decorate drops the ciphertext', 'absent', 'present'));

    // A ROW FROM BEFORE THIS FEATURE: plaintext columns, no blob. A couple must
    // not lose a note to a migration they never asked for.
    const legacy = pii.decorateGuestNote({ id: 'n2', guest_name: 'Alan', guest_email: 'alan@example.com', message: 'Congratulations' });
    r.push(legacy.guest_email === 'alan@example.com' && legacy.message === 'Congratulations'
      ? pass('decorate falls back to a pre-feature row\'s columns')
      : fail('decorate falls back to a pre-feature row\'s columns', 'the plaintext', legacy));

    // A CORRUPT OR TAMPERED BLOB IS UNREADABLE, NOT FATAL. decryptPayload
    // throws on a bad auth tag; one bad row must not take the page down.
    const corrupt = pii.decorateGuestNote({ id: 'n3', encrypted_guest: 'not-base64-at-all', message: 'fallback' });
    r.push(corrupt.message === 'fallback' && corrupt.guest_email === ''
      ? pass('a corrupt blob degrades rather than throwing')
      : fail('a corrupt blob degrades rather than throwing', { message: 'fallback' }, corrupt));
    r.push(pii.readGuestNoteBlob(null) === null && pii.readGuestNoteBlob('') === null
      ? pass('an absent blob reads as null') : fail('an absent blob reads as null', null, 'something else'));
  }

  // ── 9. the helper moves the fetch and nothing else ───────────────────────
  has('the helper reads the key from the server-only env var', HELPER, 'process.env.BASE44_ADMIN_KEY');
  has('the helper passes it as a bearer header', HELPER, 'Authorization: `Bearer ${BASE44_ADMIN_KEY}`');
  // NOTHING PRINTS THE KEY. A thrown message carries the method, the path and
  // the status — never the URL with a key in it, and never the key.
  for (const forbidden of ['console.log(BASE44_ADMIN_KEY', 'console.error(BASE44_ADMIN_KEY',
                           '${BASE44_ADMIN_KEY}`)', 'api_key=']) {
    lacks(`the helper never emits the key (${forbidden})`, HELPER, forbidden);
  }
  r.push(!/return\s+BASE44_ADMIN_KEY/.test(HELPER)
    ? pass('the helper never returns the key') : fail('the helper never returns the key', 'no return', 'returned'));
  has('hasAdminKey answers with a boolean', HELPER, 'return !!BASE44_ADMIN_KEY');
  // THE THREE ENVELOPE SHAPES. A list read that only handles a bare array
  // reads { data: [...] } as empty, which is the no-data-state class again.
  for (const shape of ['Array.isArray(payload)', "Array.isArray(payload?.data)", "Array.isArray(payload?.results)"]) {
    has(`the helper unwraps ${shape}`, HELPER, shape);
  }
  // AND ALL THREE ENDPOINTS USE IT — the point of extracting it.
  for (const [name, src] of [['submit', SUBMIT], ['guest-notes', NOTES], ['guest-note-update', UPDATE]]) {
    has(`${name} uses the shared helper`, src, "from './_lib/base44Entities.js'");
    lacks(`${name} keeps no local admin fetch`, src, 'https://base44.app/api');
  }

  return r;
}

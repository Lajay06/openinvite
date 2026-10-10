/**
 * The mirror carries the live declarations, and no array item was narrowed.
 *
 * ── RULE 12 ────────────────────────────────────────────────────────────────
 *
 * base44/entities/*.jsonc is a MIRROR of a schema the owner applies live. Any
 * PR building against a newly applied declaration syncs the mirror in the same
 * PR, read from the live schema and never copied forward from the old mirror.
 *
 * Seven paths were declared on 2026-09-25 and verified field-by-field against
 * a live export before this mirror was written: guidanceState and its two
 * members, dressCodePills and dressCodeNotes on mainCeremony and on reception,
 * and Music.playlist and Music.categoryOther.
 *
 * THREE MORE ON 2026-10-07, on Guest: household_id, is_child and child_age,
 * applied live by the owner through Base44 chat and diffed shape-aware against
 * their export before this mirror was touched. They were the only paths that
 * differed, they are the last three keys in the live property order, and every
 * existing property, the required list and the whole rls block came back
 * byte-identical. Nothing reads them yet; they are declared so a write cannot
 * be silently dropped and so the drop scanner stops calling them drift.
 *
 * ── THE NARROWING THIS GUARD EXISTS FOR ────────────────────────────────────
 *
 * The first attempt at those declarations also put dressCodePills and
 * dressCodeNotes on preWeddingEvents[] and postWeddingEvents[]. Those items
 * are bare `{ "type": "object" }` — no properties at all — which is what lets
 * a custom event carry the twenty-one fields EventDetails writes into it.
 * Declaring two properties on such an item gives it a property LIST, and a
 * custom entity silently drops what it does not declare (BASE44_PLATFORM_NOTES,
 * confirmed empirically 2026-07). So every other field on every pre- and
 * post-wedding event was one save away from being discarded: name, date,
 * venueName, dressCode, the lot.
 *
 * The owner reverted it the same day, and Base44 reported zero WeddingDetails
 * rows updated in between, so nothing was lost. This guard is the part that
 * makes sure it cannot come back quietly: a bare object item that acquires
 * `properties`, `items`, `enum`, `required` or `additionalProperties` fails
 * here, by path.
 *
 * WHY A SHAPE CHECK AND NOT A FIELD LIST. The first diff of that change
 * compared PATH LISTS and reported "additive only, nothing dropped" — which
 * was true of the paths and completely missed the narrowing, because the
 * mirror had no paths under those items to compare against. A guard that
 * counts fields would have passed too. This one compares shape.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);

/** The mirror is JSONC. Strip line comments only, exactly as the generator does. */
function loadMirror(name) {
  const text = readFileSync(root(`base44/entities/${name}.jsonc`), 'utf8');
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''));
}

const CONSTRAINTS = ['properties', 'items', 'enum', 'required', 'additionalProperties',
  'patternProperties', 'oneOf', 'anyOf', 'allOf'];

/** Every array-of-object item that declares nothing — the free-form ones. */
const FREE_FORM = [
  'preWeddingEvents', 'postWeddingEvents', 'qna', 'menuItems', 'polls',
];

export async function runMirrorDeclaresTheNewFields() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  The mirror — the 2026-09-25 declarations, and nothing narrowed:\n');

  const wd = loadMirror('WeddingDetails');
  const music = loadMirror('Music');

  // ── guidanceState ─────────────────────────────────────────────────────────
  const gs = wd.properties.guidanceState;
  check('guidanceState is declared', !!gs && gs.type === 'object', gs ? gs.type : 'MISSING');
  check('  tourSeenAt is a nullable string, not a boolean',
    JSON.stringify(gs?.properties?.tourSeenAt?.type) === '["string","null"]',
    JSON.stringify(gs?.properties?.tourSeenAt?.type));
  check('  dismissed is an array of strings',
    gs?.properties?.dismissed?.type === 'array' && gs?.properties?.dismissed?.items?.type === 'string',
    JSON.stringify(gs?.properties?.dismissed));

  // ── dress code, on the two fixed events only ──────────────────────────────
  for (const ev of ['mainCeremony', 'reception']) {
    const p = wd.properties[ev]?.properties || {};
    check(`${ev} declares dressCodePills as an array of strings`,
      p.dressCodePills?.type === 'array' && p.dressCodePills?.items?.type === 'string',
      JSON.stringify(p.dressCodePills));
    check(`  ${ev} declares dressCodeNotes as a string`,
      p.dressCodeNotes?.type === 'string', JSON.stringify(p.dressCodeNotes));
    check(`  ${ev} keeps dressCode, the fallback for weddings that answered first`,
      p.dressCode?.type === 'string', JSON.stringify(p.dressCode));
  }

  // ── AND NOT on the custom-event arrays ────────────────────────────────────
  for (const arr of ['preWeddingEvents', 'postWeddingEvents']) {
    const items = wd.properties[arr]?.items;
    check(`${arr}[] is still a bare object — no property list to drop against`,
      JSON.stringify(items) === '{"type":"object"}', JSON.stringify(items));
  }

  // ── nothing anywhere went from free-form to constrained ───────────────────
  for (const arr of FREE_FORM) {
    const items = wd.properties[arr]?.items;
    if (!items) { check(`${arr} exists`, false, 'MISSING'); continue; }
    const added = CONSTRAINTS.filter((k) => k in items);
    check(`  ${arr}[] constrains nothing`, added.length === 0,
      added.length ? `NARROWED by ${added.join(', ')}` : 'bare');
  }

  // ── Music ─────────────────────────────────────────────────────────────────
  check('Music.playlist is declared', music.properties.playlist?.type === 'string',
    JSON.stringify(music.properties.playlist));
  check('Music.categoryOther is declared', music.properties.categoryOther?.type === 'string',
    JSON.stringify(music.properties.categoryOther));
  check('  and category is still the fixed six — categoryOther sits beside it',
    JSON.stringify(music.properties.category?.enum) === JSON.stringify(
      ['ceremony', 'cocktail_hour', 'dinner', 'dancing', 'special_moments', 'general']),
    JSON.stringify(music.properties.category?.enum));

  // ── the derived file was regenerated in the same commit ───────────────────
  const gen = readFileSync(root('src/lib/entityFields.generated.js'), 'utf8');
  check('entityFields.generated.js was regenerated alongside the mirror',
    /"guidanceState"/.test(gen) && /"playlist"/.test(gen) && /"categoryOther"/.test(gen),
    'all three in the generated map');

  // ── rls untouched ─────────────────────────────────────────────────────────
  check('WeddingDetails rls is unchanged — world-readable, owner-writable',
    wd.rls?.create === null && wd.rls?.read === null
      && wd.rls?.update?.created_by_id === '{{user.id}}', JSON.stringify(wd.rls));

  // ── 2026-10-07: THE THREE GUEST FIELDS ─────────────────────────────────
  //
  // Declared because an undeclared key is DROPPED, silently, by a custom
  // entity. A mirror sync with nothing asserting the sync is one careless
  // edit away from undoing itself, and the failure would be invisible: the
  // write would appear to succeed and the value would not be there.
  const guest = loadMirror('Guest');
  const expected = {
    household_id: { type: 'string' },
    is_child:     { type: 'boolean', default: false },
    child_age:    { type: 'number' },
  };
  for (const [name, want] of Object.entries(expected)) {
    const got = guest.properties?.[name];
    const okType = got && got.type === want.type;
    results.push(okType
      ? pass(`Guest.${name} is declared, type ${want.type}`, JSON.stringify({ type: got.type }))
      : fail(`Guest.${name} is declared, type ${want.type}`, want.type, got ? JSON.stringify(got.type) : 'MISSING'));
    if ('default' in want) {
      results.push(got?.default === want.default
        ? pass(`  and defaults to ${want.default}`, String(got.default))
        : fail(`  and defaults to ${want.default}`, String(want.default),
               got && 'default' in got ? String(got.default) : 'no default'));
    }
  }

  // THE LIVE ORDER, which is what makes the next diff against an export cheap.
  // These three stopped being last on 2026-10-09, when the reply-lifecycle
  // fields were added after them, so the assertion is that they still sit
  // TOGETHER AND IN ORDER rather than that they sit at the end. The next
  // section pins what is last now.
  const guestKeys = Object.keys(guest.properties || {});
  const oct07 = ['household_id', 'is_child', 'child_age'];
  const at = guestKeys.indexOf('household_id');
  results.push(at >= 0 && JSON.stringify(guestKeys.slice(at, at + 3)) === JSON.stringify(oct07)
    ? pass('  and the three sit together, in the live order', guestKeys.slice(at, at + 3).join(', '))
    : fail('  and the three sit together, in the live order', oct07.join(', '),
           at >= 0 ? guestKeys.slice(at, at + 3).join(', ') : 'household_id MISSING'));

  // ── 2026-10-09: THE REPLY-LIFECYCLE FIELDS ──────────────────────────────
  //
  // Same reason as the 2026-10-07 block above: an undeclared key is dropped
  // silently, so the sync needs something asserting it. Item 0 of
  // goals/2026-10-09-reply-lifecycle.md; the owner added all four changes in
  // Base44 and this PR mirrors them with no behavior attached.
  //
  // to_hash, NOT to. Every other guest address in this entity is encrypted or
  // hashed, and a new plaintext address column would have been the one place
  // that regressed. Pinned here because the shape is the whole point of the
  // field: a later send compares hashes to tell whether the address changed.
  const replyLifecycle = {
    email_opt_out:    { type: 'boolean', default: false },
    email_opt_out_at: { type: 'string' },
    send_history:     { type: 'array' },
  };
  for (const [name, want] of Object.entries(replyLifecycle)) {
    const got = guest.properties?.[name];
    results.push(got && got.type === want.type
      ? pass(`Guest.${name} is declared, type ${want.type}`, JSON.stringify({ type: got.type }))
      : fail(`Guest.${name} is declared, type ${want.type}`, want.type, got ? JSON.stringify(got.type) : 'MISSING'));
    if ('default' in want) {
      results.push(got?.default === want.default
        ? pass(`  and defaults to ${want.default}`, String(got.default))
        : fail(`  and defaults to ${want.default}`, String(want.default),
               got && 'default' in got ? String(got.default) : 'no default'));
    }
  }
  results.push(guest.properties?.email_opt_out_at?.format === 'date-time'
    ? pass('  and email_opt_out_at is a date-time', 'date-time')
    : fail('  and email_opt_out_at is a date-time', 'date-time',
           guest.properties?.email_opt_out_at?.format || 'no format'));

  const histProps = guest.properties?.send_history?.items?.properties || {};
  results.push(JSON.stringify(Object.keys(histProps)) === JSON.stringify(['type', 'sent_at', 'to_hash'])
    ? pass('  and a send_history entry is exactly type, sent_at, to_hash', Object.keys(histProps).join(', '))
    : fail('  and a send_history entry is exactly type, sent_at, to_hash', 'type, sent_at, to_hash',
           Object.keys(histProps).join(', ') || 'MISSING'));
  results.push(!('to' in histProps)
    ? pass('  and it carries no plaintext address key', 'no "to"')
    : fail('  and it carries no plaintext address key', 'no "to"', 'to is declared'));

  results.push(JSON.stringify(guest.properties?.event_responses?.items?.properties?.status?.enum)
      === JSON.stringify(['pending', 'yes', 'no', 'maybe'])
    ? pass('the per-event status enum carries maybe', 'pending, yes, no, maybe')
    : fail('the per-event status enum carries maybe', 'pending, yes, no, maybe',
           JSON.stringify(guest.properties?.event_responses?.items?.properties?.status?.enum)));
  results.push(guest.properties?.event_responses?.items?.properties?.status?.default === 'pending'
    ? pass('  and its default is still pending', 'pending')
    : fail('  and its default is still pending', 'pending',
           String(guest.properties?.event_responses?.items?.properties?.status?.default)));

  const gen2 = readFileSync(root('src/lib/entityFields.generated.js'), 'utf8');
  results.push(/"email_opt_out"/.test(gen2) && /"email_opt_out_at"/.test(gen2) && /"send_history"/.test(gen2)
    ? pass('  and entityFields.generated.js was regenerated with all three', 'in the generated map')
    : fail('  and entityFields.generated.js was regenerated with all three', 'all three', 'regenerate it'));

  // THE TWO GUEST SHAPES MOST AT RISK FROM A CHAT-DRIVEN EDIT, named in the
  // authorization for this sync. poll_votes is the bare object; the seven keys
  // under event_responses are what every per-event surface reads.
  //
  // poll_votes IS AN OPEN MAP, NOT A BARE OBJECT, and the distinction is the
  // whole point. It declares `additionalProperties: { type: string }`, which
  // says "any key, string values" and keeps every poll id a guest votes in.
  // What would narrow it is a `properties` LIST, because that is what makes a
  // custom entity drop the keys it does not name. The first draft of this
  // check asserted "no constraints at all" and went red against a mirror that
  // is correct and identical to live, which is the failure mode this guard's
  // own header warns about: compare the shape that matters, not the one that
  // is easy to test.
  const pollVotes = guest.properties?.poll_votes || {};
  const narrowing = ['properties', 'enum', 'required', 'oneOf', 'anyOf', 'allOf']
    .filter((c) => c in pollVotes);
  results.push(narrowing.length === 0 && pollVotes.type === 'object'
    && pollVotes.additionalProperties?.type === 'string'
    ? pass('Guest.poll_votes is still an open map, any key to a string',
           JSON.stringify(pollVotes.additionalProperties))
    : fail('Guest.poll_votes is still an open map, any key to a string',
           'additionalProperties string, no property list',
           narrowing.length ? `narrowed by ${narrowing.join(', ')}` : JSON.stringify(pollVotes)));

  const erKeys = Object.keys(guest.properties?.event_responses?.items?.properties || {});
  const SEVEN = ['event_id', 'invited', 'status', 'meal_choice', 'plus_ones', 'plus_one_names', 'responded_at'];
  results.push(JSON.stringify(erKeys) === JSON.stringify(SEVEN)
    ? pass('Guest.event_responses items still declare the same seven keys, in order', `${erKeys.length} keys`)
    : fail('Guest.event_responses items still declare the same seven keys, in order',
           SEVEN.join(', '), erKeys.join(', ') || 'none'));

  const pon = guest.properties?.event_responses?.items?.properties?.plus_one_names || {};
  results.push(pon.type === 'array' && pon.items?.type === 'string'
    ? pass('  and plus_one_names is still an array of strings', JSON.stringify(pon.items))
    : fail('  and plus_one_names is still an array of strings', 'array of string', JSON.stringify(pon)));

  // THE GENERATED MAP CARRIES THEM TOO, which is the half a mirror edit alone
  // would leave behind: the Ava action validator reads that file, not this one.
  const generated = readFileSync(root('src/lib/entityFields.generated.js'), 'utf8');
  const missing = Object.keys(expected).filter((k) => !new RegExp(`"${k}"`).test(generated));
  results.push(missing.length === 0
    ? pass('  and entityFields.generated.js was regenerated with all three', 'in the generated map')
    : fail('  and entityFields.generated.js was regenerated with all three', 'all three', `missing ${missing.join(', ')}`));

  // ── 2026-10-10: THE BOUNCE STAMP ────────────────────────────────────────
  //
  // Same reason as the two blocks above: an undeclared key is dropped
  // silently, so the sync needs something asserting it. Item 0 of
  // goals/2026-10-10-bounces-and-notes.md.
  //
  // ONE OBJECT, FOUR SUB-PROPERTIES, because the four facts are only ever
  // written and cleared together. A stamp with no date, or a date with no
  // reason, is not a state the product has, so the shape is pinned whole
  // rather than field by field.
  //
  // email_id IS LOAD-BEARING, not decoration. Resend delivers at-least-once,
  // so the webhook is idempotent on it: a second delivery for the same
  // email_id is a 200 no-op rather than a second stamp. Drop the key and the
  // idempotency has nothing to key on.
  //
  // THE ENUM HAS ONE VALUE ON PURPOSE. Temporary bounces and complaints are
  // logged and dropped this goal, so a second value would imply a state
  // nothing writes. Asserted as exactly ["permanent"] rather than as
  // containing it, because a widened enum is a product decision and should
  // fail here until someone makes it.
  const bounce = guest.properties?.email_bounce;
  results.push(bounce && bounce.type === 'object'
    ? pass('Guest.email_bounce is declared, type object', JSON.stringify({ type: bounce.type }))
    : fail('Guest.email_bounce is declared, type object', 'object', bounce ? JSON.stringify(bounce.type) : 'MISSING'));

  const bounceProps = bounce?.properties || {};
  results.push(JSON.stringify(Object.keys(bounceProps)) === JSON.stringify(['at', 'kind', 'detail', 'email_id'])
    ? pass('  with exactly at, kind, detail and email_id, in the live order', Object.keys(bounceProps).join(', '))
    : fail('  with exactly at, kind, detail and email_id, in the live order', 'at, kind, detail, email_id',
           Object.keys(bounceProps).join(', ') || 'MISSING'));

  results.push(bounceProps.at?.format === 'date-time'
    ? pass('  at is a date-time', 'date-time')
    : fail('  at is a date-time', 'date-time', bounceProps.at?.format || 'no format'));

  results.push(JSON.stringify(bounceProps.kind?.enum) === JSON.stringify(['permanent'])
    ? pass('  kind is an enum of exactly one value', JSON.stringify(bounceProps.kind.enum))
    : fail('  kind is an enum of exactly one value', '["permanent"]', JSON.stringify(bounceProps.kind?.enum)));

  results.push(bounceProps.detail?.type === 'string' && bounceProps.email_id?.type === 'string'
    ? pass('  detail and email_id are strings', 'both string')
    : fail('  detail and email_id are strings', 'both string',
           `detail ${bounceProps.detail?.type}, email_id ${bounceProps.email_id?.type}`));

  // NO ADDRESS ANYWHERE IN THE SHAPE. The provider's bounce message usually
  // quotes the recipient, and this object is read by the couple's dashboard,
  // so there is deliberately no field for an address to be written into.
  results.push(!('to' in bounceProps) && !('email' in bounceProps) && !('address' in bounceProps)
    ? pass('  and it carries no address field', 'no to, email or address')
    : fail('  and it carries no address field', 'none of to/email/address', Object.keys(bounceProps).join(', ')));

  const genBounce = readFileSync(root('src/lib/entityFields.generated.js'), 'utf8');
  results.push(/"email_bounce"/.test(genBounce)
    ? pass('  and entityFields.generated.js was regenerated with it', 'in the generated map')
    : fail('  and entityFields.generated.js was regenerated with it', 'email_bounce', 'regenerate it'));

  return results;
}

/**
 * tests/persistence/per-event-copy.mjs
 *
 * THE OWNER'S PER-EVENT COPY, VERBATIM, WHERE IT IS SUPPOSED TO BE.
 *
 * Item 6 of goals/2026-10-01-per-event-invitations.md asked for this and it
 * could not be written there: every string below ships in #886, #887 or #892,
 * so a guard asserting them on main before those merged would have been red on
 * main. Landing it now is item 2 of goals/2026-10-06-per-event-follow-up.md.
 *
 * WHY PIN COPY AT ALL. Product strings drift under maintenance in a way code
 * does not, because changing one reads as harmless: a label gets "improved", a
 * sub line gets shortened to fit, and the words the owner chose are gone with
 * nothing failing. These were given verbatim in the goal's own Copy section,
 * so verbatim is the standard they are held to.
 *
 * AND THE HOUSE RULES ON THE SAME STRINGS, because the guards that enforce
 * them repo-wide have scopes that leave a gap here:
 *
 *   NO DASHES   test:calm-copy reads only lines ADDED in origin/main...HEAD.
 *               Once these lines are on main they are invisible to it forever,
 *               so an em dash edited into one of them later is caught by
 *               nothing. Checked here against the strings themselves.
 *   NO EMOJI    the repo-wide guard is a ratchet over whole files; this is the
 *               narrower claim about these particular surfaces.
 *   SENTENCE    product chrome, and all of these are chrome: the Guests page,
 *   CASE        the send modal, the daily update.
 *
 * SCOPE, AND THE RULING THAT SETS IT. A whole-file dash scan of the three
 * older files flags copy that predates the 2026-09-28 ruling, which says in
 * terms: "There is NO SWEEP... every other string already shipped stays until
 * someone edits that line for another reason." So the dash rule is applied to
 * the pinned strings and to the files this feature INTRODUCED, and the three
 * pre-ruling lines are asserted STILL PRESENT instead, which is the opposite
 * of a sweep and puts the decision on the record.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// BUILT FROM CHAR CODES, not typed. A guard about em dashes that contains
// three of them is a guard that trips every other dash check in the repo,
// and it did on the first draft of this file.
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);
const ELLIPSIS = String.fromCharCode(0x2026);
const DASHES = new RegExp('[' + EM + EN + ']');

/**
 * Every string the goal's Copy section gives, and the file that must contain
 * it. A string here is a claim that the owner wrote these words and that this
 * file is where they belong.
 */
const COPY = [
  ['Invited to',                                    'src/components/guests/GuestList.jsx',        'the column and chip-group label'],
  ['Invite to...',                                  'src/components/guests/BulkActionBar.jsx',    'bulk, invite'],
  ['Remove from...',                                'src/components/guests/BulkActionBar.jsx',    'bulk, remove'],
  ['Which event is this about?',                    'src/components/guests/SendInvitesModal.jsx', 'the send step heading'],
  ['Only guests invited to it will be on the list', 'src/components/guests/SendInvitesModal.jsx', 'the send step sub line'],
  ['All events',                                    'src/components/guests/SendInvitesModal.jsx', 'the first choice'],
];

/** The per-event count line, a template rather than a literal. */
const COUNT_LINE = [
  ['src/lib/eventTallies.js', /\$\{invited\} invited, \$\{replied\} replied/, 'the one place the words live'],
  ['src/pages/DailyUpdate.jsx', /eventCountLine\(t\)/, 'the daily update renders it rather than wording it again'],
];

/** Files this feature introduced, which carry no legacy and are held whole. */
const NEW_FILES = [
  'src/lib/eventTallies.js',
  'src/lib/guestEventVisibility.js',
  'src/lib/eventDeletion.js',
];

/** Files this feature edited, which carry pre-ruling copy left alone. */
const EDITED_FILES = [
  'src/components/guests/GuestList.jsx',
  'src/components/guests/BulkActionBar.jsx',
  'src/components/guests/SendInvitesModal.jsx',
];

/**
 * Pre-existing copy in those files, asserted STILL PRESENT. If one of these
 * ever changes it will be because somebody edited that line for another
 * reason, which is exactly when the ruling says the dash goes. Until then a
 * sweep would be the violation.
 */
// THE WHATSAPP PREVIEW LINE WAS THE SECOND ENTRY HERE, and item 12b deleted
// the bubble it belonged to. Its presence was pinned so that a later dash
// sweep could not strip a string that predates the dash ruling; with the
// string gone for an unrelated reason, there is nothing left to protect. The
// entry is removed rather than loosened, because a grandfather clause for copy
// that no longer exists is a check that can only ever pass.
const GRANDFATHERED = [
  ['src/components/guests/GuestList.jsx',        EM + ' none ' + EM, 'a select placeholder, em dashes both sides'],
  ['src/components/guests/BulkActionBar.jsx',    'Type a tag' + ELLIPSIS, 'a tag input placeholder, one ellipsis character'],
];

/**
 * A violation is a glyph that renders in the system emoji font. U+FE0F is the
 * tell, per CLAUDE.md: a bare dingbat that inherits our typeface is not one.
 */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{FE0F}]/u;

/** Comments are out of scope for the dash rule; strings are not. */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\n]*?\/\/.*$/gm, (l) => l.slice(0, l.indexOf('//')));

export async function runPerEventCopy() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── VERBATIM, AND IN THE RIGHT FILE ─────────────────────────────────────

  // COMMENTS STRIPPED FIRST, and that is not tidiness. The first draft asserted
  // the string anywhere in the file, and renaming the column label from
  // "Invited to" to "Events" left the guard green: GuestList.jsx also says
  // "Invited to" in a comment above the chips. A copy guard that a comment can
  // satisfy is not a copy guard.
  for (const [str, file, why] of COPY) {
    ok(`"${str}" is in ${path.basename(file)}`, stripComments(read(file)).includes(str), why);
  }
  for (const [file, re, why] of COUNT_LINE) {
    ok(`the count line in ${path.basename(file)}`, re.test(read(file)), why);
  }
  // The owner gave "{n} invited, {m} replied". The template above proves the
  // words and the order; this proves the punctuation between them, which is
  // the half a rewrite takes first.
  ok('the count line joins with a comma and nothing else',
     /invited, \$\{replied\} replied/.test(read('src/lib/eventTallies.js')),
     'comma, not a dash or a slash');

  // ── THE PINNED STRINGS THEMSELVES, CHARACTER BY CHARACTER ───────────────
  //
  // This is the check that actually covers the owner's copy: each string is
  // asserted present verbatim above, so a dash or an emoji inside one would
  // have to be inside the literal here too.
  const badChar = COPY.filter(([str]) =>
    DASHES.test(str) || str.includes(ELLIPSIS) || EMOJI.test(str));
  ok('no pinned string carries an em dash, an en dash, an ellipsis character or an emoji',
     badChar.length === 0,
     badChar.length ? badChar.map(([s]) => s).join(' | ') : `${COPY.length} string(s)`);

  // ── THE FEATURE'S OWN FILES, HELD WHOLE ─────────────────────────────────

  for (const file of NEW_FILES) {
    const body = stripComments(read(file));
    const hit = body.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => DASHES.test(l));
    ok(`${path.basename(file)} carries no em or en dash outside its comments`,
       hit.length === 0, hit.length ? `line ${hit[0][0]}: ${hit[0][1].trim().slice(0, 60)}` : 'clean');
    ok('  and no emoji anywhere in it', !EMOJI.test(read(file)), 'none');
  }

  // Emoji has no grandfather clause: the repo-wide ratchet already holds every
  // file to it and none of these three is on it.
  for (const file of EDITED_FILES) {
    ok(`${path.basename(file)} carries no emoji`, !EMOJI.test(read(file)), 'none');
  }

  // ── THE PRE-RULING LINES, ASSERTED PRESENT RATHER THAN ABSENT ───────────

  for (const [file, needle, why] of GRANDFATHERED) {
    ok(`${path.basename(file)} keeps its pre-ruling copy, no sweep`,
       read(file).includes(needle), why);
  }

  // ── SENTENCE CASE, ON THE PINNED STRINGS ────────────────────────────────

  const ACRONYMS = new Set(['RSVP', 'FAQ', 'BYO', 'OK']);
  const shouty = COPY.map(([s]) => s).filter((s) =>
    s.split(/\s+/).slice(1).some((w) => {
      const bare = w.replace(/[^A-Za-z]/g, '');
      return bare && bare[0] === bare[0].toUpperCase() && !ACRONYMS.has(bare);
    }));
  ok('every pinned string is sentence case', shouty.length === 0,
     shouty.length ? shouty.join(' | ') : `${COPY.length} string(s)`);

  const allCaps = COPY.map(([s]) => s).filter((s) => /\b[A-Z]{2,}\b/.test(s)
    && !s.split(/\s+/).some((w) => ACRONYMS.has(w.replace(/[^A-Za-z]/g, ''))));
  ok('  and none of them shouts', allCaps.length === 0,
     allCaps.length ? allCaps.join(' | ') : 'no ALL CAPS');

  // ── THREE FULL STOPS, NOT ONE ELLIPSIS CHARACTER ────────────────────────
  //
  // "Invite to..." as the owner wrote it. U+2026 is identical at a glance and
  // is the kind of thing an editor substitutes silently. Checked on the two
  // labels rather than on the file, which carries one of its own in a tag
  // placeholder that predates the ruling.
  const bulk = read('src/components/guests/BulkActionBar.jsx');
  ok('the bulk labels use three full stops, not a single ellipsis character',
     bulk.includes('Invite to...') && bulk.includes('Remove from...')
     && !bulk.includes('Invite to' + ELLIPSIS) && !bulk.includes('Remove from' + ELLIPSIS),
     'three dots on both');

  return results;
}

/**
 * tests/persistence/guard-comment-stripper.mjs
 *
 * A GUARD READS CODE, SO IT HAD BETTER BE READING THE CODE.
 *
 * Nearly every guard here reads product source as text and asserts on what it
 * finds, and all of them drop comments first, because a guard's own
 * explanation of what it removed names the thing it removed. For a long time
 * each one wrote that by hand, as some arrangement of
 *
 *     src.replace(/\/\*[\s\S]*?\*\//g, '')
 *
 * and that expression deletes live code. `/*` is not only a comment opener: it
 * appears mid-line in attribute values, regular expressions and strings, and
 * an unanchored match runs from the first one to the next star-slash anywhere
 * in the file, which is usually inside a real comment dozens of lines later.
 *
 * ── HOW IT WAS FOUND, WHICH IS THE POINT ───────────────────────────────────
 *
 * Item 12a of goals/2026-10-08-site-fixes-batch-1.md had to prove that
 * password protection survived a sweep of WBRightPanel.jsx. It did not survive
 * in what the guard could see: `accept="audio/*"` on the background-music file
 * input opened a comment that ran sixty lines, taking the password block with
 * it. Every ABSENCE assertion around it had passed against blanked-out text.
 *
 * The POSITIVE check is what failed. That is the whole lesson: a guard that
 * only asserts absence cannot tell "the thing is gone" from "I cannot see the
 * file", and the two look identical in a green run.
 *
 * ── WHAT THIS GUARD HOLDS ──────────────────────────────────────────────────
 *
 * Three things, in order of how much they matter.
 *
 *   1. stripComments behaves. Measured against real strings, including the
 *      exact attribute that caused the incident.
 *   2. No guard that reads a KNOWN-DAMAGED file may use the hand-written form.
 *      This is the rule that actually prevents a recurrence, and it is
 *      currently satisfied with nothing on the exception list.
 *   3. The hand-written form does not spread. A ratchet, not a ban: ninety
 *      four of them remain, in guards that read files the naive form happens
 *      not to damage. Converting all of them in one sweep would be ninety
 *      edits to ninety guards whose intent nobody re-read, which is a worse
 *      risk than the one being fixed. The ceiling means the next guard written
 *      must use the helper, and the number can only fall.
 *
 * ── AND IT DOES NOT PRETEND THE FIX CHANGED ANY VERDICT ────────────────────
 *
 * When the twelve affected guards were moved onto the helper, the suite went
 * from 5115 checks to 5115 checks and from green to green. Not one assertion
 * flipped. The four guards flagged alongside 12a were reading blanked source,
 * but none of their assertions happened to depend on the blanked region. The
 * damage was latent, not active, everywhere except the one case already fixed.
 * That is worth writing down so nobody later reads this file as a record of
 * thirty-three bugs caught, and so the real argument stays visible: the next
 * absence assertion over a blanked region would have been silent too.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** The hand-written form, as it is actually written across this repo. */
const NAIVE = /\.replace\(\s*\/\\\/\\\*\[\\s\\S\]\*\?\\\*\\\/\/g/g;

/**
 * THE CEILING, AND WHY A CEILING RATHER THAN A ZERO.
 *
 * 94 hand-written strip expressions remain. That is a count of CODE, taken
 * with comments stripped, because this file and _shared.mjs both quote the
 * expression in prose and a count of raw text reports its own documentation.
 * Each remaining one reads source the naive form does not damage, which is why
 * they are green and why converting them is optional rather than urgent. A
 * ceiling that can only fall stops the form spreading to new guards without
 * demanding ninety unreviewed edits today. Lower this number when guards are
 * converted; never raise it. 94 -> 89 on 2026-10-10: the mobile pass put
 * "/m/*" route paths in App.jsx, which the naive form damages, so the four
 * guards reading App.jsx through it moved to stripComments.
 */
const CEILING = 89;

/** Every .mjs under tests/ and scripts/, which is where guards live. */
function guardFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith('.mjs')) out.push(path.relative(ROOT, p));
    }
  };
  for (const r of ['tests', 'scripts']) {
    const abs = path.join(ROOT, r);
    if (fs.existsSync(abs)) walk(abs);
  }
  return out;
}

/**
 * Source files the naive form provably damages, recomputed here rather than
 * listed, so the rule tracks the codebase instead of a snapshot. A file is
 * damaged when stripping it the naive way removes more lines than stripping it
 * the way stripComments does.
 */
function damagedSources() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!/node_modules|dist|\.git/.test(p)) walk(p); }
      else if (/\.(jsx?|mjs)$/.test(p)) {
        const s = fs.readFileSync(p, 'utf8');
        const naive = s.replace(/\/\*[\s\S]*?\*\//g, '');
        if (stripComments(s, { line: false }).split('\n').length > naive.split('\n').length) {
          out.push(path.relative(ROOT, p));
        }
      }
    }
  };
  // SOURCE A GUARD READS, NOT GUARDS THEMSELVES. The first version walked
  // tests/ and scripts/ whole, so every guard file landed on the damaged list
  // (they are full of regexes containing slash-star) and then "read" its own
  // basename, which produced offenders like "ava-tick-off reads
  // ava-tick-off". Guards read product source, the render harness and the
  // motion capture; those are the three places worth scanning.
  for (const r of ['src', 'api', 'scripts/lib', 'tests/motion']) {
    const abs = path.join(ROOT, r);
    if (fs.existsSync(abs)) walk(abs);
  }
  return out;
}

export async function runGuardCommentStripper() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. THE HELPER BEHAVES ───────────────────────────────────────────────
  ok('a block comment on its own lines is removed',
     stripComments('  /* a\n   * b\n   */\nkeep();').trim() === 'keep();', 'gone');
  ok('  and a JSX brace comment with it',
     stripComments('{/* a */}\nkeep();').trim() === 'keep();', 'gone');
  ok('  and a whole-line // comment',
     stripComments('  // a\nkeep();').trim() === 'keep();', 'gone');
  // THE INCIDENT, AS A TEST. This exact attribute cost sixty lines.
  const attr = '<input type="file" accept="audio/*" />\nconst keep = 1;\n/* a real comment */\nconst also = 2;';
  const stripped = stripComments(attr);
  ok('a mid-line slash-star is NOT a comment opener',
     /accept="audio\/\*"/.test(stripped) && /const keep = 1;/.test(stripped) && /const also = 2;/.test(stripped),
     'the attribute, and the code on both sides of it, survive');
  ok('  where the hand-written form eats everything to the next star-slash',
     !/const keep = 1;/.test(attr.replace(/\/\*[\s\S]*?\*\//g, '')), 'which is the bug');
  ok('a trailing // is kept unless asked for',
     stripComments('keep(); // note').includes('// note')
       && !stripComments('keep(); // note', { trailing: true }).includes('// note'), 'opt in');
  ok('  and trailing mode keeps the code before it',
     stripComments('keep(); // note', { trailing: true }).trim() === 'keep();', 'code survives');
  ok('line mode can be turned off',
     stripComments('// a\nkeep();', { line: false }).includes('// a'), 'comments readable when needed');

  // ── 2. NO GUARD READS A DAMAGED FILE THROUGH THE NAIVE FORM ─────────────
  const damaged = damagedSources();
  ok('there are source files the naive form damages', damaged.length > 0,
     `${damaged.length} file(s), worst: ${damaged[0]}`);

  // THIS GUARD MUST READ CODE, WHICH IS THE WHOLE SUBJECT OF THIS GUARD.
  //
  // The first version scanned raw guard text, so _shared.mjs was reported as
  // its own worst offender: the documentation for stripComments QUOTES the
  // hand-written expression and lists the damaged files by name, and a scan of
  // prose cannot tell a quotation from a call. Both reads below strip comments
  // first, with the helper under test, which is the only form that does not
  // eat the regexes these files are made of.
  //
  // A REFERENCE IS A PATH, NOT A WORD. Matching a bare basename found any
  // file named in a comment; guards reference source by its path, so that is
  // what counts as reading it.
  const offenders = [];
  for (const g of guardFiles()) {
    const src = stripComments(read(g));
    NAIVE.lastIndex = 0;
    if (!NAIVE.test(src)) continue;
    const reads = damaged.filter((d) => src.includes(d));
    if (reads.length) offenders.push(`${g} reads ${reads.map((r) => path.basename(r)).join(', ')}`);
  }
  ok('no guard reads a damaged file through a hand-written strip',
     offenders.length === 0,
     offenders.length ? offenders.slice(0, 4).join(' | ') : 'every one of them uses stripComments');

  // ── 3. THE HAND-WRITTEN FORM DOES NOT SPREAD ────────────────────────────
  let count = 0;
  for (const g of guardFiles()) {
    const m = stripComments(read(g)).match(NAIVE);
    if (m) count += m.length;
  }
  ok(`hand-written strips are at or below the ceiling of ${CEILING}`,
     count <= CEILING, `${count} found`);
  // A CEILING THAT HAS FALLEN SHOULD BE LOWERED, said by the guard rather than
  // left to notice. Not a failure: a nudge with the number in it.
  ok('  and the ceiling is not stale by more than ten',
     CEILING - count <= 10, count < CEILING ? `${count} now, lower CEILING to ${count}` : 'current');

  // ── 4. THE HELPER HAS ONE HOME ──────────────────────────────────────────
  const shared = read('tests/persistence/_shared.mjs');
  ok('stripComments lives in _shared.mjs and is exported',
     /export function stripComments\(/.test(shared), 'one implementation');
  ok('  and says what it costs to get wrong',
     /Onboarding\.jsx/.test(shared) && /440 lines/.test(shared), 'the measurements are in the file');

  return results;
}

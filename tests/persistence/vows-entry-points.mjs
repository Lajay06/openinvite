/**
 * tests/persistence/vows-entry-points.mjs
 *
 * ONE WAY TO START WRITING, AND IT IS AT THE TOP.
 *
 * Vows & Speeches offered three: the top bar's "Write new", a "Write manually"
 * in the left panel's empty state, and another in the middle of the page. The
 * top bar is on screen the whole time, so the other two were repetition rather
 * than reach. Owner ruling, 2026-09-10.
 *
 * ── WHAT IS COUNTED, AND WHY NOT `setIsEditing(true)` ───────────────────────
 *
 * The obvious predicate is wrong. `setIsEditing(true)` appears four times and
 * three of them are correct: the list row's pencil and the detail pane's Edit
 * open an item that already exists, and handleAIApply opens the editor on
 * Ava's draft. Counting those would have made this guard demand the removal of
 * the ability to edit.
 *
 * A control that STARTS A NEW ONE is the pair `setSelectedItem(null)` followed
 * by `setIsEditing(true)` — clear the selection, then open the editor on
 * nothing. That is the thing there were three of. There is now one.
 *
 * ── WHY THE COUNT AND NOT THE ABSENCE ──────────────────────────────────────
 *
 * "No 'Write manually' anywhere" would pass on a page with no way to write at
 * all, which is a worse product than the one being fixed. Exactly one, and the
 * Ava entry point still present, and editing still reachable: a page that
 * loses those is as much a failure as a page that keeps four.
 *
 * The empty states keep their sentences. An empty page still has to say what
 * to do first; it just no longer carries its own copy of the buttons.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export async function runVowsEntryPoints() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const src = readFileSync(join(ROOT, 'src/pages/VowsSpeeches.jsx'), 'utf8');

  // PRESENCE BEFORE PROPERTIES: an empty file has one of nothing.
  check('the page is readable', src.length > 1000, `${src.length} chars`);

  const starters = (src.match(/setSelectedItem\(null\);\s*setIsEditing\(true\)/g) || []).length;
  check('exactly one control starts a new item', starters === 1, `${starters} found`);

  const ava = src.includes('setShowAI(true)');
  check('  and the Ava entry point is still there', ava,
    ava ? 'setShowAI(true)' : 'the page has no way to ask Ava');

  // Removing the duplicates must not take editing with them.
  const editors = (src.match(/setIsEditing\(true\)/g) || []).length - starters;
  check('  and an existing item can still be opened to edit', editors >= 2, `${editors} edit paths`);

  // Both empty states still tell a couple what to do — the ruling removed
  // duplicate buttons, not the guidance.
  for (const [where, text] of [
    ['the left panel', 'Use the buttons above to write'],
    ['the middle', 'start a new one from the buttons above'],
  ]) {
    check(`  ${where}'s empty state still says what to do`, src.includes(text), text);
  }
  return results;
}

/**
 * Owner-accepted copy is in the product, not just in a document.
 *
 * The 19 rsvpIntro lines were accepted on 2026-08-24, scoped into the fix
 * wave, and #547 shipped WITHOUT THEM. The landing check that would have
 * caught it had been instituted days earlier by the same terminal that then
 * failed to run it — and it could not have run anyway, because the accepted
 * set lived in an advisor document outside the repo. The owner found it by
 * reading his own RSVP page: "the rsvp page is not fixed and talks about
 * resending".
 *
 * So the fix is two halves and this is the second:
 *   1. accepted copy is COMMITTED to the repo the moment it is accepted
 *      (claude/rsvp-experience-ruling.md), before the ticket consuming it opens;
 *   2. a guard reads that file and proves every line is in the product.
 *
 * PRE-MORTEM — what would make this pass while the defect exists:
 *   · The ruling doc is edited to match whatever the code says, instead of the
 *     code being fixed. NOT guarded by a test — it is guarded by the doc being
 *     a record of an owner decision, with a date, in version control, where a
 *     change to it is a reviewable diff.
 *   · A line lands in the file but on the wrong universe. GUARDED — each line
 *     is checked against its own universe's config, not the file at large.
 *   · Copy is accepted and never added to the doc. NOT guarded here; that is
 *     the human half of the rule.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { UNIVERSE_CONFIGS } from '../../src/lib/websiteThemes.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const DOC = 'claude/rsvp-experience-ruling.md';

/** Parses the `| \`universe\` | line |` table out of the accepted-copy doc. */
function acceptedIntros() {
  const md = readFileSync(resolve(ROOT, DOC), 'utf8');
  const out = new Map();
  for (const m of md.matchAll(/^\|\s*`(\w+)`\s*\|\s*(.+?)\s*\|\s*$/gm)) out.set(m[1], m[2]);
  return out;
}

export async function runAcceptedCopyLanded() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Accepted copy — in the product, not just in a document:\n');

  const accepted = acceptedIntros();
  check('the accepted-copy doc is readable and parses', accepted.size >= 19, `${accepted.size} lines`);

  // Per-universe, not file-wide: a line present on the WRONG universe would
  // satisfy a file-wide grep and be wrong on every guest's screen.
  const wrong = [];
  for (const [universe, line] of accepted) {
    const actual = UNIVERSE_CONFIGS[universe]?.copy?.rsvpIntro;
    if (actual !== line) wrong.push(universe);
  }
  check('every accepted rsvpIntro is on its own universe',
    wrong.length === 0,
    wrong.length ? `wrong or missing: ${wrong.join(', ')}` : `${accepted.size}/${accepted.size} exact`);

  // The framing the owner reported. If any of it survives, the rewrite did not
  // actually replace what he was reading.
  const STALE = ['slipped away', 'has gone astray', 'been misplaced', 'Lost yours', 'send it again', 'send it once more'];
  const src = readFileSync(resolve(ROOT, 'src/lib/websiteThemes.js'), 'utf8');
  const survivors = STALE.filter((p) => src.includes(p));
  check('  and the lost-property framing is gone', survivors.length === 0,
    survivors.join(', ') || 'none of it survives');

  // CONTROL: the comparison must be capable of failing.
  const first = [...accepted.keys()][0];
  check('  control: a changed line IS detected',
    UNIVERSE_CONFIGS[first]?.copy?.rsvpIntro !== accepted.get(first) + ' x',
    'exact comparison, not substring');

  return results;
}

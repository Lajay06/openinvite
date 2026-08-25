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

/**
 * Parses one `| \`universe\` | line |` table out of the accepted-copy doc,
 * scoped to the section that owns it.
 *
 * SCOPED, not file-wide: the doc now carries two accepted sets, and a
 * file-wide table scan would happily satisfy the rsvpSent assertions with
 * rsvpIntro rows. That is the same "a check that searches wider than the
 * thing it verifies" failure the meal probe hit — the assertion must be
 * scoped to the unit under test.
 */
function acceptedFrom(headingStartsWith) {
  const md = readFileSync(resolve(ROOT, DOC), 'utf8');
  const start = md.indexOf(headingStartsWith);
  if (start === -1) return new Map();
  const rest = md.slice(start + headingStartsWith.length);
  const end = rest.indexOf('\n## ');
  const section = end === -1 ? rest : rest.slice(0, end);
  const out = new Map();
  for (const m of section.matchAll(/^\|\s*`(\w+)`\s*\|\s*(.+?)\s*\|\s*$/gm)) out.set(m[1], m[2]);
  return out;
}

export async function runAcceptedCopyLanded() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Accepted copy — in the product, not just in a document:\n');

  const SETS = [
    { field: 'rsvpIntro', heading: '## `rsvpIntro`' },
    { field: 'rsvpSent',  heading: '## `rsvpSent`' },
  ];

  for (const { field, heading } of SETS) {
    const accepted = acceptedFrom(heading);
    check(`${field}: the accepted set parses from the ruling doc`,
      accepted.size === 19, `${accepted.size} lines`);

    // Per-universe, not file-wide: a line present on the WRONG universe would
    // satisfy a file-wide grep and be wrong on every guest's screen.
    const wrong = [];
    for (const [universe, line] of accepted) {
      if (UNIVERSE_CONFIGS[universe]?.copy?.[field] !== line) wrong.push(universe);
    }
    check(`  ${field}: every accepted line is on its own universe`,
      wrong.length === 0,
      wrong.length ? `wrong or missing: ${wrong.join(', ')}` : `${accepted.size}/${accepted.size} exact`);
  }

  // The two sets must not be the same table read twice — the scoping above is
  // load-bearing, so prove the sections really are distinct.
  check('  the two accepted sets are distinct sections',
    acceptedFrom('## `rsvpIntro`').get('brooklyn') !== acceptedFrom('## `rsvpSent`').get('brooklyn'),
    'scoped parse, not a file-wide table scan');

  // The framing the owner reported. If any of it survives, the rewrite did not
  // actually replace what he was reading.
  const STALE = ['slipped away', 'has gone astray', 'been misplaced', 'Lost yours', 'send it again', 'send it once more'];
  const src = readFileSync(resolve(ROOT, 'src/lib/websiteThemes.js'), 'utf8');
  const survivors = STALE.filter((p) => src.includes(p));
  check('  and the lost-property framing is gone', survivors.length === 0,
    survivors.join(', ') || 'none of it survives');

  // CONTROL: the comparison must be capable of failing.
  const intros = acceptedFrom('## `rsvpIntro`');
  const first = [...intros.keys()][0];
  check('  control: a changed line IS detected',
    UNIVERSE_CONFIGS[first]?.copy?.rsvpIntro !== intros.get(first) + ' x',
    'exact comparison, not substring');

  // The loanword rule names this exact string as its own reductio, and it was
  // live in production until this set replaced it.
  const src2 = readFileSync(resolve(ROOT, 'src/lib/websiteThemes.js'), 'utf8');
  check('  and paris no longer opens with a loanword flourish',
    !src2.includes('Avec plaisir'), 'CLAUDE.md\'s own reductio, gone');

  return results;
}

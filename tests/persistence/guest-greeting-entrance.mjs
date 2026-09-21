/**
 * The greeting on the entrance — guest greeting, package three.
 *
 * "For Nora", one line above the kicker, on the universe's own name motion,
 * for a recognised guest whose name the shell has resolved BY THE KICKER
 * BEAT. The rules this guard pins, in the order a visit meets them:
 *
 *   1. The name is fixed at the kicker beat from a ref, never read live from
 *      the prop in the tree — a name that lands late never appears, never
 *      re-fires a beat, never moves what is painted.
 *   2. When there is no name there is no element: `{greetName && (…)}`, and
 *      the line is absolutely positioned off the column's top edge, so the
 *      ungreeted overlay is byte-identical to before and the greeted one
 *      differs by exactly that line.
 *   3. The ledger. `oi_entrance_<slug>` records SEEN_UNGREETED or
 *      SEEN_GREETED; a legacy '1' is migrated to SEEN_UNGREETED at mount; a
 *      replay is offered only when the name is already known at mount, and a
 *      replay — finished or skipped — writes SEEN_GREETED, so it happens once.
 *
 * The painted proofs (greeted vs ungreeted DOM, reduced motion, slow and
 * failing lookups, the ledger walked end to end, six universes × two widths)
 * live in the PR body; they need a browser on this lane's own port.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '../..');

export async function runGuestGreetingEntrance() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  The greeting on the entrance — one line, decided at the beat, replayed once:\n');

  const src = readFileSync(resolve(ROOT, 'src/components/guest-website/EntranceMoment.jsx'), 'utf8');

  // 1. Decided at the beat.
  const beat = src.match(/setTimeout\(\(\) => \{[\s\S]*?greetNameRef\.current = name;[\s\S]*?setGreetName\(name\);[\s\S]*?setPhase\(p => \(p === 'scrim' \? 'kicker' : p\)\);[\s\S]*?\}, config\.beats\.kicker\)/);
  check('the name is fixed inside the kicker timer, from the ref', !!beat, beat ? 'found' : 'not found');
  check('  and the tree never reads the prop directly', /guestFirstNameRef\.current = guestFirstName/.test(src) && !/\{guestFirstName\}/.test(src), 'ref only');

  // 2. One line, or nothing.
  const line = src.match(/\{greetName && \(\s*<motion\.p[\s\S]*?For \{greetName\}[\s\S]*?<\/motion\.p>\s*\)\}/);
  check('the greeting renders only when greetName is set', !!line, line ? 'conditional' : 'not found');
  check('  as "For {name}" on the names motion variants', !!line && /variants=\{variants\}/.test(line[0]), 'same motion as the names');
  check('  positioned off the column edge, reserving nothing', !!line && /position: 'absolute', bottom: '100%'/.test(line[0]), 'absolute, bottom 100%');
  check('  immediately above the kicker in source order', !!line && src.indexOf(line[0]) < src.indexOf('{/* Beat 2 — kicker + hairline */}'), 'precedes the kicker block');

  // 3. The ledger.
  check('two recorded outcomes, exported', /export const SEEN_UNGREETED = 'seen-ungreeted'/.test(src) && /export const SEEN_GREETED = 'seen-greeted'/.test(src), 'SEEN_UNGREETED, SEEN_GREETED');
  const init = src.match(/const \[phase, setPhase\] = useState\(\(\) => \{[\s\S]*?return 'scrim';\s*\}\);/);
  check('a greeted viewing never replays', !!init && /if \(seen === SEEN_GREETED\) return 'gone';/.test(init[0]), 'gone');
  check('  a legacy \'1\' is migrated to seen-ungreeted at mount', !!init && /if \(seen !== SEEN_UNGREETED\) window\.localStorage\.setItem\(storageKey, SEEN_UNGREETED\);/.test(init[0]), 'migrated');
  check('  the replay is offered only when the name is known at mount', !!init && /if \(!guestFirstName\) return 'gone';\s*replayRef\.current = true;/.test(init[0]), 'prop at mount');
  check('  a greeted play or a spent replay writes seen-greeted, else seen-ungreeted',
    /const seen = greetNameRef\.current \|\| replayRef\.current \? SEEN_GREETED : SEEN_UNGREETED;/.test(src) && /localStorage\.setItem\(storageKey, seen\)/.test(src), 'once');

  return results;
}

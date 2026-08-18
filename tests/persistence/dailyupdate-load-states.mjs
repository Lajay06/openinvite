/**
 * DailyUpdate must be able to tell an outage from an empty account.
 *
 * The page loaded every data source as `.catch(() => [])`, so a total backend
 * failure and a brand-new account rendered byte-identical UI — a calm,
 * complete "nothing here yet" on the page couples land on first. There was no
 * loading/error distinction and no reachable retry (`handleRefresh` existed but
 * nothing called it; eslint reported it unused on main).
 *
 * These are STRUCTURAL pins, not behavioural tests — this is a static guard in
 * a suite with no React renderer. They exist so the swallow-everything pattern
 * cannot come back unnoticed, which is the same reason the guest plaintext
 * reader guards exist.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dir, '../../src/pages/DailyUpdate.jsx');

export async function runDailyUpdateLoadStates() {
  const results = [];
  const raw = readFileSync(FILE, 'utf8');
  // Comments are stripped BEFORE scanning. The first version of this guard
  // matched its own header, which describes the very pattern it forbids — the
  // same way an earlier reader guard matched the identifier in its own import.
  // A guard that can be satisfied or broken by prose is not a guard.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  console.log('\n  DailyUpdate — an outage must not render as an empty account:\n');

  // The exact pattern that made failure invisible.
  const swallows = (src.match(/\.catch\(\(\)\s*=>\s*\[\]\)/g) || []).length;
  results.push(swallows === 0
    ? pass('no data source swallows its failure with .catch(() => [])', '0 occurrences')
    : fail('a data source still discards its failure', '0 occurrences of .catch(() => [])', `${swallows} found`));

  // Failures must be recorded so the render can distinguish the two cases.
  results.push(/setFailedSources\(/.test(src)
    ? pass('load failures are recorded, not discarded', 'setFailedSources present')
    : fail('load failures are not recorded', 'setFailedSources(...)', 'absent'));

  // A distinct error phase, separate from ready.
  results.push(/setPhase\(['"]error['"]\)/.test(src) && /phase === ['"]error['"]/.test(src)
    ? pass("an 'error' phase exists and is rendered", 'set and read')
    : fail("no distinct 'error' phase", "setPhase('error') and phase === 'error'", 'missing one or both'));

  // The retry must actually be reachable — it was dead code before.
  const defined = /const handleRefresh\s*=/.test(src);
  const wired = (src.match(/onClick=\{handleRefresh\}/g) || []).length;
  results.push(defined && wired >= 1
    ? pass('the retry handler is reachable from the UI', `${wired} call site(s)`)
    : fail('handleRefresh is defined but unreachable', 'at least one onClick={handleRefresh}', `${wired} found`));

  // Partial failure must be surfaced, not silently folded into the numbers.
  results.push(/failedSources\.length > 0/.test(src)
    ? pass('partial failure is surfaced rather than presented as complete data', 'banner guarded on failedSources')
    : fail('partial failure is invisible', 'a render branch on failedSources.length', 'absent'));

  return results;
}

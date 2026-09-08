/**
 * Registry entry for scripts/launch-smoke.mjs.
 *
 * The script lives in scripts/ because it is a runnable journey, not a guard
 * over a module — but the registry only enumerates this directory, so a file
 * that is not here cannot be listed, and R35 is the rule that a test no runner
 * executes is not a gate. This is the runner.
 *
 * It is in LIVE_CREDENTIAL_GUARDS, so the CI lane never calls it: it signs up
 * a real account and sends a real email. The owner runs it.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export async function runLaunchSmoke() {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/launch-smoke.mjs')], {
    encoding: 'utf8', stdio: 'pipe', env: process.env,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  process.stdout.write(out);
  const line = (out.match(/^\s*(\d+)\/(\d+)\s/m) || []);
  const detail = line.length ? `${line[1]}/${line[2]} steps` : 'no summary line';
  return [r.status === 0 ? pass('the stranger’s journey completes', detail) : fail('the stranger’s journey completes', 'exit 0', detail)];
}

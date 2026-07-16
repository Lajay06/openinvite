/**
 * scripts/capture/run-all.mjs
 *
 * The one command that re-captures everything after a UI change:
 * pre-flight -> stills -> videos -> upload -> report. Stops immediately if
 * pre-flight fails rather than capturing a broken/wrong account state.
 *
 * Usage: npm run capture
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MANIFEST_FILE } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(script) {
  console.log('\n' + '─'.repeat(60));
  console.log(`▶ ${script}`);
  console.log('─'.repeat(60));
  const res = spawnSync('node', [path.join(__dirname, script)], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`\n✗ ${script} exited with code ${res.status}. Stopping the run.`);
    process.exit(res.status || 1);
  }
}

run('preflight.mjs');
run('stills.mjs');
run('videos.mjs');
run('upload.mjs');

console.log('\n' + '='.repeat(60));
console.log('✓ Capture run complete.');
if (fs.existsSync(MANIFEST_FILE)) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  console.log(`\nShot list (${Object.keys(manifest).length}):`);
  for (const [name, urls] of Object.entries(manifest)) {
    const url = urls.png || urls.jpg || urls.mp4 || Object.values(urls)[0];
    console.log(`  ${name}: ${url}`);
  }
}
console.log('='.repeat(60));

#!/usr/bin/env node
/**
 * REFUSE TO PUSH A COMMIT CONTAINING A CREDENTIAL FILE.
 *
 * These paths were ALREADY in .gitignore and were staged anyway.
 *
 * .gitignore lives in the tree, so its protection is only as old as the commit
 * you have checked out. The rules covering scripts/capture/output/ were added
 * on 2026-08-25; a recovery branch created at a 2026-07-16 base checked out a
 * .gitignore without them, every ignored hazard in the working directory became
 * stageable, and `git add -A` took a session storage-state and an RSVP probe
 * token into a commit.
 *
 * Nothing reached origin — the commit was diffed against its source before
 * being pushed, and rebuilt by name. But that was a check someone remembered to
 * run, and this is the version that does not need remembering.
 *
 * A HAZARD LEFT IN THE WORKSPACE WILL EVENTUALLY BE PICKED UP BY A ROUTINE
 * COMMAND. Removing the hazard beats resolving to be careful around it.
 */
import { execSync } from 'child_process';

// Path shapes that must never enter a commit, whatever .gitignore says at the
// commit you happen to be standing on.
const FORBIDDEN = [
  { re: /(^|\/)storage-state\.json$/,        why: 'a browser session state — contains cookies and auth tokens' },
  { re: /(^|\/)rsvp-token\.txt$/,            why: 'a live RSVP probe token' },
  { re: /(^|\/)\.env$/,                      why: 'real environment values' },
  { re: /(^|\/)\.env\.(local|production)$/,  why: 'real environment values' },
  { re: /(^|\/)settings\.local\.json$/,      why: 'machine-local config, often with tokens' },
  { re: /(^|\/)\.app\.jsonc$/,               why: 'Base44 app config' },
  { re: /\.pem$|\.p12$|(^|\/)id_rsa$/,       why: 'a private key' },
];

const range = process.argv[2] || 'origin/main..HEAD';
let files = [];
try {
  files = execSync(`git diff --name-only ${range}`, { encoding: 'utf8' }).split('\n').filter(Boolean);
} catch {
  // No upstream yet — check everything this branch adds.
  files = execSync('git diff --name-only HEAD~1..HEAD', { encoding: 'utf8' }).split('\n').filter(Boolean);
}

const hits = [];
for (const f of files) for (const { re, why } of FORBIDDEN) if (re.test(f)) hits.push({ f, why });

if (hits.length) {
  console.error('\n  CREDENTIAL FILE IN A COMMIT — REFUSING THIS PUSH.\n');
  for (const { f, why } of hits) console.error(`    ${f}\n      ${why}`);
  console.error('\n  These never enter git. Remove them from the commit:');
  console.error('    git rm --cached <path>   # then amend, or rebuild the commit by name\n');
  console.error('  If .gitignore should have caught this, check whether the rule exists');
  console.error('  at the commit you branched from — that is how this happened before.\n');
  process.exit(1);
}
console.log(`  no credential files in ${range} (${files.length} file(s) checked)`);

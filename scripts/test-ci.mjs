/**
 * scripts/test-ci.mjs
 *
 * CI-safe subset of the persistence suite: every module that needs no live
 * Base44 login and no BASE44_ADMIN_KEY — pure-function / mocked-network
 * checks only. Exists so GitHub Actions can gate PRs without holding
 * BASE44_ADMIN_KEY (full production database access) as a repo secret, and
 * without every PR run writing to the live production Base44 database
 * (which risks colliding with whatever a local `npm run test:persistence`
 * run is doing at the same time).
 *
 * The live, credential-requiring modules (guest/RSVP/ownership round-trips,
 * onboarding, endpoint-auth, anonymous-endpoints, notifications, seating,
 * table-guest-sync, plus-one identity, collaborator invite, todo-list
 * schema, wedding-details) stay in scripts/test-persistence.mjs as the
 * mandatory LOCAL pre-merge step WORKFLOW.md documents — this script's job
 * is to catch everything CI safely can without those.
 *
 * Usage: npm run test:ci
 * Exits 0 if all pass, 1 if any fail.
 */


import { loadGuards, LIVE_CREDENTIAL_GUARDS, STANDALONE_GUARDS } from '../tests/persistence/_registry.mjs';

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  CI test suite — Openinvite (credential-free subset)');
  console.log('  Live Base44 round-trip checks run locally via npm run test:persistence');
  console.log('═══════════════════════════════════════════════════════\n');

  const results = [];

  // Modules that died mid-run rather than returning results. A throw already
  // fails the suite (results.push(false) -> non-zero exit), but the UNCAUGHT
  // line prints hundreds of lines above the summary, so a dead module reads as
  // "one check failed somewhere" in a 861-check log. Named here so the summary
  // says WHICH module never ran — the difference between a failing assertion
  // and a file whose assertions did not execute at all.
  const crashed = [];

  async function runModule(name, fn) {
    try {
      results.push(...await fn());
    } catch (err) {
      console.error(`\n  ⚠️  UNCAUGHT ERROR in ${name}: ${err.message}\n`);
      crashed.push(`${name}: ${err.message}`);
      results.push(false);
    }
  }

  // EVERY GUARD IN THE DIRECTORY, IN FILENAME ORDER.
  //
  // This was seventy-six hand-written `runModule` lines, and above them
  // seventy-six hand-written imports. Two costs, both paid twice on
  // 2026-09-06: sample-content-never-published.mjs was in neither list and CI
  // had never run its 249 checks (R35), and every PR that added a guard
  // collided with the last one on exactly these lines.
  //
  // A guard now runs BECAUSE IT EXISTS. Adding one touches no shared file, so
  // there is nothing left to collide on and nothing left to forget.
  //
  // Sorted by filename, so the order is deterministic and reviewable. These
  // guards are independent — none creates state another reads — so the order
  // is a property of the log rather than of the result.
  const guards = await loadGuards('ci');
  for (const g of guards) {
    if (!g.run) {
      // A module that cannot be run is the exact thing enumeration exists to
      // make impossible, so it fails loudly rather than being skipped.
      console.error(`\n  ⚠️  REGISTRY ERROR in ${g.file}: ${g.error}\n`);
      crashed.push(`${g.file}: ${g.error}`);
      results.push(false);
      continue;
    }
    await runModule(g.name, g.run);
  }
  console.log(`\n  ${guards.length} guard module(s) enumerated from tests/persistence/`
    + ` — ${LIVE_CREDENTIAL_GUARDS.size} live-credential and ${STANDALONE_GUARDS.size} standalone run elsewhere.`);

  const passed = results.filter(Boolean).length;
  const total = results.length;
  const allOk = passed === total;

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  Result: ${passed}/${total} checks passed`);
  if (crashed.length) {
    console.log(`  ⛔  ${crashed.length} MODULE(S) CRASHED — their assertions never ran:`);
    for (const c of crashed) console.log(`        ${c}`);
  }
  if (!allOk) {
    console.log('  ⚠️  Some checks failed — see output above.');
  }
  console.log(`${'─'.repeat(55)}\n`);

  process.exit(allOk ? 0 : 1);
}

run().catch(err => {
  console.error('\n✗ Unexpected error:', err.message);
  process.exit(1);
});

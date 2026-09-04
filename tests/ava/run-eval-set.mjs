import { EVAL_SET, validateEvalSet } from './eval-set.mjs';

console.log('\n  Ava eval set — twenty questions, five that must be refused:\n');
const results = validateEvalSet(EVAL_SET);
for (const r of results) console.log(`  ${r.ok ? '✅ PASS' : '❌ FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
console.log(`\n  ${results.filter((r) => r.ok).length}/${results.length} passed`);
console.log('  NOTE: this validates the SET. Running the questions against a live');
console.log('  model needs the owner to confirm expected answers first.');
process.exit(results.every((r) => r.ok) ? 0 : 1);

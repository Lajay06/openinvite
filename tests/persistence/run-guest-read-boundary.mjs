import { runGuestReadBoundary } from './guest-read-boundary.mjs';

const results = await runGuestReadBoundary();
const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);

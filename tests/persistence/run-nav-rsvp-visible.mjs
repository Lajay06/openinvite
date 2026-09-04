import { runNavRsvpVisible } from './nav-rsvp-visible.mjs';

const results = await runNavRsvpVisible();
const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);

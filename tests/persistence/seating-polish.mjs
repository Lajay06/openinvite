/**
 * tests/persistence/seating-polish.mjs
 *
 * Covers fix/seating-polish: (1) a selected table gets an accent ring/glow
 * + a gentle pulse (not just a border-colour swap), and assigned vs empty
 * seats are visually distinct beyond colour alone; (2) a table can be
 * renamed at any time via the side panel, not only at creation.
 *
 * Seating.jsx/VisualTable.jsx are .jsx files (real render logic, imports
 * React) — this suite runs as a plain Node script with no JSX transform,
 * so (same convention as elsewhere in this suite) these are structural
 * checks against the source text, plus a live round-trip proving a
 * renamed table's name actually persists.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_ID, api, pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dir, '..', '..', p), 'utf8');

export async function runSeatingPolish(token) {
  const results = [];

  console.log('\n  Seating polish — selected table is visually obvious:\n');

  const visualTableSource = read('src/components/seating/VisualTable.jsx');
  const checks = [
    { name: 'Selected table gets an accent box-shadow/ring', re: /boxShadow:\s*selected\s*\?\s*'0 0 0 4px rgba\(224,53,83/ },
    { name: 'Selected table gets a subtle scale-up', re: /transform:\s*selected\s*\?\s*'scale\(1\.\d+\)'/ },
    { name: 'Selected table applies the seating-table-selected pulse class', re: /className=\{selected \? 'seating-table-selected' : undefined\}/ },
    { name: 'Assigned seats get a solid ring distinct from empty seats\' dashed outline', re: /border:\s*guest\s*\?\s*'2px solid #FFFFFF'\s*:\s*'1\.5px dashed/ },
  ];
  for (const c of checks) {
    results.push(c.re.test(visualTableSource) ? pass(c.name, 'found') : fail(c.name, 'found', 'not found'));
  }

  const css = read('src/index.css');
  results.push(/@keyframes seatingTablePulse/.test(css)
    ? pass('seatingTablePulse keyframe exists', 'found')
    : fail('seatingTablePulse keyframe exists', 'found', 'not found'));
  results.push(/prefers-reduced-motion:\s*no-preference\)\s*\{\s*\.seating-table-selected/.test(css)
    ? pass('seating-table-selected pulse is gated behind prefers-reduced-motion', 'found')
    : fail('seating-table-selected pulse is gated behind prefers-reduced-motion', 'found', 'not found — would ignore the accessibility preference'));

  console.log('\n  Seating polish — tables can be renamed anytime (live round-trip):\n');

  const seatingSource = read('src/pages/Seating.jsx');
  results.push(/const handleRenameTable = /.test(seatingSource)
    ? pass('Seating.jsx has handleRenameTable', 'found')
    : fail('Seating.jsx has handleRenameTable', 'found', 'not found'));
  results.push(/renamingTableId/.test(seatingSource)
    ? pass('Seating.jsx has rename-mode state for the side panel', 'found')
    : fail('Seating.jsx has rename-mode state for the side panel', 'found', 'not found'));

  let tableId = null;
  try {
    // Table has no is_test field in its schema — cleaned up explicitly in
    // the `finally` block below instead (same as the DELETE-in-finally
    // pattern used for entities without one, e.g. guest.mjs's RSVP block).
    const created = await api('POST', `/apps/${APP_ID}/entities/Table`,
      { name: '__PERSISTENCE_TEST_TABLE__', shape: 'round', capacity: 8, assigned_guests: [] }, token);
    tableId = created.id;

    await api('PUT', `/apps/${APP_ID}/entities/Table/${tableId}`, { name: 'Head Table' }, token);
    const back = await api('GET', `/apps/${APP_ID}/entities/Table/${tableId}`, undefined, token);
    results.push(back.name === 'Head Table'
      ? pass('Renaming a table (Table.update name) persists', `"${back.name}"`)
      : fail('Renaming a table (Table.update name) persists', 'Head Table', back.name));
  } catch (err) {
    console.log(`  ❌ FAIL  table rename round-trip — error: ${err.message}`);
    results.push(false);
  } finally {
    if (tableId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Table/${tableId}`, undefined, token); } catch { /* non-fatal */ }
    }
  }

  return results;
}

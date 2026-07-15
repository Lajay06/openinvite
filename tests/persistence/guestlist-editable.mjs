/**
 * tests/persistence/guestlist-editable.mjs
 *
 * Covers feat/guestlist-editable's overhaul of the guest list:
 *  - Live round-trip: a Guest created with no `category` stays genuinely
 *    blank (the Base44 schema used to default category to 'family' — that
 *    default has been removed; this is the actual regression test for "no
 *    category on import", since the earlier default applied server-side
 *    regardless of what the import code sent).
 *  - Live round-trip: `tags` (already a registered array field) persists
 *    through both a plain update and an add/remove-style read-modify-write,
 *    the same shape the bulk-edit tag actions perform.
 *  - Structural checks (readFileSync — Guests.jsx/GuestList.jsx/
 *    ImportGuestModal.jsx/BulkActionBar.jsx are .jsx files; this suite runs
 *    as a plain Node script with no JSX transform) confirming: Bulk add is
 *    gone, the persistent add-row/editable Tags column exist, the CSV
 *    template is simplified to exactly 4 columns, and import never sets
 *    category.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_ID, api, pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dir, '..', '..', p), 'utf8');

export async function runGuestlistEditable(token) {
  const results = [];

  console.log('\n  Guest list editable — category has no schema default (live round-trip):\n');

  let blankCategoryId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_NO_CATEGORY__', is_test: true }, token);
    blankCategoryId = created.id;
    const back = await api('GET', `/apps/${APP_ID}/entities/Guest/${blankCategoryId}`, undefined, token);
    results.push(!back.category
      ? pass('Guest created with no category stays blank (not defaulted to "family")', JSON.stringify(back.category))
      : fail('Guest created with no category stays blank (not defaulted to "family")', 'blank/undefined', back.category));
  } catch (err) {
    console.log(`  ❌ FAIL  category-blank-on-create — error: ${err.message}`);
    results.push(false);
  } finally {
    if (blankCategoryId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${blankCategoryId}`, undefined, token); } catch { /* non-fatal */ }
    }
  }

  console.log('\n  Guest list editable — tags persist through create/update (bulk-edit\'s add/remove shape):\n');

  let tagsGuestId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_TAGS__', is_test: true, tags: ['College friends'] }, token);
    tagsGuestId = created.id;

    let back = await api('GET', `/apps/${APP_ID}/entities/Guest/${tagsGuestId}`, undefined, token);
    results.push(Array.isArray(back.tags) && back.tags.length === 1 && back.tags[0] === 'College friends'
      ? pass('Guest.tags persists on create', JSON.stringify(back.tags))
      : fail('Guest.tags persists on create', '["College friends"]', JSON.stringify(back.tags)));

    // Mirrors handleBulkAddTag: read current tags, append, write back.
    const withAdded = [...(back.tags || []), 'Work'];
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${tagsGuestId}`, { tags: withAdded }, token);
    back = await api('GET', `/apps/${APP_ID}/entities/Guest/${tagsGuestId}`, undefined, token);
    results.push(Array.isArray(back.tags) && back.tags.length === 2 && back.tags.includes('Work') && back.tags.includes('College friends')
      ? pass('Guest.tags — bulk "add tag" (read, append, write) persists', JSON.stringify(back.tags))
      : fail('Guest.tags — bulk "add tag" (read, append, write) persists', '["College friends","Work"]', JSON.stringify(back.tags)));

    // Mirrors handleBulkRemoveTag: read current tags, filter, write back.
    const withRemoved = (back.tags || []).filter(t => t !== 'College friends');
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${tagsGuestId}`, { tags: withRemoved }, token);
    back = await api('GET', `/apps/${APP_ID}/entities/Guest/${tagsGuestId}`, undefined, token);
    results.push(Array.isArray(back.tags) && back.tags.length === 1 && back.tags[0] === 'Work'
      ? pass('Guest.tags — bulk "remove tag" (read, filter, write) persists', JSON.stringify(back.tags))
      : fail('Guest.tags — bulk "remove tag" (read, filter, write) persists', '["Work"]', JSON.stringify(back.tags)));
  } catch (err) {
    console.log(`  ❌ FAIL  tags round-trip — error: ${err.message}`);
    results.push(false); results.push(false); results.push(false);
  } finally {
    if (tagsGuestId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${tagsGuestId}`, undefined, token); } catch { /* non-fatal */ }
    }
  }

  console.log('\n  Guest list editable — "Bulk add" fully removed:\n');

  const bulkAddModalPath = resolve(__dir, '..', '..', 'src/components/guests/BulkAddGuestModal.jsx');
  results.push(!existsSync(bulkAddModalPath)
    ? pass('BulkAddGuestModal.jsx no longer exists', 'deleted')
    : fail('BulkAddGuestModal.jsx no longer exists', 'file deleted', 'file still present'));

  const guestsPageSource = read('src/pages/Guests.jsx');
  results.push(!/BulkAddGuestModal/.test(guestsPageSource)
    ? pass('Guests.jsx has no remaining BulkAddGuestModal reference', 'none found')
    : fail('Guests.jsx has no remaining BulkAddGuestModal reference', 'none', 'reference still present'));
  results.push(!/>\s*Bulk add\s*</.test(guestsPageSource)
    ? pass('Guests.jsx no longer renders a "Bulk add" button', 'none found')
    : fail('Guests.jsx no longer renders a "Bulk add" button', 'none', 'button still present'));

  console.log('\n  Guest list editable — Monday.com-style table (inline-editable Tags/Dietary, persistent add row):\n');

  const guestListSource = read('src/components/guests/GuestList.jsx');
  const listChecks = [
    { name: 'GuestList.jsx has a Tags column header', re: /<TableHead>Tags<\/TableHead>/ },
    { name: 'GuestList.jsx has an inline-editable tags cell (tagsCell)', re: /const tagsCell = /},
    { name: 'GuestList.jsx has an inline-editable dietary cell (dietaryCell)', re: /const dietaryCell = / },
    { name: 'GuestList.jsx has the persistent AddGuestRow component', re: /function AddGuestRow\(/ },
    { name: 'GuestList.jsx accepts an onQuickAdd prop for the add row', re: /onQuickAdd/ },
    { name: 'CATEGORY_OPTIONS is exported for reuse by the bulk-edit bar', re: /export const CATEGORY_OPTIONS/ },
  ];
  for (const c of listChecks) {
    results.push(c.re.test(guestListSource) ? pass(c.name, 'found') : fail(c.name, 'found', 'not found'));
  }

  console.log('\n  Guest list editable — multi-select bulk edit bar (Category/Tags/Dietary/Delete):\n');

  const bulkBarPath = resolve(__dir, '..', '..', 'src/components/guests/BulkActionBar.jsx');
  results.push(existsSync(bulkBarPath)
    ? pass('BulkActionBar.jsx exists', 'found')
    : fail('BulkActionBar.jsx exists', 'found', 'not found'));
  if (existsSync(bulkBarPath)) {
    const barSource = read('src/components/guests/BulkActionBar.jsx');
    const barChecks = [
      { name: 'BulkActionBar exposes onSetCategory (bulk category set)', re: /onSetCategory/ },
      { name: 'BulkActionBar exposes onSetDietary (bulk dietary set)', re: /onSetDietary/ },
      { name: 'BulkActionBar exposes onAddTag (bulk tag add)', re: /onAddTag/ },
      { name: 'BulkActionBar exposes onRemoveTag (bulk tag remove)', re: /onRemoveTag/ },
      { name: 'BulkActionBar exposes onDelete (bulk delete)', re: /onDelete/ },
    ];
    for (const c of barChecks) {
      results.push(c.re.test(barSource) ? pass(c.name, 'found') : fail(c.name, 'found', 'not found'));
    }
  }

  const guestsSourceForBulk = guestsPageSource;
  const bulkHandlerChecks = [
    { name: 'Guests.jsx has handleBulkUpdate (uniform category/dietary set)', re: /const handleBulkUpdate = / },
    { name: 'Guests.jsx has handleBulkAddTag', re: /const handleBulkAddTag = / },
    { name: 'Guests.jsx has handleBulkRemoveTag', re: /const handleBulkRemoveTag = / },
    { name: 'Guests.jsx has handleBulkDelete', re: /const handleBulkDelete = / },
    { name: 'Guests.jsx has handleQuickAdd for the persistent add row', re: /const handleQuickAdd = / },
  ];
  for (const c of bulkHandlerChecks) {
    results.push(c.re.test(guestsSourceForBulk) ? pass(c.name, 'found') : fail(c.name, 'found', 'not found'));
  }

  console.log('\n  Guest list editable — CSV template simplified to exactly Name/Email/Phone/Plus one:\n');

  const importSource = read('src/components/guests/ImportGuestModal.jsx');
  const templateMatch = importSource.match(/const TEMPLATE_HEADERS = \[([^\]]*)\]/);
  const templateHeaders = templateMatch
    ? templateMatch[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
    : [];
  const expectedHeaders = ['Name', 'Email', 'Phone', 'Plus one (Y/blank)'];
  results.push(JSON.stringify(templateHeaders) === JSON.stringify(expectedHeaders)
    ? pass('TEMPLATE_HEADERS is exactly Name/Email/Phone/Plus one (Y/blank)', JSON.stringify(templateHeaders))
    : fail('TEMPLATE_HEADERS is exactly Name/Email/Phone/Plus one (Y/blank)', JSON.stringify(expectedHeaders), JSON.stringify(templateHeaders)));

  const rowToGuestMatch = importSource.match(/function rowToGuest\(row\) \{[\s\S]*?\n\}/);
  const rowToGuestBody = rowToGuestMatch ? rowToGuestMatch[0] : '';
  results.push(rowToGuestBody && !/category:/.test(rowToGuestBody)
    ? pass('rowToGuest() never sets category (imported guests get no category)', 'no category key in returned object')
    : fail('rowToGuest() never sets category (imported guests get no category)', 'no category key', 'category key present'));

  return results;
}

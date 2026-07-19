/**
 * tests/persistence/guestlist-editable.mjs
 *
 * Covers feat/guestlist-editable's overhaul of the guest list:
 *  - Live round-trip: a Guest created with no `category` gets the schema's
 *    own default of 'family' (AUDIT_2026-07.md schema-drift re-verification,
 *    2026-07: this test previously asserted the field stays blank, on the
 *    assumption the default had been removed — re-checked the live schema
 *    directly and the enum + "family" default are actually declared and
 *    intentional, so the old assertion was stale, not a real regression).
 *    "No category on import" is still covered — see the separate structural
 *    check below that rowToGuest() never sets category itself.
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
import { APP_ID, api, pass, fail, cleanupEntity } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dir, '..', '..', p), 'utf8');

export async function runGuestlistEditable(token) {
  const results = [];

  console.log('\n  Guest list editable — category defaults to "family" (live round-trip):\n');

  let blankCategoryId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_NO_CATEGORY__', is_test: true }, token);
    blankCategoryId = created.id;
    const back = await api('GET', `/apps/${APP_ID}/entities/Guest/${blankCategoryId}`, undefined, token);
    results.push(back.category === 'family'
      ? pass('Guest created with no category gets the schema default ("family")', back.category)
      : fail('Guest created with no category gets the schema default ("family")', 'family', back.category));
  } catch (err) {
    console.log(`  ❌ FAIL  category-defaults-to-family — error: ${err.message}`);
    results.push(false);
  } finally {
    if (blankCategoryId) {
      await cleanupEntity(token, 'Guest', blankCategoryId);
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
      await cleanupEntity(token, 'Guest', tagsGuestId);
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
    { name: 'GuestList.jsx has the persistent AddGuestRow component', re: /function AddGuestRow\(/ },
    { name: 'GuestList.jsx accepts an onQuickAdd prop for the add row', re: /onQuickAdd/ },
    { name: 'CATEGORY_OPTIONS is exported for reuse by the bulk-edit bar', re: /export const CATEGORY_OPTIONS/ },
  ];
  for (const c of listChecks) {
    results.push(c.re.test(guestListSource) ? pass(c.name, 'found') : fail(c.name, 'found', 'not found'));
  }

  console.log('\n  Guest list — Dietary moved out of its own table column, into the expanded detail row (fix/guest-list-order-dietary):\n');

  results.push(!/<TableHead>Dietary<\/TableHead>/.test(guestListSource)
    ? pass('GuestList.jsx no longer has a Dietary column header', 'not found')
    : fail('GuestList.jsx no longer has a Dietary column header', 'not found', 'still present'));

  results.push(/function DietaryField\(/.test(guestListSource)
    ? pass('GuestList.jsx has a DietaryField component', 'found')
    : fail('GuestList.jsx has a DietaryField component', 'found', 'not found'));

  // Wired into the expanded RSVP detail row, not just defined — a component
  // that exists but is never rendered would silently make dietary uneditable.
  const rsvpDetailRowMatch = guestListSource.match(/function RsvpDetailRow\([\s\S]*?\n\}/);
  const rsvpDetailRowBody = rsvpDetailRowMatch ? rsvpDetailRowMatch[0] : '';
  results.push(/<DietaryField\b/.test(rsvpDetailRowBody)
    ? pass('RsvpDetailRow renders <DietaryField> (dietary is reachable from the expand chevron)', 'found')
    : fail('RsvpDetailRow renders <DietaryField> (dietary is reachable from the expand chevron)', 'found', 'not found'));

  results.push(/COLUMN_COUNT = 10/.test(guestListSource)
    ? pass('COLUMN_COUNT updated to 10 after removing the Dietary column', '10')
    : fail('COLUMN_COUNT updated to 10 after removing the Dietary column', '10', 'not found/stale'));

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

  console.log('\n  Guest list — new guests default to the bottom of the list, not the top (fix/guest-list-order-dietary):\n');

  results.push(/getMyGuestsWithRsvp\('created_date'\)/.test(guestsPageSource)
    ? pass('Guests.jsx loads with ascending created_date (oldest first, newest last)', "getMyGuestsWithRsvp('created_date')")
    : fail('Guests.jsx loads with ascending created_date (oldest first, newest last)', "getMyGuestsWithRsvp('created_date')", 'not found — may still be descending'));

  results.push(/setScrollToGuestId\(created\.id\)/.test(guestsPageSource)
    ? pass('Guests.jsx scrolls a newly-created guest into view (handleSubmit + handleQuickAdd)', 'setScrollToGuestId(created.id) found')
    : fail('Guests.jsx scrolls a newly-created guest into view (handleSubmit + handleQuickAdd)', 'found', 'not found'));

  results.push(/scrollToGuestId/.test(guestListSource)
    ? pass('GuestList.jsx accepts and acts on a scrollToGuestId prop', 'found')
    : fail('GuestList.jsx accepts and acts on a scrollToGuestId prop', 'found', 'not found'));

  // Live proof of the actual mechanism, not just the source text: create two
  // sentinel guests 1.1s apart (long enough to guarantee different
  // created_date timestamps) and fetch them the same way Guests.jsx now does
  // — sort=created_date, ascending — confirming Base44 really does return
  // the earlier-created one first, not just that our code asks it to.
  let orderAId = null, orderBId = null;
  try {
    const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
    if (!me?.id) throw new Error("Could not resolve the test account's own user id");

    const a = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_ORDER_A__', is_test: true }, token);
    orderAId = a.id;
    await new Promise(r => setTimeout(r, 1100));
    const b = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_ORDER_B__', is_test: true }, token);
    orderBId = b.id;
    if (!orderAId || !orderBId) throw new Error('Missing id on one of the sentinel guests');

    const ownQuery = encodeURIComponent(JSON.stringify({ created_by_id: me.id }));
    const listResult = await api('GET', `/apps/${APP_ID}/entities/Guest?q=${ownQuery}&sort=created_date`, undefined, token);
    const list = Array.isArray(listResult) ? listResult : (listResult?.data || listResult?.results || []);

    const indexA = list.findIndex(g => g.id === orderAId);
    const indexB = list.findIndex(g => g.id === orderBId);
    const bothFound = indexA !== -1 && indexB !== -1;
    const aBeforeB = bothFound && indexA < indexB;

    results.push(bothFound && aBeforeB
      ? pass("Base44 .filter(query, 'created_date') returns the earlier-created guest first", `A at index ${indexA}, B at index ${indexB}`)
      : fail("Base44 .filter(query, 'created_date') returns the earlier-created guest first", 'A before B', bothFound ? `A at index ${indexA}, B at index ${indexB}` : 'one or both sentinels missing from the list'));
  } catch (err) {
    console.log(`  ❌ FAIL  guest list ordering — error: ${err.message}`);
    results.push(false);
  } finally {
    if (orderAId) { await cleanupEntity(token, 'Guest', orderAId); }
    if (orderBId) { await cleanupEntity(token, 'Guest', orderBId); }
  }

  return results;
}

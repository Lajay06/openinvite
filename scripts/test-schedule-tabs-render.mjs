/* global document */
/**
 * Every Schedule tab RENDERS, with rows in it.
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 *
 * The owner opened the Run sheet tab on his own record and got the error
 * boundary. List and Calendar rendered. Twenty-six source checks, a render
 * harness, a typography probe and a full CI suite were all green, because not
 * one of them had ever MOUNTED the Run sheet tab with rows in it.
 *
 * The crash was `DataTable.jsx`: `selectable` is computed from whether the
 * caller passed `selectedIds`, and the next line then called
 * `selectedIds.has(...)` regardless. A run sheet has no bulk actions, so it
 * passes no selection model — and the second half of the condition is
 * `selectableRows.length > 0`, so an EMPTY run sheet never threw. Every check
 * that had seen this tab had seen it empty.
 *
 * A source check cannot catch that. `selectedIds.has` is a correct-looking
 * line in a file that reads fine. Only mounting it with rows finds it, so this
 * mounts every tab with rows and fails on any page error or error boundary.
 *
 * THE FIXTURE IS THE OWNER'S OWN SHAPES, read from the live john-suzanne
 * record (read-only) and copied here by shape, not by content: 21 rows where
 * `responsible_person`, `notes`, `description`, `location` and `end_time` are
 * all NULL rather than absent, two rows share the event name "First dance",
 * and the categories span planning and event tags across three days.
 *
 * Usage: npm run test:schedule-tabs  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';
const own = { created_by: 'fixture@example.com', created_by_id: 'u1' };

/** A row in the live record's shape: every optional field explicitly null. */
const row = (id, event_name, category, event_date, start_time, notes = null) => ({
  id, event_name, category, event_date, start_time,
  end_time: null, location: null, description: null, responsible_person: null, notes,
  ...own,
});

const DEC30 = '2026-12-30';
const DEC31 = '2026-12-31';
const JAN01 = '2027-01-01';

const SCHEDULE = [
  row('s01', 'Rehearsal', 'rehearsal', DEC30, '17:00'),
  row('s02', 'Welcome drinks', 'pre_wedding', DEC30, '18:30'),
  row('s03', 'Hair and makeup begins', 'preparation', DEC31, '09:00'),
  row('s04', 'Photography — getting ready', 'photography', DEC31, '11:00'),
  row('s05', 'Guest transport pickup — CBD hotels', 'transportation', DEC31, '13:30', 'Coaches depart on the hour.'),
  row('s06', 'Ceremony', 'ceremony', DEC31, '15:00'),
  row('s07', 'Cocktail hour', 'reception', DEC31, '16:00'),
  row('s08', 'Reception', 'reception', DEC31, '18:00'),
  row('s09', 'Grand entrance', 'reception', DEC31, '18:00'),
  row('s10', 'Welcome speeches', 'reception', DEC31, '18:30', 'Parents of the couple, then the MC.'),
  row('s11', 'Best man & maid of honour speeches', 'reception', DEC31, '19:45'),
  // TWO ROWS, ONE NAME, DIFFERENT TAGS — the live record has exactly this
  // pair. Anything keyed on the name rather than the id collapses them.
  row('s12', 'First dance', 'reception', DEC31, '20:05'),
  row('s13', 'First dance', 'other', DEC31, '20:30'),
  row('s14', 'Cake cutting', 'reception', DEC31, '20:15'),
  row('s15', 'Band set — Harbour City Sound', 'reception', DEC31, '20:30', 'Live band before the DJ.'),
  row('s16', 'Bouquet toss', 'reception', DEC31, '22:00'),
  row('s17', 'DJ set — countdown to midnight', 'reception', DEC31, '22:10', 'DJ takes over from the band.'),
  row('s18', 'New Year’s Eve countdown', 'reception', DEC31, '23:45', 'Champagne toast.'),
  row('s19', 'After-party', 'post_wedding', JAN01, '00:30'),
  row('s20', 'Recovery brunch', 'post_wedding', JAN01, '11:00'),
  row('s21', 'Return transport — CBD hotels', 'transportation', JAN01, '02:00', 'Coaches depart on the hour.'),
];

const TABS = ['List', 'Calendar', 'Run sheet', 'Considerations'];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

console.log('\n  Every Schedule tab renders, with rows in it:\n');

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 1000, seed: { ...SEED, Schedule: SCHEDULE } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });

await page.goto(`${BASE}/Schedule`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(4500);

/** The error boundary's own words — the thing the owner saw. */
const boundary = async () => (await page.locator('body').innerText()).includes('Something went wrong');

check('the page itself renders', !(await boundary()), 'before any tab is clicked');

for (const tab of TABS) {
  errors.length = 0;
  const before = await page.getByRole('button', { name: new RegExp(`^${tab}`, 'i') }).first().isVisible().catch(() => false);
  if (!before) { check(`the "${tab}" tab exists`, false, 'not found'); continue; }
  await page.getByRole('button', { name: new RegExp(`^${tab}`, 'i') }).first().click().catch(() => {});
  await page.waitForTimeout(2000);
  const broke = await boundary();
  check(`"${tab}" renders with 21 rows seeded`, !broke && errors.length === 0,
    broke ? 'ERROR BOUNDARY' : (errors[0] || 'no page errors'));

  // ── EVERY "···" ACTION, ACTUALLY CLICKED ──────────────────────────────
  //
  // MOUNTING IS NOT USING. The tab rendered and the owner still hit an error,
  // because the crash was behind the row menu. A guard that only mounts sees
  // none of it, so this opens the menu on the first row and clicks every item
  // in it, on every tab that has one.
  const menus = await page.locator('table tbody tr button:has(svg)').count().catch(() => 0);
  if (menus > 0) {
    const labels = await (async () => {
      await page.locator('table tbody tr button:has(svg)').first().click().catch(() => {});
      await page.waitForTimeout(400);
      const items = await page.locator('[role="menuitem"]').allInnerTexts().catch(() => []);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      return items;
    })();
    check(`  "${tab}" row menu opens`, labels.length > 0, labels.join(' · ') || 'no menu items');
    for (const label of labels) {
      errors.length = 0;
      await page.locator('table tbody tr button:has(svg)').first().click().catch(() => {});
      await page.waitForTimeout(350);
      const item = page.locator('[role="menuitem"]', { hasText: new RegExp(`^${label}$`) }).first();
      const disabled = await item.getAttribute('data-disabled').catch(() => null);
      if (disabled !== null) { await page.keyboard.press('Escape'); continue; }
      await item.click().catch(() => {});
      await page.waitForTimeout(1200);
      const broke = await boundary();
      check(`  "${tab}" › ··· › ${label}`, !broke && errors.length === 0,
        broke ? `ERROR BOUNDARY${errors[0] ? ` — ${errors[0]}` : ''}` : (errors[0] || 'no page errors'));
      // Close whatever it opened, so the next action starts from the table.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // The run sheet's CONTENT, asserted while it is the open tab. Checked here
  // rather than after the loop: clicking back to it from Considerations did
  // not switch tabs reliably, and a check that reads the wrong tab's text
  // fails for a reason that has nothing to do with the run sheet.
  if (tab === 'Run sheet') {
    const body = await page.locator('body').innerText();
    check('  it lists the reception’s moments',
      body.includes('Grand entrance') && body.includes('Cake cutting'), 'rows, not an empty state');
    check('  in time order, earliest first',
      body.indexOf('Cocktail hour') < body.indexOf('Grand entrance')
        && body.indexOf('Grand entrance') < body.indexOf('Cake cutting'), '4:00 PM · 6:00 PM · 8:15 PM');
    // THE PICKER IS A PILL ROW, the guest list's control, not a dropdown.
    const pills = await page.locator('.filter-pill').allInnerTexts().catch(() => []);
    check('  the event picker is the shared pill row',
      pills.length > 0, pills.join(' · ') || 'no .filter-pill in the toolbar');
    check('  "All" comes first, with the total across every event',
      pills[0] === 'All (15)', pills[0] || '—');
    check('  one pill per event that has rows, in the order the wedding runs',
      pills.join(' · ') === 'All (15) · Ceremony (1) · Reception (11) · Other (1) · Post-wedding (2)',
      pills.join(' · '));
    check('  and the fullest event is the one that opens',
      /Reception/.test(await page.locator('.filter-pill.active').first().innerText().catch(() => '')),
      'most rows first, so the busiest run sheet is the one you land on');

    // "All" — every event's rows, grouped, with a heading row per event.
    await page.locator('.filter-pill', { hasText: /^All/ }).first().click().catch(() => {});
    await page.waitForTimeout(900);
    const allBody = await page.locator('table').first().innerText();
    check('  "All" groups every event under a heading row',
      ['Ceremony (1)', 'Reception (11)', 'Other (1)', 'Post-wedding (2)'].every((h) => allBody.includes(h)),
      'headings inside the same table');
    check('  and the headings sit above their own event’s moments',
      allBody.indexOf('Ceremony (1)') < allBody.indexOf('Reception (11)')
        && allBody.indexOf('Reception (11)') < allBody.indexOf('Post-wedding (2)'), 'in wedding order');
    check('  every event’s rows are present under All',
      allBody.includes('Grand entrance') && allBody.includes('Recovery brunch') && allBody.includes('Ceremony'),
      '15 moments across four events');
  }
}

await ctx.close();
await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);

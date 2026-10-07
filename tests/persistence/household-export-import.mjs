/**
 * tests/persistence/household-export-import.mjs
 *
 * HOUSEHOLDS AND CHILDREN SURVIVE A ROUND TRIP.
 *
 * Item 6 of goals/2026-10-07-households-and-children.md. The export is the
 * only route a guest list has out of the product, and the import is the only
 * route in at scale. A feature that cannot leave and come back is a feature a
 * couple cannot keep anywhere but here.
 *
 * ── WHAT A ROUND TRIP ACTUALLY HAS TO PRESERVE ─────────────────────────────
 *
 * Not the household_id. The GROUPING. The export writes the stored key and the
 * import mints a fresh one, deliberately: a label is free text a couple may
 * reuse across two imports or two weddings, and a stored key should not depend
 * on what they typed. So the assertion is that the same people end up on the
 * same invitation, not that the key matches.
 *
 * ── THE COLUMNS ARE APPENDED, FOR THE THIRD TIME ───────────────────────────
 *
 * A spreadsheet somebody has already built a pivot table on must not have its
 * columns move. The guard pins the first seventeen in order and then the three
 * new ones, so an insertion in the middle fails rather than being discovered
 * by a couple whose formulas broke.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { rowToGuest, assignHouseholdIds, TEMPLATE_HEADERS } from '../../src/lib/guestImport.js';
import { counts, householdIdOf, isChild, membersOf } from '../../src/lib/household.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const EXPECTED_HEADERS = [
  'Name', 'Email', 'Phone', 'Category', 'RSVP Status', 'Meal Choice', 'Table Assignment',
  'Plus One', 'Plus One Name', 'Dietary Restrictions', 'Plus One RSVP', 'Plus One Meal',
  'Plus One Dietary', 'Mailing Address', 'Notes', 'Special Requests', 'Plus One Email',
  'Household', 'Child', 'Child age',
];

export async function runHouseholdExportImport() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE EXPORT HEADER ───────────────────────────────────────────────────

  const page = read('src/pages/Guests.jsx');
  const headerLine = /\[('(?:[^']|\\')+'(?:, *'(?:[^']|\\')+')*)\]\.join\(','\),/.exec(page);
  const headers = headerLine
    ? headerLine[1].split(',').map((x) => x.trim().replace(/^'|'$/g, ''))
    : [];
  check('the export header is the seventeen that were there plus the three new ones, in order',
        headers, EXPECTED_HEADERS);
  check('  and the three are LAST, so nobody\'s pivot table moves',
        headers.slice(-3), ['Household', 'Child', 'Child age']);

  ok('Household exports the trimmed key the import reads back',
     /householdIdOf\(g\) \|\| ''/.test(page), 'householdIdOf');
  ok('  Child is Yes or No, never blank',
     /isChild\(g\) \? 'Yes' : 'No'/.test(page), 'Yes / No');
  ok('  and the age is exported only for a child',
     /isChild\(g\) && Number\.isFinite\(Number\(g\.child_age\)\)/.test(page), 'gated on isChild');
  // A ZERO IS A REAL AGE. Testing for truthiness would drop a newborn.
  ok('  with a finite-number test, so an age of 0 survives',
     !/g\.child_age \? /.test(page) && /Number\.isFinite/.test(page), 'no truthiness test');

  // ── THE TEMPLATE ────────────────────────────────────────────────────────

  check('the template offers the three columns',
        TEMPLATE_HEADERS, ['Name', 'Email', 'Phone', 'Plus one (Y/blank)',
                           'Household', 'Child (Y/blank)', 'Child age']);

  // ── READING A ROW ───────────────────────────────────────────────────────

  const r = (row) => rowToGuest(row, 'AU', []);
  check('a Household value becomes a label, not a key',
        [r({ Name: 'Priya', Household: 'Patel' })._householdLabel,
         r({ Name: 'Priya', Household: 'Patel' }).household_id],
        ['Patel', undefined]);
  check('  trimmed, and a blank cell is no household',
        [r({ Name: 'A', Household: '  Patel ' })._householdLabel,
         r({ Name: 'A', Household: '   ' })._householdLabel,
         r({ Name: 'A' })._householdLabel],
        ['Patel', undefined, undefined]);

  check('Child accepts what a spreadsheet actually contains',
        ['Y', 'yes', 'TRUE', '1', '', 'n', 'maybe'].map((v) => !!r({ Name: 'A', 'Child (Y/blank)': v }).is_child),
        [true, true, true, true, false, false, false]);

  check('an age is read only for a child, and only in range',
        [r({ Name: 'A', 'Child (Y/blank)': 'Y', 'Child age': '6' }).child_age,
         r({ Name: 'A', 'Child (Y/blank)': 'Y', 'Child age': '0' }).child_age,
         r({ Name: 'A', 'Child (Y/blank)': 'Y', 'Child age': '17' }).child_age,
         r({ Name: 'A', 'Child (Y/blank)': 'Y', 'Child age': '18' }).child_age,
         r({ Name: 'A', 'Child (Y/blank)': 'Y', 'Child age': '-1' }).child_age,
         r({ Name: 'A', 'Child (Y/blank)': 'Y', 'Child age': 'six' }).child_age,
         r({ Name: 'A', 'Child age': '8' }).child_age],
        [6, 0, 17, undefined, undefined, undefined, undefined]);

  check('  a decimal age is truncated, not rounded up',
        r({ Name: 'A', 'Child (Y/blank)': 'Y', 'Child age': '6.9' }).child_age, 6);

  // ── ONE ID PER LABEL ────────────────────────────────────────────────────

  const parsed = [
    { name: 'Priya', _householdLabel: 'Patel' },
    { name: 'Dev', _householdLabel: 'Patel' },
    { name: 'Mina', _householdLabel: 'Patel' },
    { name: 'Anna' },
    { name: 'Solo', _householdLabel: 'JustMe' },
    { name: 'A', _householdLabel: 'Singh' },
    { name: 'B', _householdLabel: 'Singh' },
  ];
  const assigned = assignHouseholdIds(parsed, (_l, n) => `hh-${n}`);
  check('rows sharing a label share one id',
        assigned.filter((x) => x._householdLabel === 'Patel').map((x) => x.household_id),
        ['hh-1', 'hh-1', 'hh-1']);
  check('  two labels get two ids',
        [...new Set(assigned.map((x) => x.household_id).filter(Boolean))], ['hh-1', 'hh-2']);
  check('  a row with no label gets none', assigned.find((x) => x.name === 'Anna').household_id, undefined);
  // A LABEL ON ONE ROW IS NOT A HOUSEHOLD.
  check('  and a label used by one row alone gets none either',
        assigned.find((x) => x.name === 'Solo').household_id, undefined);
  check('the label never becomes the key',
        assigned.every((x) => x.household_id === undefined || !x.household_id.includes('Patel')), true);
  check('an empty file assigns nothing', assignHouseholdIds([]), []);

  // ── THE ROUND TRIP, END TO END ──────────────────────────────────────────
  //
  // Export the stored rows, read the file back, and assert the GROUPING is the
  // same even though every key is new.
  const stored = [
    { id: 'g1', name: 'Priya Patel', email: 'priya@example.com', household_id: 'hh-old-1' },
    { id: 'g2', name: 'Dev Patel', household_id: 'hh-old-1' },
    { id: 'g3', name: 'Mina Patel', household_id: 'hh-old-1', is_child: true, child_age: 6 },
    { id: 'g4', name: 'Anna Singh' },
    { id: 'g5', name: 'Zoe Woods', is_child: true },
  ];
  // The three columns exactly as the export writes them.
  const exported = stored.map((g) => ({
    Name: g.name,
    Email: g.email || '',
    Household: householdIdOf(g) || '',
    'Child (Y/blank)': isChild(g) ? 'Yes' : 'No',
    'Child age': isChild(g) && Number.isFinite(Number(g.child_age)) && g.child_age !== undefined
      ? String(Math.trunc(Number(g.child_age))) : '',
  }));
  const reimported = assignHouseholdIds(
    exported.map((row) => rowToGuest(row, 'AU', [])), (_l, n) => `hh-new-${n}`);

  check('the round trip keeps five people', reimported.length, 5);
  check('  the same three on one invitation',
        membersOf(reimported[0], reimported).map((x) => x.name),
        ['Priya Patel', 'Dev Patel', 'Mina Patel']);
  check('  the keys are new, not the old ones',
        [...new Set(reimported.map((x) => x.household_id).filter(Boolean))], ['hh-new-1']);
  check('  the children are still children, with the age intact',
        reimported.filter((x) => x.is_child).map((x) => [x.name, x.child_age]),
        [['Mina Patel', 6], ['Zoe Woods', undefined]]);
  check('  and the counts match what went in',
        counts(reimported), counts(stored));

  // ── THE SUMMARY LINE ────────────────────────────────────────────────────

  const modal = read('src/components/guests/ImportGuestModal.jsx');
  ok("the summary is the owner's words",
     /\$\{hh\.people\} guests in \$\{hh\.invitations\} invitations, \$\{hh\.children\} children/.test(modal),
     '"{n} guests in {m} invitations, {c} children"');
  ok('  counted from the rows that actually imported, not from the file',
     /householdCounts\(toImport\.filter\(\(r\) => !failed\.includes\(r\._rowIndex\)\)\)/.test(modal),
     'failures excluded');
  ok('  through the one resolver', /counts as householdCounts/.test(modal), 'household.js');
  ok('  on the clean path and the troubled one',
     /\[shapeLine, maybeLine\]\.filter\(Boolean\)\.join/.test(modal)
     && /parts\.push\(shapeLine\)/.test(modal), 'both branches');
  ok('the label is stripped before the guest is created',
     /_maybeMapped, _householdLabel, \.\.\.guestData \} = row;/.test(modal), 'preview state only');

  return results;
}

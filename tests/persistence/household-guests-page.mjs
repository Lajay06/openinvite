/**
 * tests/persistence/household-guests-page.mjs
 *
 * THE GUESTS PAGE, WITH HOUSEHOLDS AND CHILDREN ON IT.
 *
 * Item 2 of goals/2026-10-07-households-and-children.md. Item 1 built the
 * resolver; this is the surface, and the surface is where a household stops
 * being an idea and has to survive a sort, a delete and an editor.
 *
 * ── THE THREE THINGS THIS GUARD IS REALLY FOR ──────────────────────────────
 *
 *   A SORT MUST NOT TEAR A HOUSEHOLD APART. The page sorts by whatever column
 *   the couple clicked, and grouping has to survive it with nothing lost and
 *   nothing duplicated. Driven over several sort orders rather than one.
 *
 *   "ADD SOMEONE" MUST NOT UNPUBLISH AN EVENT. It is an invitation write, and
 *   the one exception to the full-resolved-set contract. publicEventIds is
 *   asserted on both sides, because that is the only way to catch it: a guard
 *   that read the entries alone would pass on the version that writes a false.
 *
 *   DELETING A LEAD MUST NOT NEED A WRITE. Succession is a property of leadOf,
 *   not a field anyone maintains. If it were a stored flag, every delete would
 *   need a second write that could fail on its own and leave a household with
 *   no lead or two.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import {
  groupByHousehold, membersOf, leadOf, counts, entriesForNewMember, isChild,
} from '../../src/lib/household.js';
import { publicEventIds } from '../../src/lib/guestEventVisibility.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\n]*?\/\/.*$/gm, (l) => l.slice(0, l.indexOf('//')));
const readCode = (p) => stripComments(read(p));

const WEDDING = {
  mainCeremony: { startTime: '14:00' },
  reception:    { startTime: '18:00' },
  preWeddingEvents: [{ event_id: 'wd', name: 'Welcome drinks', date: '2027-06-10' }],
};

const g = (id, name, over = {}) => ({ id, name, created_date: '2027-01-01T00:00:00Z', ...over });
const PRIYA = g('g1', 'Priya Patel', { household_id: 'h1', email: 'priya@example.com' });
const DEV   = g('g2', 'Dev Patel',   { household_id: 'h1' });
const MINA  = g('g3', 'Mina Patel',  { household_id: 'h1', is_child: true, child_age: 6 });
const ANNA  = g('s1', 'Anna Singh');
const ZOE   = g('s2', 'Zoe Woods', { is_child: true });

export async function runHouseholdGuestsPage() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── GROUPING SURVIVES ANY SORT ──────────────────────────────────────────

  const ALL = [PRIYA, DEV, MINA, ANNA, ZOE];
  const orders = [
    ['as stored',        ALL],
    ['by name',          [...ALL].sort((a, b) => a.name.localeCompare(b.name))],
    ['by name reversed', [...ALL].sort((a, b) => b.name.localeCompare(a.name))],
    ['member first',     [DEV, MINA, ANNA, PRIYA, ZOE]],
    ['child first',      [MINA, ZOE, DEV, PRIYA, ANNA]],
  ];
  for (const [label, sorted] of orders) {
    const rows = groupByHousehold(sorted);
    const names = rows.map((r) => r.guest.name);
    results.push(names.length === ALL.length && new Set(names).size === ALL.length
      ? pass(`sorted ${label}: every guest appears exactly once`, `${names.length} rows`)
      : fail(`sorted ${label}: every guest appears exactly once`, `${ALL.length} unique`, names.join(', ')));
    // THE HOUSEHOLD IS CONTIGUOUS, which is the property a sort could break.
    const idx = names.map((n, i) => [n, i]).filter(([n]) => n.endsWith('Patel')).map(([, i]) => i);
    results.push(idx.length === 3 && idx[2] - idx[0] === 2
      ? pass(`  and the Patels stay together`, `rows ${idx.join(',')}`)
      : fail(`  and the Patels stay together`, 'three adjacent rows', `rows ${idx.join(',')}`));
    const leadName = rows.find((r) => r.guest.household_id === 'h1' && r.isLead)?.guest.name;
    results.push(leadName === 'Priya Patel'
      ? pass('  with Priya leading, whatever the sort', leadName)
      : fail('  with Priya leading, whatever the sort', 'Priya Patel', String(leadName)));
  }

  check('a guest with no household is their own single row',
        groupByHousehold([ANNA]).map((r) => [r.guest.name, r.isLead, r.size]),
        [['Anna Singh', true, 1]]);

  check('every member of a real household reports the household size',
        groupByHousehold([PRIYA, DEV, MINA]).map((r) => r.size), [3, 3, 3]);

  ok('only the lead is flagged as lead',
     groupByHousehold([PRIYA, DEV, MINA]).filter((r) => r.isLead).length === 1, 'exactly one');

  check('an empty list groups to nothing', groupByHousehold([]), []);

  // ── "ADD SOMEONE" IS AN INVITATION WRITE THAT CANNOT UNPUBLISH ──────────

  const addCase = (label, lead, others, expect) => {
    const rows = entriesForNewMember(lead);
    check(label, rows.map((r) => [r.event_id, r.invited, r.status, r.responded_at]), expect);
    const before = publicEventIds(WEDDING, [lead, ...others]);
    const after = publicEventIds(WEDDING, [lead, ...others, { id: 'new', household_id: 'h1', event_responses: rows }]);
    check('  and the public event set is untouched', after, before);
  };

  addCase('a new member copies the lead, answers cleared',
          { ...PRIYA, event_responses: [
            { event_id: 'main-ceremony', invited: true, status: 'yes', responded_at: '2027-02-01T00:00:00Z' },
            { event_id: 'reception', invited: true, status: 'yes', responded_at: '2027-02-01T00:00:00Z' },
          ] }, [DEV],
          [['main-ceremony', true, 'pending', null], ['reception', true, 'pending', null]]);

  addCase('and gets nothing for an event the lead has no entry for',
          { ...PRIYA, event_responses: [{ event_id: 'main-ceremony', invited: true, status: 'yes' }] }, [DEV],
          [['main-ceremony', true, 'pending', null]]);

  addCase("a lead already removed from an event passes that removal on, unchanged",
          { ...PRIYA, event_responses: [
            { event_id: 'main-ceremony', invited: true, status: 'yes' },
            { event_id: 'wd', invited: false, status: 'pending' },
          ] }, [DEV],
          [['main-ceremony', true, 'pending', null], ['wd', false, 'pending', null]]);

  // ── DELETING A LEAD NEEDS NO WRITE ──────────────────────────────────────

  const HOUSE = [PRIYA, DEV, MINA];
  check('the lead today', leadOf(HOUSE).name, 'Priya Patel');
  const afterDelete = HOUSE.filter((x) => x.id !== PRIYA.id);
  check('  succession is automatic once the row is gone', leadOf(afterDelete).name, 'Dev Patel');
  check('  and the rest of the household is intact',
        membersOf(afterDelete[0], afterDelete).map((x) => x.name), ['Dev Patel', 'Mina Patel']);
  check('  down to one member, who leads alone',
        leadOf([MINA]).name, 'Mina Patel');
  ok('  no stored lead flag exists to go stale',
     !/is_lead|household_lead|leadId/.test(read('src/lib/household.js'))
     && !/is_lead|household_lead/.test(read('base44/entities/Guest.jsonc')),
     'succession is computed, never stored');

  // ── THE COUNT LINE ──────────────────────────────────────────────────────

  check('the goal\'s own example: three in a household, two alone',
        counts(ALL), { people: 5, adults: 3, children: 2, invitations: 3 });

  ok('isChild drives the child label and nothing else does',
     isChild(MINA) && !isChild(PRIYA), 'strict true');

  const page = read('src/pages/Guests.jsx');
  ok('the count line is the owner\'s words', page.includes('guests across'), '"{people} guests across {invitations} invitations"');
  ok('  invitations, not people, in the second half', /\{hhCounts\.invitations\}/.test(page), 'invitations');
  ok('  the adults and children line appears only when there are children',
     /hhCounts\.children > 0 && \(/.test(page), 'conditional');
  ok('  and it reads "adults, children"', /\{hhCounts\.adults\} adults, \{hhCounts\.children\} children/.test(page),
     "the owner's words");
  ok('  the numbers come from the one resolver',
     /householdCounts\(guests\)/.test(readCode('src/pages/Guests.jsx')), 'household.js');

  // ── THE WIRING ──────────────────────────────────────────────────────────

  const list = readCode('src/components/guests/GuestList.jsx');
  const wiring = [
    ['src/components/guests/GuestList.jsx', list, 'the list groups through the resolver',
      /const rows = groupByHousehold\(sortedGuests\)/],
    ['src/components/guests/GuestList.jsx', list, '  and renders the grouped order, not the raw sort',
      /rows\.map\(\(r\) => r\.guest\)\.flatMap/],
    ['src/components/guests/GuestList.jsx', list, '  a member row is indented',
      /data-household-member/],
    ['src/components/guests/GuestList.jsx', list, '  "Move out" is offered only inside a household',
      /householdRowFor\.get\(guest\.id\)\?\.size \?\? 1\) > 1/],
    ['src/pages/Guests.jsx', readCode('src/pages/Guests.jsx'), 'adding someone copies through entriesForNewMember',
      /event_responses: entriesForNewMember\(lead\)/],
    ['src/pages/Guests.jsx', readCode('src/pages/Guests.jsx'), '  and moving out only clears the key',
      /updateGuest\(guest\.id, \{ household_id: '' \}\)/],
  ];
  for (const [file, text, label, re] of wiring) {
    results.push(re.test(text) ? pass(label, path.basename(file))
                               : fail(label, path.basename(file), 'the line is gone'));
  }

  // NEITHER ACTION MAY REACH FOR THE FULL RESOLVED SET. This is the line that
  // would reopen the public-site hole, so it is asserted by absence.
  // Scoped to the two handler BODIES, not to the file: Guests.jsx legitimately
  // uses resolveAllEventResponses for the invitation chips, which is the write
  // the full-set contract was made for. The first draft of this check sliced
  // the file on a string and would have read whatever happened to follow.
  const body = (name) => {
    const src = readCode('src/pages/Guests.jsx');
    const i = src.indexOf(`const ${name} = async (`);
    if (i < 0) return null;
    const j = src.indexOf('\n  };', i);
    return j < 0 ? null : src.slice(i, j);
  };
  for (const name of ['handleAddToHousehold', 'handleMoveOutOfHousehold']) {
    const b = body(name);
    results.push(b && !/resolveAllEventResponses/.test(b)
      ? pass(`${name} never writes a full resolved set`, `${b.length} chars read`)
      : fail(`${name} never writes a full resolved set`, 'no full set', b ? 'full set found' : 'handler not found'));
  }

  // ── THE CHILD CONTROLS ──────────────────────────────────────────────────

  const form = read('src/components/guests/GuestForm.jsx');
  ok('the editor has a Child toggle', /id="is_child"/.test(form), 'is_child');
  ok('  and the age field only when it is on',
     /formData\.is_child === true && \(/.test(form) && /id="child_age"/.test(form), 'conditional');
  ok('  bounded to whole years 0 to 17, because the schema says number',
     /min=\{0\}/.test(form) && /max=\{17\}/.test(form) && /step=\{1\}/.test(form)
     && /Math\.trunc\(Number\(raw\)\)/.test(form), 'validated by the writer');
  ok('  and unticking clears the age rather than leaving it stranded',
     /set\('child_age', undefined\)/.test(form), 'cleared');

  const listRaw = read('src/components/guests/GuestList.jsx');
  ok('the row says "Child" or "Child, 6"',
     listRaw.includes('`Child, ${Number(guest.child_age)}`') && /: 'Child'/.test(listRaw),
     "the owner's words");

  // THE AGE IS FOR THE COUPLE. The guest site must not render it, and the
  // cheapest way to know is that no guest-facing file mentions the field.
  const guestSide = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.jsx?$/.test(e.name)) guestSide.push(rel);
    }
  };
  walk('src/components/guest-website');
  const leaks = guestSide.filter((f) => /child_age/.test(read(f)));
  check('no guest-site file reads child_age', leaks, []);

  return results;
}

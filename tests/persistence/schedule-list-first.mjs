/**
 * tests/persistence/schedule-list-first.mjs
 *
 * THE SCHEDULE PAGE OPENS AS A LIST, AND THE CALENDAR SHOWS THE SAME EVENTS.
 *
 * Owner ruling: "Get rid of the visual builder and have the calendar as a list
 * of events with an option to view it as calendar view. It is too much."
 *
 * It was four tabs, three of which were one set of events drawn three ways,
 * defaulting to the one with the most machinery in it — a drag-and-drop hour
 * grid. The couple's first question is "what is happening and when".
 *
 * THE OWNER'S PLANT — the list shows every event the calendar shows, same
 * count, same ids — WAS NOT TRUE OF THE OLD PAGE AND COULD NOT HAVE BEEN. The
 * calendar aggregated five sources (schedule rows, the wedding day, the RSVP
 * deadline, three vendor dates, and the calendar's own custom entries); the
 * run sheet read Schedule records only. Two views of one page disagreeing
 * about what an event is. buildScheduleEvents is the single answer now, and
 * the plant is a property rather than a coincidence.
 *
 * NOTHING IS DELETED YET. WeddingDayTimelineBuilder.jsx is still in the repo
 * and is unreachable from the UI, because the owner asked to see the
 * screenshots before anything is removed. The check below pins UNREACHABLE,
 * not ABSENT, so it will stay honest either side of that decision.
 */
import { pass, fail } from './_shared.mjs';
import { buildScheduleEvents, groupEventsByDay, whenRelativeTo, WHEN_RANK, WHEN_LABEL } from '../../src/lib/scheduleEvents.js';
import { naturalCompare, sortRows } from '../../src/lib/tableSort.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Line comments first: a stray "/*" inside a "//" line otherwise opens a block
// comment that runs to the next "*/" and swallows the rest of the file.
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** A wedding with something from every source the page reads. */
const FIXTURE = {
  scheduleItems: [
    { id: 's1', event_name: 'Ceremony',  event_date: '2027-07-03', start_time: '15:00', end_time: '16:00', location: 'The Old Observatory', category: 'ceremony' },
    { id: 's2', event_name: 'Reception', event_date: '2027-07-03', start_time: '18:00', location: 'The Long Room', category: 'reception' },
    { id: 's3', event_name: 'Brunch',    event_date: '2027-07-04', start_time: '10:00', location: 'The Trafalgar Tavern' },
    { id: 's4', event_name: 'No date yet', start_time: '09:00' },
  ],
  vendors: [
    { id: 'v1', name: 'Fleur & Stem', category: 'flowers', contract_date: '2027-01-10' },
    { id: 'v2', name: 'Bright Lens',  category: 'photography', booking_date: '2027-07-03', start_time: '11:00',
      meeting_date: '2027-02-14T14:30:00' },
  ],
  invitation: { wedding_date: '2027-07-03', couple_names: 'Ada & Alan', rsvp_deadline: '2027-05-01' },
  customEvents: [
    { id: 'custom-1', title: 'Dress fitting', date: '2027-03-02', time: '11:00', location: '', type: 'custom' },
    // time: null, not ''. A custom entry is passed through as the calendar's
    // own form wrote it, and that form can leave the time unset. It matters:
    // String(null) is "null", which sorts AFTER "18:00" on a plain compare, so
    // an untimed entry would land at the END of the wedding day instead of the
    // top. The all-day branch in groupEventsByDay is what stops that, and with
    // only ''-timed rows in this fixture that branch could be deleted with
    // nothing going red.
    { id: 'custom-2', title: 'Rings collected', date: '2027-07-03', time: null, location: '', type: 'custom' },
  ],
};

export async function runScheduleListFirst() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The Schedule page opens as a list, and the calendar agrees with it:\n');

  const events = buildScheduleEvents(FIXTURE);

  // ── THE OWNER'S PLANT ───────────────────────────────────────────────────
  {
    const hub = code('src/pages/ScheduleHub.jsx');
    const cal = code('src/pages/Calendar.jsx');
    check('PLANT: both views are built by the SAME function',
      /buildScheduleEvents\(/.test(hub) && /buildScheduleEvents\(/.test(cal),
      'the list cannot show a different set from the calendar because there is only one set');
    check('  and neither builds its own events alongside it',
      !/allEvents\.push\(/.test(cal) && !/allEvents\.push\(/.test(hub),
      'the inline five-source block is gone from Calendar.jsx');

    // The property itself, computed rather than asserted: what the list
    // renders is what groupEventsByDay flattens back to.
    const listed = groupEventsByDay(events).flatMap(d => d.events);
    // The calendar can only draw an event that has a date, so the property is
    // list ⊇ calendar: everything the grid shows is in the list.
    const onGrid = events.filter(e => e.date);
    check('PLANT: the list shows every event the calendar shows — same count',
      listed.filter(e => e.date).length === onGrid.length,
      `${listed.filter(e => e.date).length} listed with a date, ${onGrid.length} on the grid`);
    check('  and the same ids, none added, none lost',
      JSON.stringify(listed.filter(e => e.date).map(e => e.id).sort()) ===
      JSON.stringify(onGrid.map(e => e.id).sort()),
      onGrid.map(e => e.id).sort().join(', '));
    // A ROW WITH NO DATE MUST NOT VANISH. event_date is required by the entity
    // and by the form, so this should not happen — but the first build of
    // buildScheduleEvents skipped such rows outright, which would have made a
    // legacy dateless event invisible everywhere. The old run sheet listed
    // every Schedule record regardless. It gets a group at the end instead.
    check('  a schedule row with no date is at the end of the list, not gone',
      listed.some(e => e.id === 'schedule-s4')
        && groupEventsByDay(events).at(-1).date === null
        && !onGrid.some(e => e.id === 'schedule-s4'),
      'the list can hold it; the calendar has nowhere to draw it');
  }

  // ── EVERY SOURCE SURVIVES THE MOVE ──────────────────────────────────────
  {
    const ids = events.map(e => e.id);
    for (const [what, id] of [
      ['the schedule rows',    'schedule-s1'],
      ['the wedding day',      'wedding-day'],
      // The RSVP deadline is a DEADLINE row now, with its own pill and its own
      // id — it was a plain 'wedding' row and appeared twice once the deadline
      // source landed.
      ['the RSVP deadline',    'deadline-rsvp'],
      // The vendor rows carry which DATE they are now — one id per field
      // rather than three shapes of id — so a row reads "Florist — meeting"
      // instead of three rows that all say "Florist".
      ['a vendor contract',    'vendor-contract_date-v1'],
      ['a vendor booking',     'vendor-booking_date-v2'],
      ['a vendor meeting',     'vendor-meeting_date-v2'],
      ['a custom entry',       'custom-1'],
    ]) check(`${what} is still there`, ids.includes(id), id);
    check('  a vendor meeting keeps its time off the timestamp',
      events.find(e => e.id === 'vendor-meeting_date-v2')?.time === '14:30', 'from 2027-02-14T14:30:00');
  }

  // ── THE LIST'S OWN SHAPE ────────────────────────────────────────────────
  {
    const days = groupEventsByDay(events);
    check('days come out in date order',
      JSON.stringify(days.map(d => d.date)) === JSON.stringify([...days.map(d => d.date)].sort()),
      days.map(d => d.date).join(' → '));
    const wedding = days.find(d => d.date === '2027-07-03');
    check('  and a day\'s events come out in time order',
      JSON.stringify(wedding.events.map(e => e.time || '')) === JSON.stringify(['', '', '11:00', '15:00', '18:00']),
      wedding.events.map(e => `${e.time || 'all-day'} ${e.title}`).join(' | '));
    check('  every untimed event sorts to the top of its day, not to midnight or past 6pm',
      wedding.events.slice(0, 2).every(e => !e.time)
        && wedding.events.map(e => e.id).slice(0, 2).sort().join() === 'custom-2,wedding-day',
      'a null time stringifies to "null" and sorts after "18:00" on a plain compare');
    check('the list carries location where there is one and blank where there is not',
      events.find(e => e.id === 'schedule-s1').location === 'The Old Observatory'
        && events.find(e => e.id === 'deadline-rsvp').location === '',
      'a deadline does not happen anywhere');
  }

  // ── THE PAGE OPENS ON THE LIST, AND THE BUILDER IS UNREACHABLE ──────────
  {
    const hub = code('src/pages/ScheduleHub.jsx');
    const tabs = [...(/const TABS = \[([\s\S]*?)\];/.exec(hub)?.[1] || '').matchAll(/key: "([a-z]+)"/g)].map(m => m[1]);
    // THREE VIEWS NOW, on the owner's later direction: "List... Calendar...
    // Then run sheet is literally order of events for the specific event."
    // Considerations stays — it is the page's notes, not a view of the events.
    check('PLANT: the tab bar is List, Calendar, Run sheet, Considerations — in that order',
      JSON.stringify(tabs) === JSON.stringify(['list', 'calendar', 'runsheet', 'considerations']),
      tabs.join(', '));
    check('  and the page opens on the list',
      /useState\("list"\)/.test(hub), 'not on the grid with the most machinery in it');
    check('PLANT: "visual" is not a reachable tab',
      !tabs.includes('visual') && !/activeTab === "visual"/.test(hub), 'no route to it from the UI');
    check('  and nothing reachable renders the builder',
      !/WeddingDayTimelineBuilder/.test(hub), 'ScheduleHub does not import it');

    // GONE, AND NOTHING REACHES FOR IT.
    //
    // This used to assert UNREACHABLE and pass a literal `true` on the
    // deleted branch, because the owner had not yet said the word. He has, the
    // four files are removed, and a branch that cannot fail is not a check —
    // so it now asserts what is actually true: every one of them is absent,
    // and no live line in the repo imports or routes to any of them.
    const REMOVED = [
      'src/components/schedule/WeddingDayTimelineBuilder.jsx',
      'src/components/schedule/ScheduleTimeline.jsx',
      'src/components/schedule/ScheduleList.jsx',
      'src/pages/Schedule.jsx',
    ];
    const stillThere = REMOVED.filter((f) => { try { readFileSync(join(ROOT, f)); return true; } catch { return false; } });
    check('PLANT: all four removed files are gone', stillThere.length === 0,
      stillThere.join(', ') || REMOVED.length + ' removed');

    // A COMMENT MAY STILL NAME THEM — Seating.jsx cites the builder's Print
    // PDF pattern and scheduleOrder.js records why the comparator exists, and
    // deleting the reasoning because the file moved is the mistake this repo
    // has made before. Only live code is searched.
    const LIVE = ['src/pages/ScheduleHub.jsx', 'src/pages/Calendar.jsx', 'src/pages.config.js', 'src/App.jsx'];
    const reaching = LIVE.filter((f) => {
      const src = code(f);
      return /WeddingDayTimelineBuilder|ScheduleTimeline|components\/schedule\/ScheduleList|SchedulePage|from ["']\.\/Schedule["']/.test(src);
    });
    check('  and no live file imports or routes to one of them',
      reaching.length === 0, reaching.join(', ') || `${LIVE.length} checked, none reaches`);
    check('  the Considerations tab renders the notes itself now',
      /<PageConsiderations pageKey="schedule" \/>/.test(code('src/pages/ScheduleHub.jsx')),
      'Schedule.jsx held nothing else by the end');
    check('  and the schedule-order guard keeps no allowance for a file that is gone',
      /const ALLOWED = \{\};/.test(readFileSync(join(ROOT, 'scripts/test-schedule-order.mjs'), 'utf8')),
      'a dead allowance is a hole nobody is watching');
  }

  // ── THE LIST IS A SORTABLE TABLE, ON THE GUEST LIST'S OWN SORT ──────────
  //
  // Owner: "All I need is List as a table that can sort like Guest List."
  // Consumed, not forked: the compare, the blanks rule and the header cycle
  // are src/lib/tableSort.js, which is where they moved out of GuestList.jsx.
  {
    const table = code('src/components/schedule/ScheduleTable.jsx');
    // R37: the table markup itself moved to the shared shell, so this checks
    // that the List goes THROUGH it rather than that it renders <Table> itself.
    check('PLANT: the List is a table using the shared shell and the shared sort',
      /from '@\/lib\/tableSort'/.test(table) && /from '@\/components\/shared\/DataTable'/.test(table)
        && /<DataTable/.test(table),
      'the same shell and the same sort as the guest list');
    check('  and defines no compare of its own',
      !/function naturalCompare/.test(table) && !/localeCompare/.test(table),
      'one implementation, not two that drift');
    {
      const labels = [...table.matchAll(/key: '(\w+)',\s*label: '([^']+)'/g)].map((m) => m[2]);
      check('  six columns: Date, Time, Event, Type, Location, Notes',
        labels.join(' · ') === 'Date · Time · Event · Type · Location · Notes', labels.join(' · '));
    }
    check('  and it is the default tab',
      /useState\("list"\)/.test(code('src/pages/ScheduleHub.jsx')), 'the page opens on it');

    // EVERY COLUMN SORTS, in both directions, against orders computed here
    // rather than asserted from memory.
    const COLUMNS = {
      date:     { getValue: (e) => e.date || '', compare: naturalCompare },
      time:     { getValue: (e) => e.time || '', compare: naturalCompare },
      title:    { getValue: (e) => e.title || '', compare: naturalCompare },
      when:     { getValue: (e) => (e.when ? WHEN_RANK[e.when] : null), compare: (a, b) => a - b },
      location: { getValue: (e) => e.location || '', compare: naturalCompare },
      notes:    { getValue: (e) => e.notes || e.description || '', compare: naturalCompare },
    };
    const ROWS = [
      { id: 'a', date: '2027-07-03', time: '15:00', title: 'Ceremony',      when: 'wedding-day', location: 'Observatory', notes: 'Arrive early' },
      { id: 'b', date: '2027-03-02', time: '09:00', title: 'Dress fitting', when: 'planning',    location: '',            notes: '' },
      { id: 'c', date: '2027-07-04', time: '10:00', title: 'Brunch',        when: 'after',       location: 'Tavern',      notes: 'Casual' },
      { id: 'd', date: '2027-07-03', time: '09:00', title: 'Hair and makeup', when: 'wedding-day', location: 'The house', notes: '' },
    ];
    const order = (field, direction) => sortRows(ROWS, { field, direction }, COLUMNS).map((r) => r.id).join('');
    // WRITTEN OUT IN FULL, and three of the six were wrong the first time —
    // I worked them out by hand and the guard corrected me on date, title and
    // location. Literals rather than a second sort, because a check that
    // recomputes the thing it is checking proves only that the code agrees
    // with itself.
    for (const [field, asc] of [
      ['date', 'badc'],     // b is March; a and d tie on 3 July, stable, a first
      ['time', 'bdca'],     // 09:00 twice, then 10:00, then 15:00
      ['title', 'cabd'],    // Brunch, Ceremony, Dress fitting, Hair and makeup
      ['when', 'badc'],     // planning, wedding day (a then d), after
      ['location', 'acdb'], // Observatory, Tavern, The house, then the blank
      ['notes', 'ac'],      // Arrive early, Casual, then the two blanks
    ]) {
      const got = order(field, 'asc');
      check(`PLANT: sorting by ${field} ascending`, got.startsWith(asc), `${got} (expected to start ${asc})`);
      check(`  and by ${field} descending`,
        order(field, 'desc') !== got && order(field, 'desc').length === ROWS.length,
        order(field, 'desc'));
    }
    check('PLANT: Type sorts the way the wedding runs, not alphabetically',
      order('when', 'asc') === 'badc' && WHEN_RANK.planning < WHEN_RANK['wedding-day']
        && WHEN_RANK['wedding-day'] < WHEN_RANK.after,
      `${WHEN_LABEL.planning} → ${WHEN_LABEL['wedding-day']} → ${WHEN_LABEL.after}`);
    check('  Date sorts on the stored string, never the printed label',
      /getValue: \(e\) => e\.date \|\| ''/.test(table) && !/dateLabel\(e\.date\)[^\n]*getValue/.test(table),
      '"7 September" against "12 March" is a lexical coin toss');
    check('  and rows with a blank column fall to the end, both ways',
      order('location', 'asc').endsWith('b') && order('location', 'desc').endsWith('b'),
      'the shared blanks rule');
  }

  // ── AN EVENT KNOWS WHICH SIDE OF THE WEDDING IT IS ON ───────────────────
  {
    check('PLANT: planning, wedding day and after are told apart by date',
      whenRelativeTo('2027-03-02', '2027-07-03') === 'planning'
        && whenRelativeTo('2027-07-03', '2027-07-03') === 'wedding-day'
        && whenRelativeTo('2027-07-04', '2027-07-03') === 'after',
      'the Type column');
    // BOTH EDGES OF THE DAY, because one alone only fires in half the world.
    // A parse-then-toISOString implementation pushes 00:30 back a day east of
    // Greenwich and 23:30 forward a day west of it, so whichever way the
    // runner's clock is set, one of these two breaks. The source pin below
    // covers the one machine where neither does — UTC exactly.
    check('  compared as date-only strings, so no timezone moves an event',
      whenRelativeTo('2027-07-03T00:30:00', '2027-07-03') === 'wedding-day'
        && whenRelativeTo('2027-07-03T23:30:00', '2027-07-03') === 'wedding-day',
      'both ends of the day stay on the day');
    check('  and it slices the string rather than parsing it into an instant',
      /const d = String\(dateStr\)\.slice\(0, 10\);/.test(code('src/lib/scheduleEvents.js'))
        && !/new Date\(dateStr\)/.test(code('src/lib/scheduleEvents.js')),
      'the check that holds even on a runner set to UTC');
    check('  and with no wedding date set, everything reads as planning',
      whenRelativeTo('2027-07-03', null) === 'planning', 'never guessed');
    const ev = buildScheduleEvents({ ...FIXTURE, weddingDate: '2027-07-03' });
    // SIX TYPES NOW, not three: the timeline carries to-dos, vendor dates and
    // deadlines, and each keeps its own Type wherever it falls in the year.
    check('  every event carries a Type, whatever source it came from',
      ev.every((e) => ['planning', 'wedding-day', 'after', 'todo', 'vendor', 'deadline'].includes(e.when)),
      `${ev.length} events, all stamped`);
  }

  // ── THE DAY LIST IT REPLACES ────────────────────────────────────────────
  {
    let present = true;
    try { readFileSync(join(ROOT, 'src/components/schedule/ScheduleDayList.jsx')); } catch { present = false; }
    const callers = ['src/pages/ScheduleHub.jsx', 'src/pages/Calendar.jsx']
      .filter((f) => /ScheduleDayList/.test(code(f)));
    check(present ? 'ScheduleDayList is still in the repo, with no caller' : 'ScheduleDayList has been removed',
      callers.length === 0, callers.join(', ') || 'the table replaced it; deleting it was not asked for');
  }

  // ── THE CALENDAR LANDS WHERE THE EVENTS ARE, ON THE RIGHT DAY ───────────
  {
    const cal = code('src/pages/Calendar.jsx');
    check('the calendar day cell is keyed off LOCAL date parts',
      /getFullYear\(\)\}-\$\{String\(date\.getMonth\(\) \+ 1\)/.test(cal)
        && !/const dateStr = date\.toISOString\(\)/.test(cal),
      'toISOString() on a local-midnight Date put every event one day late east of Greenwich');
    check('  and the grid opens on the month of the next event, not on an empty today',
      /monthSettled/.test(cal) && /dated\.find\(d => d >= todayKey\)/.test(cal),
      'a wedding is a year out; today\'s month is blank');
    check('  set once, so paging away is not undone by a late fetch',
      /if \(monthSettled\.current \|\| !events\.length\) return;/.test(cal), 'runs once');
  }

  return results;
}

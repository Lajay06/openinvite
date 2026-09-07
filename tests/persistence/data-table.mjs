/**
 * tests/persistence/data-table.mjs
 *
 * R37 — ONE TABLE SHELL FOR EVERY LIST-SHAPED SURFACE.
 *
 * Owner: "Why would you not just use the same format as guestlist for the
 * table visual and make it neat... Anything that is like a list should have a
 * consistent table visual with all columns sortable, neat pill filters etc."
 *
 * The shell is the guest list's, LIFTED rather than imitated: the 1px
 * container border with overflow hidden, the #FAFAFA header band, the scroll
 * wrapper, the 36px checkbox column, the 48px trailing actions column and its
 * "···" dropdown. Every number below was read off GuestList.jsx before the
 * move, and the move itself was proved by screenshot: 1440x1148 and 390x1564,
 * PIXEL-IDENTICAL, zero differing pixels at any tolerance.
 *
 * This file pins the structure so the next table cannot quietly build its own.
 */
import { pass, fail } from './_shared.mjs';
import { PILL_BASE } from '../../src/lib/tablePills.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Every page that renders a list-shaped table. GROWS WITH THE RULING: the
 * schedule's List and Run sheet join this list in the commit that puts them on
 * the shell, not in the one that extracts it — a guard that names a file
 * before it is converted is a red gate, and a red gate is not a gate.
 */
const CONSUMERS = [
  'src/components/guests/GuestList.jsx',
  'src/components/schedule/ScheduleTable.jsx',
  'src/components/schedule/RunSheet.jsx',
];

export async function runDataTable() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  R37 — one table shell, one toolbar, one pill vocabulary:\n');

  const shell = code('src/components/shared/DataTable.jsx');
  const toolbar = code('src/components/shared/TableToolbar.jsx');

  // ── THE FRAME, EXACTLY AS THE GUEST LIST HAD IT ─────────────────────────
  for (const [what, re] of [
    ['the 1px container border, overflow hidden', /border: '1px solid rgba\(10,10,10,0\.12\)', overflow: 'hidden'/],
    ['the horizontal scroll wrapper',             /overflowX: 'auto'/],
    ['the #FAFAFA header band',                   /background: '#FAFAFA'/],
    ['a 36px checkbox column',                    /width: 36/],
    ['a 48px trailing actions column',            /width: 48/],
    ['the strawberry checkbox accent',            /accentColor: '#E03553'/],
    ['the "···" actions trigger',                 /<MoreHorizontal size=\{15\} \/>/],
    ['and sortable headers through SortableHead', /<SortableHead/],
  ]) check(`PLANT: the shell keeps ${what}`, re.test(shell), 'lifted, not re-invented');

  // ── EVERY LIST-SHAPED SURFACE GOES THROUGH IT ───────────────────────────
  for (const f of CONSUMERS) {
    const src = code(f);
    const name = f.split('/').pop();
    check(`PLANT: ${name} renders through the shell`,
      /from '@\/components\/shared\/DataTable'/.test(src), 'no page builds its own table again');
    check(`  and ${name} builds no frame of its own`,
      !/border: '1px solid rgba\(10,10,10,0\.12\)', overflow: 'hidden'/.test(src)
        && !/background: '#FAFAFA'/.test(src),
      'the border and the header band belong to the shell');
  }

  // ── ONE PILL VOCABULARY ─────────────────────────────────────────────────
  check('the row pill is 10px/700 at 0.08em, fully rounded',
    PILL_BASE.fontSize === 10 && PILL_BASE.fontWeight === 700
      && PILL_BASE.letterSpacing === '0.08em' && PILL_BASE.borderRadius === 999,
    'the guest list\'s own pillBase, moved');
  check('  and the guest list uses the shared one rather than a copy',
    /PILL_BASE/.test(code('src/components/guests/GuestList.jsx'))
      && !/const pillBase = \{/.test(code('src/components/guests/GuestList.jsx')),
    'one vocabulary');


  check('PLANT: the schedule\'s Type is an outlined pill, not a filled badge',
    /OUTLINE_PILL/.test(code('src/components/schedule/ScheduleTable.jsx'))
      && !/background: '#E03553', color: '#FFFFFF'/.test(code('src/components/schedule/ScheduleTable.jsx')),
    'a Type reads as a Category, not as a shout');
  check('  and its pill comes from the shell, not a local span',
    /<Pill style=/.test(code('src/components/schedule/ScheduleTable.jsx')), 'one pill component');

  // ── THE SCHEDULE'S OWN TOOLBAR (R37) ────────────────────────────────────
  {
    const table = code('src/components/schedule/ScheduleTable.jsx');
    // SIX PILLS NOW, generated from TYPE_ORDER rather than written out — the
    // ruling widened the timeline to to-dos, vendor dates and deadlines.
    check('PLANT: List has search, six counted pills and a locations select',
      /searchPlaceholder="Search by event or location…"/.test(table)
        && /val: 'all', label: `All \(\$\{counts\.all\}\)`/.test(table)
        && /TYPE_ORDER\.map\(\(t\) => \(\{ val: t, label: `\$\{WHEN_LABEL\[t\]\} \(\$\{counts\[t\]\}\)` \}\)\)/.test(table)
        && /const TYPE_ORDER = \['planning', 'wedding-day', 'after', 'todo', 'vendor', 'deadline'\]/.test(table)
        && /placeholder: 'All locations'/.test(table),
      'All (n) · Planning · Wedding day · After · To do · Vendor · Deadline · All locations ▾');
    check('  every column is sortable',
      (table.match(/sortable: true/g) || []).length === 6, 'six of six');
    check('  Notes is one line, with the whole thing on hover',
      /textOverflow: 'ellipsis', whiteSpace: 'nowrap'/.test(table) && /title=\{text \|\| undefined\}/.test(table),
      'a four-line note makes every other row taller');
    check('  and selection checkboxes are on',
      /selectedIds=\{selectedIds\}/.test(table), 'the shell\'s column');

    const rs = code('src/components/schedule/RunSheet.jsx');
    check('PLANT: the run sheet\'s wall of pills is one select',
      /select=\{events\.length > 0/.test(rs) && !/filter-pill/.test(rs)
        && !/background: active \? '#E03553'/.test(rs),
      'one control, not one per event');
    check('  Save run sheet is the toolbar\'s primary action, right',
      /actions=\{!readOnly && event/.test(rs) && /Save run sheet/.test(rs), 'in the toolbar');
    check('  the add row is a row inside the table body',
      /footerRow=\{!readOnly/.test(rs) && /\+ Add a moment/.test(rs), 'not a button floating under it');
    check('  and reorder moved into the "···" column',
      /label: 'Move up'/.test(rs) && /label: 'Move down'/.test(rs) && !/<ChevronUp/.test(rs),
      'the actions column the shell already has');
  }

  // ── THE HUB (R37 items 4-6) ─────────────────────────────────────────────
  {
    const hub = code('src/pages/ScheduleHub.jsx');
    check('PLANT: the gradient Ava pill is gone from the page',
      !/<AvaButton/.test(hub) && !/AvaModal/.test(hub),
      'Ava\'s one entry point is the floating button');
    check('  and the Guest Suite line is a note under the title, not a pill in the action row',
      /Visible to guests in your Guest Suite/.test(hub) && !/✨ Visible/.test(hub)
        && /padding: "0 32px 14px"/.test(hub),
      'a note about the page, not a control');
    // The tiles count what the List actually SHOWS. "Total events" over a
    // list that now includes to-dos would name a different thing than it counts.
    check('PLANT: the stat tiles are the guest list\'s, and honest about the wider set',
      /statLabelStyle/.test(hub) && /statValueStyle/.test(hub) && /\{s\.sub && !loadingStats/.test(hub)
        && /label: "On the timeline"/.test(hub) && /label: "To-dos due"/.test(hub)
        && /on the day · \$\{timelineStats\.around\} around it/.test(hub),
      'label, figure, and a sub-line only where it earns one');
    check('PLANT: the run sheet picker is deduped by event name',
      /const seen = new Set\(\)/.test(hub) && /seen\.has\(key\)/.test(hub),
      'two rows named "First dance" would give two identical options');
    check('  and nothing is deleted to achieve it',
      !/Schedule\.delete\(e\.id\)/.test(hub) || /handleDelete/.test(hub),
      'the duplicates stay in List and on the Calendar, where they can be merged');
  }

  // ── ONE TOOLBAR ─────────────────────────────────────────────────────────
  check('the toolbar is search left, pills, a select, actions right',
    /placeholder=\{searchPlaceholder\}/.test(toolbar) && /filter-pill/.test(toolbar)
      && /<SelectTrigger/.test(toolbar) && /marginLeft: 'auto'/.test(toolbar),
    'the row above every table');
  check('  the pills are the guest list\'s own class, not a new one',
    /className=\{`filter-pill\$\{active \? ' active' : ''\}`\}/.test(toolbar), '.filter-pill');
  for (const f of ['src/pages/Guests.jsx', 'src/pages/ScheduleHub.jsx']) {
    const src = code(f);
    check(`PLANT: ${f.split('/').pop()} uses the shared toolbar`,
      /from '@\/components\/shared\/TableToolbar'/.test(src), 'consumed');
    check(`  and defines no FilterPill of its own`,
      !/function FilterPill/.test(src), 'one pill component');
  }

  // ── THE ESCAPE HATCH IS NAMED, NOT SILENT ───────────────────────────────
  // Checked on the CODE, not the doc comment — `code()` strips comments, so a
  // regex for the JSDoc line passed on the source and failed here.
  check('the shell allows a custom body, for the one body that is not a flat map',
    /rowStyle, readOnly, children,/.test(shell) && /\{children\}/.test(shell)
      && /!children && !loading/.test(shell),
    'the guest list expands rows into sub-rows and carries a quick-add row');

  return results;
}

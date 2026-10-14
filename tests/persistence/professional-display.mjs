/**
 * tests/persistence/professional-display.mjs
 *
 * Openinvite Professional: the owner's rulings on the contact sheet
 * (2026-10-14).
 *   1. No guided-tour button anywhere under /professional; the couple app
 *      keeps it.
 *   2. The event switcher fits the 390 gutter and truncates inside itself;
 *      the event page shows the full name.
 *   3. The run sheet at 390 is stacked cards with no sideways scroll, and
 *      "Show" stays with its dropdown.
 *   4. One guest count everywhere: heads coming, plus-ones and children
 *      included, "includes N plus-one" underneath, from guestHeads(); every
 *      place agrees on the same seed.
 *   5. Times are 12-hour everywhere, seed data included.
 * Source and pure checks here; the rendered contact sheet measures the same
 * rulings in a browser.
 *
 * PLANT (R19): a planted tour import, a planted 24-hour string, and a planted
 * second way of counting are each flagged by the same matchers.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';
import { guestHeads, panelFigures, feedRows } from '../../src/lib/professionalGuests.js';
import { eventSummary } from '../../src/lib/professionalEvents.js';
import { linkedFeedFor } from '../../src/lib/professionalFeedClient.js';
import { list, COLLECTIONS } from '../../src/lib/professionalStore.js';
import { fmtTime } from '../../src/lib/professionalRunSheet.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const walk = (d, out = []) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, out); else if (/\.jsx?$/.test(e)) out.push(p); } return out; };
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => stripComments(read(p), { trailing: true });

export const TOUR = /DashboardPageHeader|WhatsHereControl|components\/guidance\/|studioTour|StudioTour/;
/** A clock time with no am or pm after it: "20:00", "9:30" on its own. */
export const H24 = /\b([01]?\d|2[0-3]):[0-5]\d\b(?!\s?(am|pm|\s?[ap]\.m\.))/i;
/** String literals only, so code like ratios or regexes is not read as a time. */
const literals = (src) => [...src.matchAll(/'([^'\\\n]*(?:\\.[^'\\\n]*)*)'|"([^"\\\n]*(?:\\.[^"\\\n]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');

export function runProfessionalDisplay() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, the contact sheet rulings:\n');
  const files = [...walk(join(ROOT, 'src/pages/professional')), ...walk(join(ROOT, 'src/components/professional'))].map((f) => relative(ROOT, f));

  // 1. No tour.
  const tour = files.filter((f) => TOUR.test(code(f)));
  check('professional display: no guided-tour button anywhere under /professional', tour.length === 0, tour.join(', ') || `${files.length} files`);
  check('professional display: the couple app keeps its tour', /<WhatsHereControl/.test(read('src/components/layout/DashboardPageHeader.jsx')), 'DashboardPageHeader unchanged');

  // 2. The switcher at 390.
  const sw = code('src/components/professional/EventSwitcher.jsx');
  const shell = code('src/components/professional/ProShell.jsx');
  const page = code('src/components/professional/ProPage.jsx');
  check('professional display: the top bar keeps a 16px gutter and the switcher takes only the room left', /padding: '0 16px'/.test(shell) && /flex: compact \? '1 1 auto'/.test(sw) && /maxWidth: compact \? '100%'/.test(sw) && /textOverflow: 'ellipsis'/.test(sw), 'fits');
  check('professional display: on a phone the event list is pinned to the gutters', /position: 'fixed', top: 54, left: 16, right: 16/.test(sw), 'pinned');
  check('professional display: the event page title wraps, so the full name shows', /<h1 style=\{\{[^}]*overflowWrap: 'anywhere'/.test(page) && !/<h1[^>]*textOverflow/.test(page), 'wraps');

  // 3. The run sheet at 390.
  const rs = code('src/components/professional/event/RunSheetTab.jsx');
  check('professional display: the run sheet at 390 is stacked cards, never the wide table', /\{mobile \? \(/.test(rs) && /role="list" aria-label="Run sheet rows"/.test(rs) && /overflow: mobile \? 'visible' : 'auto'/.test(rs), 'cards');
  const card = rs.slice(rs.indexOf('role="listitem" onClick={() => setSelected'));
  const order = ['fmtTime(r.start_minute)', '{r.item}', 'fmtDuration(r.duration_minutes'].map((k) => card.indexOf(k));
  check('professional display: each card reads time, item, length, then the rest', order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), order.join(','));
  check('professional display: "Show" stays on one line with its dropdown', /whiteSpace: 'nowrap'[^>]*>\s*<span style=\{s\.label\}>Show<\/span>/.test(rs), 'nowrap');

  // 3b. The events home fits its box at 1440 (owner ruling 2026-10-14): long cells wrap, the table never widens.
  const home = code('src/pages/professional/EventsHome.jsx');
  const wrapping = ['couple', 'venue', 'guests', 'pay', 'planner'].filter((k) => !new RegExp(`key: '${k}', label: '[^']+', wrap: true`).test(home));
  check('professional display: the events home wraps couple, venue, coming, next payment and planner instead of widening', wrapping.length === 0 && /c\.wrap \? \{ whiteSpace: 'normal'/.test(page), wrapping.join(', ') || 'five columns wrap');
  check('professional display: the coming cell is "8 coming" on line one and the plus-ones smaller underneath', /<span style=\{\{ display: 'block', whiteSpace: 'nowrap' \}\}>\{e\.sum\.heads\.line\}<\/span>\{e\.sum\.heads\.sub && <span style=\{\{ \.\.\.s\.secondary, display: 'block'/.test(home), 'two lines');
  check('professional display: the browser overflow check covers 1440 and 390 and the events home', /const WIDTHS = \[1440, 390\]/.test(read('scripts/professional-overflow.mjs')) && /'\/professional\/app',/.test(read('scripts/professional-overflow.mjs')), 'scripts/professional-overflow.mjs');

  // 4. One guest count, on the real seed.
  const store = Object.fromEntries(COLLECTIONS.map((c) => [c, list(c)]));
  const now = new Date();
  for (const id of ['ev_1', 'ev_2']) {
    const event = store.ProEvent.find((e) => e.id === id);
    const feed = linkedFeedFor(event, store);
    const rows = feed ? feedRows(feed) : store.ProGuest.filter((g) => g.event_id === id);
    const panelTotals = feed?.totals || panelFigures(rows);
    const home = eventSummary(event, store, now, feed).heads;
    const panel = guestHeads(panelTotals);
    check(`professional display: ${event.couple_names}: events home, Guests panel, day-of and the caterer sheet count the same heads`, home.heads === panel.heads && home.line === panel.line && home.sub === panel.sub && panel.heads === panelTotals.coming + panelTotals.plus_ones, `${home.line}${home.sub ? `, ${home.sub}` : ''}`);
  }
  check('professional display: the count reads "8 coming" and "includes 1 plus-one"', guestHeads({ coming: 7, plus_ones: 1 }).line === '8 coming' && guestHeads({ coming: 7, plus_ones: 1 }).sub === 'includes 1 plus-one' && guestHeads({ coming: 5, plus_ones: 0 }).sub === '' && guestHeads({ coming: 2, plus_ones: 3 }).sub === 'includes 3 plus-ones', 'worded');
  const COUNT_PLACES = ['src/pages/professional/EventsHome.jsx', 'src/components/professional/event/GuestsTab.jsx', 'src/components/professional/event/EventOverview.jsx', ...(files.includes('src/pages/professional/DayOfPage.jsx') && /coming/i.test(code('src/pages/professional/DayOfPage.jsx')) ? ['src/pages/professional/DayOfPage.jsx'] : [])];
  const ownCount = COUNT_PLACES.filter((f) => /totals\.coming\s*[+]|coming \|\| 0\) \+|\.plus_ones \|\| 0\)/.test(code(f)) || !/guestHeads|\.heads\b/.test(code(f)));
  check('professional display: every place that shows the count takes it from guestHeads', ownCount.length === 0, ownCount.join(', ') || COUNT_PLACES.map((f) => f.split('/').pop()).join(', '));

  // 5. Twelve-hour times, seed data included.
  const timeHits = [];
  for (const f of [...files, 'src/lib/professionalStore.js', 'src/lib/professionalFeedClient.js', 'src/lib/professionalTemplates.js', 'src/lib/professionalDayOf.js']) {
    if (!files.includes(f) && !(() => { try { return statSync(join(ROOT, f)).isFile(); } catch { return false; } })()) continue;
    for (const lit of literals(code(f))) if (H24.test(lit) && !/^[0-9:]+$/.test(lit.trim()) === true) timeHits.push(`${f}: "${lit.slice(0, 40)}"`);
  }
  check('professional display: no 24-hour time in any Professional screen or its seed data', timeHits.length === 0, timeHits.slice(0, 4).join(' | ') || 'none');
  const allTimes = Array.from({ length: 1441 }, (_, m) => fmtTime(m));
  check('professional display: the run sheet’s clock prints 12-hour for every minute of the day', allTimes.every((t) => /^(1[0-2]|[1-9]):[0-5]\d (am|pm)$|^midnight$/.test(t)), `${allTimes[0]} ... ${allTimes[1439]}`);

  // PLANTS.
  check('PLANT: a planted tour import is flagged', TOUR.test("import DashboardPageHeader from '@/components/layout/DashboardPageHeader';"), 'flagged');
  check('PLANT: a planted 24-hour cue is flagged, and a 12-hour one is not', H24.test('Mic check at 20:00') && !H24.test('Mic check at 8:00 pm'), 'flagged');
  check('PLANT: a planted second count is flagged', /totals\.coming\s*[+]/.test('const n = totals.coming + totals.plus_ones;'), 'flagged');
  return r;
}

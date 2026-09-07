/**
 * tests/persistence/daily-update-page.mjs
 *
 * THE DAILY UPDATE IS A PAGE AGAIN, AND OVERALL AGREES WITH IT.
 *
 * #654 redirected /DailyUpdate to Overall, and the reason was sound: the
 * briefing was on both, and two answers to one question is worse than one. The
 * owner's ruling restores the page (spec 3.1 — the daily update page is Ava's
 * home), so the duplication has to be solved the other way round.
 *
 * ONE RESOLVED STATE, RENDERED TWICE. src/lib/dayState.js decides; the briefing
 * renders it in full on the daily update page and Overall renders its headline
 * as one line and a link. Neither computes anything. That is why this file can
 * assert they agree rather than hoping they do — the module has no React in it
 * and plain Node can run the same call both pages make.
 */
import { pass, fail } from './_shared.mjs';
import { resolveDayState, rowDate, STATE_BADGE, todosFrom } from '../../src/lib/dayState.js';
import { countdownLabel } from '../../src/lib/weddingCountdown.js';
import { ACTION_MIRROR } from '../../src/lib/avaRequest.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Line comments first — a stray "/*" inside a "//" line otherwise opens a
// block comment that runs to the next "*/" and swallows the file.
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

const TODAY = new Date(2026, 8, 6);
const on = (o) => resolveDayState({ now: TODAY, ...o });

export async function runDailyUpdatePage() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The daily update is a page again, and Overall agrees with it:\n');

  // ── PLANT: /DailyUpdate RENDERS, IT DOES NOT REDIRECT ───────────────────
  {
    const app = code('src/App.jsx');
    check('PLANT: /DailyUpdate is no longer redirected away',
      !/pathname === '\/DailyUpdate'/.test(app), 'the route reaches the page');
    check('  and lowercase /dashboard still normalises',
      /pathname === '\/dashboard'/.test(app) && /<Navigate to="\/Dashboard" replace \/>/.test(app),
      'a hand-typed path lands somewhere rather than 404');
    const cfg = code('src/pages.config.js');
    check('  the page is still registered',
      /"DailyUpdate": DailyUpdate/.test(cfg), 'routed, not orphaned');
    const page = code('src/pages/DailyUpdate.jsx');
    check('  and it renders the briefing',
      /<Briefing\b/.test(page) && /from '@\/components\/dashboard\/Briefing'/.test(page),
      'the component #654 built, reused rather than resurrected');
  }

  // ── PLANT: THE DAY STATE ON OVERALL IS THE DAY STATE ON DAILY UPDATE ────
  {
    const briefing = code('src/components/dashboard/Briefing.jsx');
    const headline = code('src/components/dashboard/DayStateHeadline.jsx');
    // The page resolves ONCE and hands the object down — the hero, the three
    // columns and Overall's one-liner are all the same `day`. Briefing.jsx no
    // longer calls the resolver at all now that the layout is the old page's;
    // it takes what it is given, which is a stronger version of the property,
    // not a weaker one.
    const pageSrc = code('src/pages/DailyUpdate.jsx');
    check('PLANT: both surfaces resolve the day through the one function',
      /resolveDayState\(/.test(pageSrc) && /resolveDayState\(/.test(headline),
      'one source, rendered twice');
    check('  and the hero renders what it is handed, deciding nothing',
      !/resolveDayState\(/.test(briefing) && /day\.headline/.test(briefing),
      'the precedence lives in dayState.js and nowhere else');
    check('  the page resolves it exactly once',
      (pageSrc.match(/resolveDayState\(/g) || []).length === 1, 'not once per column');
    check('  Overall renders the headline, not a second briefing',
      /<DayStateHeadline/.test(code('src/pages/Dashboard.jsx'))
        && !/<Briefing/.test(code('src/pages/Dashboard.jsx')),
      'the full block is on the daily update page');
    check('  and links to the page that says more',
      /to="\/DailyUpdate"/.test(headline), 'one way to the fuller answer');

    // ONE CALL IS NOT ENOUGH IF THE INPUTS ARE CHOSEN TWICE.
    //
    // Both pages called resolveDayState and still disagreed on a screenshot:
    // the daily update page read "Overdue — Order the invitations is overdue"
    // while Overall read "Waiting on 1 reply", same wedding, same moment.
    // Overall was passing the `Task` entity, and a to-do is a Note with
    // view_type 'todo'. The selection is part of the answer, so it moved into
    // dayState.js too — and this checks BOTH pages select through it.
    check('PLANT: both pages choose their to-dos with the same helper',
      /todosFrom\(/.test(code('src/pages/DailyUpdate.jsx')) && /todosFrom\(/.test(code('src/pages/Dashboard.jsx')),
      'the inputs are chosen once as well as resolved once');
    // AND FROM THE SAME STORES. todosFrom cannot make two pages agree if they
    // are handed different inputs: Overall loaded Note AND Task, the daily
    // update page loaded Note only, and Overall named a Task as the next
    // thing that the other page could not see. Caught on a screenshot, twice
    // now, in opposite directions.
    check('  and from the same two stores',
      /notes:    \(\) => getMyRecords\('Note'/.test(code('src/pages/DailyUpdate.jsx'))
        && /tasks:    \(\) => getMyRecords\('Task'/.test(code('src/pages/DailyUpdate.jsx'))
        && /todosFrom\(\{ notes: data\.notes, tasks: data\.tasks \}\)/.test(code('src/pages/DailyUpdate.jsx')),
      'Note and Task, the pair Overall reads');
    check('  and neither filters view_type itself',
      !/view_type === 'todo'/.test(code('src/pages/Dashboard.jsx'))
        && !/\.filter\(\(n\) => n\.view_type/.test(code('src/pages/DailyUpdate.jsx')),
      'a second selection is a second answer');
    check('  the helper keeps to-do Notes and drops the rest',
      todosFrom({ notes: [{ id: 'a', view_type: 'todo' }, { id: 'b', view_type: 'moodboard' }] })
        .map(r => r.id).join() === 'a',
      'a moodboard note is not an overdue task');

    // The property itself, on one input.
    const input = { tasks: [{ title: 'Order invitations', due_date: '2026-09-01' }], guests: [{ rsvp_status: 'pending' }] };
    const a = on(input), b = on(input);
    check('PLANT: the same input gives the same headline and the same badge',
      a.headline === b.headline && a.badge === b.badge, `${a.badge} / ${a.headline}`);
  }

  // ── THE STATES, IN PRECEDENCE ORDER (spec 9.1) ──────────────────────────
  {
    const overdue = on({ tasks: [{ title: 'Order invitations', due_date: '2026-09-01' }], guests: [{ rsvp_status: 'pending' }] });
    check('overdue outranks waiting, and the headline names the oldest item',
      overdue.state === 'overdue' && overdue.badge === 'Overdue' && overdue.headline === 'Overdue: Order invitations.',
      overdue.headline);
    const today = on({ tasks: [{ title: 'Call the venue', due_date: '2026-09-06' }] });
    check('due today reads Today on the badge, not "Due today"',
      today.badge === 'Today' && today.headline === 'Today: Call the venue.',
      `${today.badge} / ${today.headline} — "Book the celebrant is overdue." read as a sentence about a sentence`);
    const waiting = on({ guests: [{ rsvp_status: 'pending' }, {}] });
    check('waiting names what is waited on',
      waiting.state === 'waiting' && /Waiting on 2 replies/.test(waiting.headline), waiting.headline);
    // CLEAR PAVES FORWARD — the owner's review of tulumtest. "Nothing this
    // week" over an empty brief reads as "done, nothing can be done", which
    // for a wedding a year out is the opposite of true. Both Clear shapes are
    // exercised below, from FIXTURE data, so the title and the date cannot be
    // authored text that happens to match.
    const clear = on({ budget: [{}], vendors: [{}], tasks: [{ title: 'Book the car', due_date: '2026-10-12' }] });
    check('PLANT: Clear with something ahead reads "Clear this week."',
      clear.state === 'clear' && clear.badge === 'Clear' && clear.headline === 'Clear this week.',
      clear.headline);
    // LOCALE-INDEPENDENT, deliberately. The first version of these three
    // checks pinned "12 October" — the order this machine prints — and went
    // red on the runner, which prints "October 12". A check that only passes
    // in one locale is not a check, the same lesson the countdown plant
    // learned in one timezone. The TITLE is matched exactly, because that is
    // the part that must come from the fixture; the date is matched by its
    // parts, in either order.
    const dayAndMonth = (text, day, month) =>
      new RegExp(`\\b${day}\\b`).test(text) && new RegExp(month, 'i').test(text);
    check('  and the first line is the next to-do, by name and date, FROM THE FIXTURE',
      /^Next up: Book the car, /.test(clear.lines[0]?.text || '')
        && dayAndMonth(clear.lines[0].text, 12, 'October'),
      clear.lines[0]?.text);
    check('  a to-do with no date says so without inventing one',
      on({ budget: [{}], vendors: [{}], tasks: [{ title: 'Book the car' }] }).lines[0]?.text === 'Next up: Book the car.',
      'no date, no date');
    {
      const nextYear = on({ budget: [{}], vendors: [{}], tasks: [{ title: 'Final dress fitting', due_date: '2027-06-01' }] }).lines[0]?.text || '';
      check('  and a date in another year carries the year',
        /^Next up: Final dress fitting, /.test(nextYear) && dayAndMonth(nextYear, 1, 'June') && /2027/.test(nextYear),
        nextYear);
      const thisYear = clear.lines[0]?.text || '';
      check('  while a date in this year does not',
        !/\b20\d\d\b/.test(thisYear), thisYear);
    }
    {
      const nearest = on({ budget: [{}], vendors: [{}], tasks: [
        { title: 'Later thing', due_date: '2026-12-01' },
        { title: 'Sooner thing', due_date: '2026-09-20' },
      ] }).lines[0]?.text || '';
      check('  the NEAREST to-do wins, not the first in the array',
        /^Next up: Sooner thing, /.test(nearest) && dayAndMonth(nearest, 20, 'September'), nearest);
    }
    check('  and a SCHEDULE event is not offered as the next thing to do',
      on({ budget: [{}], vendors: [{}], schedule: [{ event_name: 'Menu tasting', event_date: '2026-09-20' }] })
        .lines.every(l => !/Menu tasting/.test(l.text)),
      'a ceremony is something that happens to you, not a task you have not finished');

    const empty = on({ budget: [{}], vendors: [{}] });
    check('PLANT: Clear with NO to-dos at all reads "Nothing planned yet."',
      empty.state === 'clear' && empty.headline === 'Nothing planned yet.', empty.headline);
    check('  and offers one thing AVA CAN ACTUALLY DO',
      empty.lines[0]?.ava === 'create_todo'
        && ACTION_MIRROR.some(a => a.type === empty.lines[0].ava)
        && /Ask Ava to add the first thing to your to-do list\./.test(empty.lines[0].text),
      empty.lines[0]?.text);
    check('  with no percentages and nothing emotional in it',
      !/%|congratul|exciting|wonderful|journey/i.test(empty.lines[0]?.text || ''), 'facts and an offer');

    check('PLANT: the brief is never blank on a Clear day',
      clear.lines.length > 0 && empty.lines.length > 0
        && on({ budget: [{ id: 'b' }], vendors: [{ id: 'v' }], tasks: [] }).lines.length > 0,
      'one of the two forward lines always applies');

    check('PLANT: a store that failed is UNAVAILABLE, never Clear',
      on({ unseen: ['the to-do list'] }).state === 'unavailable'
        && on({ unseen: ['the to-do list'] }).headline === 'Some of today could not be read.'
        && on({ unseen: ['the to-do list'] }).badge === null,
      'the headline said "Nothing planned yet" over a failed load — the same false all-clear, one line up');
    check('  and Overall carries the forward line too, not the headline alone',
      /const forward = lines\[0\]\?\.text/.test(code('src/components/dashboard/DayStateHeadline.jsx')),
      'the dead end was one page wide, not one');
    check('every badge word is the spec\'s',
      JSON.stringify(Object.values(STATE_BADGE)) === JSON.stringify(['Overdue', 'Today', 'Waiting', 'Clear']),
      Object.values(STATE_BADGE).join(' → '));
  }

  // ── PLANT: THE THREE-ITEM CAP ───────────────────────────────────────────
  {
    const many = on({
      tasks: [
        { title: 'A', due_date: '2026-09-01' }, { title: 'B', due_date: '2026-09-02' },
        { title: 'C', due_date: '2026-09-06' },
      ],
      schedule: [{ event_name: 'D', event_date: '2026-09-06' }],
      guests: [{ rsvp_status: 'pending' }],
      // budget and vendors both empty too, so six candidates are true at once
      // and only the cap stands between them and the page.
    });
    check('PLANT: never more than three lines, however much is true',
      many.lines.length === 3, `${many.lines.length} of 6 true candidates`);
    check('  and they are the three highest in precedence',
      /overdue/.test(many.lines[0].text) && /due today/.test(many.lines[1].text)
        && /on the schedule today/.test(many.lines[2].text),
      many.lines.map(l => l.text).join(' | '));
  }

  // ── NO BADGE WHEN THE DAY CANNOT BE RESOLVED (spec 9.1) ─────────────────
  {
    const blind = on({ unseen: ['the to-do list'] });
    check('a store that did not load means no badge at all',
      blind.badge === null, 'a badge is a claim about the whole day');
    check('  and the page says what it could not see',
      /formatSourceList\(unseenSources\)/.test(code('src/pages/DailyUpdate.jsx')),
      'named, never counted as empty');
    // A LOAD THAT THREW IS NOT A CLEAR DAY. The first build of the page had a
    // `finally` and no `catch`, so a strict reader's throw escaped and the
    // page rendered "Nothing needs you today" over data it had never read.
    check('a load that throws marks every store unseen rather than reporting Clear',
      /catch \(err\)[\s\S]{0,600}setUnseenSources\(\['guests', 'budget', 'schedule', 'notes', 'tasks', 'vendors'\]\)/
        .test(code('src/pages/DailyUpdate.jsx')),
      'no badge, and it says what it could not see');
    check('  an unseen store is not called an empty one',
      on({ unseen: ['budget'] }).lines.every(l => !/No budget set/.test(l.text)),
      'the check tests KEYS, which is why the loader returns keys');
  }

  // ── DATES ARE DATES, NOT INSTANTS ───────────────────────────────────────
  {
    const d = new Date(rowDate({ due_date: '2026-09-06' }));
    check('PLANT: a date-only due date is read as a LOCAL day',
      d.getFullYear() === 2026 && d.getMonth() === 8 && d.getDate() === 6,
      `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} in this timezone`);
    check('  so a task due today is not overdue west of Greenwich',
      on({ tasks: [{ title: 'Call the venue', due_date: '2026-09-06' }] }).state === 'today',
      'new Date("2026-09-06") is UTC midnight, which is the 5th in New York');
  }

  // ── THE COPY RULES ──────────────────────────────────────────────────────
  {
    const page = code('src/pages/DailyUpdate.jsx');
    const parts = [page, code('src/components/dashboard/Briefing.jsx'), code('src/components/dashboard/DayStateHeadline.jsx')];
    const strings = parts.flatMap(src => [...src.matchAll(/'([^'\n]{4,})'|"([^"\n]{4,})"|`([^`\n]{4,})`/g)].map(m => m[1] || m[2] || m[3]));
    const shouty = strings.filter(s => /!/.test(s) && !/!==|!=/.test(s));
    check('no exclamation marks anywhere on these surfaces', shouty.length === 0, shouty.join(' | ') || 'none');
    // SPEC 5.2 IS ABOUT WHAT AVA SAYS — "No percentages, ever, in anything Ava
    // says" — not about a stat card. This check forbade the string anywhere on
    // the page, which is why it went red when the owner asked for the
    // "Your numbers" column back; Overall's own strip has shown "Budget used
    // 0%" throughout. Scoped to Ava's copy: the resolved headline and lines.
    const avaCopy = [
      on({ tasks: [{ title: 'X', due_date: '2026-09-01' }] }),
      on({ guests: [{ rsvp_status: 'pending' }] }),
      on({ budget: [{}], vendors: [{}] }),
      on({ budget: [{}], vendors: [{}], tasks: [{ title: 'Y', due_date: '2026-10-12' }] }),
    ].flatMap(d => [d.headline, ...d.lines.map(l => l.text)]);
    check('  no percentages in anything Ava says (spec 5.2)',
      avaCopy.every(t => !/%|percent/i.test(t)), avaCopy.filter(t => /%/.test(t)).join(' | ') || 'none');
    // AND THE STATS COLUMN IS BACK, by the owner's ruling: "far right column
    // had stats. It was great before." Same four labels the pre-#654 page had.
    check('  the far-right stats column carries the pre-#654 four',
      ['Guests confirmed', 'RSVP pending', 'Budget used', 'Vendors booked'].every(l => page.includes(l)),
      'restored');
    check('  and no generated briefing is asked for',
      !/InvokeLLM|smartSuggestions|emotionalNote|forgottenDetail/.test(page),
      'what is true today is computed, not written');
  }

  // ── THE QUICK POINTS THAT WERE KEPT ─────────────────────────────────────
  {
    const page = code('src/pages/DailyUpdate.jsx');
    for (const [what, re] of [
      ['the countdown',        /countdownLabel\(days\)/],
      // The greeting is gone with the layout: the old page printed the couple's
      // name and the date in the masthead instead, and that is what came back.
      ['the couple name and date', /\{coupleName\}[\s\S]{0,400}\{dateLabel\}/],
      ['today\'s date',        /toLocaleDateString/],
      ['what to do first',     /<NextUp\b/],
      ['what could not be read', /formatSourceList\(unseenSources\)/],
      ['one Ava entry point',  /<AvaButton\b/],
    ]) check(`kept from the old page: ${what}`, re.test(page), 'carried over');
    // COUNTED AS ENTRY POINTS, not as components. The first build of the
    // empty-Clear line rendered its own "Ask Ava" button inside the briefing,
    // which a `<AvaButton` count could not see — two ways to open one pod on
    // one page, which is the whole subject of spec 3.3. Both spellings count.
    const surfaces = [page, code('src/components/dashboard/Briefing.jsx')];
    // Every entry point ends in openAva(), whatever renders it — so that is
    // what is counted. Counting <AvaButton> as well double-counts the one
    // button, which is how this check first reported 2 for a correct page.
    const entryPoints = surfaces.reduce((n, src) => n + (src.match(/openAva\(/g) || []).length, 0);
    check('  and exactly one Ava entry point on the page (spec 3.3)',
      entryPoints === 1, `${entryPoints} across the page and the briefing`);
  }

  // ── PLANT: THE "HAPPY 0 DAY" FAMILY IS STILL GREEN ──────────────────────
  {
    check('PLANT: the page reads the countdown through weddingCountdown.js',
      /from '@\/lib\/weddingCountdown'/.test(code('src/pages/DailyUpdate.jsx')),
      'not a fifth place computing it itself');
    check('  and does no date arithmetic of its own',
      !/86400000|Math\.ceil\(/.test(code('src/pages/DailyUpdate.jsx')),
      'the whole point of #681');
    check('  0 days is "Today", not "0 days"', countdownLabel(0) === 'Today', countdownLabel(0));
    check('  1 day is "Tomorrow", not "1 days to go"', countdownLabel(1) === 'Tomorrow', countdownLabel(1));
    check('  and after the wedding there is no label at all',
      countdownLabel(-1) === null, 'nothing counts backwards, nothing says it forever');
  }

  // ── THE LAYOUT THE OWNER NAMED ──────────────────────────────────────────
  //
  // "just have it like it was before with three columns, big topic sentence at
  // the top, far right column had stats. It was great before." Pinned against
  // the pre-#654 file (src/pages/DailyUpdate.jsx at e2c087a) so a later tidy
  // cannot quietly flatten it again.
  {
    const page = code('src/pages/DailyUpdate.jsx');
    const hero = code('src/components/dashboard/Briefing.jsx');
    const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8');

    check('PLANT: the big topic sentence is an h1 at the top, above the columns',
      /<h1 style=\{\{[\s\S]{0,160}fontSize: 42[\s\S]{0,160}fontWeight: 800/.test(hero)
        && /\{day\.headline\}/.test(hero),
      "42px/800, as e2c087a:574 had it");
    check('  under the old eyebrow',
      /Today&apos;s edition/.test(hero), "\"Today's edition\", in strawberry");
    check('  and the hero comes before the grid on the page',
      page.indexOf('<Briefing day={day}') < page.indexOf('oi-daily-grid'), 'top of the page');

    check('PLANT: three columns, with a 1px rule between each pair',
      /grid-template-columns: 1fr 1px 1fr 1px 1fr;/.test(css), 'the pre-#654 grid');
    check('  stacked on a phone rather than three 33% columns at 390px',
      /@media \(max-width: 900px\)[\s\S]{0,200}grid-template-columns: 1fr;/.test(css),
      'the old page had no mobile treatment because it was never opened on one');
    for (const [n, label] of [['A', 'This week'], ['B', 'Ava'], ['C', 'Your numbers']])
      check(`  column ${n} is "${label}"`, page.includes(`columnHead('${label}`) || page.includes(`columnHead('${label}\\u2019s briefing')`), label);

    check('PLANT: the far-right column is the stats, and they are the old four',
      page.indexOf("columnHead('Your numbers')") > page.indexOf("columnHead('This week')")
        && /Guests confirmed[\s\S]{0,400}Vendors booked/.test(page),
      'far right, in order');
    check('  rendered at the old size',
      /fontSize: 48, fontWeight: 800/.test(page), '48px/800, as e2c087a:753');
    // The badge is in Ava's column, once, as a badge — never the headline
    // repeated. It read "Overdue — Overdue: Book the celebrant." on the first
    // screenshot, once the headline started leading with the state word.
    check('  the badge appears once and does not restate the headline',
      /\{day\.badge\}\n/.test(page) && !/\$\{day\.badge\} \\u2014 \$\{day\.headline\}/.test(page)
        && (page.match(/day\.headline/g) || []).length === 0,
      'the hero owns the sentence; the column owns the badge');
    check('  the masthead carries the countdown through the shared module',
      /countdownLabel\(days\)/.test(page) && !/days > 0 \? `\$\{days\} days to go`/.test(page),
      'the old pill printed the raw number and said "Today\'s the day" forever after');
  }

  // ── THE AVA PILL IS SOLID STRAWBERRY ────────────────────────────────────
  //
  // Owner: the pill and the floating button were the last two Ava surfaces
  // still on the old pink-to-purple gradient, which reads as a different
  // product sitting on ours. Both named, both checked — a plant on the pill
  // alone found nothing to fail against until this existed.
  for (const f of ['src/components/shared/AvaButton.jsx', 'src/Layout.jsx']) {
    const src = code(f);
    const gradients = (src.match(/linear-gradient\(135deg, #ec4899, #9333ea\)/g) || []).length;
    check(`PLANT: ${f.split('/').pop()} uses solid strawberry, not the gradient`,
      gradients === 0 && /#E03553/.test(src), gradients ? `${gradients} gradient(s) left` : '#E03553');
  }

  // ── THE SIDEBAR ─────────────────────────────────────────────────────────
  {
    const nav = code('src/components/layout/AnimatedSidebar.jsx');
    const planning = /label: "Planning",\s*items: \[([\s\S]*?)\],/.exec(nav)?.[1] || '';
    const labels = [...planning.matchAll(/label: "([^"]+)"/g)].map(m => m[1]);
    check('PLANT: Daily update is a real item, directly under Overall',
      labels[0] === 'Overall' && labels[1] === 'Daily update', labels.join(' → '));
  }

  return results;
}

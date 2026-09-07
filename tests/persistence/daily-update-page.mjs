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
import { validateTracking, authoredTracking, TRACKING_REQUEST, parseTrackingBlocks } from '../../src/lib/avaTracking.js';
import { guestCounts } from '../../src/lib/guestRsvpTally.js';
import { avaSentence, greetingFor, midSentence, ANXIOUS_WORDS } from '../../src/lib/dayState.js';
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
    check('  and the hero renders the sentence it is handed, deciding nothing',
      !/resolveDayState\(/.test(briefing) && /\{sentence\}/.test(briefing),
      'the precedence lives in dayState.js and nowhere else');
    check('  and Overall renders that same sentence, greeting included',
      /avaSentence\(day, \{ fullName: coupleName \}\)/.test(headline)
        && /avaSentence\(day, \{ fullName: coupleName \}\)/.test(pageSrc),
      'one string, two pages');
    // THE SAME CALL WITH A MISSING INPUT IS A DIFFERENT STRING. Overall said
    // "There's a clear first move today" while the daily update said "300 days
    // out and there's a clear first move today", because only one passed the
    // horizon. Caught on a screenshot, not by the check above.
    check('  and both pass the horizon into it, not just one',
      /daysOut: days/.test(pageSrc) && /daysOut \}\)/.test(headline) && /daysOut=\{daysOut\}/.test(code('src/pages/Dashboard.jsx')),
      'same call, same inputs');
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
    // AND FROM THE SAME STORE — now ONE store, not two.
    //
    // This check used to require Note AND Task on both pages, because the two
    // pages had disagreed twice in opposite directions and loading the same
    // pair was the fix. Owner ruling 2026-09-07 retires `Task` outright:
    // nothing in src/ creates one, a to-do is a Note with view_type 'todo',
    // and the read cost a round trip on the critical path of the page he
    // called slow. The property the check exists for is unchanged — the two
    // pages are handed the same inputs — so it now requires the same single
    // store and the ABSENCE of the dead one.
    check('  and from the same store, with the dead entity gone',
      /notes:    \(\) => getMyRecords\('Note'/.test(code('src/pages/DailyUpdate.jsx'))
        && /todosFrom\(\{ notes: data\.notes \}\)/.test(code('src/pages/DailyUpdate.jsx'))
        && !/getMyRecords\('Task'/.test(code('src/pages/DailyUpdate.jsx'))
        && !/getMyRecords\('Task'/.test(code('src/pages/Dashboard.jsx')),
      'Note only, on both pages');
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
    check('  and Overall carries the forward line too, not the sentence alone',
      /const forward = day\.lines\[0\]\?\.text/.test(code('src/components/dashboard/DayStateHeadline.jsx')),
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
    // Same four tiles, LABELLED BY WHICH QUANTITY THEY SHOW — owner ruling.
    // "Guests confirmed" over a row count and "RSVP pending" over a person
    // count are the two halves of the 94-vs-61 defect.
    check('  the far-right stats column carries the four, each naming its quantity',
      ['Guests coming', 'Invitations pending', 'Budget used', 'Vendors booked'].every(l => page.includes(l)),
      'restored, and named');
    // THE MODEL WRITES EXACTLY ONE THING ON THIS PAGE, and it is the tracking
    // paragraph in column B — owner's ruling. The old eleven generated fields
    // stay gone, and the topic sentence stays arithmetic, because Overall
    // renders it too.
    check('  the model writes the tracking paragraph and nothing else',
      /InvokeLLM/.test(page) && /TRACKING_REQUEST/.test(page)
        && !/smartSuggestions|emotionalNote|forgottenDetail/.test(page)
        && (page.match(/InvokeLLM/g) || []).length === 1,
      'one call, one paragraph');
    check('  and the topic sentence is never model-written',
      /avaSentence\(/.test(page) && !/headline: .*InvokeLLM/.test(page),
      'a sentence two pages share cannot be rewritten on either');
  }

  // ── THE QUICK POINTS THAT WERE KEPT ─────────────────────────────────────
  {
    const page = code('src/pages/DailyUpdate.jsx');
    for (const [what, re] of [
      ['the countdown',        /countdownLabel\(daysUntilWedding/],
      // The masthead is gone on the owner's ruling — "get rid of the
      // Openinvite daily banner with the name, there is too much going on" —
      // and the header bar above already carries the name and the countdown.
      // The greeting survives as the first half of the topic sentence.
      ['the greeting, in the sentence', /avaSentence\(day, \{ fullName: coupleName \}\)/],
      ['today\'s date',        /toLocaleDateString/],
      ['what could not be read', /formatSourceList\(unseenSources\)/],
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
    // ZERO ON THE PAGE ITSELF, on the owner's ruling: "get rid of any Ask Ava
    // buttons". The floating button in Layout.jsx is the entry point, which
    // still satisfies spec 3.3 — exactly one way to reach one action.
    check('  and no Ask Ava button on the page at all',
      entryPoints === 0, `${entryPoints} across the page and the briefing`);
    check('  the floating button is still there to be the one entry point',
      /aria-label=\{chatOpen \? 'Close Ava' : 'Chat with Ava'\}/.test(code('src/Layout.jsx')),
      'Layout.jsx, bottom right');
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
        && /\{sentence\}/.test(hero),
      "42px/800, as e2c087a:574 had it");
    check('PLANT: the top line runs the full width, not condensed to 800px',
      !/maxWidth: 800/.test(hero),
      '"there is so much space for the top line so let it go wider"');
    check('PLANT: an eyebrow above it carries today\'s date, and only that',
      /\{dateLabel\}/.test(hero) && /function todayLabel/.test(hero)
        && /weekday: 'long'/.test(hero) && !/year/.test(hero),
      '"Monday 7 September" — weekday, day, month, no year');
    check('  and it is the old eyebrow\'s style',
      /fontSize: 10, fontWeight: 700, letterSpacing: '0\.15em', color: '#E03553'/.test(hero),
      'small, letterspaced, strawberry');
    check('  nothing else above it and nothing under it',
      !/Today&apos;s edition/.test(hero) && !/day\.lines\[0\]/.test(hero)
        && !/Openinvite daily/.test(page),
      'no sub-line, no masthead — "there is too much going on"');
    check('  and the hero comes before the grid on the page',
      page.indexOf('<Briefing sentence=') < page.indexOf('oi-daily-grid'), 'top of the page');
    check('PLANT: the onboarding stepper is gone',
      !/<NextUp\b/.test(page) && !/Everything else on your list/.test(page),
      'an onboarding stepper is not a to-do');

    check('PLANT: three columns, with a 1px rule between each pair',
      /grid-template-columns: 1fr 1px 1fr 1px 1fr;/.test(css), 'the pre-#654 grid');
    check('  stacked on a phone rather than three 33% columns at 390px',
      /@media \(max-width: 900px\)[\s\S]{0,200}grid-template-columns: 1fr;/.test(css),
      'the old page had no mobile treatment because it was never opened on one');
    for (const [n, label] of [['A', 'This week'], ['B', 'Ava'], ['C', 'Your numbers']])
      check(`  column ${n} is "${label}"`, page.includes(`columnHead('${label}`) || page.includes(`columnHead('${label}\\u2019s briefing')`), label);

    check('PLANT: the far-right column is the stats, and they are the old four',
      page.indexOf("columnHead('Your numbers')") > page.indexOf("columnHead('This week')")
        && /Guests coming[\s\S]{0,400}Vendors booked/.test(page),
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
    check('  the countdown still comes through the shared module',
      /countdownLabel\(daysUntilWedding/.test(page) && !/86400000|Math\.ceil\(/.test(page),
      'it feeds the tracking paragraph now that the masthead pill is gone');
  }

  // ── THE TOPIC SENTENCE IS AVA TALKING ───────────────────────────────────
  //
  // Owner: "The whole idea of the topic sentence is Ava is talking to you and
  // giving you your morning update." Two short sentences — a greeting by local
  // time of day, then the state — computed per state with the couple's own
  // numbers, because Overall renders the same string.
  {
    const at = (h) => new Date(2026, 8, 7, h);
    check('PLANT: the greeting follows the local time of day',
      greetingFor(at(9), 'Jay Galaxy') === 'Morning, Jay.'
        && greetingFor(at(14), 'Jay Galaxy') === 'Afternoon, Jay.'
        && greetingFor(at(20), 'Jay Galaxy') === 'Evening, Jay.',
      [9, 14, 20].map(h => greetingFor(at(h), 'Jay Galaxy')).join(' '));
    check('  with no name, it is the greeting alone',
      greetingFor(at(9), null) === 'Morning.', greetingFor(at(9), null));
    check('  and never an address where a name goes',
      greetingFor(at(9), 'la.jay06@gmail.com') === 'Morning.', 'the welcome-email rule');

    const say = (o) => avaSentence(resolveDayState({ now: at(9), daysOut: 115, ...o }), { fullName: 'Jay Galaxy', now: at(9) });
    const forms = {
      overdue: say({ tasks: [{ title: 'Book the celebrant', due_date: '2026-09-01' }, { title: 'Order the cake', due_date: '2026-09-02' }] }),
      today:   say({ tasks: [{ title: 'Confirm the florist count', due_date: '2026-09-07' }] }),
      waiting: say({ guests: Array(61).fill({ rsvp_status: 'pending' }) }),
      clear:   say({ budget: [{}], vendors: [{}], tasks: [{ title: 'The florist', due_date: '2026-09-21' }] }),
      empty:   say({ budget: [{}], vendors: [{}] }),
      unseen:  say({ unseen: ['to-dos'] }),
    };
    check('PLANT: Overdue leads with the horizon and the priority, not the failure',
      forms.overdue === "Morning, Jay. 115 days out and there's a clear first move today — book the celebrant.",
      forms.overdue);
    check('  and Today says they are ahead',
      forms.today === "Morning, Jay. One thing today and you're ahead — confirm the florist count.", forms.today);
    check('  Waiting counts INVITATIONS and says it is normal',
      forms.waiting === "Morning, Jay. Nothing on you today — 61 invitations are still to reply, and that's normal at 115 days out.",
      forms.waiting);
    check('PLANT: no anxious word ever reaches the top line',
      Object.values(forms).every(t => !ANXIOUS_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(t))),
      ANXIOUS_WORDS.join(', ') + ' — counts belong in Column A');
    check('  and the imperative is the action after the dash, never spliced mid-sentence',
      / — book the celebrant\.$/.test(forms.overdue) && !/with book the celebrant/.test(forms.overdue),
      'a verb where a noun belongs read as a typo');
    check('  Clear says on track and what is next',
      /^Morning, Jay\. You're on track\. Next up is the florist on /.test(forms.clear), forms.clear);
    check('  an empty wedding gets a fresh start',
      forms.empty === "Morning, Jay. Fresh start — add your first to-do and I'll keep it in order.", forms.empty);
    check('  and an unreadable store says so rather than claiming a clear day',
      forms.unseen === "Morning, Jay. I couldn't read your to-dos just now — try again in a moment.", forms.unseen);
    check('  a title reads mid-sentence, without mangling an acronym or a name',
      midSentence('Book the celebrant') === 'book the celebrant'
        && midSentence('RSVP chase') === 'RSVP chase'
        && midSentence("McKinley's deposit") === "McKinley's deposit",
      'lowercased naturally');
    check('  no percentages, no exclamation marks, no emoji in any of them',
      Object.values(forms).every(t => !/%|!/.test(t) && !/[\u{1F300}-\u{1FAFF}]/u.test(t)), 'six forms');
  }

  // ── COLUMN B: THREE SEPARATE BLOCKS ─────────────────────────────────────
  //
  // Owner: "you have three points in one paragraph. They should be their own
  // points." Each block is a bold lead of at most six words and one plain
  // sentence, and the validator requires exactly that, three times.
  {
    const good = [
      '**115 days to go** That is the horizon everything else is measured against.',
      '**21 of 61 invitations** are still to reply, and 40 guests are confirmed as coming.',
      '**2 things to pick up** They are at the top of This week, in order.',
    ].join('\n');
    check('PLANT: a briefing with two blocks is refused',
      validateTracking('**A** one.\n**B** two.').ok === false,
      validateTracking('**A** one.\n**B** two.').error);
    check('PLANT: a briefing with a percentage is refused',
      validateTracking('**A** one.\n**B** 64% used.\n**C** three.').ok === false,
      validateTracking('**A** one.\n**B** 64% used.\n**C** three.').error);
    check('PLANT: a person count paired with "replied" is refused',
      validateTracking('**A** one.\n**B** 94 guests have not replied.\n**C** three.').ok === false
        && /per invitation/.test(validateTracking('**A** one.\n**B** 94 guests have not replied.\n**C** three.').error),
      'the 94-vs-61 defect, said out loud');
    check('  a paragraph rather than blocks is refused',
      validateTracking('**A** one. **B** two. **C** three.').ok === false, 'one line is one block');
    check('  a block with no bold lead is refused',
      validateTracking('**A** one.\nplain line.\n**C** three.').ok === false, 'every block leads');
    check('  and a lead over six words is refused',
      /a lead of 7 words/.test(validateTracking('**One two three four five six seven** x.\n**B** y.\n**C** z.').error || ''),
      'a lead phrase, not a sentence in bold');
    check('  four blocks is refused too — exactly three',
      validateTracking('**A** a.\n**B** b.\n**C** c.\n**D** d.').ok === false, '4 is not 3');
    check('  a well-formed briefing passes, bullets and all',
      validateTracking(good).ok === true
        && validateTracking('- **A** a.\n- **B** b.\n- **C** c.').ok === true,
      'three blocks, each led');
    check('  and the bullet strip does not eat the bold',
      parseTrackingBlocks('- **A** a.')[0].lead === 'A',
      'a single * is a bullet; a doubled one is the lead');

    const authored = authoredTracking({ countdown: '115 days to go', invitationsPending: 21, invitations: 61, peopleAttending: 40, overdue: 2 });
    check('PLANT: the authored fallback passes its own validator',
      validateTracking(authored).ok === true,
      validateTracking(authored).error || 'the stand-in cannot be worse than what it stands in for');
    check('  it counts replies per invitation and attendance per person',
      /invitations\*\* are still to reply/.test(authored) && /guests are confirmed as coming/.test(authored),
      'both named, never mixed');
    check('  and it names the store it could not read, with three blocks still',
      /could not read your the guest list/.test(authoredTracking({ unseen: ['the guest list'] }))
        && validateTracking(authoredTracking({ unseen: ['the guest list'] })).ok === true,
      'three either way');

    const page = code('src/pages/DailyUpdate.jsx');
    check('the briefing is asked for through buildAvaPrompt',
      /buildAvaPrompt\(\{ weddingContext/.test(page) && /userText: TRACKING_REQUEST/.test(page),
      'the same builder every other Ava request uses');
    check('  and the request states every constraint, the numbers ruling included',
      /EXACTLY THREE separate blocks/.test(TRACKING_REQUEST) && /at most six words/.test(TRACKING_REQUEST)
        && /NEVER a percentage/.test(TRACKING_REQUEST) && /do not name a vendor/.test(TRACKING_REQUEST)
        && /heritage, culture or religion/.test(TRACKING_REQUEST)
        && /REPLIES ARE COUNTED PER INVITATION/.test(TRACKING_REQUEST),
      'shape, tone and the two quantities');
    check('  a failing reply is replaced rather than shown',
      /validateTracking\(reply\)\.ok \? reply\.trim\(\) : authoredTracking\(facts\)/.test(page),
      'not shown badly');
    check('  a wedding with nothing in it is never asked at all (#648)',
      /nothingToRead/.test(page) && /if \(nothingToRead\) \{[\s\S]{0,300}setTracking\(authoredTracking/.test(page),
      'Ava does not speak when there is nothing to read');
    check('  and the blocks render as blocks, never as injected HTML',
      /parseTrackingBlocks\(tracking\)/.test(page) && !/dangerouslySetInnerHTML/.test(page),
      'parsed, not injected');
  }

  // ── THE TWO NAMED QUANTITIES, EVERYWHERE ────────────────────────────────
  //
  // Owner ruling: replies per INVITATION, attendance per PERSON, every surface
  // says which, and one helper owns both. This is the 94-vs-61 defect closed at
  // its source rather than at four call sites.
  {
    const guests = Array.from({ length: 61 }, (_, i) => ({
      id: `g${i}`, rsvp_status: i < 40 ? 'attending' : 'pending',
      ...(i < 33 ? { plus_one_attending: true, plus_one_name: `P${i}` } : {}),
    }));
    const c = guestCounts(guests);
    check('PLANT: replies are per invitation, attendance per person',
      c.invitations.total === 61 && c.invitations.pending === 21 && c.people.total === 94 && c.people.attending === 40,
      `${c.invitations.total} invitations, ${c.people.total} people`);
    check('  and each carries the word a surface must print',
      c.invitations.label === 'invitations' && c.people.label === 'guests coming', 'labelled at the source');
    for (const f of ['src/pages/DailyUpdate.jsx', 'src/pages/Dashboard.jsx']) {
      const src = code(f);
      check(`  ${f.split('/').pop()} reads the helper and recomputes neither`,
        /guestCounts\(/.test(src)
          && !/guests\.filter\(isAttending\)/.test(src)
          && !/guests\.filter\(\(g\) => !g\.rsvp_status/.test(src),
        'no page counts guests itself');
    }
    check('PLANT: a stat tile never labels the invitation count as guests',
      !/label: 'Guests[^']*',\s*value: String\(counts\.invitations/.test(code('src/pages/DailyUpdate.jsx')),
      'attendance is people, replies are invitations');
    check("Column A says invitations, not guests, about replies",
      /invitation\$\{unreplied === 1 \? '' : 's'\} still to reply/.test(code('src/lib/dayState.js')),
      'the words that let 94 and 61 sit on two pages');
    check("and Ava's context passes both, labelled",
      /REPLIES ARE COUNTED PER INVITATION and ATTENDANCE PER PERSON/.test(code('src/lib/avaContextFormat.js'))
        && /Invitations: \$\{counts\.invitations\.total\}/.test(code('src/lib/avaContextFormat.js')),
      'so Ava can never say "94 guests have not replied"');
  }

  // ── THE AVA PILL IS SOLID STRAWBERRY ────────────────────────────────────
  //
  // Owner: the pill and the floating button were the last two Ava surfaces
  // still on the old pink-to-purple gradient, which reads as a different
  // product sitting on ours. Both named, both checked — a plant on the pill
  // alone found nothing to fail against until this existed.
  {
    const btn = code('src/components/shared/AvaButton.jsx');
    check('PLANT: AvaButton is solid strawberry, not the gradient',
      !/linear-gradient\(135deg, #ec4899, #9333ea\)/.test(btn) && /#E03553/.test(btn), '#E03553');

    // THE FLOATING BUTTON, and only it. The first pass changed Layout.jsx:276
    // — which is the AVATAR, not an Ava surface, and nobody asked for it. The
    // check has to name the control rather than the file, or it will bless the
    // wrong element again.
    const layout = code('src/Layout.jsx');
    const floating = /aria-label=\{chatOpen \? 'Close Ava' : 'Chat with Ava'\}[\s\S]{0,900}?\}\}/.exec(layout)?.[0] || '';
    check('PLANT: the floating Ava button is solid, shadow included',
      /background: chatOpen \? '#0A0A0A' : color\.primary/.test(floating)
        && !/linear-gradient/.test(floating) && !/rgba\(147,51,234/.test(floating),
      floating ? 'fill and shadow' : 'button not found');
    check('  and the avatar was left alone',
      /linear-gradient\(135deg, #ec4899, #9333ea\)/.test(layout),
      'not an Ava surface, and not named');
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

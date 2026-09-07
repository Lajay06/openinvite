/**
 * src/lib/dayState.js — ONE DAY STATE, COMPUTED ONCE.
 *
 * Spec section 9.1: the headline and the badge used to be two independent
 * judgments about the same day, so a badge reading "Clear" could sit above a
 * headline naming two overdue tasks. The fix is not to synchronise them — it is
 * to have one state and render it twice.
 *
 * Now rendered in TWO PLACES rather than two ways: the daily update page, which
 * is Ava's home (spec 3.1), and a single headline on Overall that links to it.
 * Two pages showing one resolved state cannot disagree either, and that is the
 * whole reason this is a module with no React in it and no imports the browser
 * needs — a guard can load it and check that the two renderings read the same
 * function.
 *
 * ── PRECEDENCE, HIGHEST FIRST (spec 9.1) ───────────────────────────────────
 *
 *   overdue   something is past its date        badge "Overdue"
 *   today     something is due today            badge "Today"
 *   waiting   nothing due, something outstanding badge "Waiting"
 *   clear     nothing due and nothing blocked   badge "Clear"
 *
 * THE BADGE VOCABULARY IS THE SPEC'S. It read "Due today" here, which is the
 * headline's words, not the badge's — the spec's table says "Today". A badge
 * with its own vocabulary is how the two drifted apart in the first place.
 *
 * ── NO BADGE WHEN THE DAY CANNOT BE RESOLVED ───────────────────────────────
 *
 * Also 9.1, and it was not implemented: "if the day state cannot be resolved
 * because data did not load, there is no badge at all, and the briefing says
 * what cannot be seen". A badge is a claim about the whole day. If the to-do
 * list failed to fetch, there is no such claim to make — so `badge` is null and
 * the caller renders the unseen sentence instead.
 *
 * ── DATES ARE READ AS DATES, NOT AS INSTANTS ───────────────────────────────
 *
 * `new Date('2027-07-03')` is midnight UTC. Compared against a local start of
 * day, that lands on the PREVIOUS day for every couple west of Greenwich — so
 * a task due today read as overdue in New York and the badge said Overdue on a
 * clear day. Date-only strings are parsed by hand, the same fix the wedding
 * countdown and the schedule calendar each needed.
 */

// The action mirror is the list of things Ava can ACTUALLY do. A Clear day
// with nothing on it offers one of these by name — never a suggestion the
// couple could accept and Ava could not carry out.
import { ACTION_MIRROR } from './avaRequest.js';
import { firstNameOrNull } from './emailGreeting.js';

/** Local midnight for a Date. */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * A row's date as a local-midnight timestamp, or null.
 * Accepts 'YYYY-MM-DD', an ISO timestamp, or a Date.
 */
export function rowDate(row) {
  const raw = row?.due_date || row?.dueDate || row?.event_date || row?.date;
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : startOfDay(raw);
  const s = String(raw);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

/**
 * THE ROWS THAT ARE ACTUALLY TO-DOS, from whatever a page happened to load.
 *
 * This exists because the two renderings disagreed on a screenshot: the daily
 * update page said "Overdue — Order the invitations is overdue" while Overall
 * said "Waiting on 1 reply", from the same wedding, at the same moment. Both
 * called resolveDayState, which is what the guard checked — and they handed it
 * DIFFERENT LISTS. Overall passed the `Task` entity; a to-do is a Note with
 * view_type 'todo' (TodoList.jsx:159), so Overall's task list was empty and the
 * overdue item was invisible to it.
 *
 * One state computed once is not enough if the inputs are chosen twice. The
 * selection is part of the answer, so it lives here with the rest of it.
 */
export function todosFrom({ notes = [], tasks = [] } = {}) {
  const fromNotes = (notes || []).filter((n) => n?.view_type === 'todo');
  // `Task` rows are kept because some accounts still have them; they are not
  // filtered on view_type because they never carried one.
  return [...fromNotes, ...(tasks || [])];
}

export const STATE_BADGE = { overdue: 'Overdue', today: 'Today', waiting: 'Waiting', clear: 'Clear' };

const titleOf = (r) => r?.title || r?.name || r?.event_name || null;

/** The set of action types Ava can actually execute. */
const CAN_DO = new Set(ACTION_MIRROR.map((a) => a.type));

/** "12 October" from a local-midnight timestamp — the year only when it differs. */
function dueLabel(at) {
  const d = new Date(at);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear
    ? { day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * @param {object} input
 * @param {Array}  input.tasks     Note rows with view_type 'todo'
 * @param {Array}  input.schedule  Schedule rows
 * @param {Array}  input.guests    Guest rows
 * @param {Array}  input.budget    Budget rows
 * @param {Array}  input.vendors   Vendor rows
 * @param {string[]} input.unseen  stores that failed to load, by key
 * @param {Date}   [input.now]     injected, so a guard can pick the day
 * @returns {{state:string, badge:string|null, headline:string, lines:Array<{text:string,to:string}>, unseen:string[], next:object|null}}
 */
export function resolveDayState({ tasks = [], schedule = [], guests = [], budget = [], vendors = [], unseen = [], daysOut = null, now = new Date() } = {}) {
  const today = startOfDay(now);

  const open = tasks.filter((t) => !t.completed);
  const overdue = open.filter((t) => { const d = rowDate(t); return d !== null && d < today; })
    .sort((a, b) => rowDate(a) - rowDate(b));
  const dueToday = open.filter((t) => rowDate(t) === today);
  const eventsToday = schedule.filter((e) => rowDate(e) === today);
  const unreplied = guests.filter((g) => !g.rsvp_status || g.rsvp_status === 'pending').length;

  // A DAY WITH A STORE MISSING IS NOT A CLEAR DAY, it is a day we could not
  // read. Spec 9.1: "if the day state cannot be resolved because data did not
  // load, there is no badge at all, and the briefing says what cannot be
  // seen." The badge was already suppressed; the HEADLINE still said "Nothing
  // planned yet", which is the same false all-clear one line up.
  //
  // The lines below still carry what WAS read — a to-do we can see is overdue
  // is worth saying even when the guest list failed. What is withheld is the
  // claim about the whole day.
  const state = unseen.length ? 'unavailable'
    : overdue.length > 0 ? 'overdue'
    : (dueToday.length > 0 || eventsToday.length > 0) ? 'today'
    : unreplied > 0 ? 'waiting'
    : 'clear';

  // WHAT IS NEXT — the nearest TO-DO by due date after today, from the same
  // store Overall reads (todosFrom, below: Notes with view_type 'todo').
  //
  // To-dos only, and not the schedule. "Next up" is something the couple does;
  // a ceremony on the schedule is something that happens to them, and offering
  // it as the next thing to do reads as a task they have somehow not finished.
  const ahead = open
    .map((r) => ({ row: r, at: rowDate(r) }))
    .filter((x) => x.at !== null && x.at > today)
    .sort((a, b) => a.at - b.at);
  // An undated open to-do is still what is next when nothing else is dated —
  // it just cannot say when.
  const undated = open.filter((t) => rowDate(t) === null);
  const nextRow = ahead[0]?.row || undated[0] || null;
  const next = nextRow ? { title: titleOf(nextRow), at: ahead[0]?.row === nextRow ? ahead[0].at : null } : null;

  // THE HEADLINE IS ABOUT THE STATE'S SUBJECT, always — never a second opinion.
  const headline = state === 'unavailable'
      ? `Some of today could not be read.`
    // LABEL FIRST, THEN THE THING. "Book the celebrant is overdue." reads as a
    // sentence about a sentence — the owner's note. The old page's headline was
    // model-written and had no authored form to inherit, so this is the plainest
    // one that keeps the subject the state's own subject (spec 9.1).
    : state === 'overdue'
      ? (titleOf(overdue[0]) ? `Overdue: ${titleOf(overdue[0])}.` : 'Something is overdue.')
    : state === 'today'
      ? (titleOf(dueToday[0] || eventsToday[0]) ? `Today: ${titleOf(dueToday[0] || eventsToday[0])}.` : 'Something is due today.')
    : state === 'waiting'
      ? `Waiting on ${unreplied} ${unreplied === 1 ? 'reply' : 'replies'}.`
    // CLEAR MUST PAVE FORWARD. It read "Nothing needs you today" over an empty
    // brief, and the owner's review of tulumtest is the reason that changed:
    // it reads as "done — nothing can be done", which is the opposite of true
    // for a wedding a year out. Clear is a state about THIS WEEK, and it
    // always carries the next thing.
    : next?.title
      ? 'Clear this week.'
      : 'Nothing planned yet.';

  // FACTS ONLY, IN PRIORITY ORDER, AND THE CAP IS ONE LINE.
  //
  // Every candidate is pushed unconditionally and the slice at the end is the
  // only thing that enforces three. It used to be the other way round: four of
  // the pushes were guarded by `lines.length < 3`, so the cap was a side
  // effect of the conditions and the slice was DEAD — a plant that deleted it
  // changed nothing, which is how a cap stops being a cap without anyone
  // noticing. The conditions that remain are about whether a line is TRUE, not
  // about how many there are already.
  //
  // AND THE SLICE IS IN EXACTLY ONE PLACE. There were two — here and again in
  // the return — so deleting either left the other doing the work and the
  // plant reported green twice. Two enforcements of one rule is one
  // enforcement plus a decoy.
  const candidates = [];
  const name = (items) => items.slice(0, 2).map(titleOf).filter(Boolean).join(', ');
  if (overdue.length) {
    const n = name(overdue);
    candidates.push({ text: `${overdue.length} task${overdue.length === 1 ? '' : 's'} overdue${n ? `: ${n}` : ''}.`, to: '/TodoList' });
  }
  if (dueToday.length) {
    const n = name(dueToday);
    candidates.push({ text: `${dueToday.length} due today${n ? `: ${n}` : ''}.`, to: '/TodoList' });
  }
  if (eventsToday.length) {
    candidates.push({ text: `${eventsToday.length} on the schedule today.`, to: '/Schedule' });
  }
  if (unreplied > 0) {
    // INVITATIONS, named. A plus-one has no invitation of its own, so this is
    // guest rows — and saying "guests" here is what let the 94 and the 61 sit
    // on two pages describing the same wedding.
    candidates.push({ text: `${unreplied} invitation${unreplied === 1 ? '' : 's'} still to reply.`, to: '/Guests' });
  }
  // An UNSEEN store is not an empty one — saying "No budget set" over a fetch
  // that failed is the lie section 5.3 exists to prevent.
  if (budget.length === 0 && !unseen.includes('budget')) {
    candidates.push({ text: 'No budget set. It lives on the Budget page.', to: '/Budget' });
  }
  if (vendors.length === 0 && !unseen.includes('vendors')) {
    candidates.push({ text: 'No vendors added. They live on the Vendors page.', to: '/Vendors' });
  }
  // THE BRIEF IS NEVER BLANK ON A CLEAR DAY. One of these two always applies:
  // the next to-do by name and date, or — with no to-dos at all — one thing
  // Ava can actually do about it.
  if (state === 'clear' && !unseen.length) {
    if (next?.title) {
      candidates.unshift({
        text: next.at ? `Next up: ${next.title}, ${dueLabel(next.at)}.` : `Next up: ${next.title}.`,
        to: '/TodoList',
      });
    } else if (CAN_DO.has('create_todo')) {
      // Named from the mirror, not authored: if create_todo ever leaves Ava's
      // powers, this offer leaves with it rather than becoming a promise the
      // couple can accept and Ava cannot keep.
      candidates.unshift({ text: 'Ask Ava to add the first thing to your to-do list.', to: '/TodoList', ava: 'create_todo' });
    }
  }

  const lines = candidates.slice(0, 3);

  return {
    state,
    // The slots avaSentence drops into its two sentences. Returned rather than
    // re-derived by the caller, so the page and Overall cannot compute them
    // differently.
    counts: {
      overdue: overdue.length,
      today: dueToday.length + eventsToday.length,
      unreplied,
      // Named, because the sentence prints it: replies are per INVITATION.
      invitationsPending: unreplied,
    },
    daysOut,
    firstOverdue: titleOf(overdue[0]),
    firstToday: titleOf(dueToday[0] || eventsToday[0]),
    // A badge is a claim about the whole day, and there is no such claim to
    // make over a store that did not load.
    badge: STATE_BADGE[state] || null,
    headline,
    lines,
    unseen,
    next,
  };
}


/**
 * AVA'S MORNING SENTENCE — two short ones, in her voice, computed not written.
 *
 * Owner: "The whole idea of the topic sentence is Ava is talking to you and
 * giving you your morning update." She is — but the words come from here, per
 * state, with the couple's own numbers dropped into slots.
 *
 * DETERMINISTIC ON PURPOSE, and this is the reason rather than caution: the
 * same string is the day-state line on Overall. A model-written greeting could
 * not be, so the two pages would drift the moment either reloaded — which is
 * the exact defect this PR exists to close. Column B is where the model writes;
 * the sentence at the top of the page is arithmetic.
 *
 * NO PERCENTAGES, NO EMOJI, NO EXCLAMATION MARKS. The greeting is by local
 * time of day, and an address is never printed where a name goes.
 */
export function greetingFor(now = new Date(), fullName = null) {
  const h = now.getHours();
  const part = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
  const first = firstNameOrNull(fullName);
  return first ? `${part}, ${first}.` : `${part}.`;
}

/**
 * A to-do's title as it reads mid-sentence: "Book the celebrant" becomes "book
 * the celebrant". Only the first letter, and only when the first word is an
 * ordinary capitalised word — RSVP stays RSVP, and a name keeps its capital.
 */
export function midSentence(title) {
  const t = String(title || '').trim();
  if (!t) return '';
  const first = t.split(/\s+/)[0];
  const ordinary = /^[A-Z][a-z]+$/.test(first);
  return ordinary ? t[0].toLowerCase() + t.slice(1) : t;
}

const onDate = (at) => {
  const d = new Date(at);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear
    ? { day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * @param {object} day    the resolved state from resolveDayState
 * @param {object} [opts]
 * @param {string} [opts.fullName]  the couple's display name
 * @param {Date}   [opts.now]
 * @returns {string} two sentences: the greeting, then the day
 */
export function avaSentence(day, { fullName = null, now = new Date() } = {}) {
  const hello = greetingFor(now, fullName);
  const d = day || {};
  const n = d.counts || {};
  // "115 days out" — through the shared module, never computed here.
  const out = d.daysOut != null ? `${d.daysOut} days out` : null;

  if (d.state === 'unavailable') {
    const which = (d.unseen || []).join(' and ') || 'part of your wedding';
    return `${hello} I couldn't read your ${which} just now — try again in a moment.`;
  }
  // THE IMPERATIVE GOES AFTER THE DASH, as the action. Spliced mid-sentence it
  // read "let's start with book the celebrant" — a verb where a noun belongs.
  if (d.state === 'overdue') {
    const title = midSentence(d.firstOverdue);
    const lead = out ? `${out} and there's a clear first move today` : "There's a clear first move today";
    return title ? `${hello} ${lead} — ${title}.` : `${hello} ${lead}.`;
  }
  if (d.state === 'today') {
    const title = midSentence(d.firstToday);
    const count = n.today || 0;
    const lead = count > 1 ? `${count} things today and you're ahead` : "One thing today and you're ahead";
    return title ? `${hello} ${lead} — ${title}.` : `${hello} ${lead}.`;
  }
  if (d.state === 'waiting') {
    // INVITATIONS, not people: a plus-one has no invitation of its own and the
    // host replies for both (guestCounts, guestRsvpTally.js).
    const inv = n.invitationsPending || 0;
    const tail = out ? `, and that's normal at ${out}` : '';
    return `${hello} Nothing on you today — ${inv} ${inv === 1 ? 'invitation is' : 'invitations are'} still to reply${tail}.`;
  }
  if (d.next?.title) {
    const when = d.next.at ? ` on ${onDate(d.next.at)}` : '';
    return `${hello} You're on track. Next up is ${midSentence(d.next.title)}${when}.`;
  }
  return `${hello} Fresh start — add your first to-do and I'll keep it in order.`;
}

/**
 * WORDS THE TOP LINE MAY NOT USE — owner ruling: "The top line needs to give
 * the user confidence and not anxiety."
 *
 * Exported so the guard checks the same list the copy is written against,
 * rather than a second one that can drift from it. Counts belong in Column A;
 * the sentence names the priority and the horizon.
 */
export const ANXIOUS_WORDS = ['slipped', 'overdue', 'behind', 'missed', 'late'];

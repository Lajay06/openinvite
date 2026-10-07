/**
 * src/lib/household.js
 *
 * ONE INVITATION, SEVERAL PEOPLE.
 *
 * C6 and C7 from the essentials sweep: a couple invites "Priya and Dev" on one
 * card, and their daughter Mina is six. Before this, the only way to say that
 * was to type both names into one Guest row, which the product then treated as
 * one person: one seat, one meal, one RSVP, one headcount.
 *
 * ── EVERY PERSON KEEPS THEIR OWN ROW ───────────────────────────────────────
 *
 * A household is a SET OF ROWS sharing one household_id, not a row containing
 * several people. That is the whole design decision, and it is what keeps
 * seating, meals, per-event chips and headcount working: each of them already
 * counts rows, and none of them has to learn what a household is. The only
 * surfaces that do are the ones about addressing an invitation.
 *
 * ── WHAT COUNTS AS "NO HOUSEHOLD", AND WHY IT IS NOT JUST null ─────────────
 *
 * household_id is a free string, written by the Guests page and by a CSV
 * column. An empty string is the shape a spreadsheet produces for a blank
 * cell, and if '' counted as a household every row with a blank cell would
 * group into one enormous invitation. Absent, empty and whitespace-only all
 * mean "this person is their own invitation", and that is normalised once,
 * here, rather than at four call sites.
 *
 * ── NOTHING CHANGES UNTIL A COUPLE USES IT ─────────────────────────────────
 *
 * Every existing guest has no household_id, so membersOf returns them alone,
 * counts() reports one invitation each, and the numbers a couple reads today
 * are the numbers they read tomorrow.
 */

import { greetableFirstName } from './guestGreeting.js';

/** Anything with an @ between two non-space runs. Same looseness as emailGreeting. */
const LOOKS_LIKE_EMAIL = /^\S+@\S+$/;

/**
 * The household key, or null for a guest who is their own invitation.
 * Trimmed, so " h1 " and "h1" are the same household and " " is none.
 */
export function householdIdOf(guest) {
  const raw = guest?.household_id;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

/** Whether this guest is a child. Anything but true is an adult. */
export function isChild(guest) {
  return guest?.is_child === true;
}

/**
 * THE ORDER A HOUSEHOLD IS READ IN, everywhere: lead first, then the rest by
 * the same rule the lead was chosen with, so a list is stable between renders
 * and between sessions.
 */
function byLeadRule(a, b) {
  // An addressable email first: that is what an invitation needs.
  const ae = hasEmail(a) ? 0 : 1;
  const be = hasEmail(b) ? 0 : 1;
  if (ae !== be) return ae - be;
  const ad = String(a?.created_date || '');
  const bd = String(b?.created_date || '');
  if (ad !== bd) return ad < bd ? -1 : 1;
  // THE TIEBREAK, and it is not decorative. The CSV import creates a whole
  // file in one Promise.all, so two rows in the same household can carry the
  // same created_date to the second and the winner would otherwise be whatever
  // order the list happened to arrive in. id ascending is stable across every
  // reader.
  return String(a?.id || '') < String(b?.id || '') ? -1 : 1;
}

function hasEmail(guest) {
  const e = String(guest?.email ?? '').trim();
  // MALFORMED DOES NOT COUNT. The lead is who the invitation is addressed to,
  // so "has an email" has to mean "has one we could send to"; a row whose
  // address is a typo would otherwise become lead and the household would get
  // nothing. A household with no addressable member has a lead anyway, by
  // date, and the send surfaces it as "No email yet".
  return !!e && LOOKS_LIKE_EMAIL.test(e);
}

/**
 * Everyone on this guest's invitation, lead first.
 *
 * A guest with no household_id is their own invitation, so the answer is just
 * them. That is the state of every guest who existed before this shipped.
 *
 * @param {object} guest
 * @param {Array}  guests  the whole list
 * @returns {Array}
 */
export function membersOf(guest, guests = []) {
  const key = householdIdOf(guest);
  if (!key) return guest ? [guest] : [];
  const list = (Array.isArray(guests) ? guests : []).filter((g) => householdIdOf(g) === key);
  // The guest themselves may not be in the list given (a fresh row, a filtered
  // view), and leaving them out would be a worse answer than including them.
  if (guest && !list.some((g) => g?.id && g.id === guest.id)) list.push(guest);
  return list.slice().sort(byLeadRule);
}

/**
 * The one member an invitation is addressed to.
 *
 * @param {Array} household  members, in any order
 * @returns {object|null}
 */
export function leadOf(household = []) {
  const list = (Array.isArray(household) ? household : []).filter(Boolean);
  if (list.length === 0) return null;
  return list.slice().sort(byLeadRule)[0];
}

/**
 * How to address the invitation: the adults' first names.
 *
 * "Priya", "Priya and Dev", "Priya, Dev and Mina". No Oxford comma, because
 * the couple's own copy does not use one.
 *
 * CHILDREN ARE NEVER IN IT. An invitation addressed to "Priya, Dev and Mina"
 * when Mina is six reads as a card addressed to a six-year-old. Note for
 * anyone comparing this to the goal's own examples: the three-name example
 * shows the FORM, and the fixture's Mina is a child, so the fixture's
 * salutation is "Priya and Dev".
 *
 * NULL RATHER THAN A GUESS. A member whose name is itself a household phrase
 * ("The Patel Family") yields no first name through greetableFirstName, by the
 * #825 rule, and a household of only children has no adult to name. Callers
 * render nothing on null, exactly as the greeting rule already requires: a
 * family addressed as "Hi there," reads as a form letter.
 *
 * @param {Array} household
 * @returns {string|null}
 */
export function salutation(household = []) {
  const names = (Array.isArray(household) ? household : [])
    .filter((g) => g && !isChild(g))
    .slice()
    .sort(byLeadRule)
    .map((g) => greetableFirstName(g.name))
    .filter(Boolean);
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The four numbers every surface in this goal reports.
 *
 * PEOPLE AND INVITATIONS ARE DIFFERENT QUESTIONS, which is the same ruling
 * guestRsvpTally.js already carries about replies and attendance: one is per
 * person, the other per card in the post. Reported side by side and never
 * mixed.
 *
 * @param {Array} guests
 * @returns {{people:number, adults:number, children:number, invitations:number}}
 */
export function counts(guests = []) {
  const list = (Array.isArray(guests) ? guests : []).filter(Boolean);
  const households = new Set();
  let loners = 0;
  let children = 0;
  for (const g of list) {
    const key = householdIdOf(g);
    if (key) households.add(key); else loners += 1;
    if (isChild(g)) children += 1;
  }
  return {
    people: list.length,
    adults: list.length - children,
    children,
    invitations: households.size + loners,
  };
}

/**
 * THE LIST AS THE GUESTS PAGE DRAWS IT: households kept together, lead first,
 * members after.
 *
 * ── SORTING AND GROUPING HAVE TO AGREE ─────────────────────────────────────
 *
 * The page sorts by whatever column the couple clicked, and a household must
 * not be torn apart by it. So the SORT decides WHERE a household sits and the
 * grouping decides the order INSIDE it. A household appears at the position of
 * its EARLIEST-SORTING member, which is the choice worth naming: it means that
 * scanning down the list you never pass a member of a household before
 * reaching the household itself. Placing the block at the LEAD's position
 * instead would push the group below any member who sorts ahead of the lead,
 * and a name you can see above the group it belongs to is worse than a lead
 * that is not first in its own column.
 *
 * A household is only reordered internally, never split, and a guest with no
 * household_id passes through exactly where the sort put them.
 *
 * @param {Array} sorted  guests, already in the order the page wants them
 * @returns {Array<{guest: object, isLead: boolean, size: number, index: number}>}
 *   one entry per row, in render order. `size` is the household's size, so a
 *   row can tell whether it is part of one at all.
 */
export function groupByHousehold(sorted = []) {
  const list = (Array.isArray(sorted) ? sorted : []).filter(Boolean);
  const byKey = new Map();
  for (const g of list) {
    const key = householdIdOf(g);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(g);
  }
  const out = [];
  const done = new Set();
  for (const g of list) {
    const key = householdIdOf(g);
    if (!key) { out.push({ guest: g, isLead: true, size: 1, index: 0 }); continue; }
    if (done.has(key)) continue;
    done.add(key);
    const members = byKey.get(key).slice().sort(byLeadRule);
    members.forEach((m, i) => out.push({ guest: m, isLead: i === 0, size: members.length, index: i }));
  }
  return out;
}

/**
 * ── THE THIRD KIND OF WRITE TO event_responses ─────────────────────────────
 *
 * src/lib/statusWrite.js's header names the first two: an INVITATION WRITE
 * (the full resolved set) and a STATUS WRITE (narrow, status and responded_at
 * only). This is the third, and it is the one exception to the full-set
 * contract, ruled 2026-10-07.
 *
 * Adding someone to an invitation copies the lead's STORED entries EXACTLY:
 * the same event ids, the same invited values, status back to pending and
 * responded_at cleared. Where the lead has no stored entry for an event, the
 * new member gets none either.
 *
 * WHY NOT THE FULL RESOLVED SET. A full set writes one entry per event, and
 * for an event the lead is not invited to that entry carries invited:false. An
 * explicit false is a REMOVAL under the 2026-10-06 ruling, and a removal takes
 * the event off the couple's PUBLIC guest site. So adding a member to a
 * household would have unpublished an event, from a screen about adding a
 * person. Copying only what is stored cannot create a false that was not
 * already there, so publicEventIds cannot move.
 *
 * THE NEW MEMBER INHERITS THE INVITATION, NOT THE ANSWER. meal_choice,
 * plus_ones and plus_one_names reset: they belong to the person who gave them.
 * The shape is exactly what defaultEventResponses and getGuestEventResponse
 * produce, so no undeclared key can reach the row.
 *
 * @param {object} lead
 * @returns {Array} the event_responses to store on the new member
 */
export function entriesForNewMember(lead) {
  const existing = Array.isArray(lead?.event_responses) ? lead.event_responses : [];
  return existing
    .filter((r) => r && typeof r.event_id === 'string' && r.event_id)
    .map((r) => ({
      event_id: r.event_id,
      invited: r.invited === true,
      status: 'pending',
      meal_choice: null,
      plus_ones: 0,
      plus_one_names: [],
      responded_at: null,
    }));
}

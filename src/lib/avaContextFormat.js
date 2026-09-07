/**
 * src/lib/avaContextFormat.js
 *
 * THE WEDDING, AS AVA IS HANDED IT. Pure: stores in, string out.
 *
 * SPLIT OUT OF avaContext.js SO IT CAN BE TESTED. The fetching side reaches
 * Base44 through resolveMyWedding, which imports the client on the '@/' alias
 * — neither resolvable nor safe to construct under plain Node. The part that
 * was actually wrong in the owner's live test is this part, and now a guard
 * can seed it from a fixture and check every number against the Budget page's
 * own computation. See tests/persistence/ava-reads-the-wedding.mjs.
 */
import { tallyAttendees, guestCounts } from './guestRsvpTally.js';
import { resolveAttendees, MEAL_CHOSEN } from './attendees.js';
import { mealOptionLabel } from './weddingEvents.js';
import { coupleDisplayName } from './coupleNames.js';
import { daysUntilWedding, countdownForPrompt } from './weddingCountdown.js';

/**
 * THE FORMATTING, SPLIT OUT SO IT CAN BE TESTED.
 *
 * `buildWeddingContext` above reaches the network through resolveMyWedding,
 * which imports the Base44 client through the '@/' alias — neither resolvable
 * nor safe to construct under plain Node. So the part that was actually WRONG
 * in the owner's live test, which is this part, takes already-fetched stores
 * and returns the string. tests/persistence/ava-reads-the-wedding.mjs seeds it
 * from a fixture and checks the numbers against the Budget page's own
 * computation.
 *
 * @param {object} o
 * @param {string[]} o.unavailable labels of stores that failed to load (5.3)
 */
export function formatWeddingContext({ guests = [], budget = [], vendors = [], schedule = [], todos = [], wd = {}, user = {}, unavailable = [] }) {
  const theme       = wd.theme || {};
  const expectedCount    = wd.guestCount ? String(wd.guestCount) : '';
  const expectedTierRaw  = wd.guestType  || '';
  // Capitalise tier label for display (schema stores lowercase: intimate → Intimate)
  const expectedTier = expectedTierRaw
    ? expectedTierRaw.charAt(0).toUpperCase() + expectedTierRaw.slice(1)
    : '';
  const expectedGuestLine = expectedCount
    ? `Expected guest count: ~${expectedCount}${expectedTier ? ` (${expectedTier})` : ''}`
    : '';

  const coupleName  = coupleDisplayName(wd) || localStorage.getItem('oi_couple_name') || 'the couple';
  const weddingDate = wd.weddingDate || localStorage.getItem('oi_wedding_date');
  const city        = wd.mainCeremony?.address || localStorage.getItem('oi_wedding_city');
  const universe    = wd.activeUniverse || '';
  const ceremonyVenue  = wd.mainCeremony?.venueName || '';
  const receptionVenue = wd.reception?.venueName || '';

  // THE FIFTH PLACE THIS FORMULA WAS SITTING. #681 removed
  // `Math.ceil((new Date(date) - new Date()) / 86400000)` from four surfaces —
  // it is arithmetic between two INSTANTS, so the same calendar day reads 1 in
  // the morning and 0 in the evening, and `new Date('2027-07-03')` is UTC
  // midnight, which is the 2nd west of Greenwich. This copy was in Ava's own
  // prompt and was missed, so the pod and the modal were still being handed a
  // number computed the broken way.
  const daysUntil = weddingDate
    ? daysUntilWedding(weddingDate)
    : null;

  // ATTENDEES, not Guest rows. Ava was told "Total: 202" for a wedding of 242
  // people and answered headcount questions on that basis.
  //
  // The totals and the per-guest list below MUST move together. Counting
  // attendees while listing only guests would take Ava from consistently
  // undercounting to contradicting herself inside a single answer, which is
  // worse.
  //
  // AUDIT_2026-07.md S21: was checking for a 'confirmed' status that does
  // not exist in the schema and could never match — always counted 0.
  const attendees = resolveAttendees(guests);
  const { combined } = tallyAttendees(attendees);
  const { attending: confirmed, total: totalAttendees } = combined;
  // REPLIES ARE PER INVITATION — owner ruling, 2026-09-07. `combined.pending`
  // is the PERSON count, so this line handed Ava the number of people whose
  // reply is outstanding and called it "not yet replied". A plus-one has no
  // invitation of its own and never replies; the host replies for both. Ava was
  // one sentence away from telling a couple that 94 guests had not replied to
  // 61 invitations. Both quantities go in now, each labelled.
  const counts = guestCounts(guests);
  // ── BUDGET, IN THE BUDGET PAGE'S OWN FIELDS AND ITS OWN WORDS ──────────
  //
  // This read `total_amount` and `spent_amount`. NEITHER FIELD EXISTS on the
  // Budget entity — its money columns are `budgeted_amount` and
  // `actual_amount` (entityFields.generated.js). So both sums were always
  // zero, and Ava told the owner his budget was "$0 with $0 spent" while the
  // Budget page showed $154,000 planned and $105,450 spent. Not a model
  // failure: a field-name failure, in a file nobody re-read after the rename.
  //
  // AND IT WAS READING ONE STORE WHERE THE PAGE READS TWO. The page shows a
  // PLAN (WeddingDetails.budget — a total and per-category allocations,
  // decrypted server-side by /api/my-wedding-details, Budget.jsx:148-168) and
  // separately the ITEMISED EXPENSES (Budget entity rows, Budget.jsx:359-364).
  // Spec 5.1 requires Ava to name the store she read, in the page's own words,
  // so all four numbers are sent under the page's own labels.
  const plan = wd.budget || null;
  const planTotal = plan ? (parseFloat(plan.total) || 0) : null;
  const planAllocated = plan?.categories
    ? Object.values(plan.categories).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
    : null;
  const committed = budget.reduce((s, b) => s + (b.budgeted_amount || 0), 0);
  const spent     = budget.reduce((s, b) => s + (b.actual_amount   || 0), 0);
  const paid      = budget.filter(b => b.paid).reduce((s, b) => s + (b.actual_amount || 0), 0);
  const unpaid    = budget.filter(b => !b.paid).reduce((s, b) => s + (b.actual_amount || 0), 0);

  // Round 7 ask #13: Ava previously only saw aggregate guest counts, so Ava
  // couldn't answer "has Isla King RSVP'd?" — the owner's own dashboard
  // chat, authenticated as themselves via the normal RLS-scoped client
  // (getMyGuestsWithRsvp already fetches this; it just wasn't being put in
  // the prompt). Capped at 400 names to keep the prompt bounded for very
  // large guest lists — plenty for real weddings, and the aggregate counts
  // above still cover anything past the cap.
  const GUEST_LIST_CAP = 400;
  // Guest records by id, for the ONE field an attendee deliberately does not
  // carry. table_assignment is guest-only — a plus-one cannot hold a table
  // (Table.assigned_guests[].guest_id needs a real Guest id) — so it is looked
  // up explicitly, for primaries only, rather than put on the attendee where
  // every plus-one would silently inherit the host's seat.
  const guestById = new Map(guests.filter(g => g?.id).map(g => [g.id, g]));
  const guestListLines = attendees.slice(0, GUEST_LIST_CAP).map(a => {
    const parts = [a.rsvp_status || 'pending'];
    if (!a.isPlusOne) {
      const table = guestById.get(a.id)?.table_assignment;
      if (table) parts.push(`table ${table}`);
    }
    // a.meal is DISCRIMINATED. Only a real selection is reported: `none` means
    // they picked nothing, `not-loaded` means this input never carried the
    // overlay, and telling Ava "no meal" for either would have her assure a
    // couple that someone who ordered the fish has no meal. The dead
    // Guest.meal_choice column is not consulted at all — see attendees.js.
    if (a.meal.state === MEAL_CHOSEN) {
      const label = mealOptionLabel(a.meal.value, wd.mealOptions);
      if (label) parts.push(label.replace(/_/g, ' '));
    }
    // Named as a plus-one so Ava does not report them as a separately invited
    // guest, and so "who is Jon coming with?" is answerable.
    const host = a.isPlusOne ? guestById.get(a.hostGuestId)?.name : null;
    const name = a.isPlusOne ? `${a.name} (plus-one of ${host || 'a guest'})` : a.name;
    // THE ID, because update_guest writes Guest.update(id, …) and nothing ever
    // sent one. The model invented them and every update 404'd — the same
    // defect as the to-do tick-off, on a second action. A plus-one is not a
    // Guest row of its own, so it gets no id and cannot be the subject of an
    // update; the executor refuses it by name rather than writing to its host.
    const idTag = a.isPlusOne ? '' : ` [id ${a.id}]`;
    return `${name}${idTag} — ${parts.join(', ')}`;
  });
  const guestListBlock = guestListLines.length
    ? `\n\nGUEST LIST — individual RSVPs, for answering questions about a specific guest by name (this is the owner's own data, in their own dashboard):\n${guestListLines.join('\n')}${attendees.length > GUEST_LIST_CAP ? `\n…and ${attendees.length - GUEST_LIST_CAP} more (use the aggregate counts above for anything beyond named lookups)` : ''}`
    : '';

  // Build theme block — only include non-empty fields
  const faithLine = theme.faith === 'Interfaith' && theme.faithSecondary
    ? `Interfaith: ${theme.faithSecondary}`
    : theme.faith ? `Faith/religion: ${theme.faith}` : '';
  const cultureItems = [...(theme.culture || []), theme.cultureOther].filter(Boolean);
  const cultureLine = cultureItems.length ? `Culture/heritage: ${cultureItems.join(', ')}` : '';
  // wd.weddingStyle is the raw onboarding style/ceremony/vibe tag array
  // (OnboardingStep5WeddingType). theme.aesthetic/theme.faith/
  // theme.atmosphere are a derived, richer version of the same data, but
  // that derivation (EventDetails.jsx's migrateThemeFields) only runs when
  // the couple actually visits Event details — a couple who never does
  // still answered the question at onboarding, so fall back to the raw
  // tags whenever the derived fields are empty, rather than losing the
  // signal entirely until a page visit that may never happen.
  const styleTagsLine = !theme.aesthetic?.length && wd.weddingStyle?.length
    ? `Style/ceremony/vibe tags: ${wd.weddingStyle.join(', ')}`
    : '';
  const themeLines = [
    theme.aesthetic?.length  ? `Aesthetic: ${theme.aesthetic.join(', ')}` : '',
    styleTagsLine,
    faithLine,
    cultureLine,
    theme.atmosphere?.length ? `Atmosphere: ${theme.atmosphere.join(', ')}` : '',
    theme.season ? `Season: ${theme.season}` : '',
    theme.setting ? `Setting: ${theme.setting}` : '',
  ].filter(Boolean);

  const themeBlock = themeLines.length
    ? `\nWEDDING THEME:\n${themeLines.join('\n')}`
    : '';

  // ── VENDORS, WITH THE FIELDS A DEPOSIT QUESTION NEEDS ──────────────────
  // Was `vendors.map(v => v.category).join(', ')` — a list of categories under
  // a heading that said "VENDORS BOOKED", so Ava could not say who, could not
  // say whether one was booked or still being researched, and could not answer
  // a deposit question at all. She reasoned about deposits from the $0 budget
  // instead, which is how a wrong number becomes a wrong argument.
  const money = (n) => `$${Number(n || 0).toLocaleString()}`;
  const vendorLines = vendors.map((v) => {
    const bits = [v.status || 'no status'];
    if (v.deposit_amount) bits.push(`deposit ${money(v.deposit_amount)} ${v.deposit_paid ? 'PAID' : 'NOT paid'}`);
    else if (v.deposit_paid) bits.push('deposit paid');
    if (v.quoted_price) bits.push(`quoted ${money(v.quoted_price)}`);
    // Same reason as the guest ids above: update_vendor writes
    // Vendor.update(id, …) against an id nothing had ever supplied.
    return `${v.name || 'Unnamed'} (${v.category || 'uncategorized'})${v.id ? ` [id ${v.id}]` : ''} — ${bits.join(', ')}`;
  });

  // ── TO-DOS, WITH DATES, SO "WHAT IS OVERDUE" HAS AN ANSWER ─────────────
  // The to-do list was not sent at all, so "what's overdue?" could only be
  // answered generically — which is what the owner got. TodoList.jsx reads the
  // Note entity; `completed` and `due_date` are its own fields.
  const todayKey = new Date().toISOString().slice(0, 10);
  const openTodos = todos.filter((t) => !t.completed);
  const overdue = openTodos.filter((t) => t.due_date && t.due_date < todayKey);
  const todoLine = (t) => `${t.title || 'Untitled'}${t.due_date ? ` — due ${t.due_date}` : ' — no due date'}${t.priority ? `, ${t.priority} priority` : ''}`;

  // ── THE SCHEDULE, AND THE CEREMONY TIME ────────────────────────────────
  // Was `SCHEDULE ITEMS: ${schedule.length}` — a count. And the ceremony START
  // TIME was never sent at all, on any line, which is why Ava answered "not
  // listed" for a time the couple had set on Ceremony details.
  const timeOf = (e) => e?.startTime || e?.time || null;
  const eventLine = (label, e) => {
    if (!e?.venueName && !timeOf(e)) return '';
    return `${label}: ${e.venueName || 'venue not set'}${timeOf(e) ? ` at ${timeOf(e)}` : ', time not set'}${e.address ? ` (${e.address})` : ''}`;
  };
  const scheduleLines = schedule.map((e) =>
    `${e.event_name || 'Untitled'}${e.event_date ? ` — ${e.event_date}` : ''}${e.start_time ? ` ${e.start_time}` : ''}${e.location ? `, ${e.location}` : ''}`);

  const venueLines = [
    eventLine('Ceremony', wd.mainCeremony),
    receptionVenue && receptionVenue !== ceremonyVenue ? eventLine('Reception', wd.reception) : '',
  ].filter(Boolean).join('\n');

  const ctx = `WEDDING CONTEXT:
Couple: ${coupleName}
Planner: ${user.full_name || 'Unknown'} (${user.email || ''})
Wedding date: ${weddingDate || 'Not set'}${countdownForPrompt(daysUntil) ? `\nCOUNTDOWN, and use these words rather than the number: ${countdownForPrompt(daysUntil)}` : ''}
Location: ${city || 'Not set'}
Style universe: ${universe || 'Not set'}${venueLines ? `\n${venueLines}` : ''}${themeBlock}

${expectedGuestLine ? expectedGuestLine + '\n' : ''}GUESTS — state the population behind the number (spec 5.1). The canonical
form is "${totalAttendees} people, which is ${guests.length} guests plus ${Math.max(0, totalAttendees - guests.length)} plus ones".
REPLIES ARE COUNTED PER INVITATION and ATTENDANCE PER PERSON — never mix them.
Invitations: ${counts.invitations.total} sent, ${counts.invitations.pending} still to reply.
People coming: ${confirmed} of ${totalAttendees}.${guestListBlock}

BUDGET — two stores, named as the Budget page names them (spec 5.1):
${plan
  ? `Plan (WeddingDetails.budget): total wedding budget ${money(planTotal)}, allocated to categories ${money(planAllocated)}, unallocated ${money(planTotal - planAllocated)}`
  : 'Plan: no budget plan saved yet'}
Expenses (itemised Budget records, ${budget.length} line${budget.length === 1 ? '' : 's'}): committed ${money(committed)}, spent ${money(spent)}, of which paid ${money(paid)} and unpaid ${money(unpaid)}
NOTE: "committed" and "total wedding budget" are DIFFERENT numbers from
different stores. Never add them together, and always say which one you mean.

VENDORS (${vendors.length}):
${vendorLines.join('\n') || 'None yet'}

TO-DO LIST (${openTodos.length} open of ${todos.length}):
${overdue.length ? `OVERDUE (${overdue.length}), today is ${todayKey}:\n${overdue.map(t => '  ' + todoLine(t)).join('\n')}` : 'Nothing overdue.'}
${openTodos.filter(t => !overdue.includes(t)).slice(0, 25).map(t => '  ' + todoLine(t)).join('\n') || '  (no other open items)'}

SCHEDULE (${schedule.length}):
${scheduleLines.join('\n') || 'No schedule items yet'}

WEBSITE: ${wd.websiteEnabled && wd.slug ? `published at /w/${wd.slug}` : wd.slug ? `not published yet (address reserved: /w/${wd.slug})` : 'not published, no address yet'}
${unavailable.length ? `\nCANNOT BE SEEN RIGHT NOW: ${unavailable.join(', ')}. Say so plainly if the couple asks about any of these, and never answer as though the missing part were empty or zero. This is a loading failure on our side, not a fact about their wedding.` : ''}`;

  return ctx.trim();
}

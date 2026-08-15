import { getMyWeddingDetails, getMyRecords, getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';
import { tallyAttendees } from '@/lib/guestRsvpTally';
import { resolveAttendees, MEAL_CHOSEN } from '@/lib/attendees';
import { mealOptionLabel } from '@/lib/weddingEvents';

export async function buildWeddingContext() {
  const [guestsResult, budgetResult, vendorsResult, scheduleResult, wdResult] = await Promise.allSettled([
    getMyGuestsWithRsvp(),
    getMyRecords('Budget'),
    getMyRecords('Vendor'),
    getMyRecords('Schedule'),
    getMyWeddingDetails(),
  ]);

  const guests   = guestsResult.status   === 'fulfilled' ? guestsResult.value   : [];
  const budget   = budgetResult.status   === 'fulfilled' ? budgetResult.value   : [];
  const vendors  = vendorsResult.status  === 'fulfilled' ? vendorsResult.value  : [];
  const schedule = scheduleResult.status === 'fulfilled' ? scheduleResult.value : [];
  const wd          = (wdResult.status === 'fulfilled' && wdResult.value) || {};
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

  const coupleName  = wd.coupleNames || localStorage.getItem('oi_couple_name') || 'the couple';
  const weddingDate = wd.weddingDate || localStorage.getItem('oi_wedding_date');
  const city        = wd.mainCeremony?.address || localStorage.getItem('oi_wedding_city');
  const universe    = wd.activeUniverse || '';
  const ceremonyVenue  = wd.mainCeremony?.venueName || '';
  const receptionVenue = wd.reception?.venueName || '';

  let user = {};
  try { user = JSON.parse(localStorage.getItem('oi_user') || '{}'); } catch { /* malformed oi_user — fall back to the empty default declared above */ }

  const daysUntil = weddingDate
    ? Math.ceil((new Date(weddingDate) - new Date()) / 86400000)
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
  const { attending: confirmed, pending, total: totalAttendees } = combined;
  const totalBudget   = budget.reduce((s, b) => s + (b.total_amount  || 0), 0);
  const spent         = budget.reduce((s, b) => s + (b.spent_amount  || 0), 0);
  const bookedVendors = vendors.map(v => v.category).join(', ');

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
    return `${name} — ${parts.join(', ')}`;
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

  const venueLines = [
    ceremonyVenue  ? `Ceremony venue: ${ceremonyVenue}`   : '',
    receptionVenue && receptionVenue !== ceremonyVenue ? `Reception venue: ${receptionVenue}` : '',
  ].filter(Boolean).join('\n');

  const ctx = `WEDDING CONTEXT:
Couple: ${coupleName}
Planner: ${user.full_name || 'Unknown'} (${user.email || ''})
Wedding date: ${weddingDate || 'Not set'}${daysUntil !== null ? ` (${daysUntil} days away)` : ''}
Location: ${city || 'Not set'}
Style universe: ${universe || 'Not set'}${venueLines ? `\n${venueLines}` : ''}${themeBlock}

${expectedGuestLine ? expectedGuestLine + '\n' : ''}GUESTS (actual RSVPs):
Total: ${totalAttendees} | Confirmed: ${confirmed} | Pending: ${pending}${guestListBlock}

BUDGET:
Total: $${totalBudget.toLocaleString()} | Spent: $${spent.toLocaleString()} (${totalBudget ? Math.round(spent / totalBudget * 100) : 0}%)

VENDORS BOOKED (${vendors.length}):
${bookedVendors || 'None yet'}

SCHEDULE ITEMS: ${schedule.length}`;

  console.log('[Ava context]\n' + ctx);
  return ctx.trim();
}

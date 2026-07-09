import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';

export async function buildWeddingContext() {
  const [guestsResult, budgetResult, vendorsResult, scheduleResult, wdResult] = await Promise.allSettled([
    getMyRecords('Guest'),
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

  const coupleName  = localStorage.getItem('oi_couple_name') || 'the couple';
  const weddingDate = localStorage.getItem('oi_wedding_date');
  const city        = localStorage.getItem('oi_wedding_city');

  let user = {};
  try { user = JSON.parse(localStorage.getItem('oi_user') || '{}'); } catch {}

  const daysUntil = weddingDate
    ? Math.ceil((new Date(weddingDate) - new Date()) / 86400000)
    : null;

  const confirmed     = guests.filter(g => g.rsvp_status === 'confirmed').length;
  const pending       = guests.filter(g => g.rsvp_status === 'pending').length;
  const totalBudget   = budget.reduce((s, b) => s + (b.total_amount  || 0), 0);
  const spent         = budget.reduce((s, b) => s + (b.spent_amount  || 0), 0);
  const bookedVendors = vendors.map(v => v.category).join(', ');

  // Build theme block — only include non-empty fields
  const faithLine = theme.faith === 'Interfaith' && theme.faithSecondary
    ? `Interfaith: ${theme.faithSecondary}`
    : theme.faith ? `Faith/religion: ${theme.faith}` : '';
  const cultureItems = [...(theme.culture || []), theme.cultureOther].filter(Boolean);
  const cultureLine = cultureItems.length ? `Culture/heritage: ${cultureItems.join(', ')}` : '';
  const themeLines = [
    theme.aesthetic?.length  ? `Aesthetic: ${theme.aesthetic.join(', ')}` : '',
    faithLine,
    cultureLine,
    theme.atmosphere?.length ? `Atmosphere: ${theme.atmosphere.join(', ')}` : '',
    theme.season ? `Season: ${theme.season}` : '',
    theme.setting ? `Setting: ${theme.setting}` : '',
  ].filter(Boolean);

  const themeBlock = themeLines.length
    ? `\nWEDDING THEME:\n${themeLines.join('\n')}`
    : '';

  const ctx = `WEDDING CONTEXT:
Couple: ${coupleName}
Planner: ${user.full_name || 'Unknown'} (${user.email || ''})
Wedding date: ${weddingDate || 'Not set'}${daysUntil !== null ? ` (${daysUntil} days away)` : ''}
Location: ${city || 'Not set'}${themeBlock}

${expectedGuestLine ? expectedGuestLine + '\n' : ''}GUESTS (actual RSVPs):
Total: ${guests.length} | Confirmed: ${confirmed} | Pending: ${pending}

BUDGET:
Total: $${totalBudget.toLocaleString()} | Spent: $${spent.toLocaleString()} (${totalBudget ? Math.round(spent / totalBudget * 100) : 0}%)

VENDORS BOOKED (${vendors.length}):
${bookedVendors || 'None yet'}

SCHEDULE ITEMS: ${schedule.length}`;

  console.log('[Ava context]\n' + ctx);
  return ctx.trim();
}

import { base44 } from '@/api/base44Client';

export async function buildWeddingContext() {
  const [guestsResult, budgetResult, vendorsResult, scheduleResult] = await Promise.allSettled([
    base44.entities.Guest.list(),
    base44.entities.Budget.list(),
    base44.entities.Vendor.list(),
    base44.entities.Schedule.list(),
  ]);

  const guests   = guestsResult.status   === 'fulfilled' ? guestsResult.value   : [];
  const budget   = budgetResult.status   === 'fulfilled' ? budgetResult.value   : [];
  const vendors  = vendorsResult.status  === 'fulfilled' ? vendorsResult.value  : [];
  const schedule = scheduleResult.status === 'fulfilled' ? scheduleResult.value : [];

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

  return `WEDDING CONTEXT:
Couple: ${coupleName}
Planner: ${user.full_name || 'Unknown'} (${user.email || ''})
Wedding date: ${weddingDate || 'Not set'}${daysUntil !== null ? ` (${daysUntil} days away)` : ''}
Location: ${city || 'Not set'}

GUESTS:
Total: ${guests.length} | Confirmed: ${confirmed} | Pending: ${pending}

BUDGET:
Total: $${totalBudget.toLocaleString()} | Spent: $${spent.toLocaleString()} (${totalBudget ? Math.round(spent / totalBudget * 100) : 0}%)

VENDORS BOOKED (${vendors.length}):
${bookedVendors || 'None yet'}

SCHEDULE ITEMS: ${schedule.length}`.trim();
}

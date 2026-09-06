import { getMyWeddingDetails, getMyRecords, getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';
import { formatWeddingContext } from '@/lib/avaContextFormat';
/**
 * @param {object} [opts]
 * @param {object} [opts.fetchers] injected stores, for tests. Each is a
 *        function returning a promise; a REJECTED one exercises the
 *        unavailable path, which is the branch spec 5.3 is about and the one
 *        that cannot be reached from a live account on purpose.
 */
export async function buildWeddingContext({ fetchers } = {}) {
  const f = {
    guests: getMyGuestsWithRsvp,
    budget: () => getMyRecords('Budget'),
    vendors: () => getMyRecords('Vendor'),
    schedule: () => getMyRecords('Schedule'),
    todos: () => getMyRecords('Note'),
    weddingDetails: getMyWeddingDetails,
    ...(fetchers || {}),
  };
  const [guestsResult, budgetResult, vendorsResult, scheduleResult, todoResult, wdResult] = await Promise.allSettled([
    f.guests(), f.budget(), f.vendors(), f.schedule(), f.todos(), f.weddingDetails(),
  ]);

  // AN UNLOADED STORE IS NOT AN EMPTY ONE (spec 5.3).
  //
  // Every one of these used to collapse to `[]` on rejection, so a budget that
  // failed to load and a budget with nothing in it produced the identical
  // prompt — and Ava answered "$0" with total confidence about a wedding she
  // could not see. The spec calls this the single most likely way Ava invents
  // a wedding fact, and names it a plumbing failure rather than a model one.
  //
  // `unavailable` is carried through to the prompt by name, and the prompt
  // instructs Ava to say which part of the wedding she cannot see rather than
  // answering as if it were empty.
  const unavailable = [];
  const store = (result, label) => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) return result.value;
    unavailable.push(label);
    return [];
  };

  const guests   = store(guestsResult,   'the guest list');
  const budget   = store(budgetResult,   'the budget expenses');
  const vendors  = store(vendorsResult,  'the vendor list');
  const schedule = store(scheduleResult, 'the schedule');
  const todos    = store(todoResult,     'the to-do list');
  return formatWeddingContext({
    guests, budget, vendors, schedule, todos, unavailable,
    wd: (wdResult.status === 'fulfilled' && wdResult.value) || {},
    user: readLocalUser(),
  });
}

/** The signed-in planner, best effort — a malformed blob is not a crash. */
function readLocalUser() {
  try { return JSON.parse(localStorage.getItem('oi_user') || '{}'); } catch { return {}; }
}


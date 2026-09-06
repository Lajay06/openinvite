/**
 * tests/persistence/ava-reads-the-wedding.mjs
 *
 * AVA ANSWERED FROM A WEDDING SHE COULD NOT SEE.
 *
 * From the owner's live test on his own record, five failures in one session:
 * the ceremony start time reported as "not listed" while it was set on
 * Ceremony details; the budget reported as "$0 with $0 spent" while the Budget
 * page showed $154,000 planned and $105,450 spent; vendor deposits reasoned
 * from that false zero; "what is overdue" answered generically; "is our budget
 * enough" answered with no figures at all.
 *
 * NONE OF THAT IS A MODEL FAILURE. Every one is a store the context builder
 * either never sent or read under a field name that does not exist:
 *
 *   avaContext.js  read `total_amount` / `spent_amount` on the Budget entity.
 *                  Its money columns are `budgeted_amount` / `actual_amount`.
 *                  Both sums were therefore always zero — which is where the
 *                  "$0" came from, and why the vendor answer reasoned from it.
 *   the PLAN       (WeddingDetails.budget: a total and per-category
 *                  allocations) was never read at all, and it is the store the
 *                  owner's $154,000 and $126,500 come from.
 *   the to-do list was never fetched, so "what is overdue" had nothing to
 *                  answer from.
 *   the ceremony   venue name was sent; the START TIME never was.
 *   the schedule   was sent as a count.
 *
 * So this guard asserts the CONTEXT, not the prose: what Ava is handed is the
 * thing that was wrong, and it is the thing that can be pinned. The numbers
 * are checked against the Budget page's own computation, to the dollar.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatWeddingContext } from '../../src/lib/avaContextFormat.js';
import { VOICE_PROHIBITIONS, buildAvaPrompt } from '../../src/lib/avaRequest.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIX = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/ava-wedding.json'), 'utf8'));

/**
 * The fixture as already-fetched stores. `unavailable` names a store the
 * fetch could not return — the 5.3 path, which is unreachable from a live
 * account on purpose and is the one that produced the owner's "$0".
 */
function seeded({ drop = null } = {}) {
  return {
    guests: FIX.guests,
    budget: drop === 'budget' ? [] : FIX.budget,
    vendors: FIX.vendors,
    schedule: FIX.schedule,
    todos: FIX.todos,
    wd: FIX.weddingDetails,
    user: { full_name: 'Owner', email: 'owner@example.com' },
    unavailable: drop === 'budget' ? ['the budget expenses'] : [],
  };
}

export async function runAvaReadsTheWedding() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Ava reads the real wedding — every store, in the pages\' own fields:\n');

  const ctx = formatWeddingContext(seeded());

  // ── 1. THE CEREMONY TIME ────────────────────────────────────────────────
  check('the ceremony START TIME is in the context', /Ceremony: The Town Hall at 16:00/.test(ctx),
    (ctx.match(/Ceremony: .*/) || ['not present'])[0]);
  check('  and the reception time too', /Reception: The Apartment at 19:00/.test(ctx),
    (ctx.match(/Reception: .*/) || ['not present'])[0]);

  // ── 2. THE BUDGET, TO THE DOLLAR ────────────────────────────────────────
  //
  // Computed here the way Budget.jsx computes it, from the same fixture, and
  // compared against what the context says. If the two ever diverge, Ava and
  // the page are telling the couple different numbers, which is the failure
  // spec 5.1 exists to prevent.
  {
    const planTotal = parseFloat(FIX.weddingDetails.budget.total);                      // Budget.jsx:148
    const allocated = Object.values(FIX.weddingDetails.budget.categories)
      .reduce((s, v) => s + (parseFloat(v) || 0), 0);                                   // Budget.jsx:163-168
    const committed = FIX.budget.reduce((s, b) => s + (b.budgeted_amount || 0), 0);     // Budget.jsx:359
    const spent     = FIX.budget.reduce((s, b) => s + (b.actual_amount   || 0), 0);     // Budget.jsx:360
    const money = (n) => `$${n.toLocaleString()}`;

    check(`the PLAN total is present and matches the page: ${money(planTotal)}`,
      ctx.includes(`total wedding budget ${money(planTotal)}`), money(planTotal));
    check(`  allocations match: ${money(allocated)}`,
      ctx.includes(`allocated to categories ${money(allocated)}`), money(allocated));
    check(`  unallocated is stated rather than left to arithmetic: ${money(planTotal - allocated)}`,
      ctx.includes(`unallocated ${money(planTotal - allocated)}`), money(planTotal - allocated));
    check(`the EXPENSES committed matches: ${money(committed)}`,
      ctx.includes(`committed ${money(committed)}`), money(committed));
    check(`  and spent matches: ${money(spent)}`,
      ctx.includes(`spent ${money(spent)}`), money(spent));
    check('  paid and unpaid are broken out, so a deposit question has an answer',
      /of which paid \$\d/.test(ctx) && /unpaid \$\d/.test(ctx),
      (ctx.match(/of which paid.*/) || ['absent'])[0]);
    check('the two stores are named as two, with an instruction not to add them',
      /Never add them together/.test(ctx), 'spec 5.1');
    check('NO ZERO ANYWHERE IN THE BUDGET BLOCK — the reported symptom',
      !/total wedding budget \$0\b/.test(ctx) && !/spent \$0\b/.test(ctx), 'no $0');
  }

  // ── 3. VENDORS, WITH DEPOSITS, BOTH STATES ──────────────────────────────
  check('a vendor with a PAID deposit says so',
    /Golden Hour Photography \(photography\) — booked, deposit \$2,000 PAID/.test(ctx),
    (ctx.match(/Golden Hour.*/) || ['absent'])[0]);
  check('  and one with an UNPAID deposit says so',
    /Fleur & Stem \(flowers\) — quoted, deposit \$900 NOT paid/.test(ctx),
    (ctx.match(/Fleur.*/) || ['absent'])[0]);

  // ── 4. OVERDUE TO-DOS, WITH THEIR DATES ─────────────────────────────────
  check('the overdue to-do is present, by name and by date',
    /OVERDUE \(1\)/.test(ctx) && /Confirm florist final count — due 2020-01-05/.test(ctx),
    (ctx.match(/Confirm florist.*/) || ['absent'])[0]);
  check('  a future item is not called overdue',
    !/Choose first dance — due 2030-01-01[\s\S]{0,40}OVERDUE/.test(ctx)
      && ctx.includes('Choose first dance'), 'listed as open, not overdue');
  check('  a completed item is not counted as open',
    /TO-DO LIST \(2 open of 3\)/.test(ctx), (ctx.match(/TO-DO LIST.*/) || ['absent'])[0]);

  // ── 5. THE SCHEDULE AND THE WEBSITE ─────────────────────────────────────
  check('the schedule is items, not a count',
    /Rehearsal dinner — 2027-06-11 19:00, The Apartment/.test(ctx),
    (ctx.match(/Rehearsal.*/) || ['absent'])[0]);
  check('the published state of the website is in the context',
    /WEBSITE: published at \/w\/theo-and-larissa/.test(ctx),
    (ctx.match(/WEBSITE:.*/) || ['absent'])[0]);

  // ── 6. THE POPULATION BEHIND THE NUMBER (spec 5.1) ──────────────────────
  check('guest totals state the population, in the canonical form',
    /people, which is \d+ guests plus \d+ plus ones/.test(ctx),
    (ctx.match(/canonical form is ".*"/) || ['absent'])[0]);

  // ── 7. AN UNLOADED STORE IS NOT AN EMPTY ONE (spec 5.3) ─────────────────
  {
    const broken = formatWeddingContext(seeded({ drop: 'budget' }));
    check('a budget store that fails to load is reported as UNAVAILABLE',
      /CANNOT BE SEEN RIGHT NOW: the budget expenses/.test(broken),
      (broken.match(/CANNOT BE SEEN.*/) || ['absent'])[0].slice(0, 70));
    check('  and Ava is told not to answer as though it were empty',
      /never answer as though the missing part were empty or zero/.test(broken), 'stated in the context');
    check('  while a healthy run says nothing of the kind',
      !/CANNOT BE SEEN RIGHT NOW/.test(ctx), 'absent when every store loads');

    // PLANT: the old behaviour — a rejected store collapsing to [].
    const collapsed = broken.replace(/\nCANNOT BE SEEN RIGHT NOW[\s\S]*$/, '');
    check('PLANT: with the unavailable line removed, the budget reads as real zeros',
      /committed \$0, spent \$0/.test(collapsed) && !/CANNOT BE SEEN/.test(collapsed),
      'exactly the "$0 with $0 spent" the owner was told');
  }

  // ── 8. THE VOICE PROHIBITIONS ───────────────────────────────────────────
  {
    const prompt = buildAvaPrompt({ weddingContext: ctx, userText: 'can you recommend a florist' });
    check('the prompt forbids recommending a named vendor (spec section 7)',
      /NEVER RECOMMEND A NAMED VENDOR/.test(prompt), 'present');
    check('  and offers the thing Ava can do instead',
      /compare the ones already saved in their vendor list/.test(VOICE_PROHIBITIONS), 'compare, not recommend');
    check('the prompt forbids raising heritage, religion or ethnicity unprompted',
      /NEVER RAISE THE COUPLE'S HERITAGE, RELIGION, CULTURE OR ETHNICITY/.test(prompt), 'present');
    check('  and says why the fields are in the context at all',
      /so you can answer WHEN ASKED/.test(VOICE_PROHIBITIONS), 'available, not volunteered');
    check('no percentages (spec 5.2) is stated in the prompt',
      /NEVER GIVE A PERCENTAGE/.test(prompt), 'present');
    check('  and the context itself no longer computes one',
      !/Math\.round\(spent \/ totalBudget \* 100\)/.test(readFileSync(join(ROOT, 'src/lib/avaContext.js'), 'utf8')),
      'the old budget line printed a percentage');
  }

  return results;
}

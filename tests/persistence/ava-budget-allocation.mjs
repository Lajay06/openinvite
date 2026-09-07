/**
 * tests/persistence/ava-budget-allocation.mjs
 *
 * "SET THE FLOWERS ALLOCATION TO $3,500" DOES IT.
 *
 * The owner asked for exactly that and got "here is the proposal to update
 * that allocation" — a sentence promising a thing, with no button under it and
 * nothing behind it. Two independent defects, and either alone reproduces the
 * report:
 *
 *   (a) THE OFFER SURVIVED WITHOUT A BACKING ACTION. avaOfferFilter drops any
 *       offer sentence no mirror action backs, and it never looked at this one:
 *       OFFER_RE holds verb forms ("want me to", "I can") and the sentence is a
 *       noun form. isOffer() said false, so the filter passed it through
 *       untouched, and the prose promised what the product could not do.
 *
 *   (b) THERE WAS NO ACTION TO BACK IT WITH. A plan allocation lives at
 *       WeddingDetails.budget.categories.<key> — three levels down, and an
 *       encrypted column. validateAvaAction checks TOP-LEVEL fields, said so at
 *       its own site, and avaExecute.js said the plan write "waits for the
 *       validator to grow rather than slipping past it". This is that growth.
 *
 * WHY THE TOP-LEVEL CHECK CANNOT COVER IT, stated because it is the reason the
 * allowlist exists: `budget` IS a declared WeddingDetails field. An object with
 * a misspelled category key inside passes every check in validateAvaAction and
 * is stored intact. Nothing refuses it and nothing reads it — success toast,
 * unchanged Budget page. Exactly the class avaActionValidation.js was written
 * about, one level deeper.
 */
import { pass, fail } from './_shared.mjs';
import { executeAvaAction, ACTION_ENTITY } from '../../src/lib/avaExecute.js';
import { validateNestedWrite, NESTED_WRITE_PATHS } from '../../src/lib/avaActionValidation.js';
import { isOffer, resolveOffer, filterUnbackedOffers } from '../../src/lib/avaOfferFilter.js';
import { ACTION_MIRROR, ACTION_FIELD_RULES } from '../../src/lib/avaRequest.js';
import { BUDGET_CATEGORY_KEYS } from '../../src/lib/budgetCategories.js';
import { POD_EXCLUDED_TYPES } from '../../src/lib/avaExecute.js';

const PATH = 'WeddingDetails.budget.categories';

/** The couple's saved plan, as /api/my-wedding-details returns it decrypted. */
const PLAN = () => ({
  budget: {
    total: 40000,
    categories: { venue: 15000, catering: 9000, photography: 4000, flowers: 1200, music: 2000 },
  },
});

async function setAllocation(data, { wd = PLAN() } = {}) {
  const puts = [];
  const deps = {
    readWeddingDetails: async () => wd,
    putWeddingFields: async (fields) => { puts.push(fields); return 'wd1'; },
  };
  try {
    const out = await executeAvaAction({ type: 'set_budget_allocation', data }, deps);
    return { ...out, puts };
  } catch (err) {
    return { ok: false, threw: err.message, error: null, puts };
  }
}

export async function runAvaBudgetAllocation() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Setting a budget allocation is a real action:\n');

  // ── (a) THE OFFER SENTENCE ──────────────────────────────────────────────
  {
    const SAID = 'Here is the proposal to update that allocation.';
    check('PLANT: "here is the proposal…" is recognized as an offer',
      isOffer(SAID) === true, 'a noun-form offer, which OFFER_RE could not see');
    check('  and "proposal to" on its own too',
      isOffer('A proposal to raise the flowers budget:') === true, 'both forms the owner saw');
    check('  while perception is still not an offer',
      isOffer('I can see nine guests without an email.') === false, 'the filter must not eat her best sentences');
    check('  and a plain answer is still a plain answer',
      isOffer('Here is the timeline you asked for.') === false, 'no proposal noun, no offer');

    // The point of recognizing it: it now resolves to a real action instead of
    // being deleted as unbacked.
    const said = 'Here is the proposal to set your flowers allocation to $3,500.';
    check('PLANT: the offer now RESOLVES to set_budget_allocation',
      resolveOffer(said)?.type === 'set_budget_allocation', resolveOffer(said)?.type || 'nothing');
    check('  so the filter keeps it rather than deleting it',
      filterUnbackedOffers(said).removed.length === 0 && filterUnbackedOffers(said).kept.length === 1,
      'a backed offer is exactly the sentence that is allowed to stand');
    const unbacked = 'Here is the proposal to book your venue for you.';
    check('  and an offer with no action behind it is still removed',
      filterUnbackedOffers(unbacked).removed.length === 1, 'recognizing more offers must not back more of them');
  }

  // ── (b) THE ACTION ITSELF ───────────────────────────────────────────────
  {
    const r = await setAllocation({ category: 'flowers', amount: 3500 });
    check('PLANT: the flowers allocation is written',
      r.ok === true && r.puts.length === 1, r.ok ? 'one write' : (r.error || r.threw));
    const written = r.puts[0]?.budget;
    check('  at budget.categories.flowers',
      written?.categories?.flowers === 3500, JSON.stringify(written?.categories?.flowers));
    check('  and the other twelve categories survive the write',
      written?.categories?.venue === 15000 && written?.categories?.catering === 9000
        && Object.keys(written?.categories || {}).length === 5,
      'the plan is one encrypted column — writing only the changed key would erase the rest');
    check('  and the total is carried through untouched',
      written?.total === 40000, String(written?.total));

    // What the Budget page computes from it (Budget.jsx:154), recomputed here
    // from the written object rather than asserted from memory.
    const allocatedBefore = Object.values(PLAN().budget.categories).reduce((s, v) => s + v, 0);
    const allocatedAfter = Object.values(written.categories).reduce((s, v) => s + v, 0);
    check('  Allocated moves by exactly the change, and Unallocated with it',
      allocatedAfter - allocatedBefore === 3500 - 1200
        && (written.total - allocatedAfter) === (40000 - allocatedAfter),
      `allocated ${allocatedBefore} → ${allocatedAfter}, unallocated ${written.total - allocatedAfter}`);
  }

  // ── THE THREE REFUSALS THE OWNER NAMED ──────────────────────────────────
  {
    const unknown = await setAllocation({ category: 'unicorns', amount: 3500 });
    check('PLANT: an unknown category is refused, by name',
      unknown.ok === false && /not one of your budget categories/.test(unknown.error || '')
        && unknown.puts.length === 0,
      unknown.error || unknown.threw);

    const negative = await setAllocation({ category: 'flowers', amount: -500 });
    check('PLANT: a negative amount is refused',
      negative.ok === false && /cannot be negative/.test(negative.error || '') && negative.puts.length === 0,
      negative.error || negative.threw);

    check('PLANT: a nested path outside the allowlist is refused',
      validateNestedWrite('WeddingDetails.assetContent.hero', 'image', 1).ok === false
        && validateNestedWrite('Guest.meta.secret', 'x', 1).ok === false,
      'fail closed — an undeclared path is not a path');
    check('  and the allowlist holds exactly one path today',
      Object.keys(NESTED_WRITE_PATHS).length === 1 && NESTED_WRITE_PATHS[PATH],
      Object.keys(NESTED_WRITE_PATHS).join(', '));
  }

  // ── THE LEAF RULE ───────────────────────────────────────────────────────
  {
    check('cents are refused — an allocation is a whole amount',
      (await setAllocation({ category: 'flowers', amount: 1250.75 })).ok === false, 'no partial dollars');
    check('a value that is not a number at all is refused',
      (await setAllocation({ category: 'flowers', amount: 'lots' })).ok === false, 'NaN is not a budget');
    check('but "$3,500" from the model is read as 3500',
      (await setAllocation({ category: 'flowers', amount: '$3,500' })).puts[0]?.budget?.categories?.flowers === 3500,
      'coerced before the rule runs, so the rule stays strict');
    check('zero is allowed — a couple may zero a category',
      (await setAllocation({ category: 'flowers', amount: 0 })).puts[0]?.budget?.categories?.flowers === 0,
      'non-negative, not positive');
  }

  // ── THE CATEGORY LIST HAS ONE OWNER ─────────────────────────────────────
  check('the allowed keys ARE the Budget page\'s own thirteen',
    NESTED_WRITE_PATHS[PATH].keyIn === BUDGET_CATEGORY_KEYS && BUDGET_CATEGORY_KEYS.length === 13,
    'a category the form does not offer cannot be set from a chat window either');
  check('  and every one of them is settable',
    (await Promise.all(BUDGET_CATEGORY_KEYS.map(k => setAllocation({ category: k, amount: 100 }))))
      .every(r => r.ok), 'all thirteen');

  // ── THE ACTION IS IN BOTH FRAMES ────────────────────────────────────────
  check('set_budget_allocation is in the mirror',
    ACTION_MIRROR.some(a => a.type === 'set_budget_allocation'), 'the modal can propose it');
  check('  and the pod is not excluded from it',
    !POD_EXCLUDED_TYPES.includes('set_budget_allocation'),
    'the pod mirror is ACTION_MIRROR minus guest edits — this is not a guest edit');
  check('  it has an executor',
    ACTION_ENTITY.set_budget_allocation === 'WeddingDetails', ACTION_ENTITY.set_budget_allocation);
  check('  and the prompt names the thirteen categories it may use',
    BUDGET_CATEGORY_KEYS.every(k => ACTION_FIELD_RULES.set_budget_allocation.includes(k)),
    'a model told the field but not the values invents them');

  // ── A MISSING READER REFUSES RATHER THAN ERASING THE PLAN ───────────────
  {
    const r = await setAllocation({ category: 'flowers', amount: 3500 }, { wd: null });
    check('an unreadable plan refuses rather than writing a plan of one key',
      r.ok === false && r.puts.length === 0 && /could not read/.test(r.error || ''),
      r.error || r.threw);
  }

  return results;
}

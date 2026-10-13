/**
 * tests/persistence/plan-features-one-source.mjs
 *
 * THE PLAN FEATURE LISTS ARE READ, NEVER RETYPED.
 *
 * ── WHAT WENT WRONG ───────────────────────────────────────────────────────
 *
 * src/lib/planFeatures.js exists precisely so the pricing page and the upgrade
 * emails cannot disagree, and its own header says so: "one array, read from
 * both places, so they can never drift apart again". Then a third surface,
 * Account > Billing, typed the lists out instead of importing them, and drifted
 * exactly as predicted. On a gifted Ultra account the owner found, in one card:
 *
 *   · a retired builder name the vocabulary guard bars
 *   · eleven universe styles, against a pricing page saying twenty
 *   · an invitations line naming the channel removed in batch 1 item 12b
 *   · an em dash, barred by the 2026-09-28 ruling
 *
 * Four errors, none of them a mistake anyone made twice: they are what a copied
 * list becomes when the original moves on.
 *
 * ── WHY THIS GUARD IS SHAPED THIS WAY ─────────────────────────────────────
 *
 * It asserts the SHAPE, not the words. Pinning the strings would mean editing
 * this file every time the owner rewords a feature, which trains people to edit
 * guards rather than to read them. What it holds is: the module is the only
 * place these lists are written, every surface imports it, and no surface
 * declares its own array of feature strings.
 */

import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { TRIAL_FEATURES, PRO_FEATURES, ULTRA_EXTRAS } from '../../src/lib/planFeatures.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

/** Every surface that shows a plan's feature list to a person. */
const SURFACES = ['src/pages/Account.jsx', 'src/pages/Pricing.jsx'];

export async function runPlanFeaturesOneSource() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. THE MODULE HOLDS ALL THREE ───────────────────────────────────────
  ok('the module exports a list for each plan',
     Array.isArray(TRIAL_FEATURES) && Array.isArray(PRO_FEATURES) && Array.isArray(ULTRA_EXTRAS)
       && TRIAL_FEATURES.length > 0 && PRO_FEATURES.length > 0 && ULTRA_EXTRAS.length > 0,
     `${TRIAL_FEATURES.length} / ${PRO_FEATURES.length} / ${ULTRA_EXTRAS.length}`);

  // ── 2. EVERY SURFACE IMPORTS, NONE RETYPES ──────────────────────────────
  for (const surface of SURFACES) {
    const src = read(surface);
    const short = surface.split('/').pop();
    ok(`${short} imports the lists`,
       /from ['"]@\/lib\/planFeatures['"]/.test(src), 'planFeatures');

    // A LOCAL ARRAY OF FEATURE-LOOKING STRINGS IS THE DRIFT ITSELF. Four or
    // more quoted lines in one array literal is a feature list by any other
    // name, and that is what Account.jsx held.
    const retyped = [...src.matchAll(/\[\s*(?:'[^']{12,}',\s*){4,}/g)].length
      + [...src.matchAll(/\[\s*(?:"[^"]{12,}",\s*){4,}/g)].length;
    ok(`  and declares no feature list of its own`, retyped === 0, `${retyped} local list(s)`);
  }

  // ── 3. THE FOUR DRIFTED CLAIMS ARE GONE FROM THE SURFACES ───────────────
  //
  // These check the FACTS the owner found wrong, not anyone's wording: the
  // count must not contradict the pricing page, and a removed channel must not
  // be advertised. Comments are included deliberately, because a surface that
  // still says "11 universe styles" anywhere is a surface someone will copy.
  const account = read('src/pages/Account.jsx');
  ok('no surface claims eleven universe styles',
     !/11 universe styles/.test(account), 'gone');
  ok('  nor advertises the removed invitation channel as a feature',
     !/invitations via email & WhatsApp/i.test(account), 'gone');
  ok('  and the lists carry no em or en dash',
     ![...TRIAL_FEATURES, ...PRO_FEATURES, ...ULTRA_EXTRAS]
       .some((f) => f.includes('—') || f.includes('–')),
     'none');

  // ── 4. THE MODULE ITSELF STAYS TRUTHFUL ─────────────────────────────────
  //
  // Its own header says nothing here should ever name a feature the product
  // does not have. The removed channel is the one that has already been named
  // once, so it is the one worth holding.
  ok('the module names no WhatsApp channel',
     ![...TRIAL_FEATURES, ...PRO_FEATURES, ...ULTRA_EXTRAS].some((f) => /whatsapp/i.test(f)),
     'email only');
  ok('  and the universe count it states is twenty',
     ULTRA_EXTRAS.some((f) => /\b20\b/.test(f)) && !ULTRA_EXTRAS.some((f) => /\b11\b/.test(f)),
     'twenty');

  // ── 5. ULTRA IS BUILT AS PRO PLUS THE EXTRAS ────────────────────────────
  ok('Account builds Ultra from Pro plus the extras, rather than restating Pro',
     /ultra: \['Everything in Pro', \.\.\.ULTRA_EXTRAS\]/.test(account),
     'additive');
  ok('  and takes trial and Pro straight from the module',
     /free: TRIAL_FEATURES/.test(account) && /pro: PRO_FEATURES/.test(account),
     'no local copy');

  return results;
}

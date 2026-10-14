#!/usr/bin/env node
/* global document */
/**
 * scripts/test-billing-states.mjs
 *
 * ACCOUNT > BILLING HAS FOUR STATES, AND EACH ONE IS RENDERED AND MEASURED.
 *
 * ── WHY FOUR, AND WHY THE CUSTOMER ID DECIDES FIRST ───────────────────────
 *
 * Owner rulings 2026-10-13:
 *
 *   stripeCustomerId exists   Manage billing, WHATEVER planSource says. A
 *                             gifted account that later buys something has a
 *                             customer and must be able to manage it, so the id
 *                             wins over the source.
 *   absent, source gift       "Your plan was a gift, so there is nothing to
 *                             bill."                              no button
 *   absent, source comp       "There is nothing to bill on this plan."
 *                                                                 no button
 *   absent, source absent     the billing@ line                   no button
 *
 * THE FOURTH IS NOT A GUESS ABOUT HOW THE PLAN ARRIVED. planSource has no
 * default, so absence reads as unknown and the line says nothing about origin.
 * Inferring "gift" from a missing field would have told all three paying
 * accounts their plan was a gift, which is the bug the field exists to prevent.
 *
 * ── WHY A BROWSER GUARD AND NOT A UNIT TEST ───────────────────────────────
 *
 * The thing being checked is what a person sees: which of four lines is on
 * screen, and whether a button is there. A unit test on a predicate would pass
 * with the JSX wired to the wrong branch. This renders /account with four
 * different fixture users and reads the painted result.
 */

import { chromium } from 'playwright';
import { seededContext, SEED, FIXTURE_USER } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const SHOT_DIR = process.env.BILLING_SHOTS || '/tmp/billing-states';

const GIFT_LINE = 'Your plan was a gift, so there is nothing to bill.';
const COMP_LINE = 'There is nothing to bill on this plan.';
const UNKNOWN_FRAGMENT = 'Questions about billing?';
const BILLING_ADDRESS = 'billing@openinvite.com.au';

/** The four, named as the owner named them. */
const STATES = [
  { key: 'customer', user: { ...FIXTURE_USER, stripeCustomerId: 'cus_guardfixture' },
    wantButton: true, wantLine: null },
  { key: 'gift', user: { ...FIXTURE_USER, planSource: 'gift' },
    wantButton: false, wantLine: GIFT_LINE },
  { key: 'comp', user: { ...FIXTURE_USER, planSource: 'comp' },
    wantButton: false, wantLine: COMP_LINE },
  { key: 'unknown', user: { ...FIXTURE_USER },
    wantButton: false, wantLine: UNKNOWN_FRAGMENT },
];

// A GIFTED ACCOUNT THAT LATER PAID. The id must win over the source, and this
// is the row that would break if the conditions were nested the other way.
STATES.push({
  key: 'gift-with-customer',
  user: { ...FIXTURE_USER, planSource: 'gift', stripeCustomerId: 'cus_guardfixture' },
  wantButton: true, wantLine: null,
});

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

console.log('\n  Account > Billing, four states at two widths:\n');

const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    for (const state of STATES) {
      const ctx = await seededContext(browser, { width, height: 1100, seed: SEED, user: state.user });
      const page = await ctx.newPage();
      // ?tab=billing DEEP-LINKS straight to the card. Landing on /account shows
      // the Settings tab, where none of this exists, which is how the first run
      // of this guard reported every state missing.
      await page.goto(`${BASE}/account?tab=billing`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(3500);

      const seen = await page.evaluate(() => {
        const note = document.querySelector('[data-billing-note]');
        const buttons = [...document.querySelectorAll('a, button')]
          .filter((el) => /Manage billing/i.test(el.textContent || ''));
        const mailtos = [...document.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href'));
        return {
          note: note ? (note.innerText || '').trim() : null,
          button: buttons.length,
          mailtos,
          body: document.body ? (document.body.innerText || '') : '',
        };
      });

      await page.screenshot({ path: `${SHOT_DIR}/${state.key}-${width}.png`, fullPage: false }).catch(() => {});

      const label = `${state.key} @ ${width}`;
      if (state.wantButton) {
        check(`${label}: Manage billing is shown`, seen.button === 1, `${seen.button} button(s)`);
        check(`  ${label}: and no nothing-to-bill note`, seen.note === null, seen.note ? `note: ${seen.note}` : 'no note');
      } else {
        check(`${label}: no Manage billing button`, seen.button === 0, `${seen.button} button(s)`);
        check(`  ${label}: the line is the one for this state`,
          !!seen.note && seen.note.includes(state.wantLine), seen.note || 'no note');
      }

      // THE OWNER'S PERSONAL MAILBOX IS NEVER IN CUSTOMER-FACING UI.
      check(`  ${label}: no lajay@ anywhere on the page`,
        !/lajay@openinvite/.test(seen.body) && !seen.mailtos.some((h) => /lajay@openinvite/.test(h)),
        'absent');

      if (state.key === 'unknown') {
        check(`  ${label}: the billing address is a mailto link`,
          seen.mailtos.some((h) => h.includes(BILLING_ADDRESS)), 'mailto billing@');
      }

      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} ${failed ? `— ${failed} FAILED` : 'ALL PASS'}`);
console.log(`  screenshots in ${SHOT_DIR}\n`);
process.exit(failed ? 1 : 0);

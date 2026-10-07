/* global document, window */
/**
 * ONE LINK, THREE PEOPLE, ON A PHONE.
 *
 * Item 8 of goals/2026-10-07-households-and-children.md asks for the RSVP form
 * with three members measured at 390. The form ships in #907 and the read that
 * fills it is held with #908, so the household arrives from the harness stub
 * in the shape api/rsvp-lookup.js returns it (renderHarness's HOUSEHOLD_ROWS).
 * When the held half merges, the same rows come from Base44 instead.
 *
 * ── WHY A BROWSER AND NOT A PROPERTY CHECK ─────────────────────────────────
 *
 * src/lib/householdRsvp.js is asserted forty-four ways in
 * tests/persistence/household-rsvp-form.mjs. None of that can show whether the
 * PAGE draws a block per member, whether the child is marked, whether a
 * three-person form fits a phone, or whether the submit a guest can actually
 * press is the one the rule says it should be. That is what this reads.
 *
 * ── THE FIXTURE, AND WHAT EACH PART MAKES POSSIBLE ─────────────────────────
 *
 *   Priya   the lead, is_you, with a plus-one, so her cards carry the one
 *           control the members' must not
 *   Dev     an adult member, two events
 *   Mina    a child, invited to the ceremony only, so the per-member event
 *           rule is visible as one card against the adults' two
 *
 * ── THE FLOW ───────────────────────────────────────────────────────────────
 *
 * The page opens on the one question it exists to ask, and commits on the tap.
 * So the walk is: tap "Yes, I will be there", then read the details form.
 * Everything below is asserted on that form.
 */
import { chromium } from 'playwright';
import { seededContext, HOUSEHOLD_TOKEN } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4232';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** Opens the lead's link and taps through to the details form. */
async function openDetails(ctx) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.goto(`${BASE}/rsvp/${HOUSEHOLD_TOKEN}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    .catch(() => {});
  await page.waitForTimeout(6000);
  const tapped = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find((x) => /Yes, I will be there/i.test(x.innerText || ''));
    if (!b) return false;
    b.click();
    return true;
  });
  await page.waitForTimeout(4000);
  return { page, errors, tapped };
}

/** What the details form painted. */
function readForm() {
  const text = (document.body.innerText || '').replace(/\s+/g, ' ');
  const names = ['Priya Patel', 'Dev Patel', 'Mina Patel'];
  const plusOnes = [...document.querySelectorAll('input[id^="plusone-"]')]
    .map((el) => el.getAttribute('id'));
  const submit = [...document.querySelectorAll('button[type="submit"]')]
    .find((b) => /send|submit|save|confirm|reply/i.test(b.innerText || ''))
    || [...document.querySelectorAll('button[type="submit"]')][0];
  return {
    text,
    present: names.filter((n) => text.includes(n)),
    order: names.map((n) => text.indexOf(n)),
    child: /\bChild\b/.test(text),
    // THE AGE IS THE COUPLE'S OWN NOTE. Not "6 is absent" — the date and the
    // table numbers carry digits — but "no age is attached to a child".
    agedChild: /Child,\s*\d/.test(text) || /\bage\b/i.test(text),
    plusOnes,
    stillToAnswer: /Still to answer:/.test(text),
    stillNames: (text.match(/Still to answer: ([^.]*)\./) || [])[1] || '',
    submitDisabled: submit ? submit.disabled : null,
    submitLabel: submit ? (submit.innerText || '').trim().slice(0, 40) : null,
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      - window.innerWidth,
  };
}

const browser = await chromium.launch();

for (const [w, h] of [[390, 844], [1440, 950]]) {
  console.log(`\n  ${w}px:`);
  const ctx = await seededContext(browser, { width: w, height: h });
  const { page, errors, tapped } = await openDetails(ctx);

  check('  the lead\'s link rendered and the first question could be answered', tapped,
    tapped ? 'tapped yes' : 'no primary button');
  check('  no page error behind it', errors.length === 0, errors.join(' | ') || 'none');

  const form = await page.evaluate(readForm);

  check('  every member of the household is on the form', form.present.length === 3,
    form.present.join(', ') || 'none of them');
  check('  the holder is first, then the rest',
    form.order[0] >= 0 && form.order[0] < form.order[1] && form.order[1] < form.order[2],
    form.order.join(' < '));
  check('  the child is marked as one', form.child, form.child ? 'Child' : 'MISSING');
  check('  and no age is shown to a guest', !form.agedChild,
    form.agedChild ? 'AN AGE IS ON THE PAGE' : 'no age');

  // PLUS-ONE CONTROLS ONLY ON THE LEAD. Her two events carry one each; the
  // members' cards carry none, and the ids say which is which.
  const memberPlusOnes = form.plusOnes.filter((id) => /plusone-hh-ref/.test(id));
  check('  the lead has a plus-one control', form.plusOnes.length > 0,
    form.plusOnes.join(', ') || 'none at all');
  check('  and no member has one', memberPlusOnes.length === 0,
    memberPlusOnes.join(', ') || 'none');
  check('  with one control id per event, never two the same',
    new Set(form.plusOnes).size === form.plusOnes.length, `${form.plusOnes.length} unique`);

  // THE BUTTON SAYS WHO IT IS WAITING FOR, and a disabled button with no
  // reason beside it is the same as a broken one.
  check('  the submit is held until the household has answered', form.submitDisabled === true,
    `disabled=${form.submitDisabled}`);
  check('  and it names who is still to answer', form.stillToAnswer,
    form.stillNames || 'MISSING');
  check('    by name, both of them',
    /Dev Patel/.test(form.stillNames) && /Mina Patel/.test(form.stillNames),
    form.stillNames || 'none');

  check('  the three-member form does not overflow the width', form.overflow <= 1,
    form.overflow > 1 ? `+${form.overflow}px` : 'none');

  // ── AND IT OPENS ONCE EVERYONE HAS AN ANSWER ────────────────────────────
  //
  // The control case for the two checks above: a submit that is disabled
  // forever would pass them both.
  await page.evaluate(() => {
    for (const b of [...document.querySelectorAll('button')]) {
      if ((b.innerText || '').trim() === 'Attending') b.click();
    }
  });
  await page.waitForTimeout(1500);
  const answered = await page.evaluate(readForm);
  check('  once every member is answered the submit opens', answered.submitDisabled === false,
    `disabled=${answered.submitDisabled}`);
  check('    and nobody is left to answer', !answered.stillToAnswer,
    answered.stillNames || 'none');
  check('    with the form still inside the width', answered.overflow <= 1,
    answered.overflow > 1 ? `+${answered.overflow}px` : 'none');

  await page.close();
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

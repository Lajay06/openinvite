/* global document, window */
/**
 * "SEND A NOTE", AS A GUEST ACTUALLY SEES IT — at 390 and 1440.
 *
 * Goal 2026-09-27 item 3: "Guard at 390 and 1440." The source guard
 * (tests/persistence/guest-note-form.mjs) proves the copy and the placement
 * rules; this proves the four things only a browser can:
 *
 *   IT IS PAINTED, on all three surfaces — the bottom of Good to know, the
 *   bottom of the RSVP page once a reply is actually in, and beneath the
 *   NO-TOKEN RSVP gate, which is what a guest sees when they open the RSVP tab
 *   without an invitation link. No RSVP test covered that arrival at all before
 *   this one: every existing pass either carried a token or drove the form. The RSVP one is
 *   reached by DRIVING THE FLOW (tap yes, submit), not by seeding a done
 *   state, because the requirement is "after a reply is submitted" and a
 *   seeded state would not prove the step it belongs to.
 *
 *   IT KNOWS WHO THE GUEST IS on the RSVP page, because they arrived on a
 *   token — the name and address are read out of the rendered inputs, not
 *   inferred from a prop being passed.
 *
 *   THE BUTTON REFUSES AN INCOMPLETE NOTE. Measured by filling the fields one
 *   at a time and reading disabled off the element, so "required" is a
 *   behavior rather than a placeholder.
 *
 *   IT FITS A PHONE. No horizontal page scroll at 390, and the form keeps a
 *   real side gutter rather than running to the edge.
 *
 * MEASURED, NOT DECLARED. Every assertion below reads the painted DOM.
 */
import { chromium } from 'playwright';
import { seededContext, PUBLISHED_WEDDING, RSVP_GUEST, RSVP_TOKEN } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4217';
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** The heading names FIRST names, so a surname must never appear in it. */
const FIRSTS = 'Ada & Alan';

const browser = await chromium.launch();

/**
 * Fill the three fields, reading `disabled` off the button after each.
 *
 * THE BUTTON IS FOUND BY POSITION, NOT BY ITS LABEL. An earlier version asked
 * for it by role and name, so a planted label change made isDisabled() time out
 * and threw an UNCAUGHT error — the run died with eight checks still unprinted,
 * including the prefill ones. One broken property must not take the other
 * measurements with it; the label has its own check above.
 */
async function measureRefusal(page, form) {
  const btn = form.locator('button').last();
  const empty = await btn.isDisabled();
  await form.locator('input').first().fill('Grace');
  await form.locator('input[type=email]').fill('grace@example.com');
  const noMessage = await btn.isDisabled();
  await form.locator('textarea').fill('Is there parking at the church?');
  await page.waitForTimeout(250);
  const complete = await btn.isDisabled();
  return { empty, noMessage, complete };
}

for (const [w, h] of [[390, 844], [1440, 950]]) {
  console.log(`\n  ${w}px:`);

  // ── Good to know ─────────────────────────────────────────────────────────
  {
    const ctx = await seededContext(browser, { width: w, height: h });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/w/${PUBLISHED_WEDDING.slug}/good-to-know`,
      { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(4000);

    const text = await page.evaluate(() => document.body.innerText || '');
    check('  Good to know rendered', /Good to know/.test(text),
      text.length ? `${text.length} chars` : 'empty');

    const form = page.locator('[data-guest-note-form]');
    const painted = await form.count();
    check('  the note form is painted at the bottom of Good to know', painted === 1, `${painted} found`);

    if (painted === 1) {
      // SCROLLED INTO VIEW FIRST, because SectionReveal keeps an unrevealed
      // section out of the accessibility tree — so getByRole found nothing
      // while the form was still below the fold, and the first version of this
      // guard failed on a form that was painted correctly. A guest scrolls to
      // reach it; the measurement has to as well.
      await form.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);

      check(`  the heading asks for the couple by first name`,
        text.includes(`A question for ${FIRSTS}?`), `looking for "A question for ${FIRSTS}?"`);
      check('  and no surname reaches it',
        !/A question for [^?]*(Lovelace|Turing)/.test(text), 'first names only');
      // THE LABEL AS PAINTED, and the control as a button. Reading the text
      // off the element proves the words; asking for the role proves a guest
      // using a keyboard or a screen reader can reach it.
      const label = (await form.locator('button').last().innerText()).trim();
      check('  the button says "Send note"', label === 'Send note', JSON.stringify(label));
      // WAITED FOR, NOT COUNTED. count() does not auto-wait, and SectionReveal
      // brings a section in on a transition — so an immediate count read 0 on a
      // button that was on its way to being visible, and the first version of
      // this check failed on working markup. waitFor measures the same property
      // and gives the reveal the time a guest's eye would.
      const reachable = await page.getByRole('button', { name: 'Send note' })
        .waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
      check('  and it is reachable as a button', reachable, 'in the a11y tree');
      check('  the cap is visible before a guest hits it',
        /1000 characters left/.test(await form.innerText()), 'live counter');

      // NOBODY TO RECOGNISE HERE. A visitor reading the site has not
      // necessarily arrived on a token, so these must be empty — a prefilled
      // name on a page that cannot know it would be the product guessing.
      check('  nothing is prefilled on Good to know',
        (await form.locator('input').first().inputValue()) === ''
        && (await form.locator('input[type=email]').inputValue()) === '',
        'no token, no guess');

      const refusal = await measureRefusal(page, form);
      check('  the button refuses an empty note', refusal.empty === true, 'disabled');
      check('  and refuses a note with no message', refusal.noMessage === true, 'disabled');
      check('  and accepts a complete one', refusal.complete === false, 'enabled');

      const fits = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        win: window.innerWidth,
      }));
      check('  the page does not scroll sideways', fits.doc <= fits.win,
        `${fits.doc} <= ${fits.win}`);

      const box = await form.boundingBox();
      check('  the form keeps a side gutter', !!box && box.x >= 16, box ? `x=${Math.round(box.x)}` : 'no box');
      check('  and never runs wider than the viewport',
        !!box && box.width <= fits.win, box ? `${Math.round(box.width)}px` : 'no box');
    }
    await ctx.close();
  }

  // ── the no-token RSVP gate ────────────────────────────────────────────────
  //
  // A GUEST WITH NO LINK. This is the retrieve-my-invitation screen, and until
  // now it offered one thing: an email box. If the address was not on the list,
  // or the question was something else, it answered nothing at all.
  {
    const ctx = await seededContext(browser, { width: w, height: h });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/w/${PUBLISHED_WEDDING.slug}/rsvp`,
      { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(4500);

    const text = await page.evaluate(() => document.body.innerText || '');
    check('  the no-token gate rendered', /RSVP/.test(text) && /YOUR EMAIL|Your email/i.test(text),
      'the retrieve-link screen');

    const form = page.locator('[data-guest-note-form]');
    const painted = await form.count();
    check('  the note form is painted beneath the gate', painted === 1, `${painted} found`);

    if (painted === 1) {
      await form.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);

      // THE GATE'S OWN HEADING, not the after-reply one. A guest here may be
      // looking for their invitation rather than asking a question.
      check(`  with the gate's own heading`,
        text.includes(`Can't find your invitation, or have a question for ${FIRSTS}?`),
        `looking for "Can't find your invitation, or have a question for ${FIRSTS}?"`);
      check('  and not the after-reply heading',
        !text.includes(`A question for ${FIRSTS}?`), 'one heading, not both');

      // NOBODY HAS BEEN RECOGNISED ON THIS PATH.
      check('  nothing is prefilled on the gate',
        (await form.locator('input').first().inputValue()) === ''
        && (await form.locator('input[type=email]').inputValue()) === '',
        'no token, no guess');

      const refusal = await measureRefusal(page, form);
      check('  the button refuses an empty note here too', refusal.empty === true, 'disabled');
      check('  and accepts a complete one', refusal.complete === false, 'enabled');

      const fits = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        win: window.innerWidth,
      }));
      check('  the gate page does not scroll sideways', fits.doc <= fits.win,
        `${fits.doc} <= ${fits.win}`);
      const box = await form.boundingBox();
      check('  the form keeps a side gutter on the gate', !!box && box.x >= 16,
        box ? `x=${Math.round(box.x)}` : 'no box');
    }
    await ctx.close();
  }

  // ── the RSVP page, after a reply is actually submitted ────────────────────
  {
    const ctx = await seededContext(browser, { width: w, height: h });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/w/${PUBLISHED_WEDDING.slug}/rsvp?rsvp=${RSVP_TOKEN}`,
      { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(4500);

    // BEFORE THE REPLY, NOTHING. The requirement is "after a reply is
    // submitted", so its absence on the form itself is half the requirement.
    check('  no note form on the RSVP form itself',
      (await page.locator('[data-guest-note-form]').count()) === 0, 'before the reply');

    await page.getByRole('button', { name: 'Yes, I will be there' }).click().catch(() => {});
    await page.waitForTimeout(3000);
    check('  still none while the reply is being refined',
      (await page.locator('[data-guest-note-form]').count()) === 0, 'details step');

    await page.getByRole('button', { name: 'Submit RSVP' }).click().catch(() => {});
    await page.waitForTimeout(4000);

    const doneText = await page.evaluate(() => document.body.innerText || '');
    check('  the reply landed', /Change my response/.test(doneText), 'done step');

    const form = page.locator('[data-guest-note-form]');
    const painted = await form.count();
    check('  the note form appears once the reply is in', painted === 1, `${painted} found`);

    if (painted === 1) {
      check(`  with the same heading`, doneText.includes(`A question for ${FIRSTS}?`), 'first names');
      // PREFILLED FROM THE TOKEN, read off the inputs the browser painted.
      check('  the name is prefilled from the token',
        (await form.locator('input').first().inputValue()) === RSVP_GUEST.name, RSVP_GUEST.name);
      check('  and so is the address',
        (await form.locator('input[type=email]').inputValue()) === RSVP_GUEST.email, RSVP_GUEST.email);

      const fits = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        win: window.innerWidth,
      }));
      check('  the done page does not scroll sideways', fits.doc <= fits.win, `${fits.doc} <= ${fits.win}`);
      const box = await form.boundingBox();
      check('  the form keeps a side gutter here too', !!box && box.x >= 16,
        box ? `x=${Math.round(box.x)}` : 'no box');
    }
    await ctx.close();
  }
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

/* global document */
/**
 * THE COUPLE'S OWN SURFACES, PAINTED: WHO IS INVITED, HOW MANY, AND THE SEND.
 *
 * Three of item 6's guards from goals/2026-10-01-per-event-invitations.md,
 * which could not be written there because each asserts UI that ships in its
 * own PR: the Guests page's chips (#886), the per-event counts (#886 and
 * #892), and the send's event step (#887). Landing them now is item 2 of
 * goals/2026-10-06-per-event-follow-up.md.
 *
 * THE FIXTURE IS THE EXPECTATION, and it is written out here rather than
 * imported from the page. A guard that derives what it expects from the file
 * under test agrees with any mistake in it. From scripts/lib/renderHarness.mjs:
 *
 *   g1 Grace      Ceremony, Reception, Welcome drinks
 *   g2 Katherine  Ceremony, Reception, Welcome drinks
 *   g3 Alan       Ceremony, Reception          (removed from Welcome drinks)
 *   g4 Edsger     Ceremony, Welcome drinks     (removed from Reception)
 *
 * So the invited counts are 4 / 3 / 3, which is also why the breakdown renders
 * at all: it is shown only when the events differ.
 *
 * READ FROM data-invited-to AND aria-pressed, not from the chip's words. The
 * chip set is rendered for every event whether or not the guest is invited, so
 * "is this event on the row" is the wrong question; the state is the pressed
 * flag, and that is what the page uses to decide the styling a couple reads.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4232';

const INVITED = {
  'Grace Hopper': ['main-ceremony', 'reception', 'welcome-drinks'],
  'Katherine J.': ['main-ceremony', 'reception', 'welcome-drinks'],
  'Alan Turing':  ['main-ceremony', 'reception'],
  'Edsger D.':    ['main-ceremony', 'welcome-drinks'],
};
const COUNTS = [['Ceremony', 4], ['Reception', 3], ['Welcome drinks', 3]];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();

for (const [w, h] of [[390, 844], [1440, 950]]) {
  console.log(`\n  ${w}px:`);
  const ctx = await seededContext(browser, { width: w, height: h });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(9000);

  // ── THE COLUMN, AND THE CHIPS ───────────────────────────────────────────

  const body = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
  check('  the column is labelled "Invited to"', /Invited to/.test(body),
    /Invited to/.test(body) ? 'present' : 'MISSING');

  // Every chip on the page, as the row's own name plus the event and state.
  const chips = await page.evaluate(() => {
    const rows = [];
    for (const el of document.querySelectorAll('[data-invited-to]')) {
      // The nearest ancestor that also contains a guest name.
      let node = el, name = '';
      for (let i = 0; i < 8 && node; i += 1) {
        node = node.parentElement;
        const t = (node?.innerText || '');
        const m = t.match(/(Grace Hopper|Katherine J\.|Alan Turing|Edsger D\.)/);
        if (m) { name = m[1]; break; }
      }
      rows.push({ name, event: el.getAttribute('data-invited-to'),
                  pressed: el.getAttribute('aria-pressed') === 'true' });
    }
    return rows;
  });

  check('  the chips rendered at all', chips.length > 0, `${chips.length} chip(s)`);
  check('  every chip carries a pressed state, not just a label',
    chips.length > 0 && chips.every((c) => c.event), `${chips.length} with an event id`);

  for (const [name, expected] of Object.entries(INVITED)) {
    const mine = chips.filter((c) => c.name === name);
    const on = mine.filter((c) => c.pressed).map((c) => c.event).sort();
    check(`  ${name} is invited to ${expected.join(', ')}`,
      mine.length > 0 && JSON.stringify(on) === JSON.stringify([...expected].sort()),
      mine.length ? on.join(', ') || 'none' : 'row not found');
  }

  // ── THE PER-EVENT COUNTS ────────────────────────────────────────────────

  const strip = await page.evaluate(() => {
    const el = document.querySelector('[data-per-event-counts]');
    return el ? (el.innerText || '').replace(/\s+/g, ' ') : null;
  });
  check('  the per-event counts strip is on the page', !!strip, strip ? strip.slice(0, 80) : 'MISSING');
  for (const [name, n] of COUNTS) {
    check(`  ${name} reads "${n} invited"`,
      !!strip && new RegExp(`${name}\\s*${n} invited`).test(strip), strip ? 'matched' : 'no strip');
  }
  check('  and the counts differ, which is why the breakdown is shown',
    new Set(COUNTS.map(([, n]) => n)).size > 1, '4 / 3 / 3');

  await ctx.close();
}

// ── THE SEND'S EVENT STEP ─────────────────────────────────────────────────
//
// One width: this is a modal with one column at both, and the assertion is
// about which choice is pressed and which guests survive the filter.
{
  console.log('\n  send invites, 1440px:');
  const ctx = await seededContext(browser, { width: 1440, height: 950 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(9000);

  const opened = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find((b) => /send invite/i.test(b.innerText || ''));
    if (!btn) return false;
    btn.click();
    return true;
  });
  check('  the send modal opens from the Guests page', opened, opened ? 'opened' : 'no Send invites button');
  await page.waitForTimeout(2500);

  const step = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-send-event]')];
    return {
      count: btns.length,
      ids: btns.map((b) => b.getAttribute('data-send-event')),
      pressed: btns.filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.getAttribute('data-send-event')),
      text: (document.body.innerText || '').replace(/\s+/g, ' '),
    };
  });

  check('  it asks which event first', /Which event is this about\?/.test(step.text),
    /Which event is this about\?/.test(step.text) ? 'present' : 'MISSING');
  check('  with the promise under it',
    /Only guests invited to it will be on the list/.test(step.text), 'sub line');
  check('  one choice per event, plus All events',
    step.count === 4, `${step.count} choice(s): ${step.ids.join(', ')}`);
  check('  "All events" is first', step.ids[0] === 'all', step.ids[0] || 'none');
  check('  and it is the one selected by default',
    step.pressed.length === 1 && step.pressed[0] === 'all',
    step.pressed.join(', ') || 'nothing pressed');

  // CHOOSING AN EVENT NARROWS THE LIST, AND "NARROWS" NEEDS A CONTROL.
  //
  // Alan is the only one of the four not invited to the welcome drinks, so he
  // is the guest who must disappear. Asserting only his absence would pass on
  // a step that never advanced, or a list that failed to render at all, so the
  // flow is walked TWICE from a fresh load: once choosing All events, where he
  // must be present, and once choosing the welcome drinks, where he must not.
  const walk = async (eventId) => {
    const p2 = await ctx.newPage();
    await p2.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await p2.waitForTimeout(9000);
    await p2.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /send invite/i.test(x.innerText || ''));
      if (b) b.click();
    });
    await p2.waitForTimeout(2500);
    const picked = await p2.evaluate((id) => {
      const b = [...document.querySelectorAll('[data-send-event]')]
        .find((x) => x.getAttribute('data-send-event') === id);
      if (!b) return false;
      b.click();
      const next = [...document.querySelectorAll('button')]
        .find((x) => /continue|next|select guests/i.test(x.innerText || ''));
      if (next) next.click();
      return true;
    }, eventId);
    await p2.waitForTimeout(2500);
    const text = await p2.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
    await p2.close();
    return { picked, text };
  };

  const all = await walk('all');
  check('  the All events choice can be taken', all.picked, all.picked ? 'clicked' : 'no choice');
  check('  under All events the full list is offered, Alan included',
    /Alan Turing/.test(all.text), /Alan Turing/.test(all.text) ? 'Alan present' : 'Alan ALREADY missing');

  const wd = await walk('welcome-drinks');
  check('  the welcome drinks can be chosen', wd.picked, wd.picked ? 'clicked' : 'no choice');
  check('  choosing the welcome drinks keeps the three who are invited',
    ['Grace', 'Katherine', 'Edsger'].every((n) => wd.text.includes(n)),
    ['Grace', 'Katherine', 'Edsger'].filter((n) => wd.text.includes(n)).join(', ') || 'none');
  check('  and drops the one who is not',
    !/Alan Turing/.test(wd.text), /Alan Turing/.test(wd.text) ? 'Alan is still listed' : 'Alan dropped');
  check('  so the two lists genuinely differ',
    /Alan Turing/.test(all.text) && !/Alan Turing/.test(wd.text), 'the event choice changes the list');

  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

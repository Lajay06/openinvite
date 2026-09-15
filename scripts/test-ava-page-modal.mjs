/* global document */
/**
 * ONE ASK AVA BUTTON, ONE PAGE MODAL — AND THE POD STAYS WHERE IT IS.
 *
 * Owner ruling, Run 4 S1: a page-level "Ask Ava to …" button opens THAT PAGE'S
 * modal, with that page's quick actions, in the middle of the screen. It is
 * independent of the bottom-right pod, which the couple opens themselves.
 *
 * ── WHAT WAS WRONG ─────────────────────────────────────────────────────────
 *
 * `AvaButton` has two behaviours in one component (AvaButton.jsx:14):
 *
 *   onClick given    the page's own <AvaModal>, with its quick actions
 *   onClick absent   openAva() -> a window event -> the Layout's pod
 *
 * Nothing at the call site says which you are getting. Six pages had taken the
 * second branch — four of them because an earlier version dispatched an event
 * nothing listened for, so the buttons had done nothing at all and were wired
 * to the pod when that was found. A couple on the polls page asking for poll
 * ideas got a general assistant in the corner with no poll actions in it.
 *
 * ── WHAT THIS MEASURES ─────────────────────────────────────────────────────
 *
 * Per page: the button exists, no dialog is open yet, the click opens a
 * role=dialog titled for THAT page, the dialog carries that page's own quick
 * actions, and `[data-ava-pod]` is still absent. The last one is why the pod
 * has a name to ask for — before it, "the pod did not open" could only be
 * guessed at from geometry.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4203';

// The quick action asserted per page is the FIRST one the page declares, and
// it is written here as a literal rather than read from the source: a guard
// that derives its expectation from the file it is testing agrees with any
// mistake in it.
const PAGES = [
  { route: '/Polls',         button: /Ask Ava to suggest poll ideas/i,        title: 'Polls',
    action: 'Suggest a few polls we could ask our guests' },
  { route: '/QandA',         button: /Ask Ava to suggest FAQ questions/i,     title: 'Questions and answers',
    action: 'What questions will our guests ask that we have not answered?' },
  { route: '/account',       button: /Ask Ava about your account or plan/i,   title: 'Account',
    action: 'What does our plan include?' },
  { route: '/event-details', button: /Ask Ava to help plan your event details/i, title: 'Event details',
    action: 'What still needs setting on our ceremony and reception?' },
];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 950 });

// ── THE CONTROL, AND WHY IT IS FIRST ───────────────────────────────────────
//
// A plant found this blind: DELETING `data-ava-pod` from the pod left the run
// fully green. Every "and the pod is untouched" check asks whether that
// selector matches nothing — and a selector that names nothing at all also
// matches nothing. The guard could not tell a closed pod from a pod with no
// name, so the one assertion the ruling turns on was unfalsifiable.
//
// So the pod is opened deliberately, once, before anything else: if the name
// is gone this fails by name, and the per-page checks below mean what they say.
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Polls`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: /chat with ava/i }).first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const pod = await page.locator('[data-ava-pod]').count();
  check('the pod answers to the name this guard asks it by', pod > 0,
    pod > 0 ? '[data-ava-pod] is on the open pod' : 'the pod opened under no name — every pod check below is vacuous');
  await page.close();
}

for (const p of PAGES) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${p.route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);

  const btn = page.getByRole('button', { name: p.button }).first();
  const present = await btn.count() > 0;
  // PRESENCE BEFORE PROPERTIES: without the button, every assertion below is
  // about a click that never happened.
  check(`${p.route}: the page offers Ask Ava`, present, present ? 'button present' : 'no Ask Ava button on this page');
  if (!present) { await page.close(); continue; }

  const before = await page.locator('[role="dialog"]').count();
  check(`  nothing is open before the click`, before === 0, `${before} dialog(s)`);

  await btn.click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const dialog = page.locator('[role="dialog"]').first();
  const opened = await dialog.count() > 0;
  check(`  the click opens a dialog`, opened, opened ? 'role=dialog' : 'nothing opened');

  const text = opened ? await dialog.innerText().catch(() => '') : '';
  check(`  and it is this page's Ava, by name`, text.includes(`Ask Ava — ${p.title}`) || text.includes(p.title),
    opened ? `"${text.split('\n')[0].slice(0, 44)}"` : 'no dialog');
  check(`  and it carries this page's own quick actions`, text.includes(p.action),
    text.includes(p.action) ? `"${p.action.slice(0, 40)}…"` : 'that page\'s first action is not in the dialog');

  const pod = await page.locator('[data-ava-pod]').count();
  check(`  and the pod is untouched`, pod === 0, pod === 0 ? 'no pod' : 'the pod opened too');

  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

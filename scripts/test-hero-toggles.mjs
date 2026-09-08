/* global document, getComputedStyle */
/**
 * THE THREE HERO SWITCHES, AND THE CONTRACT THE NAMES ONE RESTS ON.
 *
 * ── WHY EVERY UNIVERSE, NOT A SAMPLE ────────────────────────────────────────
 *
 * "Names off" is not a prop. Every one of the twenty heroes prints the names
 * in an `h1` inside its own Masthead, next to a kicker that is universe COPY
 * and must survive; passing an empty string leaves the `h1` holding its
 * line-height open, and three of the layouts render spans and an ampersand
 * inside it so they would not even be empty. So it is one CSS rule —
 * `.wb-hero-names-off h1 { display: none }` — over a wrapper that contains
 * only the Masthead.
 *
 * That rule rests on an assumption: the `h1` in a Masthead is the couple's
 * names, and nothing else in there is one. An assumption held across twenty
 * files is a thing to CHECK, not to write down. So every universe is rendered
 * with the switch off and asked two questions — is the name gone, and is the
 * kicker still there. The second is what separates "we hid the names" from
 * "we hid the masthead".
 *
 * ── DEFAULTS ARE ON, WHICH IS THE MIGRATION-SHAPED RISK ─────────────────────
 *
 * Every couple already has a hero with their names on it. A switch stored as
 * `undefined` must therefore read as ON. A guard that only ever checks the
 * OFF state would pass just as happily on code that defaulted everyone to
 * off, so the on state is checked too, on the same universe, in the same run.
 *
 * ── THE MARK IS KEPT WHEN IT IS SWITCHED OFF ────────────────────────────────
 *
 * Turning a monogram off must not delete the upload. The overlay carries an
 * `enabled` flag rather than being removed, and that is asserted directly:
 * off, then on again, and the same URL is still what renders.
 *
 * Usage: npm run test:hero-toggles  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, dismissEntrance, SEED, PUBLISHED_WEDDING } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

/** id → the kicker that universe prints beside the names. tulum has none. */
const UNIVERSES = [
  ['london', 'An invitation'], ['kyoto', 'A quiet gathering'], ['capri', "You're invited!"],
  ['marrakech', 'Nº 01 — Marrakech'], ['brooklyn', 'The wedding'], ['bali', 'Welcome, with love'],
  ['paris', 'Save the date'], ['capetown', 'You are warmly invited'], ['mykonos', 'You are invited'],
  ['amalfi', 'You are warmly invited'], ['sedona', 'Join us'], ['aspen', 'You are invited'],
  ['taj', 'You are graciously invited'], ['havana', 'You are invited'],
  ['edinburgh', 'You are cordially invited'], ['monaco', 'You are invited'],
  ['florence', 'You are invited'], ['seoul', 'You are invited'], ['shanghai', 'You are invited'],
  ['tulum', null],
];

const NAME = 'Ada';
// A REAL, LOADABLE IMAGE, as a data URI. The harness blocks remote images on
// purpose, and a blocked one has no intrinsic height — so with `height: auto`
// its box is zero and "painted" would be false for a mark that is rendering
// perfectly. That would have read as a defect in the product rather than in
// the fixture. 1x1 transparent PNG.
const MARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** Renders the guest home page for one universe with one homeContent, and reads it. */
async function heroFor(browser, activeUniverse, homeContent) {
  const wedding = { ...PUBLISHED_WEDDING, activeUniverse, homeContent };
  const ctx = await seededContext(browser, { width: 1440, height: 900, seed: SEED });
  await dismissEntrance(ctx);
  await ctx.route((url) => /\/api\/wedding-by-slug/.test(typeof url === 'string' ? url : url.href),
    (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wedding) }));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/w/${wedding.slug}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3200);
  const out = await page.evaluate((mark) => {
    // PAINTED, not present: display:none is what hides the names, and an
    // element that is in the DOM with no box is exactly what this must not
    // count as visible.
    const painted = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const headings = [...document.querySelectorAll('h1')];
    return {
      text: document.body.innerText || '',
      paintedH1: headings.filter(painted).map((h) => (h.innerText || '').replace(/\s+/g, ' ').trim()),
      marks: [...document.querySelectorAll('img')].filter((i) => i.src === mark).filter(painted).length,
    };
  }, MARK);
  await ctx.close();
  return out;
}

console.log('\n  The hero switches, on every universe:\n');

const browser = await chromium.launch();

// ── names off, on all twenty ────────────────────────────────────────────────
for (const [id, kicker] of UNIVERSES) {
  const off = await heroFor(browser, id, { showNames: false });
  const nameOnScreen = off.paintedH1.some((h) => h.includes(NAME));
  check(`${id}: names off — the names are not painted`, !nameOnScreen,
    off.paintedH1.join(' | ') || 'no painted h1 at all');
  // The kicker is universe copy. Hiding the masthead would take it too, and
  // that would pass the check above while being the wrong fix.
  if (kicker) {
    check(`  and its kicker survives`, off.text.toUpperCase().includes(kicker.toUpperCase()),
      kicker);
  }
}

// ── and the default, which must still be ON ─────────────────────────────────
{
  const on = await heroFor(browser, 'london', {});
  check('a switch that was never touched reads as ON — the names are painted',
    on.paintedH1.some((h) => h.includes(NAME)), on.paintedH1.join(' | ') || 'nothing painted');
}

// ── the date, on the one hero that prints one ───────────────────────────────
{
  const on = await heroFor(browser, 'tulum', {});
  const off = await heroFor(browser, 'tulum', { showDate: false });
  check('tulum prints the date by default', /2027|2026|Date to be announced/.test(on.text),
    (on.text.match(/\b\w+ \d{1,2}, \d{4}\b/) || ['none'])[0]);
  check('  and the date switch takes it off', !/\b\w+ \d{1,2}, \d{4}\b/.test(off.text),
    (off.text.match(/\b\w+ \d{1,2}, \d{4}\b/) || ['gone'])[0]);
}

// ── the mark, and that switching it off keeps the upload ────────────────────
{
  const shown = await heroFor(browser, 'london', { overlay: { url: MARK, scale: 30 } });
  check('the mark renders over the hero', shown.marks === 1, `${shown.marks} painted`);

  const hidden = await heroFor(browser, 'london', { overlay: { url: MARK, scale: 30, enabled: false } });
  check('  switched off, it is not rendered', hidden.marks === 0, `${hidden.marks} painted`);

  // The couple's upload is still on the record — the switch is a flag, not a
  // delete — so turning it back on brings the same file back with no re-upload.
  const back = await heroFor(browser, 'london', { overlay: { url: MARK, scale: 30, enabled: true } });
  check('  and switching it back on returns the same file', back.marks === 1, `${back.marks} painted`);
}

// ── the same mark on a media block, which is a different renderer ───────────
//
// The hero's overlay and a block's are the same component over different
// media, and that is exactly why both are checked: one call site passing the
// wrong prop is invisible from the other.
{
  const blocksWith = (overlay) => ({
    blocks: [
      { id: 'p1', type: 'photo', order: 0, content: { url: MARK, caption: '' }, ...(overlay ? { overlay } : {}) },
      { id: 'v1', type: 'video', order: 1, content: { url: 'https://vimeo.com/76979871' }, ...(overlay ? { overlay } : {}) },
    ],
  });

  const none = await heroFor(browser, 'london', blocksWith(null));
  const shown = await heroFor(browser, 'london', blocksWith({ url: MARK, scale: 30 }));
  const off = await heroFor(browser, 'london', blocksWith({ url: MARK, scale: 30, enabled: false }));

  // The photo block's own content is the same file, so the baseline is what
  // tells the mark apart from the picture underneath it. Without this the
  // count below could be measuring the photo and calling it the overlay.
  check('the media blocks render without a mark when none is set', none.marks === 1,
    `${none.marks} painted (the photo itself)`);
  check('  a mark on a photo and a video block renders on both', shown.marks === 3,
    `${shown.marks} painted (photo + two marks)`);
  check('  and switched off, neither renders', off.marks === 1,
    `${off.marks} painted (the photo itself)`);
}

// ── and the panel that sets all of it ───────────────────────────────────────
//
// SEEDED WITH A MARK ALREADY PLACED, because one of the things being checked
// here is what the switch does to it. Everything above this point reads
// rendered output from seeded state; only this section drives the actual
// control, and "off must not delete the upload" is a property of the control,
// not of the data.
{
  const seeded = {
    ...SEED,
    WeddingDetails: [{ ...SEED.WeddingDetails[0], homeContent: { overlay: { url: MARK, scale: 30 } } }],
  };
  const ctx = await seededContext(browser, { width: 1440, height: 900, seed: seeded });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: 'Content', exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(1500);

  const panel = await page.evaluate(() => {
    const scope = [...document.querySelectorAll('div')].find((d) => (d.innerText || '').includes('Edit in Event details'));
    if (!scope) return null;
    return {
      text: scope.innerText,
      // The reversal: this panel no longer WRITES the names or the date.
      // Checked by VALUE rather than by counting inputs — the tab has other
      // fields of its own (the hero video URL, the tagline), and a count
      // would either fail on those or have to be tuned until it passed.
      // What must not exist is a control holding one of these three values.
      inputs: [...scope.querySelectorAll('input, textarea')]
        .map((i) => (i.value || '').trim())
        .filter((v) => v === 'Ada' || v === 'Alan' || /^\d{4}-\d{2}-\d{2}/.test(v)),
      link: !!scope.querySelector('a[href="/event-details"]'),
      switches: [...scope.querySelectorAll('button[aria-pressed]')].length,
    };
  });

  check('the hero panel is on screen', !!panel,
    panel ? 'found' : 'no panel containing the Event details link');
  if (panel) {
    check('  the names and the date are shown, not editable', panel.inputs.length === 0,
      panel.inputs.join(', ') || 'nothing here holds a name or a date');
    check('  and there is a way through to where they ARE edited', panel.link, '/event-details');
    check('  three switches', panel.switches >= 3, `${panel.switches} found`);
    check('  and the couple can read the values that are on their hero',
      /Ada/.test(panel.text) && /Alan/.test(panel.text) && /2027/.test(panel.text),
      (panel.text.match(/July \d+, \d{4}/) || ['no date shown'])[0]);
  } else {
    for (const n of ['  the names and the date are shown, not editable',
      '  and there is a way through to where they ARE edited', '  three switches',
      '  and the couple can read the values that are on their hero']) check(n, false, 'no panel');
  }

  // TURNING THE MARK OFF MUST NOT THROW THE FILE AWAY. The size/position
  // dials and the Remove control render only while `overlay.url` exists, so
  // their presence after the switch is turned off is the evidence that the
  // upload survived it. A handler that cleared the whole object would pass
  // every rendered check above — nothing renders either way — and lose the
  // couple's artwork.
  const dialsPresent = () => page.evaluate(() =>
    [...document.querySelectorAll('button')].some((b) => (b.innerText || '').trim() === 'Remove mark'));

  const before = await dialsPresent();
  check('the mark the couple placed is in the panel', before, before ? 'Remove mark is offered' : 'not found');

  const markSwitch = page.getByRole('button', { name: 'Toggle Show mark' }).first();
  const toggled = await markSwitch.click().then(() => true).catch(() => false);
  await page.waitForTimeout(900);
  const after = await dialsPresent();
  check('  and switching it off keeps it, rather than deleting it',
    toggled && after, !toggled ? 'the switch could not be clicked' : after ? 'still there' : 'the upload was discarded');

  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);

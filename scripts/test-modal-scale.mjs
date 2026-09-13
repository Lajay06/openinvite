/* global document, getComputedStyle */
/**
 * A DIALOG IS NOT BIGGER THAN THE PAGE BEHIND IT.
 *
 * "Add new guest" was built at page scale inside a small window: 11px labels
 * over 45px inputs under 56px section headers, seven sections deep, with the
 * required name field below the fold on a laptop. Measured against the guest
 * list it opens over, its controls were half again as tall as that page's own
 * primary button and its type ran to 16px where the page tops out at 14.
 *
 * ── THE MEASURE IS THE OWNER'S, AND SO IS THE EXEMPTION ─────────────────────
 *
 * "No text larger than the page's primary, except the modal title." The title
 * is exempt because a dialog has to say what it is; everything else in it is a
 * form, and a form is smaller than the page it interrupts.
 *
 * THE CEILING IS MEASURED, NOT WRITTEN DOWN. The instruction first gave the
 * guest-list primary as 14px; on the running product it is 12px in a 32px row,
 * and the word for what this dialog should be was "much smaller". So the
 * ceiling is read off each page's own primary at run time and applied to
 * everything in the dialog except its title. A guard holding 14 would pass a
 * dialog half again the size of the page behind it — the thing being fixed; a
 * guard holding 12 would go green on a page whose own primary had moved.
 *
 * CONTROL TEXT COUNTS. An <input>'s value is not a text node, so the element
 * walk below cannot see it, and the first version measured labels and buttons
 * while 13px fields sat between them unchecked. Controls are read separately,
 * by computed font-size, against the same ceiling.
 *
 * ── VISIBLE TEXT ONLY, AND THAT IS NOT PEDANTRY ─────────────────────────────
 *
 * The dialog's close control carries an sr-only "Close" at 16px, and Radix
 * keeps a hidden native <select> beside each custom one. Both are 16px and
 * neither is on screen. A guard counting them would demand changes to text
 * nobody can see, which is how a rule gets a reputation for being wrong.
 *
 * ── SEVEN DIALOGS, ONE MEASURE ──────────────────────────────────────────────
 *
 * Add guest was the first, not the only one. The same table now drives every
 * labelled form dialog in registry and moodboard, each opened on its own page
 * and measured against that page's own primary. tests/persistence/
 * modal-scale-class.mjs is the other half: it enumerates the dialogs from
 * source so a new one cannot be added without either carrying the class or
 * failing, which is the part a browser walk over a fixed list cannot do.
 *
 * Usage: npm run test:modal-scale  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';
const LABEL = 12;            // "labels 12px"
const CONTROL_MAX = 38;      // the builder's control height, with a pixel of slack
/**
 * A TEXTAREA IS NOT A CONTROL THAT GREW. Add guest has no textarea, so the
 * single ceiling above went unquestioned until the registry forms came in and
 * reported three 56px "controls" — which is `.oi-modal-scale textarea`'s own
 * min-height, doing exactly what it was written to do. A note field is two
 * lines because a note is two lines. It is measured against that, not against
 * a single-line row, and it still has a ceiling: a textarea that has grown to
 * a page of its own is the defect this file exists about.
 */
const TEXTAREA_MAX = 60;

/**
 * RegistryProduct ships empty in the shared seed, and "Mark as purchased" is
 * reachable only from a product card. One row is added HERE rather than in
 * renderHarness so no other guard's counts move; the fields are the entity's
 * own, which is what assertSeedMatchesSchemas checks on the way in.
 */
const seed = {
  ...SEED,
  // The grid filters on `board_name === activeBoard`, and Moodboard opens on
  // "Main board". The shared seed's two items sit on Flowers and Table, so the
  // page renders its empty state and there is no card to edit. One item is
  // moved onto the default board HERE, for the same reason as the product
  // below: no other guard's counts move.
  MoodboardItem: SEED.MoodboardItem.map((m, i) => (i === 0 ? { ...m, board_name: 'Main board' } : m)),
  RegistryProduct: [{
    id: 'rp1',
    name: 'Copper saucepan',
    description: 'The 18cm one.',
    price: 129,
    category: 'kitchen',
    quantity_requested: 2,
    quantity_purchased: 0,
    created_by: 'fixture@example.com',
  }],
};

/**
 * `primary` is the page's own primary button, read by its exact text: the
 * ceiling is what this dialog opens over, not a number written down here.
 * `open` is how a couple reaches the dialog. `labels` is the presence floor —
 * properties asserted over an unopened dialog are an empty read wearing a pass.
 */
const MODALS = [
  { page: '/Guests',    primary: '+ Add guest',      open: '+ Add guest',      name: 'Add guest',          labels: 5, footer: ['Cancel', 'Add guest', 'Save changes'] },
  { page: '/Registry',  primary: 'Add cash fund',    open: 'Add platform',     name: 'Add platform link',  labels: 4 },
  { page: '/Registry',  primary: 'Add cash fund',    open: 'Add product',      name: 'Add product',        labels: 8 },
  { page: '/Registry',  primary: 'Add cash fund',    open: 'Add cash fund',    name: 'Add cash fund',      labels: 5 },
  { page: '/Registry',  primary: 'Add cash fund',    open: 'Mark as purchased', name: 'Mark as purchased', labels: 3, tab: 'Products (1)' },
  { page: '/Moodboard', primary: 'Add inspiration',  open: 'Add inspiration',  name: 'Add inspiration',    labels: 5 },
  { page: '/Moodboard', primary: 'Add inspiration',  open: { label: 'Edit' },  name: 'Edit item',          labels: 3 },
  { page: '/Vendors',   primary: '+ Add vendor',     open: '+ Add vendor',     name: 'Add vendor',         labels: 8 },
  { page: '/Schedule',  primary: '+ Add event',      open: '+ Add event',      name: 'Add event',          labels: 6 },
  { page: '/Budget',    primary: '+ Add expense',    open: '+ Add expense',    name: 'Add expense',        labels: 5 },
  { page: '/Seating',   primary: 'Add table',        open: 'Add table',        name: 'Add table',          labels: 3 },
];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** Read a page's own primary. Runs before anything is opened. */
const readPrimary = (page, text) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')]
    .find(x => x.textContent.replace(/\s+/g, ' ').trim() === t && x.getBoundingClientRect().height >= 6);
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { size: parseFloat(getComputedStyle(b).fontSize), height: Math.round(r.height) };
}, text);

/** Everything the measure needs, read off the open dialog in one pass. */
const readDialog = (page) => page.evaluate(() => {
  const dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return null;
  // THE TITLE, WITHOUT GUESSING. Every dialog passes `title` to the shared
  // wrapper, which renders it as the sr-only element the dialog is labelled
  // by. Most of these modals ALSO draw a visible heading with the same words
  // (sometimes a prefix of them: "Edit item" under "Edit item — Peonies").
  // Matching on that text is exact where a "largest font in the header band"
  // heuristic would be a rule the owner never made. The first match in
  // document order is the heading; a later button repeating the title's words
  // is a button.
  const labelled = dlg.getAttribute('aria-labelledby');
  const titleText = (labelled && document.getElementById(labelled)?.textContent || '').replace(/\s+/g, ' ').trim();
  let titleSeen = false;
  const text = [];
  const walk = (el) => {
    if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      const r = el.getBoundingClientRect();
      // On screen, with a real box. sr-only text is 1px tall and clipped.
      if (r.height >= 6 && r.width >= 6) {
        const t = el.innerText.replace(/\s+/g, ' ').trim();
        const isTitle = !titleSeen && t.length >= 5 && titleText.startsWith(t);
        if (isTitle) titleSeen = true;
        text.push({ t: t.slice(0, 34), tag: el.tagName.toLowerCase(), size: parseFloat(getComputedStyle(el).fontSize), isTitle });
      }
      return;
    }
    for (const c of el.children) walk(c);
  };
  walk(dlg);
  const controls = [...dlg.querySelectorAll('input, textarea, [role="combobox"], button')]
    .map(e => ({
      what: (e.getAttribute('aria-label') || e.placeholder || e.textContent || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 28),
      h: Math.round(e.getBoundingClientRect().height),
      // The size a couple's own typing renders at. Not visible to the text
      // walk above, because a value is a property and not a text node.
      //
      // ONLY WHERE THE ELEMENT'S OWN FONT-SIZE IS WHAT PAINTS. A section
      // header is a <button> at 16px whose only text lives in a 12px span:
      // nothing renders at 16 and nobody can see it, and measuring the
      // wrapper flagged all six of them plus the sr-only "Close". Buttons
      // are already covered by the text walk, which reads the span that
      // actually paints. What is left is the fields, where the value IS the
      // element's own text.
      size: /^(INPUT|TEXTAREA)$/.test(e.tagName) ? parseFloat(getComputedStyle(e).fontSize) : null,
      checkbox: e.type === 'checkbox' || e.type === 'radio',
      type: e.type || e.tagName.toLowerCase(),
    }))
    .filter(c => c.h >= 6);
  const labels = [...dlg.querySelectorAll('label')]
    .map(l => ({ t: l.innerText.trim(), size: parseFloat(getComputedStyle(l).fontSize) }))
    .filter(l => l.t);
  // A SECTION HEADER, NOT EVERY EXPANDABLE THING. Radix's select trigger also
  // carries aria-expanded, so this first counted "Select category" and
  // "Pending" as sections and demanded a 13px select be 12 — the guard
  // inventing a rule the owner did not make. A combobox is excluded by role.
  const sections = [...dlg.querySelectorAll('button[aria-expanded]:not([role="combobox"])')]
    .map(b => ({ t: b.innerText.replace(/\s+/g, ' ').trim(), h: Math.round(b.getBoundingClientRect().height), size: parseFloat(getComputedStyle(b.querySelector('span') || b).fontSize) }));
  return { title: titleText || null, text, controls, labels, sections };
});

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 900, seed });
const page = await ctx.newPage();

/**
 * WAIT FOR THE THING, NOT FOR THE CLOCK.
 *
 * The first version slept 6s after every navigation, 2.2s after every open and
 * 0.9s after every close, because one dialog on one page could afford it. At
 * eleven dialogs across seven pages that is over a minute of the job doing
 * nothing, and the job's budget is 20 minutes against a suite that already
 * runs 19 and a half. It went over and GitHub reported the timeout as
 * "cancelled", which reads like a race and is not one.
 *
 * Every sleep below is now a wait for the state the next line needs: the
 * page's own primary to be on screen, the dialog to be open, the dialog to be
 * gone. A slow runner waits longer and a fast one does not wait at all, which
 * is also why these are more reliable than the numbers they replace.
 */
const settled = (locator, state) => locator.waitFor({ state, timeout: 20000 }).then(() => true, () => false);

/**
 * A DIALOG MEASURED WHILE IT IS STILL ARRIVING IS NOT THE DIALOG.
 *
 * Radix scales and fades its content in. Waiting only for "visible" catches it
 * at the START of that, and the first run without the sleeps read Add guest's
 * footer buttons at 30px against a 32px primary — a failure invented entirely
 * by the measurement. The 2.2s sleep was approximating this condition; this IS
 * the condition. Raced against a ceiling so a forever-animating spinner
 * somewhere on the page cannot hang the run.
 */
const stillMoving = () => Promise.race([
  page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))).then(() => true)),
  new Promise((r) => setTimeout(() => r(false), 5000)),
]).catch(() => false);

/** Gone means no dialog in the document, not "this handle detached". */
const dialogGone = () => page.waitForFunction(() => !document.querySelector('[role="dialog"]'), null, { timeout: 20000 })
  .then(() => true, () => false);

let at = null;
for (const m of MODALS) {
  console.log(`\n  ${m.name}, at ${m.page}'s scale\n`);
  if (at !== m.page) {
    await page.goto(`${BASE}${m.page}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    at = m.page;
  }
  // The primary is both the ceiling and the signal that the page has finished
  // arriving: it is rendered by the same authenticated read the rest waits on.
  await settled(page.getByRole('button', { name: m.primary, exact: true }).first(), 'visible');

  const primary = await readPrimary(page, m.primary);
  check(`${m.page}'s own primary was measured`, !!primary,
    primary ? `"${m.primary}" is ${primary.size}px in a ${primary.height}px row` : 'not found');

  if (m.tab) {
    const tab = page.getByRole('tab', { name: m.tab, exact: true });
    await tab.click({ timeout: 8000 }).catch(() => {});
  }
  const opener = typeof m.open === 'string'
    ? page.getByRole('button', { name: m.open, exact: true })
    : page.getByRole('button', { name: m.open.label, exact: true });
  await settled(opener.first(), 'visible');
  await opener.first().click({ timeout: 8000 }).catch(() => {});
  await settled(page.locator('[role="dialog"]').first(), 'visible');
  await stillMoving();

  const modal = await readDialog(page);

  // PRESENCE BEFORE PROPERTIES: an unopened dialog has nothing too large in it.
  check('the dialog opened', !!modal && modal.text.length > 2, modal ? `${modal.text.length} pieces of visible text` : 'no dialog');
  if (!modal) continue;
  check('  and it has a title', !!modal.title, modal.title || 'none');
  check('  and its fields', modal.labels.length >= m.labels, `${modal.labels.length} labels (floor ${m.labels}), ${modal.controls.length} controls`);
  check('  and the visible heading was matched to it', modal.text.some(t => t.isTitle),
    modal.text.filter(t => t.isTitle).map(t => `"${t.t}" ${t.size}px`).join(', ') || 'no visible heading carries the title text');

  // ── the measure, against the page's own primary ───────────────────────────
  const CEILING = primary ? primary.size : LABEL;
  const tooBig = modal.text.filter(t => !t.isTitle && t.size > CEILING);
  check(`nothing but the title is larger than the page primary (${CEILING}px)`, tooBig.length === 0,
    tooBig.length ? tooBig.map(t => `"${t.t}" ${t.size}px`).join(', ') : `${modal.text.length} pieces checked`);

  const sized = modal.controls.filter(c => !c.checkbox && c.size !== null);
  const bigControls = sized.filter(c => c.size > CEILING);
  check('  and no field\'s own text is either', bigControls.length === 0,
    bigControls.length ? bigControls.map(c => `"${c.what}" ${c.size}px`).join(', ') : `${sized.length} field(s) checked`);

  const offLabel = modal.labels.filter(l => l.size !== LABEL);
  check(`  every label is ${LABEL}px`, offLabel.length === 0,
    offLabel.length ? offLabel.map(l => `"${l.t}" ${l.size}px`).join(', ') : `${modal.labels.length} labels checked`);

  for (const sec of modal.sections) {
    check(`  section "${sec.t}" is no larger than a row label`, sec.size <= LABEL, `${sec.size}px`);
    check('    and its row is no taller than a control', sec.h <= CONTROL_MAX, `${sec.h}px`);
  }

  const ceilingFor = (c) => (c.type === 'textarea' ? TEXTAREA_MAX : CONTROL_MAX);
  const tall = modal.controls.filter(c => c.h > ceilingFor(c));
  check(`every control is ${CONTROL_MAX}px or shorter, a note field ${TEXTAREA_MAX}`, tall.length === 0,
    tall.length ? tall.map(c => `"${c.what}" ${c.h}px`).join(', ') : `${modal.controls.length} controls checked`);

  if (primary && m.footer) {
    const footer = modal.controls.filter(c => m.footer.includes(c.what));
    for (const b of footer) {
      check(`  "${b.what}" is the page primary's height`, b.h === primary.height, `${b.h}px vs ${primary.height}px`);
    }
  }

  // PRESENCE BEFORE PROPERTIES, ON THE WAY OUT TOO. A dialog left open swallows
  // the next opener's click, and the next iteration then measures the PREVIOUS
  // dialog against this one's expectations — which is exactly what happened:
  // "Add platform link" was checked against Add product's caption floor and
  // read as a form with half its fields missing.
  await page.keyboard.press('Escape').catch(() => {});
  check('  and it closes again', await dialogGone(), 'nothing left open behind it');
}

await browser.close();
const failed = results.filter(r => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

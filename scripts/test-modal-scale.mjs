/* global document, getComputedStyle, innerHeight */
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
 * "No text larger than the guest-list primary, except the modal title." The
 * title is exempt because a dialog has to say what it is; everything else in
 * it is a form, and a form is smaller than the page it interrupts.
 *
 * A DISCREPANCY IS REPORTED RATHER THAN RESOLVED. The instruction gives the
 * guest-list primary as 14px. Measured on the running product it is 12px, in
 * a 32px row. So this asserts the owner's stated ceiling of 14 — the number
 * that was ruled on — and prints what the primary actually measures beside it,
 * so the two can be reconciled by whoever owns the ruling rather than quietly
 * by the guard.
 *
 * ── VISIBLE TEXT ONLY, AND THAT IS NOT PEDANTRY ─────────────────────────────
 *
 * The dialog's close control carries an sr-only "Close" at 16px, and Radix
 * keeps a hidden native <select> beside each custom one. Both are 16px and
 * neither is on screen. A guard counting them would demand changes to text
 * nobody can see, which is how a rule gets a reputation for being wrong.
 *
 * Usage: npm run test:modal-scale  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';
const CEILING = 14;          // the owner's stated size for the guest-list primary
const LABEL = 12;            // "labels 12px"
const CONTROL_MAX = 38;      // the builder's control height, with a pixel of slack

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 900 });
const page = await ctx.newPage();
await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(6000);

console.log('\n  The Add guest dialog, at the page\'s scale\n');

const primary = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '+ Add guest');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { size: parseFloat(getComputedStyle(b).fontSize), height: Math.round(r.height) };
});
check('the guest list\'s own primary was measured', !!primary,
  primary ? `"+ Add guest" is ${primary.size}px in a ${primary.height}px row — the instruction says 14px` : 'not found');

await page.getByRole('button', { name: '+ Add guest', exact: true }).click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(2200);

const modal = await page.evaluate(() => {
  const dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return null;
  const title = dlg.querySelector('h1, h2, h3');
  const text = [];
  const walk = (el) => {
    if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      const r = el.getBoundingClientRect();
      // On screen, with a real box. sr-only text is 1px tall and clipped.
      if (r.height >= 6 && r.width >= 6) {
        text.push({
          t: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 34),
          tag: el.tagName.toLowerCase(),
          size: parseFloat(getComputedStyle(el).fontSize),
          isTitle: el === title,
        });
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
  const footer = [...dlg.querySelectorAll('button')]
    .filter(b => ['Cancel', 'Add guest', 'Save changes'].includes(b.textContent.trim()))
    .map(b => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height), size: parseFloat(getComputedStyle(b).fontSize) }));
  return { title: title ? title.innerText.trim() : null, text, controls, labels, sections, footer };
});

// PRESENCE BEFORE PROPERTIES: an unopened dialog has nothing too large in it.
check('the dialog opened', !!modal && modal.text.length > 6, modal ? `${modal.text.length} pieces of visible text` : 'no dialog');
if (!modal) { await browser.close(); process.exit(1); }
check('  and it has a title', !!modal.title, modal.title || 'none');
check('  and its fields', modal.labels.length >= 5, `${modal.labels.length} labels, ${modal.controls.length} controls`);

// ── the measure ─────────────────────────────────────────────────────────────
const tooBig = modal.text.filter(t => !t.isTitle && t.size > CEILING);
check(`nothing but the title is larger than ${CEILING}px`, tooBig.length === 0,
  tooBig.length ? tooBig.map(t => `"${t.t}" ${t.size}px`).join(', ') : `${modal.text.length} pieces checked`);

for (const l of modal.labels) {
  check(`  label "${l.t}" is ${LABEL}px`, l.size === LABEL, `${l.size}px`);
}

const rowLabel = LABEL;
for (const sec of modal.sections) {
  check(`  section "${sec.t}" is no larger than a row label`, sec.size <= rowLabel, `${sec.size}px`);
  check(`    and its row is no taller than a control`, sec.h <= CONTROL_MAX, `${sec.h}px`);
}

const tall = modal.controls.filter(c => c.h > CONTROL_MAX);
check(`every control is ${CONTROL_MAX}px or shorter`, tall.length === 0,
  tall.length ? tall.map(c => `"${c.what}" ${c.h}px`).join(', ') : `${modal.controls.length} controls checked`);

if (primary) {
  for (const b of modal.footer) {
    check(`  "${b.t}" is the page primary's height`, b.h === primary.height, `${b.h}px vs ${primary.height}px`);
  }
}

await browser.close();
const failed = results.filter(r => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

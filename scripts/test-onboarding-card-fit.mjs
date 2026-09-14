/* global document, getComputedStyle */
/**
 * TEXT STAYS INSIDE ITS BOX.
 *
 * The guest-count step offers three choice cards — Intimate / Celebration /
 * Grand — in a three-column grid. At 390 each column is about 100px wide and
 * the cards carry 24px of horizontal padding each side, leaving ~50px for a
 * word like "Celebration" set at 16px bold. It does not fit, and the overflow
 * is the first thing a couple sees on a phone.
 *
 * ── MEASURED ON THE RANGE, NOT ON ONE WIDTH ────────────────────────────────
 *
 * 360, 390 and 430 are the three phone widths that matter: the smallest still
 * in use, the modern default, and the large end. A fix tuned to 390 alone can
 * pass there and overflow at 360, which is the width belonging to the oldest
 * and cheapest handsets.
 *
 * ── THE TEXT'S BOX, NOT THE ELEMENT'S ──────────────────────────────────────
 *
 * An element with `overflow: visible` reports a clientWidth that fits while
 * its text paints outside it, so the element's own box proves nothing. This
 * measures the RANGE over the text node — the ink — against the card's padding
 * box, which is the question being asked: does the word sit inside the border
 * the couple can see.
 */
import { chromium } from 'playwright';
import { seededContext, ONBOARDING_SEED, ONBOARDING_USER } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4194';
const WIDTHS = [360, 390, 430];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();

for (const width of WIDTHS) {
  console.log(`\n  The guest-count cards at ${width}\n`);
  const ctx = await seededContext(browser, { width, height: 900, seed: ONBOARDING_SEED, user: ONBOARDING_USER });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Cross the wizard to the guest-count screen the way a couple does.
  await page.getByRole('button', { name: 'Get started', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByPlaceholder('Your name').fill('Ada').catch(() => {});
  await page.getByPlaceholder("Partner's name").fill('Alan').catch(() => {});
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Continue/ }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^We haven't set a date yet/ }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^Not sure yet/ }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1800);

  const here = await page.getByText('How many guests are you expecting?').count() > 0;
  // PRESENCE BEFORE PROPERTIES: a screen that never rendered has no overflow.
  check('the guest-count screen was reached', here, here ? 'three cards to measure' : 'the wizard did not get here');
  if (!here) { await ctx.close(); continue; }

  const cards = await page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll('button')) {
      const t = (b.innerText || '').replace(/\s+/g, ' ').trim();
      if (!/^(Intimate|Celebration|Grand)\b/.test(t)) continue;
      const cs = getComputedStyle(b);
      const box = b.getBoundingClientRect();
      // The padding box: where the border is drawn, minus the padding the
      // design asked for. Text must live inside this.
      const inner = {
        left: box.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth),
        right: box.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth),
      };
      // THE INK, via a Range over each text node — an element box can fit while
      // its text paints outside it.
      const lines = [];
      const walk = (el) => {
        for (const n of el.childNodes) {
          if (n.nodeType === 3 && n.textContent.trim()) {
            const r = document.createRange();
            r.selectNodeContents(n);
            for (const rect of r.getClientRects()) {
              if (rect.width > 0) lines.push({ text: n.textContent.trim().slice(0, 20), left: rect.left, right: rect.right });
            }
          } else if (n.nodeType === 1) walk(n);
        }
      };
      walk(b);
      out.push({
        label: t.split('\n')[0].slice(0, 20),
        cardW: Math.round(box.width),
        innerW: Math.round(inner.right - inner.left),
        overflow: lines.map((l) => Math.round(Math.max(inner.left - l.left, l.right - inner.right))),
        worst: lines.length ? Math.round(Math.max(...lines.map((l) => Math.max(inner.left - l.left, l.right - inner.right)))) : null,
        widest: lines.length ? Math.round(Math.max(...lines.map((l) => l.right - l.left))) : null,
        lines: lines.length,
      });
    }
    return out;
  });

  check('  all three cards were measured', cards.length === 3, cards.map((c) => `${c.label} ${c.cardW}px`).join(', '));
  for (const c of cards) {
    check(`  "${c.label}" text sits inside its card`, c.worst !== null && c.worst <= 0,
      `card ${c.cardW}px, ${c.innerW}px inside the padding; widest line ${c.widest}px; overflow ${c.worst}px over ${c.lines} line(s)`);
  }
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

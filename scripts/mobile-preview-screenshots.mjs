/**
 * scripts/mobile-preview-screenshots.mjs
 *
 * Captures every /m/preview screen at 390x844 into mobile-screenshots/, and
 * measures each one: nothing wider than the viewport, no tap target under
 * 44px, no input under 16px. The preview is dev-only, so this needs the
 * Vite dev server (`npm run dev`, or set BASE to wherever it is running).
 *
 *   BASE=http://localhost:5173 node scripts/mobile-preview-screenshots.mjs
 *
 * The two external requests it reports (the Base44 SDK's analytics batch and
 * CurrencyProvider's auth.me) are the app's own boot calls, not the preview's.
 */
/* eslint-env browser */
/* global document, window, getComputedStyle */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:5173';
const DIR = process.env.OUT || 'mobile-screenshots';
fs.mkdirSync(DIR, { recursive: true });

const SHOTS = [
  ['/m/preview', 'home'],
  ['/m/preview', 'home-scrolled', 'scroll'],
  ['/m/preview', 'home-ava', 'ava'],
  ['/m/preview/guests', 'guests'],
  ['/m/preview/guests', 'guests-search', 'tap:Search guests'],
  ['/m/preview/guests', 'guests-add-sheet', 'tap:Add a guest'],
  ['/m/preview/guests/g3', 'guest-detail'],
  ['/m/preview/plan', 'plan-checklist'],
  ['/m/preview/plan', 'plan-add-task-sheet', 'tap:Add a task'],
  ['/m/preview/plan?segment=budget', 'plan-budget'],
  ['/m/preview/plan/budget/catering', 'plan-budget-category'],
  ['/m/preview/plan?segment=budget&add=1', 'plan-add-expense-sheet'],
  ['/m/preview/plan?segment=timeline', 'plan-timeline'],
  ['/m/preview/plan?segment=vendors', 'plan-vendors'],
  ['/m/preview/site', 'site'],
  ['/m/preview/account', 'account'],
  ['/m/preview/account?native=1', 'account-native'],
  ['/m/preview?state=loading', 'home-state-loading'],
  ['/m/preview/guests?state=empty', 'guests-state-empty'],
  ['/m/preview/plan?state=error', 'plan-state-error'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
let failures = 0;

for (const [route, name, action] of SHOTS) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => errors.push(`goto ${route}: ${e.message}`));
  await page.waitForTimeout(700);
  if (action === 'ava') { await page.click('button[aria-label="Ask Ava"]'); await page.waitForTimeout(500); }
  if (action === 'scroll') { await page.evaluate(() => { document.querySelector('.oi-m-screen').scrollTop = 400; }); await page.waitForTimeout(400); }
  if (action?.startsWith('tap:')) { await page.getByRole('button', { name: action.slice(4) }).first().click(); await page.waitForTimeout(500); }
  await page.screenshot({ path: `${DIR}/${name}.png` });
  const m = await page.evaluate(() => {
    const vw = window.innerWidth;
    const all = [...document.querySelectorAll('.oi-mobile-root *')];
    const wide = all.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && !el.closest('.oi-m-filters, .oi-m-peek, .oi-m-segments'); }).length;
    const inter = [...document.querySelectorAll('.oi-mobile-root a[href], .oi-mobile-root button, .oi-mobile-root input, .oi-mobile-root select, .oi-mobile-root textarea, .oi-mobile-root [role=button]')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight; });
    const small = inter.filter((el) => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; }).length;
    const inputs = [...document.querySelectorAll('.oi-mobile-root input, .oi-mobile-root textarea, .oi-mobile-root select')].filter((el) => el.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(el).fontSize) < 16).length;
    return { chars: (document.body.innerText || '').length, wide, small, inter: inter.length, inputs };
  });
  const ok = m.chars > 100 && m.wide === 0 && m.small === 0 && m.inputs === 0;
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(24)} chars=${m.chars} wide=${m.wide} tap<44=${m.small}/${m.inter} inputs<16=${m.inputs}`);
}
for (const e of [...new Set(errors)]) console.log('  ' + e);
await browser.close();
console.log(failures ? `\n  ${failures} screen(s) failed` : `\n  ${SHOTS.length} screens captured to ${DIR}/`);
process.exit(failures ? 1 : 0);

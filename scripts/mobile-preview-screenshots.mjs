/**
 * scripts/mobile-preview-screenshots.mjs
 *
 * Captures every /m/preview screen at 390x844 into mobile-screenshots/, and
 * measures each one: nothing wider than the viewport, no tap target under
 * 44px, no input under 16px, no box-shadow other than the elevation token. The preview is dev-only, so this needs the
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
  ['/m/preview?banner=1', 'home-banner'],
  ['/m/preview/guests', 'guests'],
  ['/m/preview/guests', 'guests-search', 'tap:Search guests'],
  ['/m/preview/guests?add=1', 'guests-add-sheet'],
  ['/m/preview/guests/g3', 'guest-detail'],
  ['/m/preview/plan', 'plan-hub'],
  ['/m/preview/plan', 'plan-hub-scrolled', 'scroll'],
  ['/m/preview/plan/checklist', 'plan-checklist'],
  ['/m/preview/plan/checklist?add=1', 'plan-add-task-sheet'],
  ['/m/preview/plan/budget', 'plan-budget'],
  ['/m/preview/plan/budget/catering', 'plan-budget-category'],
  ['/m/preview/plan/budget?add=1', 'plan-add-expense-sheet'],
  ['/m/preview/plan/schedule', 'plan-schedule'],
  ['/m/preview/plan/event-details', 'plan-event-details'],
  ['/m/preview/plan/messages', 'plan-messages'],
  ['/m/preview/plan/messages/m1', 'plan-message-thread'],
  ['/m/preview/plan/seating', 'plan-seating'],
  ['/m/preview/plan/polls', 'plan-polls'],
  ['/m/preview/plan/wedding-party', 'plan-wedding-party'],
  ['/m/preview/plan/moodboard', 'plan-moodboard'],
  ['/m/preview/plan/suite-accommodation', 'plan-suite-accommodation'],
  ['/m/preview/plan/polls', 'plan-polls-cards'],
  ['/m/preview/plan/styling', 'plan-styling'],
  ['/m/preview/plan/music', 'plan-music'],
  ['/m/preview/plan/music?segment=requests', 'plan-music-requests'],
  ['/m/preview/plan/vows', 'plan-vows'],
  ['/m/preview/plan/vendors', 'plan-vendors'],
  ['/m/preview/plan/vendors', 'plan-vendor-sheet', 'tap:Add vendor'],
  ['/m/preview/plan/marketplace', 'plan-marketplace'],
  ['/m/preview/plan/ceremony', 'plan-ceremony'],
  ['/m/preview/plan/transport', 'plan-transport'],
  ['/m/preview/plan/emergency', 'plan-emergency'],
  ['/m/preview/plan/registry', 'plan-registry'],
  ['/m/preview/plan/registry?segment=received', 'plan-registry-received'],
  ['/m/preview/plan/qna', 'plan-qna'],
  ['/m/preview/plan/good-to-know', 'plan-good-to-know'],
  ['/m/preview/plan/experience', 'plan-experience'],
  ['/m/preview/plan/honeymoon', 'plan-honeymoon'],
  ['/m/preview/plan/send-invites', 'plan-desktop-handoff'],
  ['/m/preview/site', 'site'],
  ['/m/preview/account', 'account'],
  ['/m/preview/account?native=1', 'account-native'],
  ['/m/preview/search', 'search', 'type:ame'],
  ['/m/preview/notifications', 'notifications'],
  ['/m/preview/notifications/settings', 'notification-settings'],
  ['/m/preview/push', 'push-lock-screen'],
  ['/m/preview/images', 'image-slots'],
  ['/m/preview/splash', 'launch-splash'],
  ['/m/preview/greeting', 'launch-greeting'],
  ['/m/preview/welcome', 'welcome'],
  ['/m/preview/login', 'login'],
  ['/m/preview/login?state=error', 'login-error'],
  ['/m/preview/priming', 'notification-priming'],
  ['/m/preview/priming?state=recorded', 'notification-priming-recorded'],
  ['/m/preview?lock=1', 'app-lock'],
  ['/m/preview?offline=1', 'offline'],
  ['/m/preview/plan/vendors', 'plan-vendors-grid', 'tap:Show as grid'],
  ['/m/preview/plan/moodboard', 'plan-moodboard-add', 'tap:Add pin'],
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
  if (action === 'scroll') { await page.evaluate(() => { document.querySelector('.oi-m-screen').scrollTop = 600; }); await page.waitForTimeout(500); }
  if (action?.startsWith('type:')) { await page.keyboard.type(action.slice(5)); await page.waitForTimeout(500); }
  if (action?.startsWith('tap:')) { await page.getByRole('button', { name: action.slice(4) }).first().click(); await page.waitForTimeout(500); }
  await page.screenshot({ path: `${DIR}/${name}.png` });
  const m = await page.evaluate(() => {
    const vw = window.innerWidth;
    const all = [...document.querySelectorAll('.oi-mobile-root *')];
    const wide = all.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && !el.closest('.oi-m-filters, .oi-m-peek, .oi-m-segments, .oi-m-welcome__slides'); }).length;
    const inter = [...document.querySelectorAll('.oi-mobile-root a[href], .oi-mobile-root button:not([data-preview-control]), .oi-mobile-root input, .oi-mobile-root select, .oi-mobile-root textarea, .oi-mobile-root [role=button]')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight; });
    const small = inter.filter((el) => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; }).length;
    const inputs = [...document.querySelectorAll('.oi-mobile-root input, .oi-mobile-root textarea, .oi-mobile-root select')].filter((el) => el.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(el).fontSize) < 16).length;
    const shadows = all.filter((el) => { const b = getComputedStyle(el).boxShadow; return b && b !== 'none' && !/0px 8px 24px/.test(b); }).length;
    return { chars: (document.body.innerText || '').length, wide, small, inter: inter.length, inputs, shadows };
  });
  // A loading state is skeletons by design, so presence is not asked of it.
  // The launch screens are deliberately sparse (a logo; a greeting and one line).
  const ok = (m.chars > 100 || name.includes('state-loading') || name.startsWith('launch-')) && m.wide === 0 && m.small === 0 && m.inputs === 0 && m.shadows === 0;
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(26)} chars=${m.chars} wide=${m.wide} tap<44=${m.small}/${m.inter} inputs<16=${m.inputs} shadows=${m.shadows}`);
}
for (const e of [...new Set(errors)]) console.log('  ' + e);
await browser.close();
console.log(failures ? `\n  ${failures} screen(s) failed` : `\n  ${SHOTS.length} screens captured to ${DIR}/`);
process.exit(failures ? 1 : 0);

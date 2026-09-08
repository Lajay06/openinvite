/* global document, getComputedStyle, navigator */
/**
 * THE BUILDER'S SETTINGS TAB, EXERCISED RATHER THAN READ.
 *
 * P4 was an audit: open every control, use it, and say WORKS / BROKEN / DEAD
 * with evidence. Five of six worked. The sixth was not a broken control but an
 * unreadable one — the toggle labels rendered #333 on the panel's #1C1C1E,
 * measured at 1.35:1 where WCAG AA wants 4.5:1, so "Website is Live" and
 * "Require password" were invisible while working perfectly.
 *
 * That is the shape this file is for: a control can pass every functional
 * check and still fail the person using it, and source review cannot see the
 * difference because both values are in the file, on different lines, in
 * different components.
 *
 * ── THE CONTRAST IS COMPOSITED, NOT NAIVE ───────────────────────────────────
 *
 * The label's colour is rgba(255,255,255,0.75). A ratio taken from the raw
 * channels ignores the alpha and reports 17:1 for something the eye reads at
 * about 11:1 — flattering, and wrong in the direction that hides failures. So
 * the foreground is composited over the measured background first.
 *
 * Usage: npm run test:settings-tab  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';
const AA = 4.5;

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const parse = (c) => { const n = String(c).match(/[\d.]+/g) || []; return { r: +n[0], g: +n[1], b: +n[2], a: n[3] === undefined ? 1 : +n[3] }; };
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (fgCss, bgCss) => {
  const bg = parse(bgCss);
  const fg = over(parse(fgCss), bg);
  const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

console.log('\n  The builder Settings tab:\n');

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 950, seed: SEED });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await ctx.newPage();
const opened = [];
ctx.on('page', (p) => opened.push(p.url()));

await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(5000);
await page.getByRole('button', { name: 'Settings', exact: true }).first().click().catch(() => {});
await page.waitForTimeout(1500);

// PRESENCE BEFORE PROPERTIES: every assertion below is about controls on this
// panel, and a panel that never opened has none of them.
const onPanel = await page.evaluate(() =>
  (document.body.innerText || '').includes('Your site URL') && (document.body.innerText || '').includes('Share on WhatsApp'));
check('the Settings tab opens', onPanel, onPanel ? 'the panel is on screen' : 'no Settings panel');

if (onPanel) {
  // ── the address, which is deliberately not editable ───────────────────────
  const url = await page.evaluate(() => {
    const t = document.body.innerText || '';
    return { shown: /openinvite\.com\.au\/w\//.test(t), editable: !!document.querySelector('input[value*="ada-and-alan"]') };
  });
  check('the site URL is shown', url.shown, 'openinvite.com.au/w/<slug>');
  check('  and is not an input — it follows the names, it is not typed',
    !url.editable, url.editable ? 'an input holds the slug' : 'read-only');

  // ── the two toggles: they work, AND they can be read ──────────────────────
  for (const [aria, what] of [['Toggle Website is Live', 'the status toggle'], ['Toggle Require password', 'the password toggle']]) {
    const btn = page.locator(`button[aria-label^="${aria.split(' Live')[0]}"]`).first();
    const present = await btn.count() > 0;
    check(`${what} is on the panel`, present, present ? aria : 'not found');
    if (!present) { check(`  ${what}'s label can be read`, false, 'not found'); continue; }

    const seen = await page.evaluate((sel) => {
      const b = document.querySelector(sel);
      const span = b.parentElement.querySelector('span');
      let n = span, bg = null;
      while (n && !bg) { const c = getComputedStyle(n).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)') bg = c; n = n.parentElement; }
      return { text: span.innerText, fg: getComputedStyle(span).color, bg: bg || 'rgb(255, 255, 255)' };
    }, `button[aria-label^="${aria.split(' Live')[0]}"]`);
    const r = contrast(seen.fg, seen.bg);
    check(`  ${what}'s label can be read against the panel`, r >= AA,
      `${r.toFixed(2)}:1 — "${seen.text}" ${seen.fg} on ${seen.bg}`);
  }

  // ── the status toggle actually changes the record ─────────────────────────
  const before = await page.locator('button[aria-label^="Toggle Website is"]').first().getAttribute('aria-pressed');
  await page.locator('button[aria-label^="Toggle Website is"]').first().click().catch(() => {});
  await page.waitForTimeout(600);
  const after = await page.locator('button[aria-label^="Toggle Website is"]').first().getAttribute('aria-pressed');
  const label = await page.evaluate(() => document.querySelector('button[aria-label^="Toggle Website is"]')?.parentElement.querySelector('span')?.innerText);
  check('the status toggle flips, and its label says which way',
    before !== after && /Hidden|Live/.test(label || ''), `${before} → ${after}, "${label}"`);

  // ── copy link ─────────────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Copy link' }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => 'DENIED'));
  check('Copy link puts the address on the clipboard', /\/w\/ada-and-alan$/.test(clip), clip);

  // ── whatsapp ──────────────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Share on WhatsApp' }).first().click().catch(() => {});
  await page.waitForTimeout(1800);
  const wa = opened.find((u) => /wa\.me|whatsapp\.com/.test(u));
  check('Share on WhatsApp opens a share with the address in it',
    !!wa && decodeURIComponent(wa).includes('/w/ada-and-alan'), wa ? wa.slice(0, 78) : 'nothing opened');
}

// ── THE QR IS DRAWN HERE, NOT FETCHED ───────────────────────────────────────
//
// It used to be an <img> pointing at api.qrserver.com with the couple's
// wedding address in the query string: a private URL handed to a service we do
// not run, on every render of this tab, failing silently when blocked. The
// check is deliberately in two parts. An inline <svg> proves something is
// drawn; NO EXTERNAL IMAGE HOST anywhere in the panel proves the old path is
// gone rather than merely joined by a new one — a stray <img> beside the svg
// would satisfy the first check on its own.
if (onPanel) {
  const qr = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('div')].find((d) => (d.innerText || '').includes('Your site URL') && (d.innerText || '').includes('Share on WhatsApp'));
    if (!panel) return null;
    return {
      // THE QR SPECIFICALLY, not "an svg somewhere": this panel has
      // twenty-nine icons in it, so a count of all svgs would pass with the
      // QR missing entirely. The QR is the 120x120 one.
      qrSvgs: [...panel.querySelectorAll('svg')].filter((el) => {
        const r = el.getBoundingClientRect();
        return Math.round(r.width) === 120 && Math.round(r.height) === 120;
      }).length,
      // Any remote source at all, not just qrserver: the rule is that this
      // panel makes no third-party request for the couple's address.
      remote: [...panel.querySelectorAll('img, image')]
        .map((el) => el.getAttribute('src') || el.getAttribute('href') || '')
        .filter((u) => /^https?:|^\/\//.test(u)),
      html: panel.innerHTML,
    };
  });
  check('the QR is an inline svg, drawn at its own size', !!qr && qr.qrSvgs === 1,
    qr ? `${qr.qrSvgs} svg(s) at 120x120` : 'no panel');
  check('  and the panel loads no image from anywhere else',
    !!qr && qr.remote.length === 0, qr && qr.remote.length ? qr.remote.join(', ') : 'no remote image sources');
  check('  and qrserver is not referenced at all',
    !!qr && !/qrserver/i.test(qr.html), qr && /qrserver/i.test(qr.html) ? 'still there' : 'gone');
}

await ctx.close();
await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);

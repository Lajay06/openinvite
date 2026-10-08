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
//
// IT USED TO BE IDENTIFIED BY TWO STRINGS 12a DELETED. The probe read
// "Your site URL" and "Share on WhatsApp", which is how this guard went red
// the moment the item removed them, with one failure and nothing else run.
// That is the same defect test:beauty-collapsed had under item 7: a guard that
// recognises a surface by a label the work is allowed to change cannot tell
// "the panel is gone" from "the panel moved on".
//
// It anchors on the two controls the panel exists FOR instead. Both are the
// subject of the contrast measurement below, both are named by aria-label
// rather than by visible copy, and neither is something a copy pass can move.
const onPanel = await page.evaluate(() =>
  !!document.querySelector('button[aria-label^="Toggle Website is"]')
  && !!document.querySelector('button[aria-label^="Toggle Require password"]'));
check('the Settings tab opens', onPanel, onPanel ? 'the panel is on screen' : 'no Settings panel');

if (onPanel) {
  // ── NO ADDRESS ON THE PANEL, which is the 12a inversion ───────────────────
  //
  // This block asserted the opposite until 2026-10-08: "the site URL is shown"
  // and "is not an input". Item 12a removed every URL display from this panel,
  // so what has to be true now is that the address is nowhere ON IT, and the
  // editability question went with the thing being edited.
  //
  // THE PANEL, NOT THE PAGE, and the difference is a real finding rather than
  // a convenience. Read against document.body this went red on two things 12a
  // does not touch and was not asked to: the canvas address bar, which is the
  // device preview's own chrome telling the couple which page they are looking
  // at (it reads "Email · 600px" over an invitation), and the header "Share"
  // button, which navigates to the guest suite's email page and sends nothing.
  // Both are reported with 12a and left alone. A guard scoped to the whole
  // page would have made this item answer for them.
  // THE MARKER IS A CONVENIENCE; THE FALLBACK IS WHAT MAKES A RED HONEST.
  //
  // Scoping every check to `[data-wb-settings-panel]` alone made this guard
  // useless as evidence: run against main, where the marker does not exist,
  // the selector returned nothing, the panel text read as the empty string,
  // and "shows no site URL" PASSED on a panel that prints the URL. The guard
  // still went red overall, on the missing marker, which is the shape of a
  // guard that looks like it bites and does not.
  //
  // So the panel is resolved by its marker when there is one and by walking up
  // from the Status toggle when there is not. Either way the checks below read
  // a real element, and on main they fail on the address and the controls that
  // are actually there.
  const PANEL = `(() => {
    const marked = document.querySelector('[data-wb-settings-panel]');
    if (marked) return marked;
    let n = document.querySelector('button[aria-label^="Toggle Website is"]');
    while (n && n.parentElement && !(n.innerText || '').includes('Require password')) n = n.parentElement;
    return n || null;
  })()`;

  const url = await page.evaluate(`(() => {
    const panel = ${PANEL};
    const t = (panel && panel.innerText) || '';
    return {
      found: !!panel,
      marked: !!document.querySelector('[data-wb-settings-panel]'),
      shown: /openinvite\\.com\\.au\\/w\\//.test(t),
      slugAnywhere: /ada-and-alan/.test(t),
      editable: !!(panel && panel.querySelector('input[value*="ada-and-alan"]')),
    };
  })()`);
  check('the panel was read, by its marker or by its toggle', url.found,
    url.marked ? 'data-wb-settings-panel' : 'found by walking up from the Status toggle');
  check('  and it carries the marker a guard should scope to', url.marked, 'data-wb-settings-panel');
  check('  and shows no site URL', !url.shown, url.shown ? 'openinvite.com.au/w/ is still printed' : 'no address');
  check('  nor the slug under another label', !url.slugAnywhere, url.slugAnywhere ? 'the slug is on screen' : 'no slug');
  check('  and holds no input carrying it either', !url.editable, 'no slug field');

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

  // ── AND NOTHING HANDS A GUEST THE SITE BY LINK ────────────────────────────
  //
  // Copy link and Share on WhatsApp were exercised here and are now asserted
  // absent. ABSENT BY NAME AND BY EFFECT, because either alone is weak: a
  // button renamed "Share" would pass a name check, and a button that opens
  // nothing in a harness would pass an effect check. So the panel is asked for
  // every button it has, and separately nothing is allowed to have opened a
  // wa.me or whatsapp window by the end of the run.
  // ARIA LABELS COUNT, and that is what keeps this from being an empty read.
  //
  // The first version collected `innerText` only and reported "0 buttons, none
  // of them sharing" — a pass. Both toggles on this panel ARE buttons, with an
  // aria-label and a knob div and no text node at all, so filtering on text
  // emptied the pool, and a check over an empty pool passes whatever the panel
  // contains. Reading the accessible name as well gives it something real to
  // be true about, and the count below is asserted, not just printed.
  const buttons = await page.evaluate(`(() => {
    const panel = ${PANEL};
    if (!panel) return [];
    return [...panel.querySelectorAll('button')]
      .map((b) => ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).replace(/\\s+/g, ' ').trim())
      .filter(Boolean);
  })()`);
  check('the panel has controls to check', buttons.length >= 2, `${buttons.length} named buttons`);
  // "SHARE ON", NOT "SHARE". A bare /share/ also matched the header's "Share"
  // button, which navigates to the guest suite's email page: the destination
  // 12a leaves in place, not a channel. The patterns name the four controls
  // the ruling names, in the forms they were actually written in.
  const sharey = buttons.filter((t) => /\bcopy\b|whatsapp|\bqr\b|share on|share via/i.test(t));
  check('  and no copy, share or QR control among them', sharey.length === 0,
    sharey.length ? sharey.join(', ') : `${buttons.length} checked, none of them sharing`);
  // A CHECK THAT COULD ONLY PASS IS NOT A CHECK, so there isn't one here.
  // "nothing opened a wa.me window" was written as corroboration and it is
  // vacuous: the run no longer clicks a WhatsApp button, so the assertion is
  // true on main, where the button is right there, and true here, where it is
  // gone. The `opened` listener stays, because the contrast measurements below
  // and above are the reason this file is a browser guard and a stray popup
  // during them is worth seeing in the log.

  // ── NO QR, AND STILL NO THIRD-PARTY REQUEST FOR THE ADDRESS ───────────────
  //
  // The QR used to be an <img> pointing at api.qrserver.com with the couple's
  // wedding address in the query string: a private URL handed to a service we
  // do not run, on every render, failing silently when blocked. #726 replaced
  // it with a locally drawn svg; 12a removes it entirely.
  //
  // THE SECOND CHECK OUTLIVES THE FIRST ON PURPOSE. "No QR" would be satisfied
  // by a panel that had gone back to fetching one from a remote host and
  // failing to render it. "No remote image anywhere on the panel" is the rule
  // that was actually made, and it holds whether or not a QR ever returns.
  // A HANDLE, NOT AN INJECTED STRING. The two reads above pass PANEL into
  // page.evaluate as source text, which works for them and broke here: a
  // template literal eats the backslashes in `/^https?:|^\/\//`, leaving an
  // unterminated regex and a SyntaxError thrown from inside the browser. The
  // panel is resolved once to an element handle instead, and the function
  // below is a real function with its regexes intact.
  const panelHandle = await page.evaluateHandle(PANEL);
  const qr = await page.evaluate((panel) => {
    if (!panel) return null;
    return {
      squares: [...panel.querySelectorAll('svg')].filter((el) => {
        const r = el.getBoundingClientRect();
        return Math.round(r.width) === 120 && Math.round(r.height) === 120;
      }).length,
      remote: [...panel.querySelectorAll('img, image')]
        .map((el) => el.getAttribute('src') || el.getAttribute('href') || '')
        .filter((u) => /^https?:|^\/\//.test(u)),
      html: panel.innerHTML,
    };
  }, panelHandle);
  check('the panel draws no QR', !!qr && qr.squares === 0,
    qr ? `${qr.squares} svg(s) at 120x120` : 'no panel');
  check('  and loads no image from anywhere else',
    !!qr && qr.remote.length === 0, qr && qr.remote.length ? qr.remote.join(', ') : 'no remote image sources');
  check('  and qrserver is not referenced at all',
    !!qr && !/qrserver/i.test(qr.html), qr && /qrserver/i.test(qr.html) ? 'still there' : 'gone');
}

await ctx.close();
await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);

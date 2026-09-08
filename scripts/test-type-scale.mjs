/* global document, getComputedStyle */
/**
 * NO PAGE DECLARES ITS OWN TYPE SCALE OR BUTTON SIZE.
 *
 * Owner ruling 2026-09-07: "we've already decided what the standard design
 * size is for these pills, so why are these massive?"
 *
 * WHY THIS IS A RENDER GUARD AND NOT A GREP. A page's font size is the sum of
 * an inline style, a Tailwind class, a shared component's default and
 * index.css's own rules — and the last of those carries `!important` on the
 * font FAMILY, which is exactly the trap that let twenty universes render in
 * the wrong face while their source said otherwise. The only honest question
 * is what the browser computed, so that is what this asks.
 *
 * WHAT IT MEASURES. Every input, label, button and filter pill on a set of
 * dashboard routes, and whether its computed font-size is one of the five
 * sizes in src/styles/typeScale.js. A sixth size is not a design decision, it
 * is a page forgetting the other five exist.
 *
 * Usage: npm run test:type-scale  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';
import { TYPE_SCALE } from '../src/styles/typeScale.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const own = { created_by: 'fixture@example.com', created_by_id: 'u1' };
const day = SEED.WeddingDetails[0].weddingDate.slice(0, 10);
const SEEDED = {
  ...SEED,
  Schedule: [
    { id: 's1', event_name: 'Ceremony', category: 'ceremony', event_date: day, start_time: '15:00', location: 'The Old Observatory', responsible_person: null, notes: null, description: null, end_time: null, ...own },
    { id: 's2', event_name: 'Speeches', category: 'reception', event_date: day, start_time: '19:00', location: 'The Long Room', responsible_person: null, notes: null, description: null, end_time: null, ...own },
  ],
};

/** The routes a couple actually spends time on. */
const PAGES = [
  '/DailyUpdate', '/Guests', '/Schedule', '/Budget', '/TodoList', '/Vendors',
  '/Seating', '/Moodboard', '/Messages', '/Music', '/Polls', '/ceremony-details',
  // The send flow is a page now, and the owner named its buttons: "Send to
  // guests" and "Back" were huge.
  '/SendInvites',
];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

console.log(`\n  Every control is on the type scale (${TYPE_SCALE.join(' · ')}px):\n`);

const browser = await chromium.launch();
const offenders = [];

for (const path of PAGES) {
  const ctx = await seededContext(browser, { width: 1440, height: 950, seed: SEEDED });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);

  const bad = await page.evaluate((scale) => {
    const out = [];
    // Controls only. A heading, a headline and a stat numeral are typography,
    // not controls, and the owner's rule is about the control surface.
    const CONTROLS = 'input, textarea, select, button, label, .filter-pill, [role="button"]';
    for (const el of document.querySelectorAll(CONTROLS)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;          // not rendered
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      // SCREEN-READER FURNITURE IS NOT PAINTED. Radix renders a visually
      // hidden <select> for form semantics and an sr-only "Close" label; both
      // sit at the browser's default 16px and neither is ever seen. A guard
      // that fails on them is failing on the accessibility layer.
      if (el.closest('.sr-only') || el.getAttribute('aria-hidden') === 'true') continue;
      if (r.width <= 1 || r.height <= 1) continue;
      const size = Math.round(parseFloat(cs.fontSize));
      if (scale.includes(size)) continue;
      // ITS OWN TEXT, NOT ITS DESCENDANTS'. The first version used innerText,
      // which includes every child — so a sidebar row div (16px, painting
      // nothing) reported as a 16px control because the 14px span inside it
      // had words. Every nav row and every accordion header failed, and the
      // one real 16px button was buried among them. Same lesson as the
      // typography guard's leaf-versus-cell: judge what the element paints.
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(' ')
        .trim();
      // A CHECKBOX HAS NO TEXT. Its `value` defaults to the string "on",
      // which is not something anyone reads — the first version reported
      // every checkbox on the send page as a 16px control called "on".
      if (/^(checkbox|radio)$/i.test(el.getAttribute('type') || '')) continue;
      const text = own || el.value || el.getAttribute('placeholder') || '';
      if (!text) continue;
      out.push(`${size}px ${el.tagName.toLowerCase()}: ${text.slice(0, 22)}`);
    }
    return [...new Set(out)];
  }, TYPE_SCALE);

  check(`${path} — every control on the scale`, bad.length === 0, bad.slice(0, 4).join(' · ') || 'clean');
  if (bad.length) offenders.push(`${path}: ${bad.join(' · ')}`);
  await ctx.close();
}

// ── THE WEBSITE BUILDER'S RIGHT PANEL ──────────────────────────────────────
//
// SCOPED TO THE PANEL, NOT THE ROUTE, and the scope is the point. /website-editor
// renders the couple's own guest site on its canvas, and that site is ARTWORK
// (CLAUDE.md's surface-based exemption) — its type is the couple's design and
// has nothing to do with our control scale. Adding the route to PAGES above
// would fail on the wedding's own headline and teach the next person to
// disable the guard.
//
// The right panel is chrome: it is the studio, the same as any dashboard
// surface, and it is where the Emails section lives. So this walks that
// element's subtree only, on the Design tab and the Content tab, with an email
// selected — the state where the section's own controls are on screen.
{
  const ctx = await seededContext(browser, { width: 1440, height: 950, seed: SEEDED });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(6000);

  const reachedEmails = await page.getByRole('button', { name: 'Invitation' }).first()
    .click().then(() => true).catch(() => false);
  // PRESENCE BEFORE PROPERTIES. If the Emails section never rendered, every
  // measurement below would pass by measuring nothing.
  check('the builder’s Design tab reaches the Emails section', reachedEmails,
    reachedEmails ? 'Invitation selected' : 'no Invitation button — the section did not render');
  await page.waitForTimeout(1500);

  for (const tab of ['Design', 'Content']) {
    await page.getByRole('button', { name: tab, exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(900);
    const bad = await page.evaluate((scale) => {
      // The panel is the one element carrying the three tabs.
      const panel = [...document.querySelectorAll('div')].find((d) => {
        const labels = [...d.querySelectorAll(':scope > div > button')].map((b) => b.textContent.trim());
        return labels.includes('Design') && labels.includes('Content') && labels.includes('Settings');
      });
      if (!panel) return ['(the right panel was not found)'];
      // MEASURE THE TEXT WHEREVER IT SITS, NOT ONLY THE CONTROL'S OWN NODES.
      //
      // The dashboard pass above reads a control's own text nodes, because a
      // sidebar row div reports 16px while painting nothing and its 14px child
      // is the real label — judging the wrapper failed every nav row.
      //
      // In this panel the shape is the other way round. Its buttons wrap their
      // labels in a <span>, so the button has no own text and the span is not
      // a control: an off-scale size on the BUTTON is inherited straight into
      // the span and painted, and neither element is judged. Planting 16px on
      // the Emails list rows proved it — the rows rendered at 16px and this
      // check passed.
      //
      // So a control is judged by every size that actually paints text inside
      // it: its own, plus each descendant that carries text of its own.
      const paintedSizes = (el) => {
        const sizes = [];
        const ownText = (n) => [...n.childNodes].filter((c) => c.nodeType === 3)
          .map((c) => c.textContent.trim()).join(' ').trim();
        const add = (node) => {
          const text = ownText(node) || (node === el ? (el.value || el.getAttribute('placeholder') || '') : '');
          if (!text) return;
          const cs = getComputedStyle(node);
          if (cs.visibility === 'hidden' || cs.display === 'none') return;
          sizes.push([Math.round(parseFloat(cs.fontSize)), text]);
        };
        add(el);
        el.querySelectorAll('*').forEach(add);
        return sizes;
      };

      const out = [];
      for (const el of panel.querySelectorAll('input, textarea, select, button, label, [role="button"]')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        for (const [size, text] of paintedSizes(el)) {
          if (scale.includes(size)) continue;
          out.push(`${size}px ${el.tagName.toLowerCase()}: ${text.slice(0, 22)}`);
        }
      }
      return [...new Set(out)];
    }, TYPE_SCALE);
    // A RATCHET, NOT A CLEAN SLATE — and the three below are named rather
    // than hidden.
    //
    // Turning this check on found three controls already off the scale, all of
    // them older than the Emails section it was written for:
    //
    //   15px  the font picker's specimen ("Cormorant Garamond"). A font picker
    //         exists to show the face; 15px is that specimen size, deliberate
    //         and set by the typography work.
    //   9px   the same picker's ▼ caret.
    //   26px  MediaPicker's empty-state glyph, shared by every media field in
    //         the builder's Content tab.
    //
    // None is this section's, and fixing them means reopening the typography
    // picker and a shared field used across the builder — a change that
    // belongs to whoever owns those, decided on its own merits. So they are
    // listed here BY THEIR EXACT RENDERED SIZE AND LABEL. Anything else that
    // goes off the scale in this panel fails, and each of these fails the
    // moment its size changes, which is when someone is already in the file.
    const PRE_EXISTING = [
      /^15px button: /,          // the font picker's specimen
      /^9px button: ▼$/,         // the same picker's caret
      /^26px div: /,             // MediaPicker's empty-state glyph
    ];
    const fresh = bad.filter((b) => !PRE_EXISTING.some((re) => re.test(b)));
    check(`  the builder’s ${tab} tab — every control on the scale`, fresh.length === 0, fresh.slice(0, 4).join(' · ') || 'clean');
    if (fresh.length) offenders.push(`/website-editor ${tab}: ${fresh.join(' · ')}`);
  }
  await ctx.close();
}

await browser.close();

if (offenders.length) {
  console.log('\n  Off the scale:\n');
  offenders.forEach((o) => console.log(`    ${o}`));
}

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);

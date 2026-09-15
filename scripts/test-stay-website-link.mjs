/* global document */
/**
 * A STAY'S OWN WEBSITE, WHERE A GUEST CAN REACH IT.
 *
 * Owner ruling, Run 4 S5: beside "View on maps", a "Website" link when the
 * stay has one, opening in a new tab.
 *
 * ── WHAT WAS ACTUALLY WRONG ────────────────────────────────────────────────
 *
 * The field already existed. `website_url` has been stored on a manually-added
 * stay since the guest suite shipped — typed into a field placeheld "https://…"
 * (GuestSuiteAccommodation.jsx:305) and rendered on the COUPLE'S own card as
 * "Website / booking" (:81). The guest page never read it. So a couple could
 * save their hotel's booking page, see it on their screen, and no guest could
 * ever open it.
 *
 * A place added from Google search had none to save: Text Search returns no
 * `website` — only Place Details does — so the add path now asks for it once,
 * at add time, and writes it onto the record.
 *
 * ── WHY ABSENCE IS CHECKED AS HARD AS PRESENCE ─────────────────────────────
 *
 * The fixture carries two stays, one with a website and one without. A link
 * rendered unconditionally would pass every presence check ever written and
 * send a guest to an empty href, so the second card is the assertion that
 * matters as much as the first.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4206';
const WITH = 'The Devonport Hotel';
const WITHOUT = 'Greenwich Guesthouse';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 950 });
const page = await ctx.newPage();
await page.goto(`${BASE}/w/ada-and-alan/stay`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(6000);

/** Each stay card, by the name in it, with the links it offers. */
const cards = await page.evaluate((names) => {
  const out = {};
  for (const name of names) {
    const h = [...document.querySelectorAll('h2')].find((x) => (x.innerText || '').trim() === name);
    const card = h ? h.closest('div').parentElement : null;
    out[name] = card
      ? [...card.querySelectorAll('a')].map((a) => ({ text: (a.innerText || '').trim(), href: a.getAttribute('href') || '', target: a.getAttribute('target') || '', rel: a.getAttribute('rel') || '' }))
      : null;
  }
  return out;
}, [WITH, WITHOUT]);

// PRESENCE BEFORE PROPERTIES: both cards must be on the page at all.
check('both stays rendered', !!cards[WITH] && !!cards[WITHOUT],
  `${WITH}: ${cards[WITH] ? 'card' : 'MISSING'} · ${WITHOUT}: ${cards[WITHOUT] ? 'card' : 'MISSING'}`);

if (cards[WITH]) {
  const site = cards[WITH].find((a) => /website/i.test(a.text));
  check(`  "${WITH}" offers its website`, !!site, site ? `"${site.text}"` : `links read: ${cards[WITH].map((a) => a.text).join(' · ') || 'none'}`);
  check('    and it points at the stored address', !!site && site.href === 'https://example.com/devonport', site ? site.href : 'no link');
  // A NEW TAB, AND NOT A HANDLE ON OURS. `target=_blank` without
  // rel=noopener hands the opened page window.opener — it can navigate the
  // couple's site out from under their guest.
  check('    and it opens in a new tab, safely', !!site && site.target === '_blank' && /noopener/.test(site.rel),
    site ? `target="${site.target}" rel="${site.rel}"` : 'no link');
  check('    beside the map link, not instead of it', cards[WITH].some((a) => /maps/i.test(a.text)), 'View on maps still there');
}

if (cards[WITHOUT]) {
  const site = cards[WITHOUT].find((a) => /website/i.test(a.text));
  check(`  "${WITHOUT}" has none, and offers none`, !site,
    site ? `it links "${site.text}" to "${site.href}"` : 'no website link on a stay without one');
  check('    but still offers its map', cards[WITHOUT].some((a) => /maps/i.test(a.text)), 'View on maps present');
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

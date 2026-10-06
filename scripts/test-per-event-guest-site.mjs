/* global document, window */
/**
 * WHO SEES WHICH EVENT ON THE PUBLISHED SITE, PAINTED.
 *
 * Item 6 of goals/2026-10-01-per-event-invitations.md asked for this at 390
 * and 1440 and it could not be written there: the behavior ships in #889, so a
 * guard asserting it on main before that merged would have been red on main.
 * Landing it now is item 2 of goals/2026-10-06-per-event-follow-up.md.
 *
 * WHY A BROWSER AND NOT A PROPERTY CHECK. The resolver is already covered in
 * tests/persistence/guest-site-event-visibility.mjs, forty assertions deep.
 * What that cannot show is whether the celebration page ASKS it: the page
 * builds its own event list with its own ids ('ceremony', not 'main-ceremony')
 * and joins to the resolver through a separate `_eventId`. A rename on either
 * side of that join leaves every property check green and publishes the event
 * anyway. This guard reads the page.
 *
 * THE FIXTURE, AND WHAT MAKES EACH ASSERTION POSSIBLE:
 *
 *   PUBLISHED_GUESTS has one guest removed from the Welcome drinks, so the
 *   event is NOT public, while nobody is removed from either main event, so
 *   both stay public.
 *
 *   PER_EVENT_GUEST is invited to the Welcome drinks and removed from the
 *   Reception, so her link proves both directions at once: it reveals an event
 *   the public page hides, and it withholds an event the public page shows.
 *
 * Both widths, because the goal asked for both and because the celebration
 * page has a separate layout at each.
 */
import { chromium } from 'playwright';
import { seededContext, PUBLISHED_WEDDING, PER_EVENT_TOKEN } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4231';
const SLUG = PUBLISHED_WEDDING.slug;

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** What the page actually painted, plus the overflow the goal asks about. */
async function readCelebration(ctx, url) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);
  const seen = await page.evaluate(() => ({
    text: (document.body.innerText || '').replace(/\s+/g, ' '),
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
  }));
  await page.close();
  return { ...seen, errors };
}

const browser = await chromium.launch();

for (const [w, h] of [[390, 844], [1440, 950]]) {
  console.log(`\n  ${w}px:`);
  const ctx = await seededContext(browser, { width: w, height: h });

  // ── WITHOUT A LINK ──────────────────────────────────────────────────────
  const pub = await readCelebration(ctx, `${BASE}/w/${SLUG}/celebration`);
  check('  the public celebration page rendered at all', pub.text.length > 40,
    pub.text.length ? `${pub.text.length} chars` : 'empty');
  check('  no page error behind it', pub.errors.length === 0, pub.errors.join(' | ') || 'none');
  check('  it shows the ceremony', /Ceremony/.test(pub.text), 'present');
  check('  it shows the reception, which nobody was removed from', /Reception/.test(pub.text), 'present');
  check('  and it HIDES the welcome drinks, which one guest was removed from',
    !/Welcome drinks/.test(pub.text), /Welcome drinks/.test(pub.text) ? 'LEAKED' : 'hidden');
  check('  no horizontal scroll', pub.overflow <= 1, pub.overflow > 1 ? `+${pub.overflow}px` : 'none');

  // ── WITH A PERSONAL LINK ────────────────────────────────────────────────
  const mine = await readCelebration(ctx,
    `${BASE}/w/${SLUG}/celebration?rsvp=${encodeURIComponent(PER_EVENT_TOKEN)}`);
  check('  a personal link rendered', mine.text.length > 40,
    mine.text.length ? `${mine.text.length} chars` : 'empty');
  check('  no page error behind it', mine.errors.length === 0, mine.errors.join(' | ') || 'none');
  check('  her link SHOWS the welcome drinks the public page hides',
    /Welcome drinks/.test(mine.text), /Welcome drinks/.test(mine.text) ? 'revealed' : 'MISSING');
  check('  and NEVER shows the reception she was removed from',
    !/Reception/.test(mine.text), /Reception/.test(mine.text) ? 'LEAKED' : 'withheld');
  check('  she still sees the ceremony', /Ceremony/.test(mine.text), 'present');
  check('  no horizontal scroll', mine.overflow <= 1, mine.overflow > 1 ? `+${mine.overflow}px` : 'none');

  // THE TWO VIEWS MUST DIFFER. If the token were ignored entirely, or the
  // filter dropped, every assertion above could still pass by accident on a
  // page that shows one fixed set to everybody.
  check('  the two views are genuinely different pages',
    /Welcome drinks/.test(mine.text) !== /Welcome drinks/.test(pub.text)
    && /Reception/.test(mine.text) !== /Reception/.test(pub.text),
    'the link changes what is shown');

  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

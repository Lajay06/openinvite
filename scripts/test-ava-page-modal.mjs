/* global getComputedStyle */
/**
 * ONE ASK AVA: ONE SHELL, ONE NAME, ONE COLOUR — AND THE POD STAYS WHERE IT IS.
 *
 * Owner ruling, Run 4 S1: a page-level "Ask Ava to …" button opens THAT PAGE'S
 * modal, with that page's quick actions, in the middle of the screen. It is
 * independent of the bottom-right pod, which the couple opens themselves.
 *
 * Owner ruling, Run 5 T3: there is ONE shell. Every page-level Ask Ava opens
 * the same window, titled "Ask Ava — <that page>", flat, in #E03553. A page's
 * own tool — the vows writer, the seating allocator — renders INSIDE it as its
 * body rather than in a second window of its own.
 *
 * ── WHAT WAS WRONG ─────────────────────────────────────────────────────────
 *
 * `AvaButton` has two behaviours in one component (AvaButton.jsx:14):
 *
 *   onClick given    the page's own <AvaModal>, with its quick actions
 *   onClick absent   openAva() -> a window event -> the Layout's pod
 *
 * Nothing at the call site says which you are getting. On top of that, four
 * separate windows called themselves Ask Ava — five navy page dialogs, the
 * vows writer, the seating allocator, and a 337-line assistant on Our story
 * with a pink-to-purple avatar, a shadow-2xl card and rounded-2xl corners.
 * Twenty-two pages named their modal after a persona ("Vendor expert",
 * "Inspiration curator") rather than after themselves. And the schedule page
 * had no Ask Ava at all: its own pill had been replaced by an empty <div />
 * under the retired spec-3.3 rule, while the calendar it embeds suppressed
 * its button in deference to the pill that was no longer there.
 *
 * ── WHY THE PAGE LIST IS NOT WRITTEN HERE ──────────────────────────────────
 *
 * The previous version of this guard listed FOUR pages. There were thirty-six.
 * A list written by hand is a list of the cases its author had in mind, and
 * twice in one run a hand-written enumeration was narrower than the surface it
 * claimed to cover. Owner ruling: **an enumeration is by import graph or by
 * AST, never by a text pattern of the call form.**
 *
 * So the LIST comes from scripts/lib/avaEntryPoints.mjs, which walks the import
 * graph from AvaButton / AvaModal / openAva. The EXPECTATIONS below are written
 * by hand — a guard that reads both from the file under test agrees with any
 * mistake in it. The two are cross-checked in both directions: an entry point
 * with no expectation fails, and an expectation for a page that no longer has
 * an entry point fails. A new Ask Ava cannot be added quietly.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';
import { avaEntryPoints, avaCallSites, rivalAvaDialogs } from './lib/avaEntryPoints.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4203';

// ── THE EXPECTATIONS, BY HAND ──────────────────────────────────────────────
//
//   modal     a page-level Ask Ava button that opens the shared shell
//   inline    the button runs a generator ON the page and opens no window
//   host      the page renders another page's Ask Ava; covered at that page
//   retired   the page is not routed; nothing can reach its button
//
// `title` is what the shell's header must read after "Ask Ava — ", and it is
// the page's OWN name — the one its DashboardPageHeader shows directly above
// the button. Not a persona: you ask Ava about your vendors, not a "Vendor
// expert".
const EXPECT = {
  Accommodation:           { kind: 'modal', route: '/accommodation',           title: 'Accommodation' },
  Account:                 { kind: 'modal', route: '/account',                 title: 'Account' },
  Beauty:                  { kind: 'modal', route: '/Beauty',                  title: 'Beauty' },
  Budget:                  { kind: 'modal', route: '/Budget',                  title: 'Budget' },
  CeremonyDetails:         { kind: 'modal', route: '/ceremony-details',        title: 'Ceremony details' },
  Checklist:               { kind: 'modal', route: '/Checklist',               title: 'Checklist' },
  EmergencyContact:        { kind: 'modal', route: '/emergency-contact',       title: 'Emergency contacts' },
  EntertainmentDetails:    { kind: 'modal', route: '/EntertainmentDetails',    title: 'Entertainment' },
  EventDetails:            { kind: 'modal', route: '/event-details',           title: 'Event details' },
  FoodBeverage:            { kind: 'modal', route: '/FoodBeverage',            title: 'Food & beverage' },
  Guests:                  { kind: 'modal', route: '/Guests',                  title: 'Guests' },
  GuestSuitePolicies:      { kind: 'modal', route: '/GuestSuitePolicies',      title: 'Good to know' },
  Honeymoon:               { kind: 'modal', route: '/honeymoon',               title: 'Honeymoon' },
  Messages:                { kind: 'modal', route: '/Messages',                title: 'Messages' },
  Moodboard:               { kind: 'modal', route: '/Moodboard',               title: 'Moodboard' },
  Music:                   { kind: 'modal', route: '/Music',                   title: 'Music' },
  OurStory:                { kind: 'modal', route: '/OurStory',                title: 'Our story' },
  Photography:             { kind: 'modal', route: '/Photography',             title: 'Photography & videography' },
  Polls:                   { kind: 'modal', route: '/Polls',                   title: 'Polls & games' },
  QandA:                   { kind: 'modal', route: '/QandA',                   title: 'Q&A' },
  Registry:                { kind: 'modal', route: '/Registry',                title: 'Registry' },
  ScheduleHub:             { kind: 'modal', route: '/Schedule',                title: 'Schedule' },
  // The auto-allocator opens the same shell with its own name — one page,
  // two tools, one window. Extra shells are declared, never ignored.
  Seating:                 { kind: 'modal', route: '/Seating',                 title: 'Seating', alsoTitles: ['allocate seats'] },
  Styling:                 { kind: 'modal', route: '/Styling',                 title: 'Styling' },
  Transport:               { kind: 'modal', route: '/transport',               title: 'Transport' },
  UniverseStudio:          { kind: 'modal', route: '/studio/universe',         title: 'Design studio' },
  VendorMarketplace:       { kind: 'modal', route: '/VendorMarketplace',       title: 'Marketplace' },
  Vendors:                 { kind: 'modal', route: '/Vendors',                 title: 'My vendors' },
  VowsSpeeches:            { kind: 'modal', route: '/VowsSpeeches',            title: 'Vows & speeches' },
  WeddingFavours:          { kind: 'modal', route: '/wedding-favours',         title: 'Wedding favours' },
  WeddingParty:            { kind: 'modal', route: '/wedding-party',           title: 'Wedding party' },

  // The button here calls a generator and the answer appears ON the page —
  // there is no window to be the wrong window. The static half still holds
  // them to the label rule and to importing no dialog of their own.
  GuestSuiteAccommodation: { kind: 'inline', route: '/GuestSuiteAccommodation' },
  GuestSuiteTransport:     { kind: 'inline', route: '/GuestSuiteTransport' },
  GuestSuiteExperience:    { kind: 'inline', route: '/GuestSuiteExperience' },

  // /Checklist is TasksHub showing Checklist.jsx, whose own Ask Ava renders
  // there; the Hub adds none of its own, so it is covered at Checklist.
  // (ScheduleHub is NOT one of these: it renders Calendar.jsx with the
  // calendar's chrome suppressed, so the Hub has to carry the button itself —
  // and for a while neither of them did.)
  TasksHub:                { kind: 'host', covers: 'Checklist' },

  // Overall was retired: /Dashboard redirects to /DailyUpdate and no PAGES key
  // maps to Dashboard.jsx, so its Ask Ava button cannot be reached by anyone.
  // Asserted below rather than assumed — if it is ever routed again, this
  // fails and asks for a real entry.
  Dashboard:               { kind: 'retired', route: '/Dashboard' },
};

// One label is built from state rather than written as a literal, so the AST
// cannot read it. Both branches are named here and checked live.
const DYNAMIC_LABELS = {
  'src/pages/VowsSpeeches.jsx': ['Ask Ava to help write your vows', 'Ask Ava to help write your speech'],
};

const LABEL_SHAPE = /^Ask Ava (to|about) /;

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

// ════════════════════════════════════════════════════════════════════════════
// PART ONE — the whole surface, from the AST. No browser, nothing sampled.
// ════════════════════════════════════════════════════════════════════════════
console.log('\n  The surface, by import graph\n');

const entryPoints = avaEntryPoints();
const { buttons, modals } = avaCallSites();

check('the import graph finds the Ask Ava pages', entryPoints.length >= 30,
  `${entryPoints.length} page modules reach AvaButton / AvaModal / openAva`);

// Both directions. An entry point with no expectation is a page nobody checked;
// an expectation with no entry point is a check that stopped meaning anything.
const missing = entryPoints.filter(p => !EXPECT[p.page]).map(p => p.page);
check('every page the graph finds has an expectation here', missing.length === 0,
  missing.length ? `undeclared: ${missing.join(', ')}` : `${entryPoints.length} declared`);

const found = new Set(entryPoints.map(p => p.page));
const stale = Object.keys(EXPECT).filter(p => !found.has(p));
check('every expectation here is still a page in the graph', stale.length === 0,
  stale.length ? `no longer an entry point: ${stale.join(', ')}` : 'none stale');

// The route is hand-written; the program is asked whether it is a URL that
// actually renders that page. The retired page's route is the URL this guard
// PROBES, not one the router serves — that is the point of it, and it is
// asserted separately below.
const wrongRoute = entryPoints
  .filter(p => EXPECT[p.page]?.route && EXPECT[p.page].kind !== 'retired' && !p.routes.includes(EXPECT[p.page].route))
  .map(p => `${p.page}: this guard says ${EXPECT[p.page].route}, the router says ${p.routes.join(' ') || 'nothing'}`);
check('each route named here is one the router really serves', wrongRoute.length === 0,
  wrongRoute.length ? wrongRoute.join(' | ') : 'all routes confirmed against App.jsx and pages.config.js');

const retired = entryPoints.filter(p => EXPECT[p.page]?.kind === 'retired');
const wronglyLive = retired.filter(p => p.routes.length).map(p => `${p.page} is routed at ${p.routes.join(' ')}`);
check('the retired page is still unreachable', wronglyLive.length === 0,
  wronglyLive.length ? wronglyLive.join(', ') : 'Dashboard.jsx: no route renders it');

// ── The label rule, across every call site in the repo ─────────────────────
//
// Pages AND components: one of the six bare labels found this run was in a
// component, and a page-only sweep would have missed it a second time.
const offShape = buttons.filter(b => {
  if (typeof b.label === 'string') return !LABEL_SHAPE.test(b.label);
  return !DYNAMIC_LABELS[b.file];        // an expression, declared above or not
});
check('every Ask Ava label says what asking will do', offShape.length === 0,
  offShape.length
    ? offShape.map(b => `${b.file}:${b.line} ${JSON.stringify(b.label)}`).join(' | ')
    : `${buttons.length} call sites, all "Ask Ava to …" or "Ask Ava about …"`);

// ── One shell: nobody else holds a window called Ask Ava ───────────────────
const rivals = rivalAvaDialogs();
check('no second window calls itself Ask Ava', rivals.length === 0,
  rivals.length ? rivals.map(r => `${r.file}:${r.line} "${r.title}"`).join(' | ') : 'AvaModal is the only one');

// ── The title in the source is the title this guard expects ────────────────
const titleMismatch = [];
for (const p of entryPoints) {
  const want = EXPECT[p.page];
  if (!want || want.kind !== 'modal') continue;
  for (const m of p.modals) {
    if (m.pageTitle === null) continue;             // built from state; live-checked
    if ((want.alsoTitles || []).includes(m.pageTitle)) continue;
    if (m.pageTitle !== want.title) titleMismatch.push(`${p.page}:${m.line} renders ${JSON.stringify(m.pageTitle)}, expected ${JSON.stringify(want.title)}`);
  }
}
check('each page names its shell after itself', titleMismatch.length === 0,
  titleMismatch.length ? titleMismatch.join(' | ') : `${modals.length} AvaModal call sites`);

// An inline page has no window at all — not a second one, not the shell.
const inlineWithModal = entryPoints
  .filter(p => EXPECT[p.page]?.kind === 'inline' && p.importsModal)
  .map(p => p.page);
check('the inline generators still open no window', inlineWithModal.length === 0,
  inlineWithModal.length ? `${inlineWithModal.join(', ')} now import AvaModal — declare them as modal pages` : 'three pages answer on the page');

// ════════════════════════════════════════════════════════════════════════════
// PART TWO — live, in the browser, page by page.
// ════════════════════════════════════════════════════════════════════════════
const only = (process.env.AVA_PAGES || '').split(',').map(s => s.trim()).filter(Boolean);
const livePages = entryPoints
  .filter(p => EXPECT[p.page]?.kind === 'modal')
  .filter(p => !only.length || only.includes(p.page))
  .map(p => ({ page: p.page, ...EXPECT[p.page] }));

console.log(`\n  Live, ${livePages.length} page${livePages.length === 1 ? '' : 's'}${only.length ? ` (AVA_PAGES=${only.join(',')})` : ''}\n`);

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 950 });

// ── THE CONTROL, AND WHY IT IS FIRST ───────────────────────────────────────
//
// A plant found this blind: DELETING `data-ava-pod` from the pod left the run
// fully green. Every "and the pod is untouched" check asks whether that
// selector matches nothing — and a selector that names nothing at all also
// matches nothing. The guard could not tell a closed pod from a pod with no
// name, so the one assertion the ruling turns on was unfalsifiable.
//
// So the pod is opened deliberately, once, before anything else: if the name
// is gone this fails by name, and the per-page checks below mean what they say.
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Polls`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: /chat with ava/i }).first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const pod = await page.locator('[data-ava-pod]').count();
  check('the pod answers to the name this guard asks it by', pod > 0,
    pod > 0 ? '[data-ava-pod] is on the open pod' : 'the pod opened under no name — every pod check below is vacuous');
  await page.close();
}

// The retired page: asserted, not assumed.
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}${EXPECT.Dashboard.route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  const path = new URL(page.url()).pathname;
  check('the retired page still sends couples elsewhere', !/^\/dashboard$/i.test(path), `/Dashboard -> ${path}`);
  await page.close();
}

const OLD_AVA = { navy: 'rgb(10, 25, 48)' };   // #0A1930, the bespoke navy the page dialogs used

async function checkPage(p) {
  const lines = [];
  const say = (name, ok, detail) => { lines.push([`${p.page}${name}`, ok, detail]); };

  const page = await ctx.newPage();
  await page.goto(`${BASE}${p.route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(7000);

  const btn = page.getByRole('button', { name: LABEL_SHAPE }).first();
  const present = await btn.count() > 0;
  // PRESENCE BEFORE PROPERTIES: without the button, every assertion below is
  // about a click that never happened.
  say(': offers Ask Ava, labelled for what it does', present,
    present ? `"${(await btn.innerText().catch(() => '')).trim()}"` : 'no button whose name starts "Ask Ava to/about"');
  if (!present) { await page.close(); return lines; }

  const before = await page.locator('[role="dialog"]').count();
  say('  nothing is open before the click', before === 0, `${before} dialog(s)`);

  await btn.click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const shell = page.locator('[role="dialog"][data-ava-shell]');
  const opened = await shell.count() > 0;
  const anyDialog = await page.locator('[role="dialog"]').count();
  say('  the click opens the shared shell', opened,
    opened ? '[data-ava-shell]' : anyDialog ? `${anyDialog} dialog(s) opened, none of them the shell` : 'nothing opened');

  if (opened) {
    const text = await shell.first().innerText().catch(() => '');
    say('  titled for this page', text.includes(`Ask Ava — ${p.title}`),
      `"${text.split('\n')[0].slice(0, 52)}"`);

    // The old Ava: a pink-to-purple gradient header, or a bespoke navy one.
    // Computed, over every node in the dialog — a class-name check would miss
    // an inline style, which is how all four of them were written.
    const offences = await shell.first().evaluate((el, OLD) => {
      const out = [];
      for (const n of [el, ...el.querySelectorAll('*')]) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) out.push(`${n.tagName.toLowerCase()}: ${cs.backgroundImage.slice(0, 48)}`);
        if (cs.backgroundColor === OLD.navy) out.push(`${n.tagName.toLowerCase()}: the old navy`);
      }
      return out.slice(0, 3);
    }, OLD_AVA);
    say('  no gradient and no navy inside it', offences.length === 0, offences.join(' | ') || 'flat #E03553');
  }

  const pod = await page.locator('[data-ava-pod]').count();
  say('  and the pod is untouched', pod === 0, pod === 0 ? 'no pod' : 'the pod opened too');

  await page.close();
  return lines;
}

// Four at a time: thirty-one pages one after another is six minutes of
// waiting for the same seeded app to boot.
const queue = [...livePages];
const collected = [];
await Promise.all([0, 1, 2, 3].map(async () => {
  while (queue.length) {
    const p = queue.shift();
    collected.push(await checkPage(p).catch(e => [[`${p.page}: the page could not be visited`, false, String(e).slice(0, 90)]]));
  }
}));
for (const lines of collected.sort((a, b) => String(a[0][0]).localeCompare(String(b[0][0])))) {
  for (const [name, ok, detail] of lines) check(name, ok, detail);
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }

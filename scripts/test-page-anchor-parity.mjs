/**
 * scripts/test-page-anchor-parity.mjs
 *
 * ONE ANCHOR PER PAGE. Within a guest page, the kicker (the universe's own
 * SectionMark), the heading, the paragraph and the quote share ONE alignment
 * and ONE left edge, and that anchor is the mark's: left for the marks that
 * set textAlign left or lay out as a flex row, centered for the two that
 * center. The mark is artwork and stays as designed; the body follows it.
 * Hero mastheads are excluded — their per-universe alignment is design, not
 * drift, and this guard never looks at them.
 *
 * Run it against a build:
 *   CAPTURE_BASE_URL=http://localhost:4173 npm run test:page-anchor-parity
 *
 * WHAT IT MEASURES, AND WHY NOT RECTANGLES ALONE. A bounding box is the box,
 * not the text: a centered paragraph in a full-width box has the box's left
 * edge at the page inset and its glyphs somewhere else entirely. So each
 * element's edge is its FIRST PAINTED LINE — a Range over the first text node,
 * getClientRects() — and elementFromPoint at that line's left-middle must
 * return the element or a descendant, proving the glyphs are painted there
 * and not covered. The mark's edge is its root box (a flex-row mark's kicker
 * sits after an icon; the edge is where the row starts). Computed textAlign
 * is read too, and both must agree.
 *
 * THE FIXTURE IS EACH UNIVERSE'S OWN SAMPLE, routed through the same guest-safe
 * allowlist the endpoint uses, into the published-site path under the render
 * harness. That is a test rendering the same components the builder preview
 * renders; nothing here publishes, writes, or leaves this process.
 *
 * PRE-MORTEM — what would let this pass while the defect exists:
 *   · A page renders its empty state, so there is nothing to misalign.
 *     Guarded: presence of a sample string BEFORE any measurement, per page.
 *   · Only one role is found, so "all equal" is vacuous. Guarded: a page
 *     must yield the mark plus at least one body role, or it fails.
 *   · The declared anchor (Component.anchor) and the painted mark disagree.
 *     Guarded: the measured mark alignment must equal the declaration.
 *   · The mark exists in the DOM but is not painted (opacity, cover).
 *     Guarded: elementFromPoint on the mark's first glyph.
 *   · At 390 every column is full-width, so left edges coincide by
 *     accident. Guarded: 1440 runs too, and textAlign is checked at both.
 */
/* eslint-env browser */
/* global document, getComputedStyle, NodeFilter */
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seededContext, PUBLISHED_WEDDING, dismissEntrance } from './lib/renderHarness.mjs';
import { pickGuestSafeFields } from '../api/_lib/guestSafeWedding.js';
import { UNIVERSE_CONFIGS } from '../src/lib/websiteThemes.js';
import { getSampleWedding } from '../src/lib/sampleContent/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const SLUG = PUBLISHED_WEDDING.slug;
const VIEWPORTS = [390, 1440];
const TOLERANCE = 1.5; // px — subpixel layout, never a design difference

// ── The declared anchor, read off the mark files (they are JSX; Node cannot import them) ──
function declaredAnchors() {
  const reg = readFileSync(resolve(ROOT, 'src/components/guest-website/layouts/sectionMarks.js'), 'utf8');
  const byLayout = {};
  for (const m of reg.matchAll(/'([a-z-]+)': (\w+),/g)) byLayout[m[1]] = m[2];
  const anchorOf = {};
  for (const comp of new Set(Object.values(byLayout).concat('MinimalSectionMark'))) {
    const src = readFileSync(resolve(ROOT, `src/components/guest-website/layouts/${comp}.jsx`), 'utf8');
    const a = src.match(new RegExp(`${comp}\\.anchor = '(left|center)'`));
    if (!a) throw new Error(`${comp}.jsx declares no anchor`);
    anchorOf[comp] = a[1];
  }
  return (layout) => anchorOf[byLayout[layout] || 'MinimalSectionMark'];
}

// ── Pages, with the sample string that proves each rendered ──
const FIELDS = ['homeContent', 'ourStoryContent', 'celebrationContent', 'registryContent', 'musicContent', 'music',
  'qna', 'polls', 'weddingPolicies', 'accommodation', 'transport', 'guestSuiteTransport', 'experienceGuide',
  'mainCeremony', 'reception', 'enabledPages'];
const PAGES = [
  ['home',        (s) => s.homeContent.blocks.find((b) => b.type === 'heading').content.text],
  ['our-story',   (s) => s.ourStoryContent.storyText.slice(0, 40)],
  ['celebration', (s) => s.mainCeremony.venueName],
  ['rsvp',        () => 'RSVP'],
  ['registry',    (s) => s.registryContent.registryMessage.slice(0, 40)],
  ['music',       (s) => s.musicContent.customMessage.slice(0, 40)],
  ['stay',        (s) => s.accommodation.manualProperties[0].name],
  ['transport',   (s) => s.guestSuiteTransport.places[0].name],
  // FAQ and Polls are not prose pages: their rows are the shared accordion
  // button and the poll card, left by construction in every universe. Good to
  // know and Experience render a plain centered h1 rather than the mark and
  // are out of this package's scope. None of the four is measured here.
];

function fixtureFor(id) {
  const sample = getSampleWedding(id);
  const wedding = { ...PUBLISHED_WEDDING, activeUniverse: id };
  for (const f of FIELDS) if (sample[f] !== undefined) wedding[f] = sample[f];
  // The harness fixture carries curated Guest Suite places, which the Stay
  // page prefers over the sample's manual properties. The sample has none, so
  // the fixture's are cleared, or Stay renders the fixture and not the sample.
  wedding.guestSuiteAccommodation = sample.guestSuiteAccommodation ?? { places: [] };
  const { customGifts = [], registryProducts = [] } = PUBLISHED_WEDDING;
  return { body: { ...pickGuestSafeFields(wedding), customGifts, registryProducts }, sample };
}

// Runs in the page. Returns one measurement per role: the first painted line of
// the first element carrying that role, hit-tested, plus computed textAlign.
const MEASURE = () => {
  const norm = (a) => (a === 'start' || a === 'left' ? 'left' : a === 'center' ? 'center' : a);
  const firstLine = (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const rects = [...r.getClientRects()].filter((x) => x.width > 0 && x.height > 0);
      if (rects.length) return rects[0];
    }
    return null;
  };
  const out = {};
  for (const role of ['mark', 'heading', 'paragraph', 'quote']) {
    const el = document.querySelector(`[data-oi-anchor="${role}"]`);
    if (!el) continue;
    // src/index.css sets scroll-behavior: smooth; a rect read mid-scroll lands
    // outside the viewport and elementFromPoint answers null. Instant, then
    // one layout pass.
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    void el.offsetHeight;
    const line = firstLine(el);
    if (!line) { out[role] = { error: 'no painted text' }; continue; }
    const hit = document.elementFromPoint(line.left + 2, line.top + line.height / 2);
    const painted = !!hit && (el === hit || el.contains(hit));
    const root = role === 'mark' ? (el.closest('[data-oi-anchor-root]') || el) : el;
    const box = root.getBoundingClientRect();
    out[role] = {
      textAlign: norm(getComputedStyle(el).textAlign),
      lineLeft: line.left, lineCenter: line.left + line.width / 2,
      edgeLeft: role === 'mark' ? box.left : line.left,
      edgeCenter: role === 'mark' ? box.left + box.width / 2 : line.left + line.width / 2,
      painted, hit: hit ? `${hit.tagName.toLowerCase()}${hit.className ? '.' + String(hit.className).split(' ')[0] : ''}` : null,
      text: el.textContent.trim().slice(0, 40),
    };
  }
  return out;
};

function judge(m, anchor) {
  const roles = Object.keys(m);
  const problems = [];
  if (!m.mark) problems.push('no mark on the page');
  if (roles.filter((r) => r !== 'mark').length === 0) problems.push('no body role found (heading/paragraph/quote)');
  for (const r of roles) {
    if (m[r].error) problems.push(`${r}: ${m[r].error}`);
    else if (!m[r].painted) problems.push(`${r}: not painted where measured (hit ${m[r].hit})`);
  }
  if (problems.length) return problems;
  if (m.mark.textAlign !== anchor) problems.push(`mark paints ${m.mark.textAlign}, declared ${anchor}`);
  for (const r of roles) if (m[r].textAlign !== anchor) problems.push(`${r} textAlign ${m[r].textAlign} ≠ anchor ${anchor}`);
  const key = anchor === 'center' ? 'edgeCenter' : 'edgeLeft';
  const ref = m.mark[key];
  for (const r of roles) {
    const d = Math.abs(m[r][key] - ref);
    if (d > TOLERANCE) problems.push(`${r} ${anchor === 'center' ? 'center' : 'left edge'} ${m[r][key].toFixed(1)} vs mark ${ref.toFixed(1)} (Δ${d.toFixed(1)})`);
  }
  return problems;
}

async function main() {
  const anchorFor = declaredAnchors();
  const ids = Object.keys(UNIVERSE_CONFIGS);
  const browser = await chromium.launch();
  const results = [];
  let ran = 0;
  for (const width of VIEWPORTS) {
    const ctx = await seededContext(browser, { width, height: 900 });
    await dismissEntrance(ctx);
    for (const id of ids) {
      const { body, sample } = fixtureFor(id);
      // Registered after the harness's own stub, so it wins (Playwright matches
      // the most recently registered route first).
      await ctx.route(/\/api\/wedding-by-slug/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }));
      const anchor = anchorFor(UNIVERSE_CONFIGS[id].layout);
      // One page per universe, navigated page to page: a fresh tab per route
      // paid the app's cold start eight times over for every universe.
      const page = await ctx.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const [slug, expectOf] of PAGES) {
        const url = `${BASE}/w/${SLUG}${slug === 'home' ? '' : '/' + slug}`;
        const expect = expectOf(sample);
        let problems;
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 30000 });
          await page.waitForFunction((t) => document.body.innerText.includes(t), expect, { timeout: 15000 });
          const m = await page.evaluate(MEASURE);
          problems = judge(m, anchor);
          results.push({ width, id, slug, anchor, m, problems });
        } catch (err) {
          problems = [`did not render "${expect}": ${err.message.split('\n')[0]}`];
          results.push({ width, id, slug, anchor, m: {}, problems });
        }
        ran += 1;
        if (process.env.ANCHOR_PROGRESS) process.stderr.write(`  ${problems.length ? 'x' : '.'} ${width} ${id} ${slug}\n`);
      }
      await page.close();
      await ctx.unroute(/\/api\/wedding-by-slug/);
    }
    await ctx.close();
  }
  await browser.close();

  const failed = results.filter((r) => r.problems.length);
  console.log(`\n  Page anchor parity — ${ran} page renders (${ids.length} universes × ${PAGES.length} pages × ${VIEWPORTS.length} viewports)\n`);
  for (const r of results) {
    const tag = r.problems.length ? '❌ FAIL' : '✅ PASS';
    const roles = Object.keys(r.m).map((k) => `${k}:${r.m[k].textAlign ?? '?'}@${(r.m[k][r.anchor === 'center' ? 'edgeCenter' : 'edgeLeft'] ?? NaN).toFixed?.(0)}`).join(' ');
    console.log(`  ${tag}  ${String(r.width).padStart(4)}  ${r.id.padEnd(10)} ${r.slug.padEnd(12)} anchor=${r.anchor.padEnd(6)} ${roles}`);
    for (const p of r.problems) console.log(`             · ${p}`);
  }
  const byDefect = {};
  for (const r of failed) for (const p of r.problems) { const k = p.replace(/[\d.]+/g, '#'); byDefect[k] = (byDefect[k] || 0) + 1; }
  console.log(`\n  ${results.length - failed.length}/${results.length} passed, ${failed.length} failed.`);
  if (failed.length) {
    console.log('  Defect classes:');
    for (const [k, n] of Object.entries(byDefect).sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(4)}  ${k}`);
  }
  const outDir = process.env.ANCHOR_REPORT_DIR;
  if (outDir) {
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const { writeFileSync } = await import('node:fs');
    writeFileSync(resolve(outDir, 'page-anchor-parity.json'), JSON.stringify(results, null, 2));
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });

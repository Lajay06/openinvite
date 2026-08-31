/**
 * tests/motion/capture.mjs — capture page-transition frames per universe.
 *
 * Drives the real guest site in chromium, clicks a nav link, and screenshots
 * at fixed offsets through the transition. Frames are compared pixel-wise so
 * the instrument can state whether two universes actually move differently —
 * rather than producing pictures someone has to squint at.
 *
 * VALIDATION FIRST: this is pointed at three universes whose transitions
 * ALREADY differ in the shipped code (brooklyn=slide, aspen=fade,
 * paris=dissolve). If it cannot tell those apart today it cannot verify any
 * change tomorrow — the instrument you invent to grade your own work is the
 * least tested one you will ever use.
 *
 * FULL BUFFERS, NEVER HASHES — and this is not premature caution.
 * The enquiry this harness exists to replace was derailed by exactly that
 * mistake: universes were compared by a fingerprint of
 * `html.length + first-3-hex-colours`, london and tulum collided in it, and
 * "two universes render identically" was reported as a finding. They differ on
 * all nine dimensions. A HASH COLLISION IS A FACT ABOUT THE HASH.
 *
 * So if you are here to make this faster, do not reach for a digest. Comparing
 * a few hundred PNG buffers costs milliseconds; being wrong about whether two
 * worlds move alike costs a week of building the wrong thing.
 *
 * ── WHAT THIS COST TO GET RIGHT, so the next person does not re-pay it ──
 *
 *   1. Waited a fixed 600ms  -> photographed the ENTRANCE, not the transition.
 *   2. Looked for <a> tags   -> at 390px the nav renders BUTTONS.
 *   3. exact: 'Our Story'    -> universes that uppercase their nav change the
 *                               ACCESSIBLE NAME; match case-insensitively.
 *   4. Fixed 3200ms wait     -> the entrance runs 1800-3000ms PER UNIVERSE and
 *                               aria-hides the page beneath, so the control was
 *                               in the DOM and absent from the accessibility
 *                               tree. It failed as "no nav control found",
 *                               which looks like a missing button rather than a
 *                               still-running animation.
 *
 * Every one of those produced a confident wrong answer rather than an error.
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(DIR, '../..');
const OUT = resolve(DIR, 'frames');
const universes = (process.argv[2] || 'brooklyn,aspen,paris').split(',');
const FRAMES_MS = [0, 60, 120, 200, 320];

const { UNIVERSE_CONFIGS } = await import(resolve(ROOT, 'src/lib/websiteThemes.js'))
  .catch(async () => ({ UNIVERSE_CONFIGS: null }));

function weddingPayload(universeId) {
  return {
    id: 'w-capture', slug: 'capture',
    couple1Name: 'John', couple2Name: 'Suzanne', coupleNames: 'John & Suzanne',
    welcomeMessage: 'We are overjoyed to celebrate with you.',
    weddingDate: '2027-06-14', websiteEnabled: true,
    activeUniverse: universeId,
    enabledPages: ['home', 'our-story', 'celebration', 'faq', 'rsvp'],
    qna: [{ question: 'What time should we arrive?', answer: 'By 3pm.' }],
    ourStoryContent: { body: 'We met on a Tuesday.' },
    celebrationContent: { body: 'Dinner at seven.' },
    mainCeremony: {}, reception: {},
  };
}

// BUILD THE BUNDLE HERE, not in a package.json script. The define value is
// JSON, and quoting JSON through npm -> shell -> esbuild mangles it into
// "Invalid define value" — an argv array needs no escaping at all.
execFileSync('npx', ['esbuild', resolve(DIR, 'harness.jsx'),
  '--bundle', `--outfile=${resolve(DIR, 'bundle.js')}`,
  `--alias:@=${resolve(ROOT, 'src')}`,
  `--define:import.meta.env=${JSON.stringify({ MODE: 'test', DEV: false, PROD: true, VITE_BASE44_APP_ID: 't' })}`,
  '--loader:.woff=dataurl', '--loader:.woff2=dataurl', '--loader:.svg=dataurl',
  '--loader:.png=dataurl', '--loader:.jpg=dataurl', '--loader:.mp4=empty',
  '--loader:.css=css', '--log-level=error',
], { cwd: ROOT, stdio: 'inherit' });

// static server for the harness bundle
const files = {
  '/': ['text/html', readFileSync(resolve(DIR, 'index.html'))],
  '/index.html': ['text/html', readFileSync(resolve(DIR, 'index.html'))],
  '/bundle.js': ['application/javascript', readFileSync(resolve(DIR, 'bundle.js'))],
};
const server = createServer((req, res) => {
  const path = req.url.split('?')[0];
  const hit = files[path];
  if (!hit) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': hit[0] });
  res.end(hit[1]);
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = {};

for (const u of universes) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // A URL PREDICATE, NOT A GLOB — enforced by
  // tests/persistence/route-interception-guard.mjs, and the reason is in that
  // file: `page.route('**\/api\/**')` also matches the app's own
  // /src/api/base44Client.js, so the interceptor answers JavaScript with JSON,
  // the browser refuses the MIME type, and EVERY PAGE RENDERS ZERO CHARACTERS
  // while the run happily reports measurements taken on nothing.
  //
  // This harness serves a pre-built bundle rather than Vite modules, so the
  // collision could not occur here — which is exactly the argument that would
  // have reintroduced the bug. The predicate costs nothing and does not depend
  // on how this file happens to be served today.
  await page.route(
    url => url.pathname.startsWith('/api/wedding-by-slug'),
    route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(weddingPayload(u)),
    }));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
  // WAIT FOR THE CONDITION, NOT A DURATION.
  //
  // The EntranceMoment overlay runs 1800-3000ms depending on the universe
  // (brooklyn 1800, london/kyoto 3000, default 2500) and aria-hides the page
  // beneath while mounted — so the nav button is in the DOM but absent from
  // the accessibility tree. A fixed 3200ms wait passed for brooklyn and failed
  // for every universe with a slower entrance, and the failure looked like a
  // missing button rather than a still-running animation.
  //
  // Capturing during the entrance would also photograph the WRONG MOTION and
  // report it as the page transition.
  await page.getByRole('button', { name: /our story/i })
    .first().waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {});

  // At 390px the nav renders BUTTONS, not anchors — clicking by role rather
  // than by href, because the mobile composition is the one guests use.
  //
  // CASE-INSENSITIVE, NOT exact. Several universes apply text-transform:
  // uppercase, which changes the button's ACCESSIBLE NAME to "OUR STORY" —
  // so an exact match silently found nothing on those and the capture
  // reported "no nav control" for a control that was plainly there. A
  // locator written against one universe's typography is the same trap as a
  // grep written against one file's naming.
  const link = page.getByRole('button', { name: /our story/i }).first();
  if (!(await link.count())) {
    // A diagnostic must say what it FOUND, not only that it failed —
    // "not found" is the least useful thing an instrument can report.
    const labels = await page.locator('button').evaluateAll(bs => bs.map(b => b.innerText.trim().slice(0, 20)));
    const body = (await page.innerText('body').catch(() => '')).slice(0, 90).replace(/\n/g, ' | ');
    results[u] = { error: 'no nav control found', buttonsSeen: labels, bodyStart: body };
    await ctx.close(); continue;
  }

  const shots = [];
  const t0 = Date.now();
  await link.click({ noWaitAfter: true });
  for (const ms of FRAMES_MS) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const buf = await page.screenshot({ animations: 'allow' });
    shots.push(buf);
    writeFileSync(resolve(OUT, `${u}-${String(ms).padStart(3, '0')}ms.png`), buf);
  }
  results[u] = { frames: shots.map(b => b.length), shots };
  await ctx.close();
}
await browser.close();
server.close();

// ── DOES THE INSTRUMENT ACTUALLY DISTINGUISH THEM? ──────────────────────────
// Byte-length per frame is a weak proxy; the real question is whether two
// universes' frame SEQUENCES differ. Compare frame-by-frame across universes.
// (A hash collision is a fact about the hash — so compare full buffers.)
const ids = Object.keys(results).filter(k => results[k].shots);
const verdict = {};
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const a = results[ids[i]].shots, b = results[ids[j]].shots;
    const differingFrames = a.filter((buf, k) => !buf.equals(b[k])).length;
    verdict[`${ids[i]} vs ${ids[j]}`] = `${differingFrames}/${a.length} frames differ`;
  }
}
// and: does each universe actually MOVE between its own frames?
const moves = {};
for (const id of ids) {
  const s = results[id].shots;
  moves[id] = `${s.filter((b, k) => k > 0 && !b.equals(s[k - 1])).length}/${s.length - 1} frame-to-frame changes`;
}
for (const id of ids) delete results[id].shots;
writeFileSync(resolve(OUT, 'result.json'), JSON.stringify({ frames: results, moves, verdict }, null, 2));
console.log('  FRAME SIZES  :', JSON.stringify(results));
console.log('\n  DOES IT MOVE?');
for (const [k, v] of Object.entries(moves)) console.log('    ' + k.padEnd(10) + v);
console.log('\n  CAN IT TELL THEM APART?');
for (const [k, v] of Object.entries(verdict)) console.log('    ' + k.padEnd(22) + v);

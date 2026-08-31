/**
 * tests/motion/capture.mjs — capture page-transition frames per universe.
 *
 * Drives the real guest site in chromium, clicks a nav link, and screenshots
 * at fixed offsets through the transition. Frames are compared pixel-wise so
 * the instrument can state whether two universes actually move differently —
 * rather than producing pictures someone has to squint at.
 *
 * VALIDATION FIRST: the instrument you invent to grade your own work is the
 * least tested one you will ever use.
 *
 * AND THIS ONE'S FIRST VALIDATION WAS FALSE. It was pointed at three universes
 * described as already differing -- brooklyn=slide, aspen=fade, paris=dissolve
 * -- and it separated all three. But paris was never `dissolve`: in the code
 * that validation ran against, paris and aspen were BOTH plain `fade`, the
 * same motion twice. The run reported them distinct because the raw signature
 * carries sampled opacity, and two captures of one animation never land on
 * identical hundredths. A MEASURE THAT CANNOT COLLIDE CANNOT VALIDATE.
 *
 * So this file now reports TWO numbers, and only the second one can fail:
 *
 *   - distinct SIGNATURES: saturates at N-of-N. It answers "did anything at
 *     all differ", which sampling jitter alone guarantees. Keep it for
 *     detecting a DEAD capture (identical signatures mean nothing was read),
 *     and never read it as variety.
 *   - distinct MECHANISMS: which properties move and in which direction --
 *     translate x+/x-/y+/y-, scale from >1 or <1, the clip-inset axis, or
 *     opacity alone. Duration and jitter are quotiented out, so two universes
 *     that move the same way COLLIDE HERE, as they should.
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
// THE WINDOW MUST COVER BOTH HALVES. AnimatePresence runs mode="wait": the
// outgoing page finishes its exit before the incoming page begins, so the whole
// event is ~2x the declared duration (480-680ms here). Sampling only to 320ms
// photographed the EXIT and almost none of the entrance -- and for iris,
// dissolve and lift the exit is deliberately the quieter half, so every
// loudness figure for those was reading the smaller of the two numbers the
// guest actually sees.
const FRAMES_MS = [0, 60, 120, 200, 320, 420, 520, 640];
// The guest viewport, declared ONCE. It is both the size the frames are
// captured at and the denominator every loudness figure is divided by; two
// copies of it would let the measure drift from the thing it measures.
const VIEWPORT = { width: 390, height: 844 };

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
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
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
  const sigs = [];
  const t0 = Date.now();
  await link.click({ noWaitAfter: true });
  for (const ms of FRAMES_MS) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const buf = await page.screenshot({ animations: 'allow' });
    shots.push(buf);
    writeFileSync(resolve(OUT, `${u}-${String(ms).padStart(3, '0')}ms.png`), buf);

    // ── THE MOTION SIGNATURE, separate from the picture ──────────────────
    //
    // Full-frame comparison CANNOT answer "do these two move differently".
    // Every universe has its own palette, typeface and masthead, so any two
    // frames differ whatever the motion does — the pixels report appearance
    // and get read as movement. Comparing screenshots across universes is a
    // confounded measure, and it would have reported twenty distinct motions
    // for twenty identical ones.
    //
    // So read the animating element directly: the transform matrix and opacity
    // ARE the transition, and they are independent of how the page looks.
    const sig = await page.evaluate(() => {
      // THE TRANSITION WRAPPER, NOT THE FIRST THING WITH AN OPACITY.
      //
      // `.wb-guest-root [style*="opacity"]` matched the TEXTURE OVERLAY — an
      // absolutely-positioned div with a fixed opacity that is the same element
      // in every universe. So the signature read a constant, twenty universes
      // produced four identical groups, and the before/after runs came back
      // byte-identical because neither was measuring the transition at all.
      //
      // ...and then requiring BOTH opacity AND transform inline made the
      // instrument blind to exactly the motion it had to grade. Framer-motion
      // writes `transform` only when a transform is ANIMATING, so the six
      // universes whose transition has no transform component -- fade
      // (opacity only) and unfold (opacity + clipPath) -- matched nothing and
      // recorded `null`. Six nulls are equal to each other, so they surfaced
      // as one six-way "collision": aspen, havana, kyoto, capetown, mykonos,
      // monaco. A SELECTOR THAT NAMES THE ANIMATING PROPERTIES CANNOT MEASURE
      // WHICH PROPERTIES ANIMATE -- it can only confirm the ones it assumed.
      //
      // Identify the wrapper STRUCTURALLY instead, by what it *is* rather than
      // by what it is currently doing: the in-flow direct child that holds the
      // page content. The texture overlay is absolutely positioned, has no
      // element children and is pointer-events:none; the wrapper is none of
      // those, in every universe and for every transition type.
      const root = document.querySelector('.wb-guest-root');
      if (!root) return null;
      const el = [...root.children].find((n) => {
        if (n.tagName !== 'DIV' || n.children.length === 0) return false;
        const c = getComputedStyle(n);
        return c.position !== 'absolute' && c.position !== 'fixed'
          && c.pointerEvents !== 'none';
      });
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        transform: cs.transform,
        opacity: Number(cs.opacity).toFixed(2),
        clipPath: cs.clipPath === 'none' ? null : cs.clipPath,
      };
    });
    sigs.push(sig);
  }
  results[u] = { frames: shots.map(b => b.length), shots, signature: sigs };
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
// Distinct MOTION signatures — the appearance-independent count.
const sigKey = id => JSON.stringify(results[id].signature);
const bySig = {};
for (const id of ids) (bySig[sigKey(id)] ||= []).push(id);
for (const id of ids) delete results[id].shots;
// PERSIST THE SIGNATURES ACROSS RUNS.
//
// Comparing only within a run means a ten-universe batch can never see a
// collision with a universe in another batch — so the distinct-signature count
// is a FLOOR, never a count. A floor is fine for a finding and useless as an
// acceptance criterion: it can only understate collisions, so a change that
// fixed nothing could still appear to pass.
const SIGFILE = resolve(OUT, 'signatures.json');
let allSigs = {};
try { allSigs = JSON.parse(readFileSync(SIGFILE, 'utf8')); } catch { /* first run */ }
for (const id of ids) allSigs[id] = results[id].signature;
writeFileSync(SIGFILE, JSON.stringify(allSigs, null, 2));

const allBySig = {};
for (const [id, sig] of Object.entries(allSigs)) (allBySig[JSON.stringify(sig)] ||= []).push(id);
const allCollisions = Object.values(allBySig).filter(g => g.length > 1);
console.log('\n  ACROSS EVERY UNIVERSE CAPTURED SO FAR (' + Object.keys(allSigs).length + '):');
console.log('    ' + Object.keys(allBySig).length + ' distinct signatures');
for (const g of allCollisions) console.log('      COLLIDE: ' + g.join(', '));

// ── THE MECHANISM, quotienting out duration and sampling jitter ──────────
//
// Grade WHICH PROPERTIES MOVE AND WHICH WAY, not the sampled numbers. Zero vs
// non-zero is preserved inside clip-path because that is exactly what
// separates a horizontal unfold, inset(0% N%), from a vertical one,
// inset(N% 0%) -- an earlier version normalized every number alike and
// reported four different unfolds as one.
function mechanismOf(frames) {
  const clips = frames.filter(f => f && f.clipPath).map(f => f.clipPath);
  if (clips.length) {
    const v = clips.reduce((a, b) => (b.length > a.length ? b : a));
    return 'clip ' + v.replace(/(?<![\d.])([\d.]+)%/g, (m, n) => (parseFloat(n) === 0 ? '0%' : 'N%'));
  }
  const xs = [], ys = [], sc = [];
  for (const f of frames) {
    const m = f && /^matrix\(([-\d.]+), 0, 0, [-\d.]+, ([-\d.]+), ([-\d.]+)\)$/.exec(f.transform);
    if (m) { sc.push(+m[1]); xs.push(+m[2]); ys.push(+m[3]); }
  }
  // The LEADING sign, not any sign: exit negates the axis, so a push traverses
  // both directions across five frames and "does + appear" cannot tell left
  // from right. The first frame that actually moved is the one that can.
  const lead = (vs) => { for (const v of vs) if (Math.abs(v) > 0.5) return v > 0 ? '+' : '-'; return null; };
  const lx = lead(xs), ly = lead(ys);
  if (lx || ly) return 'translate ' + (lx ? 'x' + lx : '') + (ly ? 'y' + ly : '');
  const moved = sc.find(v => Math.abs(v - 1) > 0.002);
  if (moved !== undefined) return 'scale from ' + (moved > 1 ? '>1' : '<1');
  return 'opacity only';
}
// ── LOUDNESS: a common currency for mechanisms that pixels cannot compare ──
//
// WHY EDGE-PIXELS ARE THE WRONG UNIT, because this is the part that will
// otherwise be re-invented. The first attempt to grade "how big is this
// motion" measured how far the animating edge travelled, and it made a clip
// and a translate look comparable when they are not. `unfold` was reported at
// 118px against push's 9px -- a 13x gap that sounded like a calibration
// problem inside one family. It was not. `inset(42% 0% 42% 0%)` hides the top
// 42% AND the bottom 42%: the page starts as a band showing SIXTEEN PERCENT of
// its area. Measuring one edge's travel described a 6x change in visible area
// as a distance, and undersold it by an order of magnitude.
//
// So measure AREA, not distance: the fraction of the viewport not showing
// settled content, at the frame where that fraction peaks.
//
//   clip     1 - (visible height / H) * (visible width / W)
//   translate 1 - ((W-|tx|)/W) * ((H-|ty|)/H)      the band vacated at the edge
//   scale s   1 - s^2   for s<1;   1 - 1/s^2   for s>1
//
// On this scale the four unfolds sit at 0.84-0.92 and everything else at
// 0.03-0.25 -- so unfold is 7x to 32x louder, not 13x, and matching it by
// translation alone would need 328px on a 390px screen: the page leaving
// rather than a push. That is the number that settled a taste argument.
//
// IT IS A FLOOR, NOT A PEAK, and must be read as one. Loudness is the maximum
// over the SAMPLED frames, and eight samples across a ~640ms event can land
// either side of the true extreme. Widening FRAMES_MS moves the number up and
// never down. So it can say "this is at least this loud" and can compare two
// mechanisms measured the same way; it cannot certify that anything is quiet.
//
// NO NEW DATA IS COLLECTED HERE. The clipPath and transform values have been
// in the signature since the mechanism measure was added; only the denominator
// is new. THE CHEAPEST NEW INSTRUMENT IS A NEW READING OF AN OLD CAPTURE.
function loudnessOf(frames) {
  const { width: W, height: H } = VIEWPORT;
  // CSS shorthand: 1 value -> all sides, 2 -> (block, inline), 3 -> (t, inline,
  // b), 4 -> t r b l. Expanding wrongly would silently swap an axis.
  const sides = (parts) => (parts.length === 1 ? [parts[0], parts[0], parts[0], parts[0]]
    : parts.length === 2 ? [parts[0], parts[1], parts[0], parts[1]]
    : parts.length === 3 ? [parts[0], parts[1], parts[2], parts[1]]
    : parts.slice(0, 4));
  let peak = 0;
  for (const f of frames) {
    if (!f) continue;
    let cover = 1;
    if (f.clipPath) {
      const raw = /inset\(([^)]*)\)/.exec(f.clipPath);
      if (raw) {
        // Resolve against the RIGHT AXIS while the unit is still known: a
        // percentage is already a fraction, a px value is not, and getComputedStyle
        // returns either. Converting to a number first and testing that for '%'
        // is a test that can never pass.
        const frac = (v, axis) => (v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v) / axis);
        const [t, r, b, l] = sides(raw[1].trim().split(/\s+/));
        cover *= Math.max(0, 1 - frac(t, H) - frac(b, H))
               * Math.max(0, 1 - frac(l, W) - frac(r, W));
      }
    }
    const m = /^matrix\(([-\d.]+), 0, 0, [-\d.]+, ([-\d.]+), ([-\d.]+)\)$/.exec(f.transform || '');
    if (m) {
      const [sc, tx, ty] = [+m[1], +m[2], +m[3]];
      cover *= Math.max(0, (W - Math.abs(tx)) / W) * Math.max(0, (H - Math.abs(ty)) / H);
      cover *= sc < 1 ? sc * sc : 1 / (sc * sc);
    }
    peak = Math.max(peak, 1 - cover);
  }
  return peak;
}
const LOUDFILE = resolve(OUT, 'loudness.json');
let allLoud = {};
try { allLoud = JSON.parse(readFileSync(LOUDFILE, 'utf8')); } catch { /* first run */ }
for (const id of ids) allLoud[id] = +loudnessOf(results[id].signature || []).toFixed(3);
writeFileSync(LOUDFILE, JSON.stringify(allLoud, null, 2));

const MECHFILE = resolve(OUT, 'mechanisms.json');
let allMech = {};
try { allMech = JSON.parse(readFileSync(MECHFILE, 'utf8')); } catch { /* first run */ }
for (const id of ids) allMech[id] = mechanismOf(results[id].signature || []);
writeFileSync(MECHFILE, JSON.stringify(allMech, null, 2));

writeFileSync(resolve(OUT, 'result.json'), JSON.stringify({ frames: results, moves, verdict }, null, 2));
console.log('  FRAME SIZES  :', JSON.stringify(results));
console.log('\n  DISTINCT MECHANISMS (duration and jitter quotiented out — THE measure):');
{
  const byMech = {};
  for (const [id, m] of Object.entries(allMech)) (byMech[m] ||= []).push(id);
  const names = Object.keys(byMech).sort();
  console.log('    ' + names.length + ' distinct, across ' + Object.keys(allMech).length + ' universes');
  for (const m of names) console.log('      ' + m.padEnd(26) + byMech[m].join(', '));
}

console.log('\n  LOUDNESS (fraction of the viewport not showing settled content, at peak):');
{
  const es = Object.entries(allLoud).sort((a, b) => b[1] - a[1]);
  for (const [id, v] of es) {
    const bar = '█'.repeat(Math.max(0, Math.round(v * 40)));
    console.log(`    ${id.padEnd(11)}${v.toFixed(3)}  ${bar}`);
  }
  const vals = es.map(([, v]) => v).filter((v) => v > 0);
  if (vals.length > 1) {
    console.log(`    spread: ${Math.min(...vals).toFixed(3)} to ${Math.max(...vals).toFixed(3)}`
      + `  (${(Math.max(...vals) / Math.min(...vals)).toFixed(0)}x)`);
  }
}

console.log('\n  DOES IT MOVE?');
for (const [k, v] of Object.entries(moves)) console.log('    ' + k.padEnd(10) + v);
console.log('\n  CAN IT TELL THEM APART? (full frames — CONFOUNDED by appearance)');
const differing = Object.values(verdict).filter(v => !v.startsWith('0/')).length;
console.log('    ' + differing + ' of ' + Object.keys(verdict).length + ' pairs differ');
console.log('\n  DISTINCT MOTION SIGNATURES (transform+opacity — appearance-independent):');
console.log('    ' + Object.keys(bySig).length + ' distinct, across ' + ids.length + ' universes');
for (const [, group] of Object.entries(bySig)) {
  if (group.length > 1) console.log('      COLLIDE: ' + group.join(', '));
}

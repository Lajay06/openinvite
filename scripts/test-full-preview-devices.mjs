/* global document, getComputedStyle, Image */
/**
 * THE FULL-PAGE PREVIEW SHOWS THE SAME THREE DEVICES THE CANVAS DOES.
 *
 * The builder has two preview surfaces and they are separate implementations:
 * the canvas frame lives in StudioWebsite.jsx, the full-page one in
 * FullScreenPreview.jsx. Each carries its own copy of the device list and its
 * own copy of the widths. Two copies drift; the report that opened this work
 * was that the full-page preview only ever showed desktop.
 *
 * IT DID NOT REPRODUCE (measured 2026-09-08, main at 466f2fa): the toggles are
 * there, and the frame measured 1440 / 768 / 390 across them. So nothing here
 * fixes anything. What this does is pin the property so the next divergence is
 * a red run rather than another report.
 *
 * ── WHY IT COMPARES THE TWO RATHER THAN ASSERTING NUMBERS ────────────────────
 *
 * "Phone is 390" written twice in a guard is a third copy of the same
 * constant, and it goes stale the same way. The property the package actually
 * asks for is SAMENESS: the full preview offers the same devices, with the
 * same icons, at the same widths as the canvas. So each width is measured on
 * BOTH surfaces in the same run and compared, and only the literal 390 — the
 * one number the report named — is also pinned outright.
 *
 * ── AND IT IS ACTUALLY ON SCREEN ────────────────────────────────────────────
 *
 * The first version of this guard passed on a build where the toolbar was
 * invisible. The builder's own header was sticky at z-index 100 and the shared
 * modal wrapper paints at 50, so the header covered the preview's toolbar:
 * the device toggles were present, measurable, and answered every click,
 * because Radix drops pointer-events on the page behind an open dialog — so
 * elementFromPoint named the toggle while the pixels showed the header. That
 * IS what the report described. Widths and hit-testing both read correct.
 *
 * So the toolbar's colour is read off a screenshot: the page is asked to
 * decode the capture into a canvas and hand back the pixel. #0A0A0A is the
 * toolbar, rgb(28,28,30) is the header that used to be over it. A guard that
 * cannot tell those apart cannot see the defect it exists for.
 *
 * ── PRESENCE BEFORE PROPERTIES ──────────────────────────────────────────────
 *
 * Both frames are located by their own painted background against their
 * container's, and a frame that cannot be found is reported as a failure, not
 * skipped. Without that, a preview that never opened would satisfy every
 * comparison below by measuring nothing twice.
 *
 * ── AND THE SAME INVERSION ON THE OTHER PAGES THAT HAD IT ───────────────────
 *
 * The cover was not a preview bug, it was page chrome outranking the modal
 * layer, and two more pages carried the identical `zIndex: 100` sticky header.
 * They have no full-page preview to measure, so the last section stands a
 * PROBE at the modal layer's own z-index — read out of dialog.jsx rather than
 * typed here, so it cannot drift from the wrapper it stands for — and reads
 * the pixel. Chrome that paints over the probe would paint over a dialog.
 *
 * Usage: npm run test:full-preview-devices  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

/** id, the toolbar label, and the lucide icon both surfaces must use. */
const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: 'lucide-monitor' },
  { id: 'tablet', label: 'Tablet', icon: 'lucide-tablet' },
  { id: 'mobile', label: 'Mobile', icon: 'lucide-smartphone' },
];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/**
 * The white page frame inside a dark container. Identified by the pair of
 * backgrounds rather than a test hook, so it is the real painted frame that
 * gets measured. `scope` is 'canvas' or 'preview'.
 */
const frameBox = (page, scope) => page.evaluate((which) => {
  const root = which === 'preview' ? document.querySelector('[role="dialog"]') : document.body;
  if (!root) return null;
  const white = [...root.querySelectorAll('div')].find((d) => {
    if (getComputedStyle(d).backgroundColor !== 'rgb(255, 255, 255)') return false;
    const parentBg = d.parentElement && getComputedStyle(d.parentElement).backgroundColor;
    // #1C1C1E behind the canvas, #111111 behind the full preview.
    return parentBg === 'rgb(28, 28, 30)' || parentBg === 'rgb(17, 17, 17)';
  });
  if (!white) return null;
  const r = white.getBoundingClientRect();
  const c = white.parentElement.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), containerW: Math.round(c.width) };
}, scope);

/**
 * The canvas toggles are icon-only, which is what separates them from the
 * toolbar's own Preview button — that one carries a Monitor icon too, and
 * clicking it by icon opens the very dialog this is trying to measure against.
 */
/**
 * The colour actually painted at a point, read from a real capture. The
 * browser decodes its own screenshot, so no image dependency is needed and
 * nothing about the page is disturbed to take the measurement.
 */
async function pixelAt(page, x, y, height = 48) {
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height } });
  return page.evaluate(([b64, px, py]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(px, py, 1, 1).data;
      resolve(`rgb(${d[0]}, ${d[1]}, ${d[2]})`);
    };
    img.onerror = () => resolve('undecodable');
    img.src = `data:image/png;base64,${b64}`;
  }), [shot.toString('base64'), x, y]);
}

const canvasToggle = (page, icon) =>
  page.locator(`button:has(svg.${icon})`).filter({ hasNotText: /\S/ }).first();

console.log('\n  The full-page preview and the canvas offer the same devices:\n');

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 900, seed: SEED });
const page = await ctx.newPage();
await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(5000);

// ── the canvas, first, because it is the reference the package names ────────
const canvas = {};
const canvasOpened = await frameBox(page, 'canvas');
check('the builder canvas rendered a page frame', !!canvasOpened,
  canvasOpened ? `${canvasOpened.w}x${canvasOpened.h}` : 'no white frame in the canvas');

// The header dropped below the modal layer to stop covering the preview. It
// still has to sit above the canvas that scrolls under it, and the same pixel
// read that caught the covering says so: #1C1C1E, with nothing over it.
const headerPixel = await pixelAt(page, 10, 24);
check('with no preview open, the builder header is what is painted at the top',
  headerPixel === 'rgb(28, 28, 30)', headerPixel);

for (const d of DEVICES) {
  const hit = await canvasToggle(page, d.icon).click().then(() => true).catch(() => false);
  if (!hit) { check(`the canvas has a ${d.label.toLowerCase()} toggle`, false, `no button with ${d.icon}`); continue; }
  await page.waitForTimeout(900);
  canvas[d.id] = await frameBox(page, 'canvas');
}

// ── then the full-page preview ──────────────────────────────────────────────
// The toolbar's Preview button is the first of the two on the page; the other
// is the canvas edit/preview pill.
await page.getByRole('button', { name: /^Preview$/ }).first().click().catch(() => {});
await page.waitForTimeout(3000);

const dialogOpen = await page.locator('[role="dialog"]').count() > 0;
check('the top-right Preview opens the full-page preview', dialogOpen,
  dialogOpen ? 'dialog on screen' : 'no dialog');

if (dialogOpen) {
  // THE TOOLBAR IS THE THING YOU SEE, not the thing that answers a click.
  // Two samples either side of the device pills, both inside the toolbar's
  // own 48px band. #0A0A0A is the toolbar; rgb(28, 28, 30) is the builder
  // header that used to paint over it.
  const left = await pixelAt(page, 10, 24);
  const right = await pixelAt(page, 1430, 24);
  check('the preview toolbar is the thing painted at the top of the screen',
    left === 'rgb(10, 10, 10)' && right === 'rgb(10, 10, 10)',
    `left ${left} · right ${right}`);

  for (const d of DEVICES) {
    const btn = page.locator(`[role="dialog"] button:has(svg.${d.icon})`).first();
    const present = await btn.count() > 0;
    check(`the full preview offers ${d.label.toLowerCase()}, with the canvas's icon`, present,
      present ? d.icon : `no button carrying ${d.icon}`);
    if (!present) {
      // Report the same results a reachable device would, all red. Skipping
      // them would shrink the run's total, and a guard whose count moves with
      // the defect is one whose count means nothing.
      check(`its ${d.label.toLowerCase()} frame is the width the canvas uses`, false, 'not reachable');
      if (d.id === 'mobile') check('the phone frame measures exactly 390', false, 'not reachable');
      continue;
    }

    await btn.click().catch(() => {});
    await page.waitForTimeout(1200);
    const got = await frameBox(page, 'preview');
    const want = canvas[d.id];
    // Desktop is 100% on both surfaces, and the two containers are different
    // sizes, so the shared property there is "fills its container" — comparing
    // the raw pixels would fail on a correct build. Tablet and phone are fixed
    // pixel widths, and those must match each other exactly.
    const same = d.id === 'desktop'
      ? !!got && !!want && got.w === got.containerW && want.w === want.containerW
      : !!got && !!want && got.w === want.w;
    const detail = d.id === 'desktop'
      ? `preview ${got ? `${got.w} of ${got.containerW}` : 'no frame'} · canvas ${want ? `${want.w} of ${want.containerW}` : 'no frame'}`
      : `preview ${got ? got.w : 'no frame'} · canvas ${want ? want.w : 'no frame'}`;
    check(`its ${d.label.toLowerCase()} frame is the width the canvas uses`, same, detail);

    // The one number the report named, pinned outright: a phone is 390.
    if (d.id === 'mobile') {
      check('the phone frame measures exactly 390', !!got && got.w === 390,
        got ? `${got.w}x${got.h}` : 'no frame');
    }
  }
}

await ctx.close();

// ── the same inversion, on the pages that shared it ─────────────────────────
//
// THE MODAL LAYER'S Z-INDEX IS READ, NOT TYPED. dialog.jsx is the one place
// that decides what a dialog paints at; a number copied here would go stale
// the moment someone changed it there, and the guard would keep passing
// against a layer that no longer exists.
const dialogSrc = readFileSync(resolve(ROOT, 'src/components/ui/dialog.jsx'), 'utf8');
const modalZ = (() => {
  const m = dialogSrc.match(/fixed inset-0 z-(\d+) bg-black/);
  return m ? Number(m[1]) : null;
})();
check('the modal layer\u2019s z-index can be read off dialog.jsx', modalZ !== null,
  modalZ === null ? 'the overlay class no longer matches — this guard is measuring nothing' : `z-${modalZ}`);

/**
 * Stands a probe at the modal layer and reports what is painted over it.
 * Portalled to <body> so it shares the root stacking context a Radix dialog
 * portals into, and given a colour nothing in the product uses.
 */
async function chromeUnderModalLayer(page, z) {
  await page.evaluate((zi) => {
    const el = document.createElement('div');
    el.id = 'modal-layer-probe';
    el.style.cssText = `position:fixed;left:0;top:0;width:100%;height:80px;background:rgb(0,255,0);z-index:${zi};pointer-events:none`;
    document.body.appendChild(el);
  }, z);
  await page.waitForTimeout(400);
  const painted = await pixelAt(page, 20, 20, 80);
  await page.evaluate(() => document.getElementById('modal-layer-probe')?.remove());
  return painted;
}

const PAGES_THAT_HAD_IT = [
  { label: 'the guest suite\u2019s top bar', path: '/studio/guest-suite/policies', expect: 'Guest Suite' },
];

if (modalZ !== null) {
  for (const p of PAGES_THAT_HAD_IT) {
    const c = await seededContext(browser, { width: 1440, height: 900, seed: SEED });
    const pg = await c.newPage();
    await pg.goto(`${BASE}${p.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await pg.waitForTimeout(4500);

    // PRESENCE BEFORE PROPERTIES: a page that never rendered its header has
    // nothing over the probe either, and would pass by being empty.
    const text = await pg.evaluate(() => document.body.innerText || '');
    const rendered = text.includes(p.expect);
    check(`${p.label} rendered`, rendered,
      rendered ? p.path : `${p.path} — "${p.expect}" is not on the page`);

    if (rendered) {
      const painted = await chromeUnderModalLayer(pg, modalZ);
      check(`  and nothing it paints sits above the modal layer`,
        painted === 'rgb(0, 255, 0)', painted === 'rgb(0, 255, 0)' ? `probe at z-${modalZ} is on top` : `${painted} is painted over a z-${modalZ} overlay`);
    } else {
      check(`  and nothing it paints sits above the modal layer`, false, 'the page did not render');
    }
    await c.close();
  }
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);

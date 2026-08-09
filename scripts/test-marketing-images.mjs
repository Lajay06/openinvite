#!/usr/bin/env node
/**
 * Guard for full-bleed marketing photo delivery.
 *
 * WHY THIS EXISTS
 * PR #373 swapped the About and Tour hero photos. About gained a print master
 * with responsive delivery; Tour silently LOST both and picked up a hand-rolled
 * `c_crop,x_0,y_0,w_1190,h_640` URL with no srcSet. Nothing failed. The build
 * passed, the route rendered, the smoke test was green — and /tour shipped a
 * 1190px image into a 3784px-wide box, 0.31x of the device pixels it needed at
 * devicePixelRatio 2. It stayed that way until the owner noticed it by eye.
 *
 * Two failure modes, both invisible to `npm run build`:
 *
 *   1. A hero or end cap goes back to a hand-written Cloudinary URL, losing
 *      responsive delivery. Caught by the source scan below.
 *   2. A srcset advertises a width the master cannot honour. `c_limit` never
 *      upscales, so it quietly returns the smaller master while the browser
 *      believes it received the width it asked for and paints it as if sharp.
 *      Caught by comparing every declared descriptor against the pixels
 *      Cloudinary actually returns.
 *
 * Run: npm run test:marketing-images
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { responsivePhoto } from "../src/lib/marketingImage.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const ACCEPT = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (p.endsWith(".jsx") || p.endsWith(".js")) yield p;
  }
}

const CALL = /responsivePhoto\(\s*["']([^"']+)["']\s*,\s*(\d+)\s*(?:,\s*(\{[\s\S]*?\}))?\s*\)/g;
// A hero/end-cap image prop fed a literal Cloudinary URL rather than the helper.
const RAW = /(?:image|src)=\{?"(https:\/\/res\.cloudinary\.com\/[^"]+)"/g;
// Components whose photo is full-bleed behind text, where softness shows most.
const FULL_BLEED = /<Marketing(Hero|EndCap)\b/;

let failures = 0;
const fail = (msg) => { failures++; console.log(`  ✗ ${msg}`); };

console.log("Marketing full-bleed image delivery\n");

// ── 1. No hero or end cap may hand-roll its URL ──────────────────────────
console.log("Responsive delivery is wired up:");
for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  if (!FULL_BLEED.test(text)) continue;
  const rel = file.replace(SRC, "src");
  for (const m of text.matchAll(RAW)) {
    // Only the full-bleed props matter; inline editorial photos are out of scope.
    const before = text.slice(Math.max(0, m.index - 400), m.index);
    if (/<Marketing(Hero|EndCap)\b[^>]*$/.test(before)) {
      fail(`${rel}: hero/end-cap URL written by hand, bypassing responsivePhoto()\n      ${m[1].slice(0, 88)}`);
    }
  }
}
if (!failures) console.log("  ✓ every MarketingHero/MarketingEndCap photo goes through responsivePhoto()");

// ── 2. Every advertised srcset width must be one the master can deliver ──
const calls = [];
for (const file of walk(SRC)) {
  for (const m of readFileSync(file, "utf8").matchAll(CALL)) {
    const opts = {};
    if (m[3]) {
      const t = /transform:\s*["']([^"']+)["']/.exec(m[3]);
      const c = /croppedWidth:\s*(\d+)/.exec(m[3]);
      const f = /cropFraction:\s*\{\s*w:\s*([\d.]+)\s*,\s*h:\s*([\d.]+)/.exec(m[3]);
      if (t) opts.transform = t[1];
      if (c) opts.croppedWidth = Number(c[1]);
      if (f) opts.cropFraction = { w: Number(f[1]), h: Number(f[2]) };
    }
    calls.push({ file: file.replace(SRC, "src"), id: m[1], w: Number(m[2]), opts });
  }
}

/**
 * Real delivered dimensions, without downloading the body.
 *
 * There is no x-cld-width header — an earlier draft of this guard checked for
 * one and silently passed everything, which is worth knowing before "trusting"
 * a green run. Cloudinary puts the truth in Server-Timing instead:
 *   content-info;desc="width=3840,height=2880,...,owidth=6667,oheight=5000,..."
 * `width` is what was delivered, `owidth` is the master. Both matter here.
 */
function dimensions(res) {
  const t = res.headers.get("server-timing") || "";
  const w = /[^o]width=(\d+)/.exec(t);
  const ow = /owidth=(\d+)/.exec(t);
  return { width: w ? Number(w[1]) : 0, sourceWidth: ow ? Number(ow[1]) : 0 };
}

console.log(`\nDelivered pixels match advertised descriptors (${calls.length} photos):`);
let checked = 0;

for (const c of calls) {
  const { src, srcSet } = responsivePhoto(c.id, c.w, c.opts);
  const urls = [...new Set([src, ...srcSet.split(", ").map((s) => s.split(" ")[0])])];
  const problems = [];

  for (const url of urls) {
    const res = await fetch(url, { method: "HEAD", headers: { Accept: ACCEPT } });
    checked++;
    if (!res.ok) { problems.push(`HTTP ${res.status} — ${url}`); continue; }
    const declared = Number(/w_(\d+),c_limit/.exec(url)[1]);
    const { width, sourceWidth } = dimensions(res);
    if (!width) { problems.push(`no Server-Timing content-info — cannot verify ${url}`); continue; }
    if (width !== declared) {
      problems.push(
        `advertises ${declared}w but delivers ${width}px. c_limit hit the ` +
        `master's real width, so the browser is picking this candidate ` +
        `believing it is sharper than it is.`
      );
    }
    // The sourceWidth in the code is a claim about the asset. Check it, so
    // swapping in a smaller master cannot quietly widen the ladder past it.
    if (!c.opts.croppedWidth && sourceWidth && sourceWidth !== c.w) {
      problems.push(`responsivePhoto(..., ${c.w}) but the master is ${sourceWidth}px wide`);
    }
  }

  if (problems.length) {
    console.log(`  ✗ ${c.file}  ${c.id.slice(0, 44)}`);
    problems.forEach((p) => fail(`    ${p}`));
  } else {
    const top = srcSet.split(", ").pop().split(" ")[1];
    console.log(`  ✓ ${c.file.padEnd(24)} ${c.id.slice(0, 42).padEnd(44)} up to ${top}`);
  }
}

console.log("\n" + "=".repeat(60));
if (failures) {
  console.log(`${failures} problem(s) across ${checked} URLs.`);
  process.exit(1);
}
console.log(`All ${calls.length} full-bleed photos deliver what they advertise (${checked} URLs checked).`);

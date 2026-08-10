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

// ── 1b. No full-bleed photo may be served from outside our CDN ───────────
//
// The check above only sees Cloudinary URLs on the two shared components. It
// could not see the failure that actually happened: a base44-builder "Visual
// edits" commit repointed UniverseMiniHero's 100vh photo at media.base44.com,
// which shipped a 7.76 MB raw print master with no resize, no format
// negotiation and no srcset. Off our CDN means outside every protection here,
// so a full-bleed image hosted anywhere else is a failure by definition —
// not a warning, because a warning is how the last one survived.
//
// "Full-bleed" is detected structurally: an <img>/background whose own styles
// say it fills its box (100% width AND height, or position:absolute + inset:0)
// alongside objectFit cover, or a backgroundImage on a 100vh section. Small
// inline editorial photos and the nav logo are out of scope.
console.log("\nFull-bleed photos are on our own CDN:");
// Terminators include ) so the CSS `url(https://...)` form is caught. Missing
// that is how the Home hero — the first image every visitor sees — stayed
// invisible to the first draft of this check.
const FOREIGN = /(https?:\/\/(?!res\.cloudinary\.com)[^"'`\s)]+\.(?:jpe?g|png|webp|avif))/gi;

/** Does this slice of source describe an image that fills its box? */
const fullBleedNear = (s) =>
  (/objectFit:\s*["']cover["']/.test(s) &&
    /(width:\s*["']100%["'][\s\S]{0,240}height:\s*["']100%["']|inset:\s*0)/.test(s)) ||
  (/backgroundImage/.test(s) && /(100vh|minHeight:\s*["']100vh["'])/.test(s));

// KNOWN, RECORDED, AND NOT YET FIXED.
//
// These four full-bleed photos are served from static.wixstatic.com and so get
// no f_auto, no q_auto and no responsive ladder. They pre-date this check and
// are listed here so the guard can fail on anything NEW while these are dealt
// with deliberately. This list may only ever shrink. Adding to it needs a
// reason better than "the build was red".
//
// Measured 2026-08-10 (all four are 100vw x 100vh, object-fit cover):
//   Home HERO      1280x960 JPEG  664 KB  0.44x @1440/dpr2, 0.57x @390/dpr2
//   Home banner    1280x853 JPEG  200 KB  0.44x @1440/dpr2, 0.51x @390/dpr2
//   Budget block   see report in the PR that added this list
// Wix CAN serve adaptively (/v1/fill/w_,h_,q_/file.webp works) but the site
// requests the bare original, so none of it is in use. The masters are only
// 1280 wide — Wix upscales past that without capping and the extra pixels are
// interpolated, so moving to its transforms buys format and mobile weight,
// NOT sharpness.
const OFF_CDN_ALLOWLIST = new Set([
  "https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg", // Home hero
  "https://static.wixstatic.com/media/d2df22_c34b84a5b42f49b0963b953b94c0e8c4~mv2.jpg", // Home red banner
  "https://static.wixstatic.com/media/d2df22_2d4ea077497f48679138b2e04dbc7e3a~mv2.jpg", // Home budget block
]);

const WINDOW = 700;
let offCdn = 0;
const known = [];

for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  const rel = file.replace(SRC, "src");
  for (const m of text.matchAll(FOREIGN)) {
    const at = m.index;
    // Direct use: the styles sit right next to the URL.
    let flagged = fullBleedNear(text.slice(Math.max(0, at - WINDOW), at + WINDOW));

    // Indirect use: `const IMG_SRC = "https://..."` at the top of the file and
    // the full-bleed styles hundreds of lines below. Resolve the binding and
    // look around each place the name is actually used — ValuePropSection is
    // exactly this shape, and a window around the declaration alone misses it.
    if (!flagged) {
      const decl = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["'`]?[^"'`\n]*$/.exec(text.slice(0, at));
      if (decl) {
        const name = decl[1];
        for (const u of text.matchAll(new RegExp(`\\b${name}\\b`, "g"))) {
          if (u.index === decl.index) continue;
          if (fullBleedNear(text.slice(Math.max(0, u.index - WINDOW), u.index + WINDOW))) { flagged = true; break; }
        }
      }
    }
    if (!flagged) continue;

    if (OFF_CDN_ALLOWLIST.has(m[1])) { known.push(`${rel}  ${m[1].slice(30, 90)}`); continue; }

    offCdn++;
    fail(
      `${rel}: full-bleed photo served from outside our CDN — no f_auto, no q_auto,\n` +
      `      no responsive ladder, and invisible to every check below.\n` +
      `      ${m[1].slice(0, 96)}`
    );
  }
}
if (!offCdn) console.log("  ✓ no NEW full-bleed photo is served from a third-party host");
if (known.length) {
  console.log(`  ! ${known.length} known off-CDN full-bleed photo(s) still outstanding — see OFF_CDN_ALLOWLIST:`);
  known.forEach((k) => console.log(`      ${k}`));
}

// ── 2. Every advertised srcset width must be one the master can deliver ──
const calls = [];
for (const file of walk(SRC)) {
  for (const m of readFileSync(file, "utf8").matchAll(CALL)) {
    const opts = {};
    if (m[3]) {
      const t = /transform:\s*["']([^"']+)["']/.exec(m[3]);
      const c = /croppedWidth:\s*(\d+)/.exec(m[3]);
      if (t) opts.transform = t[1];
      if (c) opts.croppedWidth = Number(c[1]);
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

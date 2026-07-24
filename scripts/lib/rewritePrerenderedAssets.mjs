/**
 * scripts/lib/rewritePrerenderedAssets.mjs
 *
 * Fixes the root cause of a production incident: the committed prerendered/
 * snapshots hardcode /assets/*.js|css filenames from whatever local build
 * generated them. Vite hashes those filenames from the built chunk's own
 * content — and SENTRY_AUTH_TOKEN is set on Vercel (Preview and Production),
 * so @sentry/vite-plugin injects a fresh, unique debug ID into every single
 * `vite build` invocation, changing the chunk's content and therefore its
 * hash even when the source is byte-identical. Vercel's buildCommand runs
 * `vite build` fresh on every deploy, so a snapshot committed after one
 * build will already reference filenames that don't exist in the very next
 * build's dist/assets — confirmed live: fetching the stale-referenced
 * /assets/index-*.js returned the SPA-fallback index.html (content-type
 * text/html) instead of JavaScript, so the app never booted.
 *
 * The fix: at apply time (after the real `vite build` for THIS deploy has
 * already run), read that build's own dist/index.html — the one Vite just
 * produced, never prerendered — to find the CURRENT main entry script and
 * stylesheet. Rewrite every prerendered snapshot's own entry tags to match.
 * <link rel="modulepreload"> tags are dropped entirely rather than rewritten:
 * they're pure performance hints (the browser starts fetching a chunk
 * slightly early) and never determine what URL a lazy import() actually
 * requests — that's resolved from the CURRENT entry chunk's own baked-in
 * routing table at runtime, so a missing or stale modulepreload hint cannot
 * break navigation, only skip a preload. There is no way to unambiguously
 * rewrite them anyway: several unrelated per-route chunks legitimately share
 * the "index-" prefix (e.g. index-BQUr9--y.js is the main entry, but
 * index-D31mqAe8.js is an unrelated lazy chunk from a completely different
 * source file that also happens to be named index.js) — old-hash-to-new-hash
 * mapping by filename prefix is fundamentally unreliable without a Vite
 * manifest.json to resolve it, so this only ever rewrites the two tags that
 * ARE unambiguous (there is exactly one main entry script and one main
 * stylesheet in any Vite-built index.html) and strips the rest.
 */
import { readFileSync, existsSync } from 'node:fs';

const SCRIPT_TAG_RE = /<script\b[^>]*\btype="module"[^>]*\bsrc="(\/assets\/[^"]+\.js)"[^>]*><\/script>/i;
const STYLE_TAG_RE = /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="(\/assets\/index-[^"]+\.css)"[^>]*>/i;
const MODULEPRELOAD_RE = /<link\b[^>]*\brel="modulepreload"[^>]*>\s*/gi;
const ASSET_REF_RE = /\/assets\/[^"'\s)]+\.(?:js|css)\b/g;

/**
 * Extracts the current build's main entry <script> and <link rel=stylesheet>
 * tags from a freshly-built (never prerendered) dist/index.html. Throws if
 * either is missing — a Vite build that doesn't produce these has bigger
 * problems than stale prerendering.
 */
export function extractCurrentEntryTags(freshIndexHtml) {
  const scriptMatch = freshIndexHtml.match(SCRIPT_TAG_RE);
  const styleMatch = freshIndexHtml.match(STYLE_TAG_RE);
  if (!scriptMatch) throw new Error('extractCurrentEntryTags: no <script type="module" src="/assets/*.js"> found in the fresh build\'s index.html');
  if (!styleMatch) throw new Error('extractCurrentEntryTags: no <link rel="stylesheet" href="/assets/index-*.css"> found in the fresh build\'s index.html');
  return {
    scriptTag: scriptMatch[0],
    scriptSrc: scriptMatch[1],
    styleTag: styleMatch[0],
    styleHref: styleMatch[1],
  };
}

/**
 * Rewrites one prerendered snapshot's main entry script/stylesheet tags to
 * the current build's, and strips all modulepreload hints (see file header
 * for why those are dropped rather than rewritten). Pure function — no I/O.
 */
export function rewritePrerenderedHtml(html, currentEntryTags) {
  let out = html.replace(SCRIPT_TAG_RE, currentEntryTags.scriptTag);
  out = out.replace(STYLE_TAG_RE, currentEntryTags.styleTag);
  out = out.replace(MODULEPRELOAD_RE, '');
  return out;
}

/**
 * Scans rewritten HTML for every remaining /assets/*.js|css reference and
 * returns the ones that don't exist in distAssetsDir — should always be
 * empty after rewritePrerenderedHtml (only the two rewritten tags should
 * remain, both freshly verified to exist), but checked explicitly rather
 * than assumed, so a future change to what tags get rewritten/stripped
 * can't silently reintroduce this exact incident.
 */
export function findMissingAssetRefs(html, rootDir) {
  const refs = [...new Set(html.match(ASSET_REF_RE) || [])];
  return refs.filter(ref => !existsSync(rootDir + ref));
}

/**
 * Full pipeline for one file: read, rewrite, verify. Throws with a clear
 * message (including the offending file path) if any referenced asset is
 * missing after rewriting — this is what makes a real mismatch fail the
 * build loudly instead of shipping broken HTML, which is exactly what
 * happened in production before this fix existed.
 */
export function rewriteAndVerify(sourcePath, currentEntryTags, rootDir) {
  const html = readFileSync(sourcePath, 'utf8');
  const rewritten = rewritePrerenderedHtml(html, currentEntryTags);
  const missing = findMissingAssetRefs(rewritten, rootDir);
  if (missing.length > 0) {
    throw new Error(
      `rewriteAndVerify: ${sourcePath} references asset(s) that don't exist in the current build: ${missing.join(', ')}`
    );
  }
  return rewritten;
}

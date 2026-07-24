/**
 * tests/persistence/prerender-asset-rewrite.mjs
 *
 * Production incident, 2026-07-24: SENTRY_AUTH_TOKEN is set on Vercel, so
 * @sentry/vite-plugin gives every `vite build` invocation a fresh debug id,
 * changing built chunks' content hashes even from byte-identical source —
 * confirmed against the actual Vercel build log for the live deployment,
 * which never produced the exact filename the committed prerendered
 * snapshot referenced. apply-prerendered.mjs used to blindly `cpSync` the
 * committed prerendered/ over the freshly-built dist/, so the live site
 * served HTML where it referenced JavaScript, and never booted.
 *
 * Pure logic, no live Base44/network calls, no filesystem fixtures — uses
 * node:fs mocked via a temp directory for the existsSync-based checks.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pass, fail } from './_shared.mjs';
import {
  extractCurrentEntryTags,
  rewritePrerenderedHtml,
  findMissingAssetRefs,
} from '../../scripts/lib/rewritePrerenderedAssets.mjs';

const FRESH_INDEX_HTML = `<!DOCTYPE html><html><head>
<link rel="icon" href="/favicon.svg">
<script type="module" crossorigin src="/assets/index-FRESH123.js"></script>
<link rel="modulepreload" crossorigin href="/assets/vendor-react-FRESH456.js">
<link rel="stylesheet" crossorigin href="/assets/index-FRESHCSS.css">
</head><body><div id="root"></div></body></html>`;

const STALE_SNAPSHOT_HTML = `<!DOCTYPE html><html><head>
<link rel="icon" href="/favicon.svg">
<script type="module" crossorigin src="/assets/index-STALE999.js"></script>
<link rel="modulepreload" crossorigin href="/assets/vendor-react-STALEabc.js">
<link rel="modulepreload" as="script" crossorigin href="/assets/Home-STALExyz.js">
<link rel="stylesheet" crossorigin href="/assets/index-FRESHCSS.css">
</head><body><div id="root">Prerendered content stays intact</div></body></html>`;

export async function runPrerenderAssetRewrite() {
  const results = [];
  console.log('\n  Prerendered asset rewrite — the fix for the 2026-07-24 stale-asset production incident:\n');

  // ── extractCurrentEntryTags ──────────────────────────────────────────────
  {
    const tags = extractCurrentEntryTags(FRESH_INDEX_HTML);
    results.push(tags.scriptSrc === '/assets/index-FRESH123.js'
      ? pass('extractCurrentEntryTags — finds the main entry script src', tags.scriptSrc)
      : fail('extractCurrentEntryTags — finds the main entry script src', '/assets/index-FRESH123.js', tags.scriptSrc));
    results.push(tags.styleHref === '/assets/index-FRESHCSS.css'
      ? pass('extractCurrentEntryTags — finds the main stylesheet href', tags.styleHref)
      : fail('extractCurrentEntryTags — finds the main stylesheet href', '/assets/index-FRESHCSS.css', tags.styleHref));

    let threw = false;
    try { extractCurrentEntryTags('<html><head></head></html>'); } catch { threw = true; }
    results.push(threw
      ? pass('extractCurrentEntryTags — throws when no entry script tag exists', 'threw')
      : fail('extractCurrentEntryTags — throws when no entry script tag exists', 'throw', 'did not throw'));
  }

  // ── rewritePrerenderedHtml ───────────────────────────────────────────────
  {
    const tags = extractCurrentEntryTags(FRESH_INDEX_HTML);
    const rewritten = rewritePrerenderedHtml(STALE_SNAPSHOT_HTML, tags);

    results.push(rewritten.includes('/assets/index-FRESH123.js')
      ? pass('rewritePrerenderedHtml — stale entry script replaced with the current one', 'found')
      : fail('rewritePrerenderedHtml — stale entry script replaced with the current one', 'present', 'missing'));
    results.push(!rewritten.includes('index-STALE999')
      ? pass('rewritePrerenderedHtml — stale entry script reference fully removed', 'removed')
      : fail('rewritePrerenderedHtml — stale entry script reference fully removed', 'removed', 'still present'));
    results.push(!rewritten.includes('modulepreload')
      ? pass('rewritePrerenderedHtml — all modulepreload hints stripped', 'stripped')
      : fail('rewritePrerenderedHtml — all modulepreload hints stripped', 'stripped', 'still present'));
    results.push(rewritten.includes('Prerendered content stays intact')
      ? pass('rewritePrerenderedHtml — leaves the actual prerendered body content untouched', 'intact')
      : fail('rewritePrerenderedHtml — leaves the actual prerendered body content untouched', 'intact', 'lost'));
    // The stylesheet was already current in both fixtures — rewriting must
    // be idempotent, not just additive, so a same-value tag isn't duplicated.
    results.push((rewritten.match(/index-FRESHCSS\.css/g) || []).length === 1
      ? pass('rewritePrerenderedHtml — an already-current stylesheet reference is not duplicated', '1 occurrence')
      : fail('rewritePrerenderedHtml — an already-current stylesheet reference is not duplicated', 1, (rewritten.match(/index-FRESHCSS\.css/g) || []).length));
  }

  // ── findMissingAssetRefs — the fail-loud safety net ──────────────────────
  // Real prerendered snapshots only ever reference /assets/*.js|css (Vite's
  // asset output dir) — the regex this checks against is scoped to that
  // prefix on purpose (see rewritePrerenderedAssets.mjs's header), so the
  // fixtures below use realistic /assets/ paths rather than bare filenames.
  {
    const tmpDir = mkdtempSync(join(tmpdir(), 'prerender-rewrite-test-'));
    mkdirSync(join(tmpDir, 'assets'));
    writeFileSync(join(tmpDir, 'assets', 'exists.js'), '// real file');
    // Deliberately do NOT create missing.css — this is the case the
    // incident shipped: a referenced asset that was never in the actual build.
    const htmlAllPresent = `<script src="/assets/exists.js"></script>`;
    const htmlOneMissing = `<script src="/assets/exists.js"></script><link href="/assets/missing.css">`;

    results.push(findMissingAssetRefs(htmlAllPresent, tmpDir).length === 0
      ? pass('findMissingAssetRefs — empty when every referenced asset exists', '0 missing')
      : fail('findMissingAssetRefs — empty when every referenced asset exists', 0, findMissingAssetRefs(htmlAllPresent, tmpDir).length));

    const missing = findMissingAssetRefs(htmlOneMissing, tmpDir);
    results.push(missing.length === 1 && missing[0] === '/assets/missing.css'
      ? pass('findMissingAssetRefs — reports exactly the missing asset, not the real one too', missing)
      : fail('findMissingAssetRefs — reports exactly the missing asset, not the real one too', ['/assets/missing.css'], missing));

    rmSync(tmpDir, { recursive: true, force: true });
  }

  // ── End-to-end: reproduces the exact incident and proves the fix ────────
  {
    const tmpDir = mkdtempSync(join(tmpdir(), 'prerender-rewrite-e2e-'));
    mkdirSync(join(tmpDir, 'assets'));
    writeFileSync(join(tmpDir, 'assets', 'index-FRESH123.js'), '// the only file that actually exists in this build');
    writeFileSync(join(tmpDir, 'assets', 'index-FRESHCSS.css'), '/* real */');
    // index-STALE999.js is deliberately absent — the incident's exact shape:
    // a snapshot referencing a filename this build never produced.

    const tags = extractCurrentEntryTags(FRESH_INDEX_HTML);
    const rewritten = rewritePrerenderedHtml(STALE_SNAPSHOT_HTML, tags);
    const missingAfterRewrite = findMissingAssetRefs(rewritten, tmpDir);

    results.push(missingAfterRewrite.length === 0
      ? pass('End-to-end — a stale snapshot rewritten against the real build has zero missing assets', '0 missing')
      : fail('End-to-end — a stale snapshot rewritten against the real build has zero missing assets', 0, missingAfterRewrite));

    // And the negative case: prove the check actually catches a real gap
    // (this is what should have failed the build during the incident,
    // instead of shipping broken HTML) — verify it against the UNREWRITTEN
    // stale HTML directly, simulating the old blind-copy behaviour.
    const missingWithoutRewrite = findMissingAssetRefs(STALE_SNAPSHOT_HTML, tmpDir);
    results.push(missingWithoutRewrite.includes('/assets/index-STALE999.js')
      ? pass('End-to-end — without the rewrite, the exact incident (missing entry script) is detected', missingWithoutRewrite)
      : fail('End-to-end — without the rewrite, the exact incident (missing entry script) is detected', 'includes /assets/index-STALE999.js', missingWithoutRewrite));

    rmSync(tmpDir, { recursive: true, force: true });
  }

  return results;
}

/**
 * tests/persistence/chunk-selfheal.mjs
 *
 * A STALE TAB HEALS ITSELF ONCE, AND NEVER LOOPS.
 *
 * Item 6 of goals/2026-10-11-dashboard-fixes-batch-1.md, after the owner's
 * stale-tab incident: his normal window held an index.html from before a
 * deploy, so its chunk URLs were gone and Sentry filled with "Importing a
 * module script failed" while a private window loaded the site perfectly.
 *
 * ── WHY THIS GUARD EXISTS AND THE CODE DID NOT NEED WRITING ────────────────
 *
 * The self-heal was already built, and thoroughly: src/lib/chunkReloadGuard.js
 * reloads at most once per ten seconds keyed in sessionStorage, holds rather
 * than reloading when storage is unavailable, and records an outcome;
 * lazyWithReload holds Suspense instead of flashing the error boundary while a
 * reload commits, bounded by a hang guard; main.jsx adds a vite:preloadError
 * side-channel; every lazy route is wrapped; no service worker is registered;
 * and index.html is served must-revalidate while the hashed assets are
 * immutable.
 *
 * NOTHING IN tests/ OR scripts/ TOUCHED ANY OF IT. The mechanism the owner's
 * tab depended on could have been deleted by any refactor with every check
 * still green. So this item proves what exists rather than rebuilding it, and
 * the one thing it changes is that the proof now exists.
 *
 * ── DRIVEN, NOT READ, WHERE IT CAN BE ──────────────────────────────────────
 *
 * reloadOnceForChunkError reads sessionStorage and calls
 * window.location.reload() off globals, so this file defines those globals and
 * runs the real function: the reload is counted, the stamp is inspected, and
 * the clock is moved to cross the window. The parts that only exist in a
 * browser (a real failed import, a real navigation) are proved by
 * scripts/test-chunk-reload.mjs, which plants a 404 on a chunk and watches the
 * page heal.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * A fresh copy of the guard, with the globals it reads.
 *
 * A FRESH MODULE PER CASE. lastOutcome is module state, and so is the
 * sessionStorage stamp it reads, so two cases sharing one import would be two
 * cases sharing one history: the "second failure holds" case would pass by
 * accident on a module that had already reloaded for another reason.
 */
async function freshGuard({ storage = 'ok', now = 1_000_000 } = {}) {
  const store = new Map();
  const reloads = [];
  const logs = [];

  globalThis.sessionStorage = {
    getItem(k) {
      if (storage === 'throw-read') throw new Error('storage blocked');
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      if (storage === 'throw-write') throw new Error('storage blocked');
      store.set(k, String(v));
    },
  };
  globalThis.window = { location: { reload: () => reloads.push(Date.now()) } };

  const realNow = Date.now;
  let clock = now;
  Date.now = () => clock;
  const realWarn = console.warn;
  console.warn = (...a) => logs.push(a.map(String).join(' '));

  const mod = await import(`../../src/lib/chunkReloadGuard.js?case=${Math.random()}`);
  return {
    mod,
    reloads,
    logs,
    store,
    advance: (ms) => { clock += ms; },
    restore: () => { Date.now = realNow; console.warn = realWarn; },
  };
}

export async function runChunkSelfheal() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. ONE RELOAD, AND ONLY ONE ───────────────────────────────────────
  {
    const g = await freshGuard();
    try {
      const first = g.mod.reloadOnceForChunkError(new Error('Importing a module script failed'));
      ok('a failed chunk import reloads the page', first === true && g.reloads.length === 1,
         `${g.reloads.length} reload(s), returned ${first}`);
      ok('  and says which outcome that was, for the beacon',
         g.mod.lastChunkReloadOutcome() === 'reloaded', String(g.mod.lastChunkReloadOutcome()));
      ok('  stamping the time so the next failure can see it',
         g.store.size === 1, `${g.store.size} key(s)`);
      ok('  and logging the reason rather than reloading silently',
         g.logs.some((l) => /stale build asset failed to load, reloading once/.test(l)
           && /Importing a module script failed/.test(l)),
         g.logs.join(' | ') || '(nothing logged)');

      // THE LOOP GUARD. This is the whole safety property: a chunk that is
      // genuinely gone fails again on the new document, and a guard that
      // reloaded for that too would spin forever on a dead deploy.
      const second = g.mod.reloadOnceForChunkError(new Error('again'));
      ok('a second failure inside the window does NOT reload again',
         second === false && g.reloads.length === 1, `${g.reloads.length} reload(s) in total`);
      ok('  and says it held, rather than reporting a reload it did not do',
         g.mod.lastChunkReloadOutcome() === 'suppressed-recent-reload',
         String(g.mod.lastChunkReloadOutcome()));

      // AND IT IS A WINDOW, NOT A LATCH. A tab left open across a later
      // deploy must be able to heal again.
      g.advance(10_001);
      const third = g.mod.reloadOnceForChunkError(new Error('much later'));
      ok('once the window has passed, a later failure heals again',
         third === true && g.reloads.length === 2, `${g.reloads.length} reload(s) in total`);
    } finally { g.restore(); }
  }

  // ── 2. NO STORAGE MEANS NO RELOAD, NOT AN UNGUARDED ONE ───────────────
  {
    const g = await freshGuard({ storage: 'throw-read' });
    try {
      const r = g.mod.reloadOnceForChunkError(new Error('private window'));
      ok('unreadable storage holds rather than reloading unguarded',
         r === false && g.reloads.length === 0, `${g.reloads.length} reload(s)`);
      ok('  and names that as the reason',
         g.mod.lastChunkReloadOutcome() === 'sessionstorage-unavailable',
         String(g.mod.lastChunkReloadOutcome()));
    } finally { g.restore(); }
  }
  {
    const g = await freshGuard({ storage: 'throw-write' });
    try {
      const r = g.mod.reloadOnceForChunkError(new Error('read-only storage'));
      ok('storage that reads but cannot be written holds too',
         r === false && g.reloads.length === 0, `${g.reloads.length} reload(s)`);
      ok('  because a stamp that did not save is a loop waiting to happen',
         g.mod.lastChunkReloadOutcome() === 'sessionstorage-unavailable',
         String(g.mod.lastChunkReloadOutcome()));
    } finally { g.restore(); }
  }

  // ── 3. THE WRAPPER, AND WHAT IT DOES WHILE A RELOAD COMMITS ───────────
  const lazyWrap = stripComments(code('src/lib/lazyWithReload.js'), { trailing: true });
  ok('the wrapper asks the guard rather than reloading itself',
     /reloadOnceForChunkError\(err\)/.test(lazyWrap) && !/location\.reload/.test(lazyWrap),
     'one decision point');
  ok('  holding Suspense while a reload commits, instead of flashing an error',
     /if \(!reloading\) throw err;/.test(lazyWrap) && /new Promise\(/.test(lazyWrap),
     'held, not thrown');
  ok('  and bounding that hold, so nobody is stranded on a spinner',
     /RELOAD_GRACE_MS/.test(lazyWrap) && /setTimeout\(\(\) => reject\(err\), RELOAD_GRACE_MS\)/.test(lazyWrap),
     'rejects after the grace window');
  ok('  re-throwing when the guard held, which is the error screen on purpose',
     lazyWrap.indexOf('if (!reloading) throw err;') < lazyWrap.indexOf('new Promise('),
     'the held case throws first');

  const main = stripComments(code('src/main.jsx'), { trailing: true });
  ok('the modulepreload path reaches the same guard',
     /addEventListener\('vite:preloadError'/.test(main) && /reloadOnceForChunkError\(event\.payload\)/.test(main),
     'one guard, two paths');
  ok('  without preventing default, so the import path still rejects',
     !/preventDefault\(\)/.test(main), 'side-channel, not a replacement');

  // ── 4. EVERY LAZY ROUTE GOES THROUGH IT ───────────────────────────────
  const config = stripComments(code('src/pages.config.js'), { trailing: true });
  const app = stripComments(code('src/App.jsx'), { trailing: true });
  const wrapped = (config.match(/lazyWithReload\(/g) || []).length
    + (app.match(/lazyWithReload\(/g) || []).length;
  ok('every lazy route is wrapped', wrapped >= 49, `${wrapped} wrapped route(s)`);

  // A BARE lazy( ANYWHERE IS THE DEFECT THIS ITEM GUARDS. Counted across the
  // whole product source rather than the two files that happen to hold routes
  // today, because the next route will be added wherever it is added.
  const bare = [];
  const files = [
    'src/pages.config.js', 'src/App.jsx', 'src/Layout.jsx', 'src/main.jsx',
  ];
  for (const f of files) {
    const live = stripComments(code(f), { trailing: true });
    for (const m of live.matchAll(/(^|[^a-zA-Z.])lazy\(/g)) {
      const at = m.index + m[0].length;
      const before = live.slice(Math.max(0, at - 24), at);
      if (!/lazyWithReload\($/.test(before)) bare.push(`${f}: ...${before.slice(-18)}lazy(`);
    }
  }
  ok('  and no route uses React.lazy directly',
     bare.length === 0, bare.join(' | ') || 'none');
  ok('  the wrapper itself is the one place that may',
     /import \{ lazy \} from 'react'/.test(code('src/lib/lazyWithReload.js')), 'by design');

  // ── 5. NOTHING IS HOLDING A STALE DOCUMENT ────────────────────────────
  //
  // A service worker is the other way a tab keeps an index.html across a
  // deploy, and it would defeat every header below.
  const swFiles = ['src/main.jsx', 'index.html', 'src/App.jsx'];
  ok('no service worker is registered',
     swFiles.every((f) => !/serviceWorker\s*\.\s*register/.test(code(f))), 'none');

  const vercel = code('vercel.json');
  const headers = JSON.parse(vercel).headers || [];
  const assetRule = headers.find((h) => h.source === '/assets/(.*)');
  const assetCache = (assetRule?.headers || []).find((h) => h.key === 'Cache-Control');
  ok('the hashed assets are immutable, so a current index is cheap to serve',
     /max-age=31536000/.test(assetCache?.value || '') && /immutable/.test(assetCache?.value || ''),
     assetCache?.value || 'no rule');

  // THE DOCUMENT IS REVALIDATED, WHICH IS WHAT "NEVER CACHED" HAS TO MEAN
  // HERE. must-revalidate keeps the 304 and still prevents a stale document
  // being reused after a deploy; no-store would lose the 304 for no gain. The
  // asset rule is in vercel.json; the document's comes from the platform
  // default, so it is asserted against the deployed response rather than this
  // file, by scripts/test-chunk-reload.mjs.
  ok('  and no rule makes the document immutable alongside them',
     !headers.some((h) => h.source !== '/assets/(.*)'
       && (h.headers || []).some((x) => x.key === 'Cache-Control' && /immutable/.test(x.value))),
     'no immutable document rule');

  return results;
}

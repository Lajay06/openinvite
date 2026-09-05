/**
 * Guest routes are served a guest shell, never the marketing homepage.
 *
 * vercel.json rewrote everything to /index.html, and apply-prerendered.mjs
 * makes dist/index.html the prerendered MARKETING HOMEPAGE — head and body. So
 * /w/:slug and /rsvp/:token were served an advertisement for the platform.
 * Measured on /w/john-suzanne in WebKit at 390 before the fix: marketing
 * visible 501ms→856ms, the wedding at 2029ms, tab title "Openinvite: the
 * wedding planning platform".
 *
 * THE PRIVACY INVARIANT, which outlives this shell. Per-wedding meta (Option
 * B) must decide on websitePasswordEnabled DIRECTLY and never on the gate's
 * runtime result: api/wedding-by-slug.js documents a fail-open — enabled with
 * no stored credential serves the site publicly — and a card keyed on gate
 * state would leak names, date and photograph straight through it. The
 * assertions below fail if any title/meta decision is ever keyed on `locked`
 * or `passwordProtected`, so Option B inherits the constraint rather than
 * rediscovering it.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { buildGuestShell, GUEST_SHELL_META } from '../../scripts/lib/guestShell.mjs';
import { extractRootHtml } from '../../scripts/lib/renderHarness.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => readFileSync(root(p), 'utf8');

export async function runGuestShell() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guest shell — an invitation is not an advertisement:\n');

  // ── routing ────────────────────────────────────────────────────────────
  const vercel = JSON.parse(read('vercel.json'));
  const rewrites = vercel.rewrites || [];
  const idxCatchAll = rewrites.findIndex((r) => r.destination === '/index.html');
  // THE INVARIANT IS "NEVER THE MARKETING HOMEPAGE", NOT ONE DESTINATION
  // STRING. /w/ is served by api/guest-page.js so a shared link can unfurl with
  // the couple's own names; that function returns the guest shell's bytes and
  // falls back to them on every failure, so a guest route still cannot reach
  // /index.html. /rsvp/ stays on the static file — it has nothing to unfurl.
  const GUEST_DESTINATIONS = ['/guest-shell.html', '/api/guest-page'];
  for (const src of ['/w/(.*)', '/rsvp/(.*)']) {
    const i = rewrites.findIndex((r) => r.source === src);
    check(`${src} is rewritten to a guest surface, never the marketing homepage`,
      i > -1 && GUEST_DESTINATIONS.includes(rewrites[i].destination),
      i > -1 ? rewrites[i].destination : 'NO RULE');
    // Order is the whole mechanism: Vercel takes the first match, so a rule
    // after the catch-all would never run.
    check(`  and precedes the /index.html catch-all`, i > -1 && idxCatchAll > -1 && i < idxCatchAll,
      `rule@${i}, catch-all@${idxCatchAll}`);
  }

  // ── the shell itself, built from the real template ─────────────────────
  // Same inputs the build uses: the repo template plus a build's entry tags.
  const ENTRY = { scriptTag: '<script type="module" crossorigin src="/assets/index-TEST.js"></script>',
                  styleTag: '<link rel="stylesheet" crossorigin href="/assets/index-TEST.css">' };
  const shell = buildGuestShell(read('index.html'), ENTRY);

  check('the shell carries no marketing copy',
    !/Because planning your wedding|All the powerful tools|planning platform/i.test(shell),
    'nothing to paint, nothing to unfurl');
  check('  #root is empty, so nothing paints before React mounts',
    extractRootHtml(shell).trim() === '', 'kills the flash at its source');

  // CONTROL for the extractor itself. The naive non-greedy regex returns '' on
  // a populated document — it stops at the first nested </div> — and reported
  // exactly that twice in one session. A tag-depth counter must return the
  // real contents, or every "#root is empty" assertion is vacuously true.
  const POPULATED = '<div id="root"><div class="a"><p>hello</p></div><span>x</span></div><script src="/x.js"></script>';
  check('  control: the extractor returns non-zero on a populated #root',
    extractRootHtml(POPULATED).includes('<span>x</span>') && extractRootHtml(POPULATED).length > 20,
    `${extractRootHtml(POPULATED).length} chars, nested div traversed`);
  check('  the title is the guest title',
    shell.includes(`<title>${GUEST_SHELL_META.title}</title>`), GUEST_SHELL_META.title);
  check('  og:url and og:image are absent, not wrong',
    !/og:url|og:image|twitter:image/i.test(shell),
    'the marketing snapshot hard-codes the site root for every guest URL');
  check('  it is noindex at the document level too',
    /<meta\s+name=["']robots["'][^>]*noindex/i.test(shell), 'belt to the vercel.json header');

  // The shell is ONE file for every wedding, so wedding-specific meta cannot
  // be correct here even if someone tries.
  check('the shell meta is wedding-independent by construction',
    !/couple|weddingDate|slug|\{\{/i.test(GUEST_SHELL_META.title + GUEST_SHELL_META.description + GUEST_SHELL_META.ogTitle),
    'one static file serves every wedding');

  // CONTROL: the builder must actually be capable of rejecting a bad shell.
  let rejected = false;
  try { buildGuestShell('<html><head></head><body><div id="root"><h1>Because planning your wedding</h1></div><script type="module" src="/src/main.jsx"></script></body></html>', ENTRY); }
  catch { rejected = true; }
  check('  control: a shell with marketing DOM in #root is rejected', rejected,
    'the builder asserts its guarantees rather than assuming them');

  // ── the build actually writes it ───────────────────────────────────────
  const apply = read('scripts/apply-prerendered.mjs');
  check('the build writes the guest shell',
    /buildGuestShell\(\s*readFileSync\(resolve\(ROOT, 'index\.html'\)/.test(apply.replace(/\s+/g, ' ')),
    'from the repo template, not from dist/index.html');
  check('  before the prerendered/ early-exit',
    apply.indexOf("guest-shell.html") < apply.indexOf('No prerendered/ directory found'),
    'a build without snapshots must still serve guests a correct shell');
  check('  and before dist/index.html is overwritten',
    apply.indexOf('guest-shell.html') < apply.indexOf('for (const sourcePath of walk(PRERENDERED))'),
    'the fresh index is the source, not the marketing snapshot');

  // ── THE PRIVACY INVARIANT ──────────────────────────────────────────────
  // A title or meta decision must never branch on the gate's runtime verdict.
  const titleSites = ['src/components/guest-website/MultiPageWeddingWebsite.jsx'];
  for (const f of titleSites) {
    const src = read(f);
    const i = src.indexOf('document.title = ');
    check(`${f.split('/').pop()}: sets a per-wedding title`, i > -1, 'the tab stops advertising us');
    // Scope to the effect, not the file — `locked` is legitimately used
    // elsewhere in this component to render the password gate.
    const start = src.lastIndexOf('useEffect(', i);
    const effect = src.slice(start, src.indexOf('}, [', i));
    check('  and does NOT key that decision on gate state',
      !/\block(ed)?\b/.test(effect) && !/passwordProtected/.test(effect),
      'keyed on the names being present — a gated response has none');
  }

  return results;
}

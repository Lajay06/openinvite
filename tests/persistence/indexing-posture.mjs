/**
 * Guest-site indexing posture.
 *
 * The regression this guards: the AEO/SEO batch added named bot groups to
 * robots.txt (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot),
 * each with `Allow: /` and no Disallow lines. In robots.txt a crawler that
 * matches a specific User-agent group obeys ONLY that group and ignores the
 * `*` group entirely -- so every one of those bots, including Bingbot (a
 * general web index, not just an answer engine), was permitted to crawl
 * /w/ : every couple's guest wedding site.
 *
 * Nobody decided that. It was a side effect of opening marketing pages to
 * answer engines, and it is invisible unless you know the per-group rule.
 * Hence a test rather than a comment.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROBOTS = readFileSync(resolve(__dir, '../../public/robots.txt'), 'utf8');
const VERCEL = JSON.parse(readFileSync(resolve(__dir, '../../vercel.json'), 'utf8'));

const PRIVATE = ['/api/', '/rsvp/', '/w/'];

function groups(txt) {
  const out = [];
  for (const chunk of txt.split(/\n(?=User-agent:)/i)) {
    const ua = chunk.match(/User-agent:\s*(\S+)/i);
    if (!ua) continue;
    out.push({ ua: ua[1], allow: /Allow:\s*\/\s*$/im.test(chunk),
               disallow: [...chunk.matchAll(/Disallow:\s*(\S+)/gi)].map(m => m[1]) });
  }
  return out;
}

export async function runIndexingPosture() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guest-site indexing posture:\n');

  const gs = groups(ROBOTS);
  check('robots.txt declares at least the wildcard group', gs.some(g => g.ua === '*'), `${gs.length} groups`);

  // THE load-bearing one: every group, not just '*'
  for (const g of gs) {
    const missing = PRIVATE.filter(p => !g.disallow.includes(p));
    check(`  group "${g.ua}" excludes ${PRIVATE.join(' ')}`, missing.length === 0,
      missing.length ? `MISSING ${missing.join(', ')}` : g.disallow.join(', '));
  }

  // AEO intent preserved: named bots still reach marketing pages
  const named = gs.filter(g => g.ua !== '*');
  check('named answer-engine bots are still allowed the marketing site',
    named.length >= 5 && named.every(g => g.allow), `${named.length} named groups, all Allow: /`);

  // Defence in depth: robots.txt is a crawl directive, not an index directive.
  const wRule = (VERCEL.headers || []).find(h => h.source === '/w/(.*)');
  const xrt = wRule?.headers?.find(h => h.key === 'X-Robots-Tag');
  check('vercel.json sets X-Robots-Tag on /w/(.*)', !!xrt, xrt?.value ?? 'ABSENT');
  check('  the header says noindex', /noindex/i.test(xrt?.value || ''), xrt?.value ?? '-');
  check('  and it is NOT applied to the whole site',
    !(VERCEL.headers || []).some(h => h.source === '/(.*)' &&
      h.headers.some(x => x.key === 'X-Robots-Tag')), 'scoped to /w/ only');

  // The sitemap must never advertise a couple's URL. It is GENERATED into
  // prerendered/ by build:prerender, not committed to public/, so this reads
  // the generated artefact and reports honestly when it has not been built
  // yet rather than passing on a missing file.
  const sitemapPath = resolve(__dir, '../../prerendered/sitemap.xml');
  if (existsSync(sitemapPath)) {
    const sitemapSrc = readFileSync(sitemapPath, 'utf8');
    check('sitemap.xml lists no guest site', !/\/w\//.test(sitemapSrc),
      `${(sitemapSrc.match(/<loc>/g) || []).length} URLs, none under /w/`);
  } else {
    check('sitemap.xml lists no guest site', false,
      'prerendered/sitemap.xml not built — run npm run build:prerender');
  }

  return results;
}

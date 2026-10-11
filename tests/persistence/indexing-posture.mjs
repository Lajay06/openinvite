/**
 * The indexing posture covers every URL a guest is actually given.
 *
 * #518 put `Disallow: /api/ /rsvp/ /w/` on the "*" group and on each named
 * bot group, and an `X-Robots-Tag: noindex, nofollow, noarchive` response
 * header on /w/. The header rule matched ONLY /w/, so /rsvp/:token — the URL
 * api/my-guest-links.js actually builds and the couple actually sends —
 * carried no noindex at all. robots.txt is advisory and covers fetching;
 * X-Robots-Tag covers indexing. The token URL had only the advisory half.
 *
 * Confirmed live before the fix: a request to /w/... returned the header and
 * a request to /rsvp/... did not.
 *
 * This pins both halves, and the invariant robots.txt states about itself:
 * a crawler that matches a named User-agent group obeys ONLY that group, so
 * every named group must repeat the Disallow lines or it inherits nothing.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);

const GUEST_PREFIXES = ['/w/', '/rsvp/'];
const REQUIRED_DISALLOW = ['/api/', '/rsvp/', '/w/'];

export async function runIndexingPosture() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Indexing posture — every guest URL, not just the pretty one:\n');

  const vercel = JSON.parse(readFileSync(root('vercel.json'), 'utf8'));
  const headerRules = vercel.headers || [];

  for (const prefix of GUEST_PREFIXES) {
    const rule = headerRules.find((r) => r.source === `${prefix}(.*)`);
    const tag = rule?.headers?.find((h) => h.key.toLowerCase() === 'x-robots-tag');
    const value = (tag?.value || '').toLowerCase();
    check(`${prefix}(.*) carries X-Robots-Tag`, Boolean(tag), value || 'MISSING');
    check(`  ${prefix} is noindex, nofollow and noarchive`,
      ['noindex', 'nofollow', 'noarchive'].every((d) => value.includes(d)), value || 'MISSING');
  }

  const robots = readFileSync(root('public/robots.txt'), 'utf8');
  // Split into agent groups. A named group inherits NOTHING from "*", which is
  // the whole reason #518 repeats the lines rather than relying on the default.
  const groups = robots
    .split(/^User-agent:\s*/mi).slice(1)
    .map((chunk) => {
      const [agent, ...rest] = chunk.split('\n');
      return { agent: agent.trim(), body: rest.join('\n') };
    });

  check('robots.txt declares at least the wildcard group plus named bots',
    groups.length >= 2, `${groups.length} groups: ${groups.map((g) => g.agent).join(', ')}`);

  const incomplete = groups.filter((g) =>
    !REQUIRED_DISALLOW.every((d) => new RegExp(`^Disallow:\\s*${d}\\s*$`, 'mi').test(g.body)));
  check('every group repeats all three Disallow lines',
    incomplete.length === 0,
    incomplete.map((g) => g.agent).join(', ') || 'all groups complete');

  // CONTROL: the parser must be capable of seeing an incomplete group, or the
  // assertion above passes for a file it never really read.
  const planted = [...groups, { agent: 'PlantedBot', body: 'Allow: /\n' }];
  const plantedIncomplete = planted.filter((g) =>
    !REQUIRED_DISALLOW.every((d) => new RegExp(`^Disallow:\\s*${d}\\s*$`, 'mi').test(g.body)));
  check('  control: a group missing its Disallow lines IS detected',
    plantedIncomplete.length === 1 && plantedIncomplete[0].agent === 'PlantedBot',
    `detected ${plantedIncomplete.map((g) => g.agent).join(', ') || 'nothing'}`);

  // ── THE MOBILE APP IS PRIVATE ON THE WEB ───────────────────────────────
  // Owner check before parity PR 2 of goals/2026-10-10-mobile-pass.md: the
  // /m routes are reachable from nothing on the marketing site, carry
  // noindex, and serve no shell screen to a signed-out visitor who types the
  // URL. Found 2026-10-11: no header on /m, and /m/welcome and /m/login
  // rendered the shell's first-run screens to anyone on the web.
  for (const source of ['/m', '/m/(.*)']) {
    const rule = headerRules.find((r) => r.source === source);
    const value = (rule?.headers?.find((h) => h.key.toLowerCase() === 'x-robots-tag')?.value || '').toLowerCase();
    check(`${source} is noindex, nofollow and noarchive`,
      ['noindex', 'nofollow', 'noarchive'].every((d) => value.includes(d)), value || 'MISSING');
  }
  const { MARKETING_ROUTES } = await import(root('scripts/marketingRoutes.mjs'));
  check('  and no /m route is prerendered or in the sitemap',
    MARKETING_ROUTES.length > 0 && !MARKETING_ROUTES.some((r) => r === '/m' || r.startsWith('/m/')),
    `${MARKETING_ROUTES.length} marketing routes`);
  // Every page and component outside the shell itself: the marketing site,
  // and the dashboard too, which does not link to the app yet either.
  const { trackedUnder } = await import('./_trackedFiles.mjs');
  const files = [...trackedUnder('src/pages', /\.jsx?$/), ...trackedUnder('src/components', /\.jsx?$/)];
  const linking = files.filter((f) => /(?:to|href)=["'{`]+\/m(?:[/"'`?]|$)/m.test(readFileSync(f, 'utf8')))
    .map((f) => f.replace(root('') + '/', ''));
  check('  and nothing on the marketing site links to it',
    linking.length === 0 && files.length > 100, linking.join(', ') || `${files.length} files read`);
  const app = readFileSync(root('src/App.jsx'), 'utf8');
  check('  and the app itself sits behind ProtectedRoute',
    /<Route element=\{<ProtectedRoute unauthenticatedElement=[^\n]*\n\s*<Route path="\/m\/\*" element=\{<MobileApp \/>\} \/>/.test(app),
    'signed out goes to the web login');
  check('  and its first-run screens render only inside the native shell',
    /\(isNativeShell\(\) \|\| import\.meta\.env\.DEV\) \? \(\s*<>\s*<Route path="\/m\/welcome" element=\{<MobileFirstRun/.test(app)
      && (app.match(/<MobileFirstRun /g) || []).length === 2
      && /<Route path="\/m\/welcome" element=\{<Navigate to="\/login\?next=%2Fm" replace \/>\} \/>/.test(app)
      && /<Route path="\/m\/login" element=\{<Navigate to="\/login\?next=%2Fm" replace \/>\} \/>/.test(app),
    'on the web, /m/welcome and /m/login go to the web login');

  return results;
}

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

  return results;
}

/**
 * Third-party contact from the browser (L3).
 *
 * Two leaks in one batch, same shape as the L2 weather work:
 *
 *   1. CurrencyContext fetched open.er-api.com direct from the browser.
 *      CurrencyProvider wraps the ENTIRE Router in src/App.jsx, so this fired
 *      for every visitor on every route, guests on /w/ links included — each
 *      one disclosing their IP, UA and Referer to fetch a rate table that is
 *      byte-identical for everybody. Now proxied by api/rates.js.
 *
 *   2. The Openinvite logo was hot-linked from static.wixstatic.com on
 *      essentially every page in the product (shell, sidebar, auth, 404,
 *      payment success, public nav and footer). A logo is not content the user
 *      chose to fetch from a third party; it is our own mark, 29 KB, and it
 *      announced every page view to Wix. Now served from our own origin.
 *
 * The 20 remaining Wix PHOTOS are deliberately still off-origin and are pinned
 * by scripts/test-marketing-images.mjs, not here. This file pins the two things
 * that changed and the fact that nothing new joins them.
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const CLIENT = strip(readFileSync(root('src/contexts/CurrencyContext.jsx'), 'utf8'));
const SERVER = strip(readFileSync(root('api/rates.js'), 'utf8'));

const WIX_LOGO_ID = 'ed803ca7c6de491a90af0df6d06a8e54';

export async function runThirdPartyAssets() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Third-party contact from the browser (L3):\n');

  // --- 1. exchange rates -------------------------------------------------
  check('client code names no er-api host',
    !/er-api\.com/.test(CLIENT), 'CurrencyContext is clean');
  check('the rate fetch goes to our origin',
    /fetch\('\/api\/rates\?base=USD'\)/.test(CLIENT), '/api/rates');
  check('caching stayed CLIENT-side (the proxy adds no cache of its own)',
    !/localStorage/.test(SERVER), 'server holds no cache');
  check('  the 1h client TTL survived the rewire',
    /const TTL = 60 \* 60 \* 1000/.test(CLIENT), 'TTL intact');

  // Not an open proxy.
  check('server never fetches a caller-supplied URL',
    !/fetch\(\s*(req\.query|query)\./.test(SERVER) && !/req\.query\.url/.test(SERVER), 'no pass-through');
  check('  the upstream host is a hard-coded constant',
    /const UPSTREAM\s*=\s*'https:\/\/open\.er-api\.com/.test(SERVER), 'allowlisted');
  check('  the base currency is checked against an allowlist',
    /SUPPORTED\.has\(base\)/.test(SERVER) && /Unsupported currency/.test(SERVER), 'rejected, not guessed');
  check('  the allowlist matches what the UI actually offers',
    (() => {
      const ui = [...CLIENT.matchAll(/code: '([A-Z]{3})'/g)].map(m => m[1]).sort();
      const srv = [...SERVER.matchAll(/'([A-Z]{3})'/g)].map(m => m[1]).sort();
      return ui.length === 18 && ui.every(c => srv.includes(c));
    })(), '18 currencies, no drift');
  check('rate limit destructures { limited } rather than truthiness',
    /const \{ limited, remaining \} = checkRateLimit\(/.test(SERVER), 'destructured');

  // --- 2. the logo -------------------------------------------------------
  const logo = root('public/openinvite-logo.png');
  check('the logo is served from our own origin', existsSync(logo),
    existsSync(logo) ? `${statSync(logo).size} bytes` : 'MISSING');

  const offenders = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(jsx?|css|html)$/.test(e.name) && readFileSync(p, 'utf8').includes(WIX_LOGO_ID)) {
        offenders.push(p.replace(root('') + '/', ''));
      }
    }
  };
  walk(root('src'));
  check('no source file hot-links the Wix-hosted logo any more',
    offenders.length === 0, offenders.length ? offenders.join(', ') : '0 references');

  const seo = readFileSync(root('src/lib/marketingSeo.js'), 'utf8');
  check('  the schema.org logo is an absolute URL on our own domain',
    /ORGANIZATION_LOGO = `\$\{SITE_URL\}\/openinvite-logo\.png`/.test(seo), 'SITE_URL-based');

  return results;
}

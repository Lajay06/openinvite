/**
 * The CORS allow-list: an exact set, reflected one origin at a time, never a
 * wildcard.
 *
 * `applyCors` in api/_lib/security.js is the single door: 42 endpoints call
 * it and none sets `Access-Control-Allow-Origin` itself. That makes the
 * allow-list a one-line lever over every endpoint at once, and until this
 * guard existed nothing in the repo asserted what was on it — a future edit
 * could have added `*`, or reflected any origin that asked, and every test
 * would still have passed.
 *
 * WHAT IS ASSERTED, and why each line is here:
 *
 *   1. The set is EXACTLY the five expected origins. A new origin is a
 *      deliberate act that edits this list and says why, not something that
 *      arrives with an unrelated change.
 *   2. Each listed origin is reflected back verbatim, with `Vary: Origin` so
 *      a cache cannot serve one origin's response to another.
 *   3. An unlisted origin — and a near-miss like a subdomain or a scheme
 *      swap — gets NO `Access-Control-Allow-Origin` at all.
 *   4. The wildcard never appears: not as a value, not in the source.
 *   5. `Access-Control-Allow-Credentials` is never set. The app authenticates
 *      with an `Authorization` header it sends explicitly; without the
 *      credentials flag a browser will not attach cookies cross-origin, so a
 *      listed origin cannot ride a logged-in session it does not hold.
 *   6. `applyCors` stays the only door: no api/ file sets the header itself.
 *
 * The two mobile origins (Capacitor's iOS and Android page origins) are on
 * the list because the native shell's WebView presents them on every
 * `/api/*` call it makes; neither can be presented by a web page. See
 * api/_lib/security.js for the reasoning kept beside the values.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';
import { applyCors } from '../../api/_lib/security.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '../..');

const EXPECTED = [
  'https://openinvite.com.au',
  'https://www.openinvite.com.au',
  'https://openinvite-pearl.vercel.app',
  'capacitor://localhost',
  'https://localhost',
];

/** Origins that must never be reflected, including near-misses of the real ones. */
const REJECTED = [
  'https://evil.example',
  'http://localhost',                    // the scheme a local dev server also presents
  'http://localhost:5173',
  'capacitor://evil',
  'https://localhost.evil.example',      // suffix trick
  'https://openinvite.com.au.evil.example',
  'https://evil.openinvite.com.au',      // a subdomain is not the site
  'null',
];

/** Minimal req/res doubles in the shape Vercel's handlers receive. */
function callCors(origin, method = 'GET') {
  const headers = {};
  let ended = false;
  let statusCode = null;
  const res = {
    setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
    status: (c) => { statusCode = c; return res; },
    end: () => { ended = true; },
  };
  const req = { method, headers: origin === undefined ? {} : { origin } };
  const handled = applyCors(req, res);
  return { headers, handled, ended, statusCode };
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.js$/.test(e)) out.push(p);
  }
  return out;
}

export async function runCorsAllowList() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  CORS allow-list — an exact set, one origin at a time, never a wildcard:\n');

  const src = readFileSync(resolve(ROOT, 'api/_lib/security.js'), 'utf8');

  // 1. The set is exactly the expected five.
  const listed = [...src.matchAll(/^\s*'([^']+)',/gm)]
    .map((m) => m[1])
    .filter((v) => /^[a-z]+:\/\//.test(v));
  const set = new Set(listed);
  check('the allow-list is exactly the five expected origins',
    set.size === EXPECTED.length && EXPECTED.every((o) => set.has(o)),
    `${listed.length} found: ${listed.join(', ')}`);

  // 2. Every listed origin is reflected, with Vary.
  for (const origin of EXPECTED) {
    const { headers } = callCors(origin);
    check(`  reflects ${origin}`,
      headers['access-control-allow-origin'] === origin && /origin/i.test(headers.vary || ''),
      `ACAO=${headers['access-control-allow-origin'] ?? 'none'} Vary=${headers.vary ?? 'none'}`);
  }

  // 3. Nothing else is reflected.
  const leaked = REJECTED.filter((o) => callCors(o).headers['access-control-allow-origin'] !== undefined);
  check('no unlisted origin gets an Access-Control-Allow-Origin',
    leaked.length === 0, leaked.length ? `LEAKED: ${leaked.join(', ')}` : `${REJECTED.length} probed, none reflected`);
  check('  a request with no Origin gets no ACAO either (cron, webhooks)',
    callCors(undefined).headers['access-control-allow-origin'] === undefined, 'no header');

  // 4. No wildcard, ever.
  const wildcardValue = [...EXPECTED, ...REJECTED, undefined].some((o) => callCors(o).headers['access-control-allow-origin'] === '*');
  check('the wildcard is never sent as a value', !wildcardValue, 'no "*" from any probe');
  check('  and never appears in the source', !/Access-Control-Allow-Origin['"]\s*,\s*['"]\*/.test(src), 'not in security.js');

  // 5. Credentials stay off. Matched on the header being SET, not merely
  // named: security.js's own comment explains why it is absent, and a guard
  // that cannot tell prose from a call would fail on its own documentation.
  const SETS = (body, header) => new RegExp(`setHeader\\(\\s*['"\`]${header}`, 'i').test(body);
  const credsAnywhere = walk(join(ROOT, 'api')).filter((f) => SETS(readFileSync(f, 'utf8'), 'Access-Control-Allow-Credentials'));
  check('Access-Control-Allow-Credentials is never set',
    credsAnywhere.length === 0 && Object.keys(callCors(EXPECTED[3]).headers).every((k) => k !== 'access-control-allow-credentials'),
    credsAnywhere.length ? credsAnywhere.join(', ') : 'absent from api/ and from the response');

  // 6. One door.
  const ownHeader = walk(join(ROOT, 'api'))
    .filter((f) => !f.endsWith('_lib/security.js'))
    .filter((f) => SETS(readFileSync(f, 'utf8'), 'Access-Control-Allow-Origin'))
    .map((f) => f.replace(ROOT + '/', ''));
  check('applyCors is the only place that sets the header',
    ownHeader.length === 0, ownHeader.length ? ownHeader.join(', ') : 'no endpoint sets its own');

  // The preflight contract the mobile shell depends on.
  const pre = callCors('capacitor://localhost', 'OPTIONS');
  check('an OPTIONS preflight is answered 200 and short-circuits',
    pre.handled === true && pre.ended === true && pre.statusCode === 200,
    `handled=${pre.handled} status=${pre.statusCode}`);
  check('  and allows the Authorization header the app sends',
    /authorization/i.test(pre.headers['access-control-allow-headers'] || ''),
    pre.headers['access-control-allow-headers'] ?? 'none');

  return results;
}

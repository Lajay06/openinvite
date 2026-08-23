/**
 * Weather proxy (L2).
 *
 * The leak: weather.js fetched Open-Meteo straight from the browser, so the
 * venue NAME and then its LAT/LON left each couple's device for a third party
 * — while the Google Places lookups beside it were correctly server-proxied
 * per CLAUDE.md. Open-Meteo needs no key, so this proxy exists purely to stop
 * that disclosure.
 *
 * Two things are pinned here:
 *   1. the client never names an Open-Meteo host again, and
 *   2. the proxy is not an OPEN proxy — it builds upstream URLs from an
 *      allowlist rather than forwarding anything a caller supplies. A
 *      pass-through proxy would be an SSRF hole aimed at our own network.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const CLIENT = readFileSync(resolve(__dir, '../../src/lib/weather.js'), 'utf8');
const SERVER = readFileSync(resolve(__dir, '../../api/weather.js'), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const C = strip(CLIENT), S = strip(SERVER);

export async function runWeatherProxy() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Weather proxy — the venue never leaves our origin:\n');

  check('client code names no Open-Meteo host', !/open-meteo\.com/.test(C),
    (C.match(/open-meteo\.com/g) || []).length + ' references');
  const calls = C.match(/fetch\(`\/api\/weather\?mode=(\w+)/g) || [];
  check('every client fetch goes to /api/weather', calls.length === 4, `${calls.length} calls`);
  check('  all four modes are covered',
    ['geocode', 'current', 'forecast', 'archive'].every(m => C.includes(`mode=${m}`)), 'geocode/current/forecast/archive');

  // #415 must survive: a failed lookup is never cached.
  check('the never-cache-a-failure guard is intact (#415)',
    /if \(result\) writeCache\(cacheKey, result\)/.test(C), 'geocode write still guarded');
  check('per-mode TTLs are unchanged',
    /GEOCODE_TTL_MS/.test(C) && /CURRENT_TTL_MS/.test(C) && /FORECAST_TTL_MS/.test(C) && /SEASONAL_TTL_MS/.test(C),
    'all four TTLs present');
  check('caching stayed CLIENT-side (the proxy adds no cache of its own)',
    !/localStorage|writeCache|readCache/.test(S), 'server holds no cache');

  // Not an open proxy.
  check('server never fetches a caller-supplied URL',
    !/fetch\(\s*(req\.query|query)\.[a-zA-Z]/.test(S) && !/req\.query\.url/.test(S), 'no pass-through');
  check('  upstream hosts are hard-coded constants',
    /const GEOCODE\s*=\s*'https:\/\/geocoding-api\.open-meteo\.com/.test(S)
    && /const FORECAST\s*=\s*'https:\/\/api\.open-meteo\.com/.test(S)
    && /const ARCHIVE\s*=\s*'https:\/\/archive-api\.open-meteo\.com/.test(S), '3 allowlisted hosts');
  check('  an unknown mode is rejected, not guessed', /return null;\s*\}\s*$/m.test(S) && /Invalid or missing weather parameters/.test(S), '400');
  check('  coordinates are range-checked', /lat < -90 \|\| lat > 90 \|\| lon < -180 \|\| lon > 180/.test(S), 'validated');
  check('  archive dates must match YYYY-MM-DD', /\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/.test(S), 'isDate guard');

  // The rate limiter returns an object, not a boolean — misusing it disables it.
  check('rate limit destructures { limited } rather than truthiness',
    /const \{ limited, remaining \} = checkRateLimit\(/.test(S), 'destructured');

  return results;
}

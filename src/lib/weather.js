/**
 * src/lib/weather.js
 *
 * Wedding-day weather for the top bar countdown ("John & Suzanne · 169 days
 * to go"). Free, no-key Open-Meteo APIs throughout — geocoding, forecast,
 * and historical archive. getWeddingWeather returns a DISCRIMINATED result
 * ({ state, data }), never a bare null, so a caller can tell "nothing to show"
 * apart from "something broke" — see the WEATHER_* constants below.
 *
 * WeddingDetails has no dedicated city field — only mainCeremony.address /
 * reception.address, a full Google Places formatted_address string (e.g.
 * "Sydney Opera House, Bennelong Point, Sydney NSW 2000, Australia"). Open-
 * Meteo's geocoder only resolves place names, not full street addresses, so
 * guessCity() walks the comma segments (skipping the venue name and the
 * country) from the end backwards, stripping trailing state-code/postcode
 * patterns from each, until one successfully geocodes.
 */

const GEOCODE_TTL_MS    = 30 * 24 * 60 * 60 * 1000; // city coordinates don't move
const CURRENT_TTL_MS    = 30 * 60 * 1000;
const FORECAST_TTL_MS   = 3 * 60 * 60 * 1000;
const SEASONAL_TTL_MS   = 7 * 24 * 60 * 60 * 1000;
const FORECAST_MAX_DAYS = 16;

function readCache(key, ttl) {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (cached && Date.now() - cached.ts < ttl) return cached.data;
  } catch { /* unreadable or malformed cache entry — treat as a miss and re-fetch */ }
  return undefined;
}

function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch { /* localStorage unavailable (private mode / quota exceeded) — caching is best-effort */ }
}

// Strips a trailing "STATE 1234" / "ST 12345" / bare postcode remnant, leaving just the locality.
function stripStateAndPostcode(segment) {
  return segment
    .replace(/\b[A-Z]{2,3}\b\s*\d{3,6}(-\d{4})?\s*$/, '')
    .replace(/\b\d{3,6}\s*$/, '')
    .trim();
}

/**
 * @returns {Promise<{ loc: null | {latitude:number,longitude:number,timezone:string}, failed: boolean }>}
 *   `failed` means the lookup could not RUN (network/parse threw). A clean
 *   response that simply matched no place is `{ loc: null, failed: false }`.
 *   The caller needs the difference: one is a broken service, the other is an
 *   address the couple can correct.
 */
async function geocode(name) {
  const cacheKey = `oi_weather_geocode_${name.toLowerCase()}`;
  const cached = readCache(cacheKey, GEOCODE_TTL_MS);
  if (cached !== undefined) return { loc: cached, failed: false };

  let result = null;
  let failed = false;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);
    const data = await res.json();
    const loc = data.results?.[0];
    if (loc) result = { latitude: loc.latitude, longitude: loc.longitude, timezone: loc.timezone };
  } catch (err) {
    // "The difference between a bad city string and a dead geocoding API is
    // the whole question when this eventually matters." It matters now: the
    // not-found state is the one a couple is expected to ACT on, so a dead
    // API must never be reported as a bad address. Hence `failed`, not just
    // the log line. The city name is the input you need to act on.
    failed = true;
    console.warn(`[weather] geocoding failed for "${name}" — ${err?.message || err}`);
  }

  // Only a SUCCESSFUL lookup is cached. This key has no date component and
  // GEOCODE_TTL_MS is 30 days, so writing `null` here meant one transient
  // geocoding blip blanked the weather panel for a month — and unclearably,
  // because resolveVenueLocation returns the cached null and every later call
  // short-circuits before the weather API is even attempted. The couple could
  // refresh, retry and wait and nothing would fix it.
  //
  // There is no negative-caching trade-off to weigh: geocoding results are
  // stable — a venue's coordinates do not change — so a negative entry can
  // only ever prolong an outage. It buys nothing and costs a month.
  if (result) writeCache(cacheKey, result);
  return { loc: result, failed };
}

// Tries each candidate locality from an address string, closest to the
// country first, returning the first that actually geocodes.
/**
 * @returns {Promise<{ loc: null | {latitude:number,longitude:number,timezone:string}, failed: boolean }>}
 *   `failed` is true only when every attempt was prevented from running. An
 *   address with too few segments to hold a locality never reaches the network
 *   and is a genuine miss, not a failure.
 */
async function resolveVenueLocation(address) {
  if (!address) return { loc: null, failed: false };
  const segments = address.split(',').map(s => s.trim()).filter(Boolean);
  if (segments.length < 2) return { loc: null, failed: false };

  // Drop the venue/street (first) and country (last); walk the rest backwards.
  const candidates = segments.slice(1, -1).reverse();
  let failed = false;
  for (const raw of candidates) {
    const cleaned = stripStateAndPostcode(raw);
    if (!cleaned || /^\d+$/.test(cleaned)) continue;
    const attempt = await geocode(cleaned);
    if (attempt.loc) return { loc: attempt.loc, failed: false };
    if (attempt.failed) failed = true;
  }
  return { loc: null, failed };
}

// WMO weather code → { label, icon } — icon names map to lucide-react components.
const WMO = {
  0: { label: 'Clear', icon: 'Sun' },
  1: { label: 'Mostly clear', icon: 'Sun' },
  2: { label: 'Partly cloudy', icon: 'CloudSun' },
  3: { label: 'Cloudy', icon: 'Cloud' },
  45: { label: 'Foggy', icon: 'CloudFog' }, 48: { label: 'Foggy', icon: 'CloudFog' },
  51: { label: 'Light drizzle', icon: 'CloudDrizzle' }, 53: { label: 'Drizzle', icon: 'CloudDrizzle' }, 55: { label: 'Heavy drizzle', icon: 'CloudDrizzle' },
  56: { label: 'Freezing drizzle', icon: 'CloudDrizzle' }, 57: { label: 'Freezing drizzle', icon: 'CloudDrizzle' },
  61: { label: 'Light rain', icon: 'CloudRain' }, 63: { label: 'Rain', icon: 'CloudRain' }, 65: { label: 'Heavy rain', icon: 'CloudRain' },
  66: { label: 'Freezing rain', icon: 'CloudRain' }, 67: { label: 'Freezing rain', icon: 'CloudRain' },
  71: { label: 'Light snow', icon: 'CloudSnow' }, 73: { label: 'Snow', icon: 'CloudSnow' }, 75: { label: 'Heavy snow', icon: 'CloudSnow' }, 77: { label: 'Snow grains', icon: 'CloudSnow' },
  80: { label: 'Rain showers', icon: 'CloudRain' }, 81: { label: 'Rain showers', icon: 'CloudRain' }, 82: { label: 'Heavy showers', icon: 'CloudRain' },
  85: { label: 'Snow showers', icon: 'CloudSnow' }, 86: { label: 'Snow showers', icon: 'CloudSnow' },
  95: { label: 'Thunderstorm', icon: 'CloudLightning' }, 96: { label: 'Thunderstorm', icon: 'CloudLightning' }, 99: { label: 'Thunderstorm', icon: 'CloudLightning' },
};
const describeCode = (code) => WMO[code] || { label: '', icon: 'Cloud' };

function daysBetween(a, b) {
  return Math.round((a - b) / 86400000);
}

/**
 * Discriminated result. getWeddingWeather used to return bare `null` on six
 * different paths, so the caller could not tell "there is nothing to show
 * because there is nothing to show" from "there is nothing to show because
 * something broke" — and Layout.jsx could not have rendered a message even
 * if it wanted one.
 *
 *   ok              — real data, `data` populated
 *   not-applicable  — no venue address, no wedding date, or an unparseable
 *                     date. Renders NOTHING, deliberately: a couple who has
 *                     not finished onboarding must not be told something failed.
 *   not-found       — geocoding ran and matched nothing. Actionable: the
 *                     couple can fix the venue address.
 *   unavailable     — a fetch threw, returned no usable data, or the
 *                     historical archive came back empty. Not actionable; it
 *                     clears itself when the service returns, because failures
 *                     are no longer cached (#415).
 */
export const WEATHER_OK             = 'ok';
export const WEATHER_NOT_APPLICABLE = 'not-applicable';
export const WEATHER_NOT_FOUND      = 'not-found';
export const WEATHER_UNAVAILABLE    = 'unavailable';

const ok            = (data) => ({ state: WEATHER_OK, data });
const notApplicable = ()     => ({ state: WEATHER_NOT_APPLICABLE, data: null });
const notFound      = ()     => ({ state: WEATHER_NOT_FOUND, data: null });
const unavailable   = ()     => ({ state: WEATHER_UNAVAILABLE, data: null });

/**
 * @param {{ mainCeremony?: { address?: string, placeId?: string|null },
 *   reception?: { address?: string, placeId?: string|null }, weddingDate?: string }} weddingDetails
 * @returns {Promise<{ state: 'ok'|'not-applicable'|'not-found'|'unavailable',
 *   data: null | { mode: 'seasonal'|'forecast'|'current', label?: string, icon: string, temp?: number, high?: number, low?: number } }>}
 *   `label` is a weather-code description on current/forecast and absent on
 *   seasonal, which is numbers only — Layout.jsx words that mode.
 */
export async function getWeddingWeather(weddingDetails) {
  // The venue OBJECT, not just its address, so placeId travels with it.
  // Same precedence as before: ceremony first, reception as the fallback.
  const ceremony = weddingDetails?.mainCeremony;
  const reception = weddingDetails?.reception;
  const venue = ceremony?.address ? ceremony : reception?.address ? reception : null;
  const address = venue?.address;
  const weddingDate = weddingDetails?.weddingDate;
  if (!address || !weddingDate) return notApplicable();

  const target = new Date(weddingDate);
  if (Number.isNaN(target.getTime())) return notApplicable();

  const today = new Date();
  const daysUntil = daysBetween(new Date(target.toDateString()), new Date(today.toDateString()));
  const mode = daysUntil <= 0 ? 'current' : daysUntil <= FORECAST_MAX_DAYS ? 'forecast' : 'seasonal';

  const dayCacheKey = `oi_weather_${mode}_${address}_${weddingDate}_${today.toDateString()}`;
  const cacheTtl = mode === 'current' ? CURRENT_TTL_MS : mode === 'forecast' ? FORECAST_TTL_MS : SEASONAL_TTL_MS;
  const cached = readCache(dayCacheKey, cacheTtl);
  // Only successful results are ever cached (#415), so a hit is always `ok`.
  if (cached !== undefined) return ok(cached);

  let result = null;
  let failed = false;
  let located = false;
  let geocodeFailed = false;
  try {
    const resolved = await resolveVenueLocation(address);
    located = !!resolved.loc;
    geocodeFailed = resolved.failed;
    if (resolved.loc) result = await fetchByMode(mode, resolved.loc, target, daysUntil);
  } catch {
    failed = true;
  }

  // Success only, same rule. In practice this one is currently harmless —
  // dayCacheKey embeds today.toDateString() so it rotates at midnight and the
  // 7-day seasonal TTL never gets to run — but "harmless because of an
  // unrelated key design" is not a property to rely on. Someone will change
  // that key one day and the 7 days will suddenly be real.
  if (result) writeCache(dayCacheKey, result);
  if (result) return ok(result);
  // Geocoding matched nothing and nothing threw — the address is the problem,
  // which the couple can act on. Distinguished from a thrown fetch or an
  // empty/unusable response, which they cannot.
  // Geocoding RAN and matched nothing. WHY decides the state, and placeId is
  // what tells us: it is null exactly when the venue was typed by hand rather
  // than picked from Places (VenueSearchPanel.jsx:83 sets it, :95 nulls it).
  //
  //   no placeId  -> NOT-APPLICABLE. Someone typed "the family farm". That is
  //                  not an error and not a bad address; the feature simply does
  //                  not apply, the same as having no date set. Calling it
  //                  not-found would mean telling a couple to correct something
  //                  they entered deliberately and correctly.
  //   has placeId -> NOT-FOUND, the genuinely odd case: Google gave us this
  //                  address and the geocoder still cannot place it.
  //
  // This runs ONLY after the attempt has already failed. It deliberately does
  // not short-circuit the lookup: a hand-typed but perfectly ordinary address
  // ("42 Main St, Sydney NSW 2000") geocodes fine and shows real weather today,
  // and gating on placeId up front would silently take that away.
  if (!failed && !located && !geocodeFailed) {
    return venue?.placeId ? notFound() : notApplicable();
  }
  return unavailable();
}

async function fetchByMode(mode, loc, target, daysUntil) {
  if (mode === 'current') {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true&timezone=auto`);
    const data = await res.json();
    const cw = data.current_weather;
    if (!cw) return null;
    const { label, icon } = describeCode(cw.weathercode);
    return { mode, label, icon, temp: Math.round(cw.temperature) };
  }

  if (mode === 'forecast') {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=${FORECAST_MAX_DAYS}&timezone=auto`);
    const data = await res.json();
    const idx = data.daily?.time?.indexOf(target.toISOString().slice(0, 10));
    if (idx == null || idx < 0) return null;
    const { label, icon } = describeCode(data.daily.weathercode[idx]);
    return {
      mode, label, icon,
      high: Math.round(data.daily.temperature_2m_max[idx]),
      low: Math.round(data.daily.temperature_2m_min[idx]),
    };
  }

  // Seasonal: average the same ±3-day calendar window across the last 3 years.
  const years = [1, 2, 3];
  const highs = [], lows = [];
  for (const yearsAgo of years) {
    const start = new Date(target); start.setFullYear(start.getFullYear() - yearsAgo); start.setDate(start.getDate() - 3);
    const end   = new Date(target); end.setFullYear(end.getFullYear() - yearsAgo); end.setDate(end.getDate() + 3);
    try {
      const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${loc.latitude}&longitude=${loc.longitude}&start_date=${start.toISOString().slice(0, 10)}&end_date=${end.toISOString().slice(0, 10)}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
      const data = await res.json();
      (data.daily?.temperature_2m_max || []).forEach(v => typeof v === 'number' && highs.push(v));
      (data.daily?.temperature_2m_min || []).forEach(v => typeof v === 'number' && lows.push(v));
    } catch (err) {
      // Diagnostics only — behaviour unchanged, this year is skipped and the
      // averages are computed from whatever did return. Without the date
      // range you cannot tell a single bad year from the archive API being
      // down for all three.
      console.warn(
        `[weather] historical fetch failed for ${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)} ` +
        `at ${loc.latitude},${loc.longitude} — ${err?.message || err}`
      );
    }
  }
  if (!highs.length || !lows.length) return null;
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  // No label. It used to read "Typical for this time of year", which made the
  // rendered string 218px in a slot with ~130px to spare at 1280 next to a long
  // couple name, so it ellipsized away to nothing useful. Seasonal wording now
  // lives in Layout.jsx alongside the other two modes' formatting; the data
  // stays just the numbers.
  return {
    mode: 'seasonal',
    icon: 'CloudSun',
    high: Math.round(avg(highs)),
    low: Math.round(avg(lows)),
  };
}

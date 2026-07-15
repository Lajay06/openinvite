/**
 * src/lib/weather.js
 *
 * Wedding-day weather for the top bar countdown ("John & Suzanne · 169 days
 * to go"). Free, no-key Open-Meteo APIs throughout — geocoding, forecast,
 * and historical archive. Every failure resolves to `null`; callers should
 * simply not render anything rather than show an error, per spec.
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
  } catch {}
  return undefined;
}

function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

// Strips a trailing "STATE 1234" / "ST 12345" / bare postcode remnant, leaving just the locality.
function stripStateAndPostcode(segment) {
  return segment
    .replace(/\b[A-Z]{2,3}\b\s*\d{3,6}(-\d{4})?\s*$/, '')
    .replace(/\b\d{3,6}\s*$/, '')
    .trim();
}

async function geocode(name) {
  const cacheKey = `oi_weather_geocode_${name.toLowerCase()}`;
  const cached = readCache(cacheKey, GEOCODE_TTL_MS);
  if (cached !== undefined) return cached;

  let result = null;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);
    const data = await res.json();
    const loc = data.results?.[0];
    if (loc) result = { latitude: loc.latitude, longitude: loc.longitude, timezone: loc.timezone };
  } catch {}

  writeCache(cacheKey, result);
  return result;
}

// Tries each candidate locality from an address string, closest to the
// country first, returning the first that actually geocodes.
async function resolveVenueLocation(address) {
  if (!address) return null;
  const segments = address.split(',').map(s => s.trim()).filter(Boolean);
  if (segments.length < 2) return null;

  // Drop the venue/street (first) and country (last); walk the rest backwards.
  const candidates = segments.slice(1, -1).reverse();
  for (const raw of candidates) {
    const cleaned = stripStateAndPostcode(raw);
    if (!cleaned || /^\d+$/.test(cleaned)) continue;
    const loc = await geocode(cleaned);
    if (loc) return loc;
  }
  return null;
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
 * @param {{ mainCeremony?: { address?: string }, reception?: { address?: string }, weddingDate?: string }} weddingDetails
 * @returns {Promise<null | { mode: 'seasonal'|'forecast'|'current', label: string, icon: string, temp?: number, high?: number, low?: number }>}
 */
export async function getWeddingWeather(weddingDetails) {
  const address = weddingDetails?.mainCeremony?.address || weddingDetails?.reception?.address;
  const weddingDate = weddingDetails?.weddingDate;
  if (!address || !weddingDate) return null;

  const target = new Date(weddingDate);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  const daysUntil = daysBetween(new Date(target.toDateString()), new Date(today.toDateString()));
  const mode = daysUntil <= 0 ? 'current' : daysUntil <= FORECAST_MAX_DAYS ? 'forecast' : 'seasonal';

  const dayCacheKey = `oi_weather_${mode}_${address}_${weddingDate}_${today.toDateString()}`;
  const cacheTtl = mode === 'current' ? CURRENT_TTL_MS : mode === 'forecast' ? FORECAST_TTL_MS : SEASONAL_TTL_MS;
  const cached = readCache(dayCacheKey, cacheTtl);
  if (cached !== undefined) return cached;

  let result = null;
  try {
    const loc = await resolveVenueLocation(address);
    if (loc) result = await fetchByMode(mode, loc, target, daysUntil);
  } catch {
    result = null;
  }

  writeCache(dayCacheKey, result);
  return result;
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
    } catch {}
  }
  if (!highs.length || !lows.length) return null;
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  return {
    mode: 'seasonal',
    label: 'Typical for this time of year',
    icon: 'CloudSun',
    high: Math.round(avg(highs)),
    low: Math.round(avg(lows)),
  };
}

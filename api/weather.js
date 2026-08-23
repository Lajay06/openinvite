/**
 * GET /api/weather?mode=<geocode|current|forecast|archive>&...
 *
 * Open-Meteo proxy. Mirrors the api/places.js pattern that CLAUDE.md
 * mandates for third-party lookups.
 *
 * WHY (L2, leak pair): weather.js called Open-Meteo directly from the
 * browser, so the venue's NAME and then its LATITUDE/LONGITUDE travelled
 * from each couple's device to a third party with no proxy -- while the
 * Google Places lookups beside it were correctly server-proxied. Open-Meteo
 * needs no API key, so unlike the Places proxies this exists purely to stop
 * that disclosure, not to hide a credential.
 *
 * NOT AN OPEN PROXY. The client sends a `mode` plus typed parameters and the
 * upstream URL is built HERE from an allowlist. A proxy that forwarded a
 * caller-supplied URL would be an SSRF hole pointed at our own network.
 * Every parameter is validated and re-encoded; nothing is passed through
 * verbatim.
 *
 * Caching is deliberately NOT moved here. weather.js keeps its localStorage
 * cache with its per-mode TTLs, including the #415 rule that a FAILED lookup
 * is never cached -- writing a null into the 30-day geocode key once poisoned
 * that venue for a month. This endpoint only changes who makes the outbound
 * request; it returns upstream JSON unchanged so every caller-side branch,
 * TTL and discriminated result keeps working untouched.
 */
import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';

const GEOCODE  = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE  = 'https://archive-api.open-meteo.com/v1/archive';

const isNum  = (v) => v !== undefined && v !== '' && Number.isFinite(Number(v));
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Builds the upstream URL from validated inputs. Returns null if invalid. */
function upstreamFor(query) {
  const { mode, name, latitude, longitude, forecast_days, start_date, end_date } = query;

  if (mode === 'geocode') {
    if (!name || typeof name !== 'string' || !name.trim()) return null;
    const u = new URL(GEOCODE);
    u.searchParams.set('name', name.trim());
    u.searchParams.set('count', '1');
    u.searchParams.set('language', 'en');
    u.searchParams.set('format', 'json');
    return u;
  }

  if (!isNum(latitude) || !isNum(longitude)) return null;
  const lat = Number(latitude), lon = Number(longitude);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  if (mode === 'current') {
    const u = new URL(FORECAST);
    u.searchParams.set('latitude', String(lat));
    u.searchParams.set('longitude', String(lon));
    u.searchParams.set('current_weather', 'true');
    u.searchParams.set('timezone', 'auto');
    return u;
  }

  if (mode === 'forecast') {
    const days = Number(forecast_days);
    if (!Number.isInteger(days) || days < 1 || days > 16) return null;
    const u = new URL(FORECAST);
    u.searchParams.set('latitude', String(lat));
    u.searchParams.set('longitude', String(lon));
    u.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weathercode');
    u.searchParams.set('forecast_days', String(days));
    u.searchParams.set('timezone', 'auto');
    return u;
  }

  if (mode === 'archive') {
    if (!isDate(start_date) || !isDate(end_date)) return null;
    const u = new URL(ARCHIVE);
    u.searchParams.set('latitude', String(lat));
    u.searchParams.set('longitude', String(lon));
    u.searchParams.set('start_date', start_date);
    u.searchParams.set('end_date', end_date);
    u.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
    u.searchParams.set('timezone', 'auto');
    return u;
  }

  return null;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // checkRateLimit returns { limited, remaining } -- NOT a boolean. Treating
  // it as one silently disables the limit, because an object is always truthy.
  const { limited, remaining } = checkRateLimit(getClientIp(req), 'weather', 60);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const upstream = upstreamFor(req.query || {});
  if (!upstream) {
    return res.status(400).json({ error: 'Invalid or missing weather parameters' });
  }

  try {
    const r = await fetch(upstream.toString(), { headers: { Accept: 'application/json' } });
    const data = await r.json();
    // Upstream shape passed through unchanged: weather.js owns every
    // interpretation, including "no results" vs "lookup failed" (#417).
    return res.status(r.ok ? 200 : 502).json(data);
  } catch (err) {
    console.error('[weather] upstream fetch failed:', err?.message);
    return res.status(502).json({ error: 'Weather lookup failed' });
  }
}

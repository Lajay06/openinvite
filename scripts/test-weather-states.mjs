/**
 * scripts/test-weather-states.mjs
 *
 * Proves every state getWeddingWeather can return is actually reachable, and
 * that each one means what it says.
 *
 * WHY THIS EXISTS
 * ---------------
 * getWeddingWeather used to return a bare `null` on six different paths, so
 * "there is nothing to show" and "something broke" were the same value. The
 * discriminated return splits them, but a discriminated return is only worth
 * anything if each arm is reachable — an unreachable arm is a comment.
 *
 * The distinction this test cares about most is not-found vs unavailable.
 * not-found is the only state a couple can act on (their venue address did
 * not resolve), so it is the one that will eventually surface a message
 * telling them to fix it. Classifying a geocoder outage as not-found would
 * tell someone to correct a perfectly good address because the network was
 * down. That defect was real and this test is what caught it.
 *
 * Plain Node, no browser: localStorage and fetch are stubbed, so nothing here
 * touches the network or any real record.
 */

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: k => store.delete(k),
};

// A real Google Places formatted_address. resolveVenueLocation needs at least
// three comma segments (it drops the venue and the country), so a bare city
// name never reaches the geocoder at all.
const today = new Date().toISOString().slice(0, 10);
const ADDR = 'Sydney Opera House, Bennelong Point, Sydney NSW 2000, Australia';

// placeId is what separates a venue picked from Places from one typed by hand.
// It decides how a FAILED lookup is classified, so both shapes are needed.
const fromPlaces = (address = ADDR) => ({ mainCeremony: { address, placeId: 'ChIJ3S-JXmauEmsRUcIaWtf4MzE' }, weddingDate: today });
const handTyped  = (address = ADDR) => ({ mainCeremony: { address, placeId: null }, weddingDate: today });

let mode = 'ok';
const GEO_HIT = { results: [{ latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' }] };
const GEO_MISS = { results: [] };
const CURRENT = { current_weather: { weathercode: 0, temperature: 21 } };

globalThis.fetch = async (url) => {
  // The client now calls our own /api/weather proxy (L2) instead of
  // open-meteo.com directly, so a geocode request is identified by the
  // proxy's mode parameter. Matching the old upstream host made every
  // geocode look like a forecast and collapsed 9 of 13 states.
  const isGeo = url.includes('mode=geocode');
  if (mode === 'throw') throw new Error('network down');
  if (isGeo && mode === 'geothrow') throw new Error('geocoder unreachable');
  if (isGeo) return { ok: true, json: async () => (mode === 'nomatch' ? GEO_MISS : GEO_HIT) };
  if (mode === 'emptydata') return { ok: true, json: async () => ({}) };
  return { ok: true, json: async () => CURRENT };
};

const {
  getWeddingWeather,
  WEATHER_OK,
  WEATHER_NOT_APPLICABLE,
  WEATHER_NOT_FOUND,
  WEATHER_UNAVAILABLE,
} = await import('../src/lib/weather.js');

const results = [];

async function check(label, fetchMode, details, expected) {
  mode = fetchMode;
  store.clear();
  const r = await getWeddingWeather(details);
  const pass = !!r && r.state === expected;
  results.push(pass);
  const state = String(r && r.state);
  console.log(
    `  ${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(30)} ${state.padEnd(15)} ` +
    `data=${r && r.data ? 'present' : 'null'}${pass ? '' : `   EXPECTED ${expected}`}`
  );
}

// Nothing to show, and deliberately silent: a couple part-way through
// onboarding must not be told that something failed.
await check('no venue address', 'ok', { weddingDate: today }, WEATHER_NOT_APPLICABLE);
await check('no wedding date', 'ok', { mainCeremony: { address: ADDR } }, WEATHER_NOT_APPLICABLE);
await check('unparseable date', 'ok', { mainCeremony: { address: ADDR }, weddingDate: 'not-a-date' }, WEATHER_NOT_APPLICABLE);

// Real data.
await check('happy path', 'ok', fromPlaces(), WEATHER_OK);

// From Places and it still will not resolve: genuinely odd, and the address is
// the thing to look at.
await check('places addr, no match', 'nomatch', fromPlaces(), WEATHER_NOT_FOUND);
await check('places addr, too short', 'ok', fromPlaces('Sydney'), WEATHER_NOT_FOUND);

// Typed by hand and it will not resolve: almost always someone who meant it —
// "the family farm" is not a mistake to be corrected. Not an error state.
await check('typed addr, no match', 'nomatch', handTyped(), WEATHER_NOT_APPLICABLE);
await check('typed addr, too short', 'ok', handTyped('The family farm'), WEATHER_NOT_APPLICABLE);

// placeId must only ever RELABEL a failure, never skip the attempt: an ordinary
// hand-typed address geocodes fine and must still show real weather.
await check('typed addr that resolves', 'ok', handTyped(), WEATHER_OK);

// Not the couple's problem, and not actionable. The geocoder-outage case is
// the one that used to be misreported as not-found.
await check('geocoder unreachable', 'geothrow', fromPlaces(), WEATHER_UNAVAILABLE);
await check('all fetches throw', 'throw', fromPlaces(), WEATHER_UNAVAILABLE);
await check('located, empty payload', 'emptydata', fromPlaces(), WEATHER_UNAVAILABLE);

// The contract itself: always shaped, never a bare null, never rejects.
mode = 'throw';
store.clear();
const shape = await getWeddingWeather({ mainCeremony: { address: ADDR }, weddingDate: today });
const shaped = shape !== null && typeof shape === 'object' && 'state' in shape && 'data' in shape;
results.push(shaped);
console.log(`  ${shaped ? 'PASS' : 'FAIL'}  ${'never a bare null'.padEnd(30)} shape={state,data}`);

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${results.every(Boolean) ? 'ALL PASS' : 'FAILURES PRESENT'}`);
process.exit(results.every(Boolean) ? 0 : 1);

/**
 * tests/persistence/calendar-feed.mjs
 *
 * THE SUBSCRIBE FEED GIVES OUT ONLY WHAT IT IS ASKED FOR, AND ONLY TO THE
 * LINK THAT HOLDS THE TOKEN.
 *
 * A subscribed calendar is fetched by Google's servers, not the couple's
 * browser, so the URL is the authority — there is no session to check. Three
 * things therefore have to be true, and each is planted below:
 *
 *   the token cannot be guessed        HMAC under a server-only secret
 *   a refusal says nothing             404, never 401: a 401 would confirm
 *                                      the wedding exists
 *   the feed carries an ALLOWLIST      not a denylist, which would leak the
 *                                      next field somebody adds
 *
 * THE SECRET IS NEVER HANDLED HERE. This file uses a literal fixture string of
 * its own; the real CALENDAR_FEED_SECRET is created by the owner and entered
 * in Vercel, and the last check greps the built bundle to prove no secret of
 * any kind reached it.
 */
import { pass, fail } from './_shared.mjs';
import { calendarFeedToken, calendarFeedTokenMatches, TOKEN_LENGTH } from '../../api/_lib/calendarFeedToken.js';
import { pickFeedFields, FEED_FIELDS } from '../../api/schedule.ics.js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** A fixture secret, and obviously one. Never the real value. */
const SECRET = 'fixture-secret-not-the-real-one';

/** Runs the handler with a stubbed Base44 and a captured response. */
// `null` means UNSET, not `undefined`. Passing `adminKey: undefined` let the
// default parameter take over, so the "no admin key" case silently ran WITH a
// key and reported 200 — a plant that tested nothing.
async function callFeed({ w, t, secret = SECRET, adminKey = 'fixture-admin-key', rows = [] } = {}) {
  const mod = await import('../../api/schedule.ics.js');
  const prevSecret = process.env.CALENDAR_FEED_SECRET;
  const prevAdmin = process.env.BASE44_ADMIN_KEY;
  if (secret === null) delete process.env.CALENDAR_FEED_SECRET; else process.env.CALENDAR_FEED_SECRET = secret;
  if (adminKey === null) delete process.env.BASE44_ADMIN_KEY; else process.env.BASE44_ADMIN_KEY = adminKey;
  const captured = { status: 0, body: '', headers: {} };
  const res = {
    status(c) { captured.status = c; return this; },
    setHeader(k, v) { captured.headers[k.toLowerCase()] = v; },
    send(b) { captured.body = b; return this; },
    end() { return this; },
  };
  const fetchImpl = async () => ({ ok: true, json: async () => rows });
  try {
    await mod.default({ method: 'GET', query: { w, t }, headers: {} }, res, fetchImpl);
  } finally {
    if (prevSecret === undefined) delete process.env.CALENDAR_FEED_SECRET; else process.env.CALENDAR_FEED_SECRET = prevSecret;
    if (prevAdmin === undefined) delete process.env.BASE44_ADMIN_KEY; else process.env.BASE44_ADMIN_KEY = prevAdmin;
  }
  return captured;
}

const ROW = {
  id: 's1', wedding_id: 'w1',
  event_name: 'Ceremony', event_date: '2027-07-03', start_time: '15:00', end_time: '16:00',
  location: 'The Old Observatory', description: 'Guests seated by 2.45',
  // Everything below must never leave the server.
  notes: 'REMEMBER THE RINGS', responsible_person: 'Aunt Jo',
  run_sheet: [{ id: 'r1', item: 'Processional', who: 'Everyone' }], category: 'ceremony',
};

export async function runCalendarFeed() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The calendar subscribe feed:\n');

  // ── THE TOKEN ───────────────────────────────────────────────────────────
  {
    const t = calendarFeedToken('w1', SECRET);
    check('the token is 32 hex characters, derived not stored',
      t.length === TOKEN_LENGTH && /^[0-9a-f]+$/.test(t), `${t.length} chars`);
    check('  the same wedding always gets the same one',
      calendarFeedToken('w1', SECRET) === t, 'a pure function of the id');
    check('  a different wedding gets a different one',
      calendarFeedToken('w2', SECRET) !== t, 'not a shared link');
    check('  and a different secret changes every one of them',
      calendarFeedToken('w1', 'another-fixture-secret') !== t, 'which is how rotation works today');
    check('no secret means no token, rather than a token of nothing',
      calendarFeedToken('w1', undefined) === null && calendarFeedToken('w1', '') === null, 'null');
    check('the compare rejects a wrong token of the right length',
      calendarFeedTokenMatches('w1', SECRET, 'f'.repeat(TOKEN_LENGTH)) === false, 'no match');
    check('  and one of the wrong length, without throwing',
      calendarFeedTokenMatches('w1', SECRET, 'abc') === false
        && calendarFeedTokenMatches('w1', SECRET, t + 'x') === false,
      'timingSafeEqual throws on a length mismatch; the lengths are checked first');
    check('  it is a constant-time compare, not ===',
      /timingSafeEqual/.test(code('api/_lib/calendarFeedToken.js'))
        && !/expected === candidate/.test(code('api/_lib/calendarFeedToken.js')),
      'a === on a hex string leaks its answer through how long it takes to say no');
  }

  // ── WHO GETS AN ANSWER ──────────────────────────────────────────────────
  {
    const good = calendarFeedToken('w1', SECRET);
    const ok = await callFeed({ w: 'w1', t: good, rows: [ROW] });
    check('PLANT: the right token gets the calendar',
      ok.status === 200 && /BEGIN:VCALENDAR/.test(ok.body), `${ok.status}`);
    check('  as text/calendar, cached privately for an hour',
      /text\/calendar/.test(ok.headers['content-type'] || '')
        && ok.headers['cache-control'] === 'private, max-age=3600',
      ok.headers['cache-control']);

    for (const [what, args] of [
      ['a wrong token',      { w: 'w1', t: 'f'.repeat(32) }],
      ['no token at all',    { w: 'w1', t: '' }],
      ['another wedding\'s token', { w: 'w1', t: calendarFeedToken('w2', SECRET) }],
      ['no wedding id',      { w: '', t: 'f'.repeat(32) }],
      ['no secret set',      { w: 'w1', t: 'f'.repeat(32), secret: null }],
      ['no admin key',       { w: 'w1', t: calendarFeedToken('w1', SECRET), adminKey: null }],
    ]) {
      const r = await callFeed({ ...args, rows: [ROW] });
      check(`PLANT: ${what} → 404, and nothing else`,
        r.status === 404 && !r.body, `${r.status} ${r.body ? 'with a body' : 'empty'}`);
    }
    check('  never 401 — that would confirm the wedding exists',
      !/401/.test(code('api/schedule.ics.js')), 'one answer for every refusal');
  }

  // ── WHAT LEAVES THE SERVER ──────────────────────────────────────────────
  {
    check('the allowlist is exactly the six safe fields',
      JSON.stringify(FEED_FIELDS) === JSON.stringify(
        ['event_name', 'event_date', 'start_time', 'end_time', 'location', 'description']),
      FEED_FIELDS.join(', '));
    const picked = pickFeedFields(ROW);
    check('PLANT: a disallowed field never survives the pick',
      !('notes' in picked) && !('responsible_person' in picked) && !('run_sheet' in picked)
        && !('category' in picked) && !('wedding_id' in picked),
      Object.keys(picked).join(', '));

    const body = (await callFeed({ w: 'w1', t: calendarFeedToken('w1', SECRET), rows: [ROW] })).body;
    check('PLANT: and none of it appears anywhere in the feed',
      !/REMEMBER THE RINGS/.test(body) && !/Aunt Jo/.test(body) && !/Processional/.test(body),
      'notes, responsible_person and the run sheet all stay behind');
    check('  while what IS allowed does appear',
      /Ceremony/.test(body) && /The Old Observatory/.test(body), 'the event, its time and its place');
    check('  it is an ALLOWLIST, so a field added tomorrow is out by default',
      /for \(const f of FEED_FIELDS\)/.test(code('api/schedule.ics.js'))
        && !/delete out\./.test(code('api/schedule.ics.js')),
      'a denylist would leak the next field somebody adds');
  }

  // ── THE SECRET NEVER REACHES A BROWSER ──────────────────────────────────
  {
    const client = ['src/components/schedule/SubscribeCalendar.jsx', 'src/pages/ScheduleHub.jsx', 'src/pages/Calendar.jsx']
      .filter((f) => /CALENDAR_FEED_SECRET|calendarFeedToken/.test(code(f)));
    check('PLANT: no client file mentions the secret or derives a token',
      client.length === 0, client.join(', ') || 'the page asks for the finished URL');
    check('  the secret is read from process.env and never logged',
      /process\.env\.CALENDAR_FEED_SECRET/.test(code('api/schedule.ics.js'))
        && !/console\.[a-z]+\([^)]*secret/i.test(code('api/schedule.ics.js'))
        && !/console\.[a-z]+\([^)]*secret/i.test(code('api/_lib/calendarFeedToken.js')),
      'never printed, never defaulted to a literal');

    // THE BUILT BUNDLE, not the source. A source check cannot see a value
    // inlined by the bundler from an env var it was given at build time.
    const dist = join(ROOT, 'dist');
    if (existsSync(dist)) {
      const files = [];
      const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p); else if (/\.(js|css|html)$/.test(e.name)) files.push(p);
      } };
      walk(dist);
      const leaked = files.filter((f) => /CALENDAR_FEED_SECRET/.test(readFileSync(f, 'utf8')));
      check(`PLANT: the secret's name appears in none of the ${files.length} built files`,
        leaked.length === 0, leaked.map((f) => f.replace(ROOT, '')).join(', ') || 'clean');
    } else {
      check('the built bundle could not be checked — run npm run build first',
        false, 'dist/ is absent');
    }
  }

  return results;
}

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
 *   the feed never lists Schedule      that read is owner-scoped and the
 *                                      admin key gets [] from it; the six
 *                                      fields are projected onto the
 *                                      WeddingDetails row by the couple's
 *                                      own session
 *
 * THE SECRET IS NEVER HANDLED HERE. This file uses a literal fixture string of
 * its own; the real CALENDAR_FEED_SECRET is created by the owner and entered
 * in Vercel, and the last check greps the built bundle to prove no secret of
 * any kind reached it.
 */
import { pass, fail } from './_shared.mjs';
import { calendarFeedToken, calendarFeedTokenMatches, TOKEN_LENGTH } from '../../api/_lib/calendarFeedToken.js';
import { pickFeedFields, FEED_FIELDS, projectScheduleForFeed, calendarFeedIsCurrent } from '../../src/lib/calendarFeedProjection.js';
import { GUEST_SAFE_WEDDING_FIELDS } from '../../api/_lib/guestSafeWedding.js';
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
async function callFeed({ w, t, secret = SECRET, adminKey = 'fixture-admin-key', feed = undefined } = {}) {
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
  // Routed like the real platform, not like a friendlier one. A wedding read
  // answers the wedding record, carrying whatever calendarFeed the test
  // planted. A Schedule list answers `200 {data: []}` NO MATTER WHAT — that is
  // what Base44 hands the admin key for an owner-scoped read
  // (BASE44_PLATFORM_NOTES.md), and it is what production served on
  // 2026-09-20. A feed that still asks Schedule gets nothing here, as it did
  // there. Wedding w1 belongs to owner u1; a wedding the fixture does not
  // know 404s like a stranger's.
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    if (/entities\/WeddingDetails\//.test(url)) {
      const ok = /WeddingDetails\/w1$/.test(url);
      const row = { id: 'w1', created_by_id: 'u1' };
      if (feed !== undefined) row.calendarFeed = feed;
      return { ok, json: async () => (ok ? row : {}), text: async () => '' };
    }
    return { ok: true, json: async () => ({ data: [] }), text: async () => '' };
  };
  try {
    await mod.default({ method: 'GET', query: { w, t }, headers: {} }, res, fetchImpl);
    captured.requests = seen;
  } finally {
    if (prevSecret === undefined) delete process.env.CALENDAR_FEED_SECRET; else process.env.CALENDAR_FEED_SECRET = prevSecret;
    if (prevAdmin === undefined) delete process.env.BASE44_ADMIN_KEY; else process.env.BASE44_ADMIN_KEY = prevAdmin;
  }
  return captured;
}

const ROW = {
  id: 's1', created_by_id: 'u1',
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
    const ok = await callFeed({ w: 'w1', t: good, feed: projectScheduleForFeed([ROW]) });
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
      const r = await callFeed({ ...args, feed: projectScheduleForFeed([ROW]) });
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

    const body = (await callFeed({ w: 'w1', t: calendarFeedToken('w1', SECRET), feed: projectScheduleForFeed([ROW]) })).body;
    check('PLANT: and none of it appears anywhere in the feed',
      !/REMEMBER THE RINGS/.test(body) && !/Aunt Jo/.test(body) && !/Processional/.test(body),
      'notes, responsible_person and the run sheet all stay behind');
    check('  while what IS allowed does appear',
      /Ceremony/.test(body) && /The Old Observatory/.test(body), 'the event, its time and its place');
    check('  it is an ALLOWLIST, so a field added tomorrow is out by default',
      /for \(const f of FEED_FIELDS\)/.test(code('src/lib/calendarFeedProjection.js'))
        && !/delete out\./.test(code('src/lib/calendarFeedProjection.js')),
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

  // ── THE WEDDING IS FOUND THROUGH THE HEADER, AND THE LIST IS UNWRAPPED ──
  // On production /api/schedule-feed-url answered {url:null, reason:"no-wedding"}
  // for the owner with both env vars set. The list was fetched with
  // `?api_key=`, which Base44 answers `200 []` for every entity, and only a
  // bare array was accepted. These feed the envelope Base44 really returns
  // and capture the request, so both halves are asserted, not assumed.
  {
    const feedUrl = await import('../../api/schedule-feed-url.js');
    const seen = [];
    const envelope = { data: [
      { id: 'w-old', created_by_id: 'u1', created_date: '2026-01-01T00:00:00Z' },
      { id: 'w-test', created_by_id: 'u1', created_date: '2026-09-01T00:00:00Z', is_test: true },
      { id: 'w-new', created_by_id: 'u1', created_date: '2026-06-01T00:00:00Z' },
    ] };
    const fetchImpl = async (url, init) => { seen.push({ url, init }); return { ok: true, json: async () => envelope, text: async () => '' }; };
    const id = await feedUrl.findMyWeddingId('u1', 'fixture-admin-key', fetchImpl);
    check('findMyWeddingId reads a {data:[…]} envelope and picks the newest real wedding',
      id === 'w-new', String(id));
    check('the admin key travels as Authorization: Bearer, never as ?api_key=',
      seen.length === 1 && seen[0].init?.headers?.Authorization === 'Bearer fixture-admin-key' && !/api_key=/.test(seen[0].url),
      seen[0]?.url);
    check('the query is still created_by_id',
      /created_by_id/.test(decodeURIComponent(seen[0]?.url || '')), 'unchanged filter');

    // Through the handler, with a signed-in caller stubbed in.
    const prevSecret = process.env.CALENDAR_FEED_SECRET, prevAdmin = process.env.BASE44_ADMIN_KEY;
    process.env.CALENDAR_FEED_SECRET = SECRET; process.env.BASE44_ADMIN_KEY = 'fixture-admin-key';
    let out = null;
    const res = { status() { return this; }, json(b) { out = b; return this; } };
    try {
      await feedUrl.default({ method: 'GET', headers: { host: 'openinvite.com.au' } }, res, fetchImpl, async () => ({ id: 'u1' }));
    } finally {
      if (prevSecret === undefined) delete process.env.CALENDAR_FEED_SECRET; else process.env.CALENDAR_FEED_SECRET = prevSecret;
      if (prevAdmin === undefined) delete process.env.BASE44_ADMIN_KEY; else process.env.BASE44_ADMIN_KEY = prevAdmin;
    }
    check('/api/schedule-feed-url returns a url for that wedding, not no-wedding',
      typeof out?.url === 'string' && /schedule\.ics\?w=w-new&t=[0-9a-f]+$/.test(out.url), JSON.stringify(out));

  }

  // ── THE FEED READS THE PROJECTION, AND NEVER ASKS SCHEDULE ──────────────
  // Schedule.read is owner-scoped and the admin key is not a superuser: an
  // owner-scoped list answers `200 []`, silently (BASE44_PLATFORM_NOTES.md).
  // On 2026-09-20 the owner subscribed from production with a correct token
  // and got a valid, EMPTY calendar — the previous join (wedding → owner →
  // Schedule by created_by_id) was right about the owner and got nothing
  // anyway. The six allowlisted fields now live on the WeddingDetails row,
  // which is read:null and which the feed already reads.
  {
    const t = calendarFeedToken('w1', SECRET);
    const rows = [
      { ...ROW, id: 's-a', created_by_id: 'u1' },
      { ...ROW, id: 's-b', event_name: 'Reception', start_time: '18:00', created_by_id: 'u1' },
      { ...ROW, id: 's-c', event_name: 'After party', start_time: '22:00', created_by_id: 'u1' },
    ];
    // THE TEST THAT WAS RED ON THE OLD PATH. Schedule answers [] as the
    // platform does; the wedding row carries three projected events. The old
    // handler built its calendar from the list and emitted zero VEVENTs.
    const three = await callFeed({ w: 'w1', t, feed: projectScheduleForFeed(rows) });
    const uids = [...three.body.matchAll(/^UID:(.+)$/gm)].map((x) => x[1].trim());
    check('PLANT: Schedule answers [] as the platform does, and the feed still carries all three events',
      three.status === 200 && uids.length === 3, `${three.status}, ${uids.length} VEVENT(s)`);
    check('  with three distinct UIDs, none of them undefined',
      new Set(uids).size === 3 && !uids.some((u) => /undefined/.test(u)), uids.join(' | '));
    check('  and no request to Schedule was made at all',
      !(three.requests || []).some((r) => /entities\/Schedule/.test(r.url)),
      (three.requests || []).map((r) => r.url.replace(/^.*entities\//, '')).join(', '));
    const wed = (three.requests || []).find((r) => /entities\/WeddingDetails\//.test(r.url));
    check('  the wedding is read with a Bearer header, never ?api_key=',
      !!wed && wed.init?.headers?.Authorization === 'Bearer fixture-admin-key' && !/api_key=/.test(wed.url), wed?.url);

    // A wedding with no projection yet is an empty calendar, not a refusal:
    // a 404 here would tell a subscribed client the link died.
    const none = await callFeed({ w: 'w1', t });
    check('a wedding with no projection yet serves an empty calendar, not a 404',
      none.status === 200 && /BEGIN:VCALENDAR/.test(none.body) && !/BEGIN:VEVENT/.test(none.body), `${none.status}`);

    // THE ALLOWLIST HOLDS ON THE WAY OUT TOO. A stored event that somehow
    // carries a disallowed field (a hand-written row, an older writer) is
    // re-picked on serve.
    const smuggled = { events: [{ ...ROW, id: 's-x' }], updatedAt: '2026-09-20T00:00:00.000Z' };
    const served = await callFeed({ w: 'w1', t, feed: smuggled });
    check('PLANT: a stored event carrying notes or responsible_person is re-picked on serve',
      served.status === 200 && /Ceremony/.test(served.body)
        && !/REMEMBER THE RINGS/.test(served.body) && !/Aunt Jo/.test(served.body),
      'the allowlist is applied on write AND on read');

    // An event across midnight: 23:45 -> 00:15 must end on the NEXT day, or
    // DTEND precedes DTSTART and the client drops the event.
    const late = { ...ROW, id: 's-late', event_date: '2026-12-31', start_time: '23:45', end_time: '00:15', created_by_id: 'u1' };
    const night = await callFeed({ w: 'w1', t, feed: projectScheduleForFeed([late]) });
    const m = night.body.match(/DTSTART:(\d{8}T\d{6})\r\nDTEND:(\d{8}T\d{6})/);
    check('an event that crosses midnight ends the next day, not before it starts',
      !!m && m[1] === '20261231T234500' && m[2] === '20270101T001500', m ? `${m[1]} -> ${m[2]}` : 'no VEVENT');
  }

  // ── THE PROJECTION ITSELF ───────────────────────────────────────────────
  {
    const rows = [
      { ...ROW, id: 's-late', event_date: '2027-07-03', start_time: '22:00' },
      { ...ROW, id: 's-early', event_date: '2027-07-03', start_time: '09:00' },
      { ...ROW, id: 's-prev', event_date: '2027-07-02', start_time: '19:00' },
      { ...ROW, id: 's-test', is_test: true },
      { ...ROW, id: undefined },
    ];
    const { events, updatedAt } = projectScheduleForFeed(rows, new Date('2026-09-20T10:00:00Z'));
    check('PLANT: a projected event carries id plus the six fields and nothing else',
      events.every((e) => JSON.stringify(Object.keys(e).sort()) === JSON.stringify(['id', ...FEED_FIELDS].sort())),
      events.map((e) => Object.keys(e).join('+')).join(' | '));
    check('PLANT: notes and responsible_person never enter the projection',
      !JSON.stringify(events).includes('REMEMBER THE RINGS') && !JSON.stringify(events).includes('Aunt Jo'), 'clean');
    check('  test-harness rows and rows without an id are left out',
      events.length === 3 && !events.some((e) => e.id === 's-test' || e.id === 'undefined'), events.map((e) => e.id).join(', '));
    check('  events are sorted by date then time, so two projections of one schedule are byte-equal',
      events.map((e) => e.id).join(',') === 's-prev,s-early,s-late', events.map((e) => e.id).join(','));
    check('  updatedAt is the projection time as ISO',
      updatedAt === '2026-09-20T10:00:00.000Z', updatedAt);

    const stored = projectScheduleForFeed(rows, new Date('2020-01-01T00:00:00Z'));
    check('a stored feed with the same events is current, whatever its updatedAt says',
      calendarFeedIsCurrent(stored, rows) === true, 'no write on an ordinary page load');
    check('  a renamed event makes it stale',
      calendarFeedIsCurrent(stored, rows.map((r) => (r.id === 's-early' ? { ...r, event_name: 'Brunch' } : r))) === false, 'self-heal');
    check('  a deleted event makes it stale',
      calendarFeedIsCurrent(stored, rows.filter((r) => r.id !== 's-prev')) === false, 'self-heal');
    check('  and an absent feed with no events is current — a couple with no schedule is not owed a write',
      calendarFeedIsCurrent(undefined, []) === true && calendarFeedIsCurrent(null, undefined) === true, 'no write');
    check('  while an absent feed with events is not',
      calendarFeedIsCurrent(undefined, rows) === false, 'the first load after this ships writes the projection');
  }

  // ── EVERY WRITER GOES THROUGH ONE CHOKEPOINT, AND THE OWNER'S SESSION ───
  // Four writers in ScheduleHub.jsx (delete, update, create, the run-sheet
  // swap) all end in loadItems(); Ava's create_schedule is the fifth. The
  // projection is written through /api/my-wedding-details with the couple's
  // own token — WeddingDetails.update is owner-scoped, so nothing else could.
  {
    const hub = code('src/pages/ScheduleHub.jsx');
    check('ScheduleHub syncs the projection on load, which every writer ends in',
      /syncCalendarFeed\(/.test(hub) && /import \{[^}]*syncCalendarFeed[^}]*\} from '@\/lib\/calendarFeedSync'/.test(hub),
      'loadItems() is the chokepoint, and the self-heal');
    for (const [what, re] of [
      ['delete', /await Schedule\.delete\(id\);[\s\S]{0,120}loadItems\(\)/],
      ['update', /await Schedule\.update\(editingItem\.id, itemData\);[\s\S]{0,300}await loadItems\(\)/],
      ['create', /await Schedule\.create\(itemData\);[\s\S]{0,300}await loadItems\(\)/],
      ['swap',   /await Schedule\.update\(b\.id, \{ start_time: a\.start_time \}\);[\s\S]{0,60}loadItems\(\)/],
    ]) {
      check(`  the hub's ${what} writer reloads, and so reaches the sync`, re.test(hub), 'loadItems() after the write');
    }
    const ava = code('src/lib/avaExecute.js');
    check('Ava\'s create_schedule syncs the projection after the row is written',
      /create_schedule/.test(ava) && /deps\.syncCalendarFeed/.test(ava), 'the fifth writer');
    for (const f of ['src/components/layout/AvaChatPod.jsx', 'src/components/layout/AvaModal.jsx']) {
      check(`  ${f.split('/').pop()} hands Ava the sync`, /syncCalendarFeed: syncMyCalendarFeed/.test(code(f)), 'dependency passed');
    }
    const sync = code('src/lib/calendarFeedSync.js');
    check('the sync writes through putMyWeddingDetails, never a raw WeddingDetails.update',
      /putMyWeddingDetails/.test(sync) && !/entities\.WeddingDetails/.test(sync), 'the owner\'s own session, one endpoint');
    check('  and skips the write when the stored feed is already current',
      /calendarFeedIsCurrent\(/.test(sync), 'no write on an ordinary page load');

    const mwd = code('api/my-wedding-details.js');
    check('api/my-wedding-details accepts calendarFeed for the owner\'s own session',
      /PLAINTEXT_WRITABLE_FIELDS = \[[^\]]*'calendarFeed'[^\]]*\]/.test(mwd), 'in the plaintext allowlist, nothing else new');
    check('  and re-projects the value on write, so the allowlist holds server-side too',
      /projectScheduleForFeed\(/.test(mwd), 'a client cannot store notes in the feed');
    check('PLANT: GUEST_SAFE_WEDDING_FIELDS does not carry calendarFeed — guests keep their own schedule path',
      !GUEST_SAFE_WEDDING_FIELDS.includes('calendarFeed'), 'not on the guest site');
    check('the schema mirror declares calendarFeed with the six fields plus id',
      /"calendarFeed"[\s\S]{0,1200}"events"[\s\S]{0,1200}"updatedAt"/.test(readFileSync(join(ROOT, 'base44/entities/WeddingDetails.jsonc'), 'utf8'))
        && FEED_FIELDS.every((f) => new RegExp(`"calendarFeed"[\\s\\S]{0,1500}"${f}"`).test(readFileSync(join(ROOT, 'base44/entities/WeddingDetails.jsonc'), 'utf8'))),
      'mirror matches the live schema (list_entity_schemas, 2026-09-20)');
  }

  return results;
}

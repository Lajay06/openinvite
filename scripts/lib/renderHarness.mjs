/**
 * renderHarness — a seeded, stubbed browser context for render passes.
 *
 * WHY THIS EXISTS. Render passes kept producing EMPTY READS presented as clean
 * results. Stubbing every entity call to `[]` makes a dashboard page render its
 * sidebar and nothing else, so "no defects found" meant "no content was on the
 * page". Item 6's production verification was reported clean on five pages that
 * had rendered navigation only; the bodies under test never appeared.
 *
 * THE STANDARD THIS ENCODES -- presence before properties:
 *   A render pass FIRST proves the expected content strings are PRESENT, and
 *   only then asserts anything about them. An assertion over absent content is
 *   not evidence.
 * `presenceThenProperties()` below refuses to report a property result at all
 * unless the presence check passed first.
 *
 * NO CREDENTIALS, EVER. The token planted in localStorage is a dummy string
 * whose only job is to get AuthContext past its `if (token)` branch so the real
 * page code runs. Identity is a stubbed RESPONSE. Nothing here transplants a
 * real session.
 *
 * Both origins are intercepted because the client picks its base URL by build
 * mode: dev talks to base44.app directly, production goes through the
 * same-origin /api/apps/* rewrite. A harness that stubs only one silently does
 * nothing against the other.
 *
 * Reused by: stat-surface assertions (feel-pass 5), the loading-idiom pass
 * (feel-pass 7), and any future build that needs a dashboard page to actually
 * have content in it.
 */
/* global localStorage, document */  // used inside page.evaluate(), which runs in the browser

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

/** A wedding with enough shape that stat tiles compute non-zero values. */
export const SEED = {
  WeddingDetails: [{
    id: 'w1', partner1Name: 'Ada', partner2Name: 'Alan',
    weddingDate: iso(300), venueName: 'The Old Observatory',
    slug: 'ada-and-alan', guestCount: 41, created_by: 'fixture@example.com',
  }],
  Guest: [
    { id:'g1', name:'Grace Hopper',   first_name:'Grace', last_name:'Hopper',   rsvp_status:'attending', attending:true,  table_id:'t1', invited:true, created_by:'fixture@example.com' },
    { id:'g2', name:'Katherine J.',   first_name:'Katherine', last_name:'J.',   rsvp_status:'attending', attending:true,  table_id:'t2', invited:true, created_by:'fixture@example.com' },
    { id:'g3', name:'Alan Turing',    first_name:'Alan', last_name:'Turing',    rsvp_status:'pending',   invited:true, created_by:'fixture@example.com' },
    { id:'g4', name:'Edsger D.',      first_name:'Edsger', last_name:'D.',      rsvp_status:'declined',  attending:false, invited:true, created_by:'fixture@example.com' },
  ],
  Table: [
    { id:'t1', name:'Table 1', seats:8,  shape:'round', x:200, y:200, created_by:'fixture@example.com' },
    { id:'t2', name:'Table 2', seats:10, shape:'round', x:520, y:200, created_by:'fixture@example.com' },
  ],
  VenueAsset: [{ id:'va1', type:'dance_floor', x:360, y:420, created_by:'fixture@example.com' }],
  // TodoList's kanban columns only render once notes exist -- the known gap
  // that left its case source-verified in the item 6 evidence table.
  Note: [
    { id:'n1', title:'Book the florist',           status:'Ideas',       completed:false, view_type:'todo', priority:'High',   created_by:'fixture@example.com' },
    { id:'n2', title:'Confirm the string quartet', status:'In progress', completed:false, view_type:'todo', priority:'Medium', created_by:'fixture@example.com' },
    { id:'n3', title:'Send save the dates',        status:'Done',        completed:true,  view_type:'todo', priority:'Low',    created_by:'fixture@example.com' },
  ],
  Task: [
    { id:'k1', title:'Final dress fitting', completed:false, due_date: iso(30), created_by:'fixture@example.com' },
    { id:'k2', title:'Confirm numbers',     completed:true,  due_date: iso(-5), created_by:'fixture@example.com' },
  ],
  Schedule: [
    { id:'s1', title:'Ceremony',  type:'ceremony',  start_time:'15:00', date: iso(300), created_by:'fixture@example.com' },
    { id:'s2', title:'Reception', type:'reception', start_time:'18:00', date: iso(300), created_by:'fixture@example.com' },
    { id:'s3', title:'Brunch',    type:'other',     start_time:'10:00', date: iso(301), created_by:'fixture@example.com' },
  ],
  Vendor: [
    { id:'v1', name:'Bloom & Vine',  category:'florist',      status:'booked',      quoted_price:2400, created_by:'fixture@example.com' },
    { id:'v2', name:'Kestrel Films', category:'videographer', status:'quoted',      quoted_price:3800, created_by:'fixture@example.com' },
    { id:'v3', name:'Ilford Studio', category:'photographer', status:'researching',                    created_by:'fixture@example.com' },
    { id:'v4', name:'Sable Beauty',  category:'beauty',       status:'booked',      quoted_price:900,  created_by:'fixture@example.com' },
  ],
  MoodboardItem: [
    { id:'m1', board:'Flowers', category:'flowers', image_url:'', created_by:'fixture@example.com' },
    { id:'m2', board:'Table',   category:'decor',   image_url:'', created_by:'fixture@example.com' },
  ],
  VowSpeech: [
    { id:'vs1', type:'vow',    title:"Ada's vows",   created_by:'fixture@example.com' },
    { id:'vs2', type:'speech', title:'Best man',     created_by:'fixture@example.com' },
  ],
  Music: [
    { id:'mu1', title:'First dance', approved:true,  created_by:'fixture@example.com' },
    { id:'mu2', title:'Guest pick',  approved:false, created_by:'fixture@example.com' },
  ],
  RegistryItem: [
    { id:'r1', name:'Copper pan', price:120, purchased:true,  created_by:'fixture@example.com' },
    { id:'r2', name:'Linen set',  price:240, purchased:false, created_by:'fixture@example.com' },
  ],
  RegistryProduct: [],
  CustomGift: [{ id:'cg1', name:'Honeymoon fund', target:1500, created_by:'fixture@example.com' }],
  GuestMessage: [
    { id:'gm1', guest_name:'Grace Hopper', message:'Cannot wait!',    body:'Cannot wait!',    read:false, replied:false, created_date: iso(-3), created_by:'fixture@example.com' },
    { id:'gm2', guest_name:'Alan Turing',  message:'Congratulations', body:'Congratulations', read:true,  replied:true,  created_date: iso(-1), reply_sent_at: iso(-1), created_by:'fixture@example.com' },
  ],
  Invitation: [],
  Notification: [],
  // Budget is AES ciphertext in production; the page tolerates an absent blob
  // and renders its tiles from zero, which is still a real (non-empty) read.
  Budget: [],
};

/** The couple. Paid plan, onboarded, so no gate or banner intercepts the page. */
export const FIXTURE_USER = {
  id: 'u1', email: 'fixture@example.com', full_name: 'Render Fixture',
  plan: 'ultra', onboardingCompleted: true, plan_step_completed: true,
  currency: 'USD', created_date: iso(-30),
};

/**
 * Stub every backend call a page makes. Returns seeded rows for known
 * entities, `[]` for unknown ones, and the fixture user for identity.
 */
export async function stubBackend(ctx, { seed = SEED, user = FIXTURE_USER, onEntity } = {}) {
  const handler = async (route) => {
    const url = route.request().url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (/\/me\b|auth\/me|users\/me/.test(url)) return json(user);

    const ent = url.match(/\/entities\/(\w+)/);
    if (ent) {
      if (onEntity) onEntity(ent[1]);
      return json(seed[ent[1]] ?? []);
    }
    // The owner endpoints the dashboard uses for decrypted reads.
    if (/\/api\/my-guests/.test(url))          return json({ guests: seed.Guest ?? [] });
    if (/\/api\/my-wedding-details/.test(url)) return json({ details: (seed.WeddingDetails ?? [])[0] ?? null });
    if (/\/api\/my-guest-links/.test(url))     return json({ links: [] });
    if (/\/api\/rates/.test(url))              return json({ result: 'success', rates: { USD: 1, AUD: 1.5 } });
    return json([]);
  };
  // A URL PREDICATE, not a glob. `'**/api/**'` looks right and is a trap: it
  // matches any path with an `api` SEGMENT, including Vite's own dev-server
  // module URLs like /src/api/base44Client.js. The harness then answered the
  // app's own JavaScript with `[]`, the browser refused it ("Expected a
  // JavaScript-or-Wasm module script but the server responded with a MIME type
  // of application/json"), and every page rendered zero characters. The
  // presence check caught it as 34/34 MISSING rather than reporting a clean
  // pass over blank pages.
  const isBackend = (url) => {
    if (/:\/\/base44\.app\//.test(url)) return true;
    try { return new URL(url).pathname.startsWith('/api/'); } catch { return false; }
  };
  await ctx.route((url) => isBackend(typeof url === 'string' ? url : url.href), handler);
}

/** A context with the dummy token planted and the backend stubbed. */
export async function seededContext(browser, { width, height, seed, user, onEntity } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    // A dummy string, never a real credential: it exists only to get
    // AuthContext past `if (token)` so the real page code runs.
    localStorage.setItem('base44_access_token', 'render-harness-not-a-real-token');
    localStorage.setItem('oi_auth', '1');
  });
  await stubBackend(ctx, { seed, user, onEntity });
  return ctx;
}

/**
 * PRESENCE BEFORE PROPERTIES.
 *
 * `expect` are strings that MUST appear in the rendered page. If any is
 * missing, this returns `{ ok:false, missing:[...] }` and does NOT run the
 * property assertion -- because a property asserted over absent content is not
 * evidence, it is an empty read wearing a pass.
 */
export async function presenceThenProperties(page, expect, assertFn) {
  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const missing = expect.filter((s) => !body.includes(s));
  if (missing.length) return { ok: false, missing, skipped: true };
  const result = await assertFn(page);
  return { ok: true, missing: [], ...result };
}

/**
 * Harness self-check: prove the route predicate is not swallowing the app.
 *
 * The predicate replaced a wildcard glob on any `api` path segment -- written
 * out it contains a comment-terminator, which is its own small trap -- that
 * matched Vite's own module
 * URLs (/src/api/base44Client.js has an `api` segment), so the harness answered
 * the app's JavaScript with `[]` and every page rendered blank. That failure is
 * invisible in any result that does not check presence, so it is checked here
 * directly and loudly.
 *
 * Returns { ok, contentType, status }. A JS module must come back as
 * JavaScript, never application/json.
 */
export async function assertHarnessServesModules(ctx, base) {
  const probe = `${base}/src/api/base44Client.js`;
  const res = await ctx.request.get(probe).catch((e) => ({ error: e.message }));
  if (res.error) return { ok: false, contentType: null, status: null, error: res.error };
  const ct = res.headers()['content-type'] || '';
  const ok = res.status() === 200 && /javascript|ecmascript/i.test(ct);
  return { ok, contentType: ct, status: res.status() };
}

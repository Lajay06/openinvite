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


/**
 * A PUBLISHED wedding site, as /api/wedding-by-slug returns it.
 *
 * The guest site does not read entities directly -- MultiPageWeddingWebsite
 * calls fetchWeddingBySlug(), which hits /api/wedding-by-slug and renders
 * whatever that returns. Seeding entities alone leaves every /w/ route on its
 * skeleton, so guest-page passes need this separately.
 *
 * `enabledPages` lists all twelve so a sweep can reach every sub-page; a real
 * couple would enable a subset. No password, so the gate never intercepts.
 */
export const PUBLISHED_WEDDING = {
  id: 'w1',
  slug: 'ada-and-alan',
  coupleNames: 'Ada & Alan',
  couple1Name: 'Ada', couple2Name: 'Alan',
  partner1Name: 'Ada', partner2Name: 'Alan',
  weddingDate: iso(300),
  activeUniverse: 'london',
  passwordProtected: false,
  locked: false,
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music',
                 'photos', 'styling', 'polls', 'faq', 'stay', 'transport', 'experience'],
  mainCeremony: { venueName: 'The Old Observatory', address: '12 Greenwich Park, London', time: '15:00' },
  rsvpContent: { rsvpDeadline: iso(200) },
  musicContent: {},
  music: { playlists: [{ playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', enabled: true }], guestRequestsEnabled: true },
  ourStory: { headline: 'How we met', body: 'On a wet Tuesday in a bookshop.' },
  faq: [{ question: 'Is there parking?', answer: 'Yes, behind the observatory.' }],
  accommodation: {}, transport: {}, experienceGuide: {},
  created_by: 'fixture@example.com', created_by_id: 'u1',
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
    // The guest site's single source: without this every /w/ route sits on its
    // skeleton forever, which reads as "nothing rendered" rather than "not seeded".
    if (/\/api\/wedding-by-slug/.test(url))   return json(PUBLISHED_WEDDING);
    if (/\/api\/guest-/.test(url))            return json({ ok: true });
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
 * ROUTE -> NAMED EXPECTED STRING.
 *
 * A character count is a PROXY for "did the page render", and every false
 * signal this harness has produced came from trusting one:
 *
 *   - a 2500ms flat wait reported 34/34 surfaces MISSING on pages that render
 *   - a >80-char threshold passed on 13 routes that were showing the entrance
 *     overlay and nothing else
 *   - a >400-char threshold invented three CRITICAL mobile blanks, which were
 *     really the nav collapsing to a hamburger and taking 46 characters with it
 *
 * So presence is a named string that the page must contain. These are page
 * headings that render whether or not the couple has added content, checked
 * against the real rendered output rather than read off the source.
 *
 * Universe-dependent: PUBLISHED_WEDDING pins `london`, whose kickers are
 * "AN INVITATION" / "OUR STORY" / "THE CELEBRATION". Change the universe and
 * these change with it.
 */
export const GUEST_ROUTE_EXPECT = {
  '':            'AN INVITATION',
  'our-story':   'OUR STORY',
  'celebration': 'THE CELEBRATION',
  'rsvp':        'RSVP',
  'registry':    'Registry',
  'music':       'Song requests',
  'photos':      'Photos',
  'styling':     'What will you wear?',
  'polls':       'Guest polls',
  'faq':         'FAQ',
  'stay':        'Where to stay',
  'transport':   'Getting here',
  'experience':  'Your guide to',
};

/**
 * Sets the per-slug key that suppresses EntranceMoment, the guest site's
 * full-screen intro.
 *
 * CORRECTION, recorded because it was reported as fact and was not: the intro
 * was blamed for a sweep's uniformly thin character counts. Measured
 * afterwards, the overlay does NOT gate content under this harness -- the nav
 * and page text are present from 800ms with prefers-reduced-motion both on and
 * off. The thin counts were the seed's empty states the whole time. This call
 * is kept because suppressing a first-visit animation is correct for a
 * deterministic pass, NOT because it fixed anything.
 *
 * Returns whether it was dismissed, so a pass can REPORT the dismissal rather
 * than silently depend on it.
 */
export async function dismissEntrance(ctx, slug = PUBLISHED_WEDDING.slug) {
  await ctx.addInitScript((s) => {
    localStorage.setItem(`oi_entrance_${s}`, '1');
  }, slug);
  return { dismissed: true, key: `oi_entrance_${slug}` };
}

/**
 * KNOWN BLIND SPOTS, as of the date this was written. Stated because an
 * instrument whose limits are undocumented gets trusted past them.
 *
 *  1. SEED DEPTH. PUBLISHED_WEDDING carries the site shell but almost no
 *     per-page content: no story blocks, no photo rows, no registry items, no
 *     FAQ entries. Pages render their empty states. Any pass about LAYOUT
 *     (cropping, alignment, overflow) is therefore measuring near-empty pages
 *     and must not report a clean result as coverage.
 *  2. ONE UNIVERSE. Everything is asserted against `london`. Motif, kicker and
 *     typography behaviour differ per universe; 18 others are unmeasured.
 *  3. STUBBED BACKEND. Responses are fixtures, so nothing here can catch a
 *     server contract change, an RLS rule, or an encryption path. Endpoint
 *     shape drift shows up as a rendering bug with a misleading cause.
 *  4. NO REAL AUTH. Identity is a stubbed response behind a dummy token.
 *     Admin-gated surfaces (pages/Admin.jsx) are out of reach by design.
 *  5. DESKTOP + MOBILE ONLY. 1440 and 390. The 768-1023 band, where the `lg`
 *     breakpoint has already produced one live defect (the trial banner),
 *     is not swept by default.
 *  6. NO NETWORK REALITY. No latency, no failures, no slow images. Timing
 *     defects that only appear on a real connection cannot surface here.
 */
export const KNOWN_BLIND_SPOTS = [
  'seed carries no per-page content — layout passes measure empty states',
  'one universe (london) — 18 others unmeasured',
  'stubbed backend — cannot catch server contract or encryption drift',
  'no real auth — admin-gated surfaces unreachable',
  'two widths only — the 768-1023 band is unswept',
  'no network reality — latency and failure modes invisible',
  'EntranceMoment does not gate content headlessly — dismissal is hygiene, not a fix',
];

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
  // MUST go through a PAGE. `ctx.request` is a separate network stack that
  // BYPASSES ctx.route() entirely, so the first version of this guard could
  // never have seen the very bug it was written to catch -- a control proved
  // it by breaking the routes and watching the guard report healthy.
  const page = await ctx.newPage();
  try {
    // Navigate first: a fetch from about:blank has no origin, so the request is
    // blocked and the guard reports a null content-type -- indistinguishable
    // from "served wrong". Caught by control 4's healthy branch.
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    const probe = `${base}/src/api/base44Client.js`;
    const r = await page.evaluate(async (u) => {
      try {
        const res = await fetch(u);
        return { status: res.status, ct: res.headers.get('content-type') || '' };
      } catch (e) { return { error: String(e).slice(0, 120) }; }
    }, probe);
    if (r.error) return { ok: false, contentType: null, status: null, error: r.error };
    return { ok: r.status === 200 && /javascript|ecmascript/i.test(r.ct), contentType: r.ct, status: r.status };
  } finally {
    await page.close();
  }
}

/**
 * tests/persistence/unfurl-og-image.mjs
 *
 * THE R32 RULING, ASSERTED AGAINST THE REAL HANDLER.
 *
 * Resolved by the owner 2026-09-05:
 *
 *   og:image = the couple's coverPhoto if present
 *            = else the ACTIVE UNIVERSE'S hero sample image
 *            = else absent
 *
 * Published sites only. An unpublished or password-protected wedding emits no
 * og:image at all — universe hero included, because the universe itself
 * discloses a choice the couple has hidden.
 *
 * WHY IT DRIVES THE REAL MODULE. api/guest-page.js sits in front of 100% of
 * guest traffic and is proxied through an edge rewrite, so it produces no
 * serverless log to inspect. Reading its source would prove nothing about what
 * it emits; this imports the actual exported handler and reads the HTML back.
 *
 * The only stubs are transport: `fetch` for the Base44 lookup and for the shell
 * document. Every decision under test is the handler's own.
 */
import { pass, fail } from './_shared.mjs';

const SHELL = '<!doctype html><html><head><title>Wedding invitation</title>'
  + '<meta name="description" content="An invitation." />'
  + '<meta property="og:title" content="You are invited" />'
  + '<meta property="og:description" content="Open your invitation to see the details and reply." />'
  + '<meta name="twitter:card" content="summary" /></head><body><div id="root"></div></body></html>';

/** Runs the real handler against one record and returns what it emitted. */
async function emit(record) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/entities/WeddingDetails')) {
      return { ok: true, status: 200, json: async () => (record ? [record] : []) };
    }
    return { ok: true, status: 200, text: async () => SHELL };
  };
  try {
    const { default: handler } = await import('../../api/guest-page.js');
    let body = '';
    const res = {
      setHeader() {}, status() { return this; },
      send(b) { body = b; return this; }, end(b) { body = b || body; return this; },
    };
    await handler({ url: '/w/probe', headers: { host: 'www.openinvite.com.au' }, query: {} }, res);
    const pick = (re) => (body.match(re) || [, null])[1];
    return {
      ogImage: /og:image/.test(body) ? pick(/property="og:image" content="([^"]*)"/) : null,
      twitterCard: pick(/name="twitter:card" content="([^"]*)"/),
      ogTitle: pick(/property="og:title" content="([^"]*)"/),
      renderedApp: /<div id="root">/.test(body),
    };
  } finally {
    globalThis.fetch = realFetch;
  }
}

const base = {
  slug: 'probe', websiteEnabled: true, websitePasswordEnabled: false,
  couple1Name: 'Ada', couple2Name: 'Alan', weddingDate: '2027-05-13',
};

export async function runUnfurlOgImage() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Unfurl og:image — the R32 ruling (owner, 2026-09-05):\n');

  const { getSampleWedding } = await import('../../src/lib/sampleContent/index.js');
  const havanaHero = getSampleWedding('havana')?.coverPhoto;

  // ── (a) published, no coverPhoto, universe havana -> the Havana hero ─────
  {
    const r = await emit({ ...base, activeUniverse: 'havana', coverPhoto: null });
    check('(a) published + no coverPhoto + havana -> the Havana hero URL',
      !!r.ogImage && r.ogImage === havanaHero, r.ogImage ? r.ogImage.slice(0, 62) : 'ABSENT');
    check('    and the card upgrades to summary_large_image',
      r.twitterCard === 'summary_large_image', String(r.twitterCard));
    check('    and the shell document is intact (delivery fails safe)',
      r.renderedApp === true, 'root div present');
  }

  // ── (b) the same record unpublished -> no og:image at all ───────────────
  {
    const r = await emit({ ...base, activeUniverse: 'havana', coverPhoto: null, websiteEnabled: false });
    check('(b) the SAME record unpublished -> no og:image',
      r.ogImage === null, r.ogImage ? `LEAKED: ${r.ogImage.slice(0, 50)}` : 'absent');
    check('    and the card stays summary, and the name is withheld too',
      r.twitterCard === 'summary' && r.ogTitle === 'You are invited', `${r.twitterCard} / ${r.ogTitle}`);
  }

  // ── (b2) password-protected -> no og:image, universe hero included ───────
  // Not in the brief's four, but it is the case the hero could most easily
  // leak through: the universe discloses a design choice on a hidden site.
  {
    const r = await emit({ ...base, activeUniverse: 'havana', coverPhoto: null, websitePasswordEnabled: true });
    check('(b2) password-protected -> no og:image, hero included',
      r.ogImage === null && r.ogTitle === 'You are invited',
      r.ogImage ? `LEAKED: ${r.ogImage.slice(0, 50)}` : 'bare card');
  }

  // ── (c) coverPhoto present -> the couple's photo wins ───────────────────
  {
    const theirs = 'https://example.com/their-own-cover.jpg';
    const r = await emit({ ...base, activeUniverse: 'havana', coverPhoto: theirs });
    check("(c) coverPhoto present -> the couple's photo, NOT the universe hero",
      r.ogImage === theirs, String(r.ogImage).slice(0, 62));
  }

  // ── (d) a universe with no sample block -> absent ────────────────────────
  {
    const r = await emit({ ...base, activeUniverse: 'brooklyn', coverPhoto: null });
    check('(d) universe with no sample block (brooklyn) -> og:image absent',
      r.ogImage === null, r.ogImage ? `unexpected: ${r.ogImage.slice(0, 50)}` : 'absent');
    check('    and the card stays summary',
      r.twitterCard === 'summary', String(r.twitterCard));
  }

  return results;
}

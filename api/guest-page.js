/**
 * api/guest-page.js — serves /w/* so a shared link can unfurl with the
 * couple's own names, date and photo.
 *
 * WHY A FUNCTION AT ALL. `vercel.json` used to rewrite /w/(.*) to one static
 * guest-shell.html, so every wedding on the platform sent the same card:
 * "You are invited", no name, no date, no image. Crawlers do not run
 * JavaScript, so the only place per-wedding meta can come from is the server.
 *
 * ── FAIL-CLOSED ON PRIVACY, FAIL-SAFE ON EVERYTHING ELSE ────────────────────
 *
 * These are two different rules and both matter.
 *
 * PRIVACY FAILS CLOSED. Names, date and image appear ONLY when this function
 * can positively confirm the wedding is not password-protected — that is,
 * `websitePasswordEnabled !== true`. Anything else is the bare card: the flag
 * set, the lookup failed, the field missing, the record absent. It is NOT
 * enough to ask whether the gate is currently effective: api/wedding-by-slug.js
 * documents a FAIL-OPEN (websitePasswordEnabled true with no stored credential
 * serves the site publicly), and a card keyed on that runtime result would leak
 * a protected couple's names into every chat app that touched the link.
 *
 * DELIVERY FAILS SAFE. Every other failure — no admin key, Base44 slow or
 * down, a malformed slug, anything thrown — returns the ORIGINAL shell bytes
 * unchanged. This function sits in front of 100% of guest traffic, and the
 * worst outcome it may produce is today's behavior. It must never be the
 * reason a guest suite does not load.
 */
import { coupleDisplayName } from './_lib/coupleNames.js';
import { previousSlugsOf } from './_lib/slugCanon.js';
// SERVER-SAFE BY CONSTRUCTION: sampleContent/{index,bali,havana}.js and
// mergeSample.js import nothing but each other — no React, no window, no
// component. Verified by importing the chain under plain node.
import { sampleHeroImage } from '../src/lib/sampleContent/mergeSample.js';

const BASE44_API = 'https://app.base44.com/api';
const LOOKUP_TIMEOUT_MS = 2500;

/** The slug is the first segment after /w/. */
function slugFrom(url) {
  const path = (url || '').split('?')[0];
  const m = /^\/w\/([^/]+)/.exec(path);
  if (!m) return null;
  try { return decodeURIComponent(m[1]).trim(); } catch { return null; }
}

/**
 * Everything after /w/<slug>, kept verbatim — the page, the query string, all
 * of it. A guest following an old link to /w/john-suzanne/rsvp?x=1 must land
 * on the RSVP page of the new address, not on its home page: a redirect that
 * drops the rest of the path answers a different question than the one asked.
 */
function tailFrom(url) {
  const [path, query] = String(url || '').split('?');
  const m = /^\/w\/[^/]+(\/.*)?$/.exec(path);
  return (m && m[1] ? m[1] : '') + (query ? `?${query}` : '');
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Replaces the shell's own meta with the couple's, leaving everything else. */
function withWeddingMeta(html, { title, description, image }) {
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${esc(description)}" />`)
    .replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${esc(title)}" />`)
    .replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${esc(description)}" />`);
  if (image) {
    // summary_large_image only when an image is actually supplied — the shell
    // advertises "summary" precisely because it has none.
    out = out
      .replace(/<meta\s+name="twitter:card"[^>]*>/i, '<meta name="twitter:card" content="summary_large_image" />')
      .replace('</head>', `  <meta property="og:image" content="${esc(image)}" />\n  </head>`);
  }
  return out;
}

/**
 * The address that replaced `slug`, or null.
 *
 * ONE ROW OR NOTHING. Two records claiming the same old address is a state
 * nobody should be redirected out of — the same rule the slug lookup already
 * applies, and for the same reason: a guest sent to the wrong wedding is worse
 * than a guest sent to a 404.
 */
async function resolveAlias({ slug, APP, ADMIN }) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), LOOKUP_TIMEOUT_MS);
    const q = encodeURIComponent(JSON.stringify({ previousSlugs: slug }));
    const r = await fetch(`${BASE44_API}/apps/${APP}/entities/WeddingDetails?q=${q}`,
      { headers: { Authorization: `Bearer ${ADMIN}` }, signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const payload = await r.json();
    const list = Array.isArray(payload) ? payload : (payload?.data || payload?.results || []);
    const rows = list.filter(w => w && !w.is_test && previousSlugsOf(w).includes(slug) && w.slug);
    return rows.length === 1 ? rows[0].slug : null;
  } catch {
    // A lookup that times out serves the shell, exactly as a failed slug
    // lookup does. A redirect is a nicety; the page loading is not.
    return null;
  }
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  let shell = '';

  try {
    const shellRes = await fetch(`${proto}://${host}/guest-shell.html`);
    shell = await shellRes.text();
  } catch {
    // Cannot even reach our own static shell — nothing useful left to do.
    res.status(302).setHeader('Location', '/guest-shell.html');
    return res.end();
  }

  const send = (html) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Short edge cache: a couple renaming their site should not be stale for
    // long, and unfurlers re-fetch anyway.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, must-revalidate');
    return res.status(200).send(html);
  };

  const slug = slugFrom(req.url);
  const ADMIN = process.env.BASE44_ADMIN_KEY;
  const APP = process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
  if (!slug || !ADMIN || !APP) return send(shell);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), LOOKUP_TIMEOUT_MS);
    const q = encodeURIComponent(JSON.stringify({ slug }));
    const r = await fetch(`${BASE44_API}/apps/${APP}/entities/WeddingDetails?q=${q}`,
      { headers: { Authorization: `Bearer ${ADMIN}` }, signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return send(shell);

    const payload = await r.json();
    const list = Array.isArray(payload) ? payload : (payload?.data || payload?.results || []);
    // Same rule the guest API uses: is_test never resolves, and an ambiguous
    // slug resolves to nothing rather than to whichever row sorted first.
    const rows = list.filter(w => w && w.slug === slug && !w.is_test);

    // ── AN ADDRESS THE COUPLE USED TO HAVE ──────────────────────────────────
    //
    // Owner ruling, Run 4 S8b: the address never changes silently, and when it
    // does change the old one keeps working — /w/<old> 301s to /w/<new>.
    //
    // HERE, NOT IN THE APP, because only here does the redirect reach the
    // address bar. The SPA could correct itself after loading, but every link
    // already shared would still resolve to the old URL for anything that
    // unfurls, crawls or caches it. A 301 is the only version of this that is
    // true for a link somebody posted a year ago.
    //
    // The array-contains query was PROVED before this was written (smoke
    // record, owner-authorized probe, 2026-09-16): `?q={"previousSlugs":"x"}`
    // returned exactly the one matching record. Without that proof this branch
    // would silently never fire, which is worse than not having it.
    if (rows.length !== 1) {
      const aliased = await resolveAlias({ slug, APP, ADMIN });
      if (aliased && aliased !== slug) {
        res.statusCode = 301;
        res.setHeader('Location', `/w/${encodeURIComponent(aliased)}${tailFrom(req.url)}`);
        // A moved address is permanent, but not cached past a second rename.
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, must-revalidate');
        return res.end();
      }
      return send(shell);
    }
    const wedding = rows[0];

    // Unpublished sites are not served by the guest API and must not be
    // advertised by a card either.
    if (wedding.websiteEnabled !== true) return send(shell);

    // THE PRIVACY GATE. Positive confirmation only.
    if (wedding.websitePasswordEnabled === true) return send(shell);

    const names = coupleDisplayName(wedding);
    if (!names.trim()) return send(shell);

    let dateStr = '';
    if (wedding.weddingDate) {
      const d = new Date(wedding.weddingDate);
      if (!Number.isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }

    return send(withWeddingMeta(shell, {
      title: `${names}`,
      description: dateStr
        ? `You are invited. ${dateStr}. Open the invitation to see the details and reply.`
        : 'You are invited. Open the invitation to see the details and reply.',
      // R32 RULING, resolved by the owner 2026-09-05: the couple's coverPhoto
      // if they have one, else the ACTIVE UNIVERSE'S hero, else absent.
      //
      // This reverses an earlier decision, deliberately and by the owner. That
      // one read: "not the universe's imageUrl. A universe image is
      // Openinvite's asset, not the couple's" — and concluded therefore
      // absent. The ruling now reaches the opposite conclusion from the same
      // premise: the universe hero is the universe's own artwork, chosen by
      // the couple when they chose the universe, so it may stand in.
      //
      // NOT SUBJECT TO THE SAMPLE-IMAGERY ACKNOWLEDGEMENT, for the same
      // reason: this is the universe identifying itself, not sample content
      // masquerading as the couple's own.
      //
      // It sits INSIDE the gates above, so it inherits them for free: an
      // unpublished wedding (websiteEnabled !== true) and a password-protected
      // one both returned the bare shell before reaching here, and therefore
      // emit no og:image at all — universe hero included, because the universe
      // itself would disclose a choice the couple has hidden.
      image: typeof wedding.coverPhoto === 'string' && /^https?:\/\//.test(wedding.coverPhoto)
        ? wedding.coverPhoto
        : sampleHeroImage(wedding.activeUniverse),
    }));
  } catch {
    return send(shell);
  }
}

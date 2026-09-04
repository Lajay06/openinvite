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
 * reason a wedding website does not load.
 */
const BASE44_API = 'https://app.base44.com/api';
const LOOKUP_TIMEOUT_MS = 2500;

/** The slug is the first segment after /w/. */
function slugFrom(url) {
  const path = (url || '').split('?')[0];
  const m = /^\/w\/([^/]+)/.exec(path);
  if (!m) return null;
  try { return decodeURIComponent(m[1]).trim(); } catch { return null; }
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
    if (rows.length !== 1) return send(shell);
    const wedding = rows[0];

    // Unpublished sites are not served by the guest API and must not be
    // advertised by a card either.
    if (wedding.websiteEnabled !== true) return send(shell);

    // THE PRIVACY GATE. Positive confirmation only.
    if (wedding.websitePasswordEnabled === true) return send(shell);

    const names = [wedding.couple1Name, wedding.couple2Name].filter(Boolean).join(' & ')
      || wedding.coupleNames || '';
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
      // The couple's own photo or none. A universe image is Openinvite's asset,
      // not theirs, and a stranger's villa on a friend's invitation is worse
      // than a text card.
      image: typeof wedding.coverPhoto === 'string' && /^https?:\/\//.test(wedding.coverPhoto)
        ? wedding.coverPhoto : null,
    }));
  } catch {
    return send(shell);
  }
}

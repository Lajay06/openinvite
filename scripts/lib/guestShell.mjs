/**
 * scripts/lib/guestShell.mjs
 *
 * Builds the static HTML shell served for guest routes — /w/:slug and
 * /rsvp/:token.
 *
 * WHY THIS EXISTS. vercel.json rewrites everything that is not /api/,
 * /.well-known/ or /assets/ to /index.html, and after apply-prerendered.mjs
 * runs, dist/index.html IS the prerendered MARKETING HOMEPAGE — head and body.
 * So every wedding URL and every invitation URL was served the marketing
 * homepage. Three symptoms, one cause:
 *
 *   1. A shared invitation unfurled as an advertisement for the platform,
 *      illustrated with a product screenshot of the RSVP flow.
 *   2. A guest opening their invitation saw ~350ms of Openinvite marketing
 *      before the wedding appeared — measured on /w/john-suzanne in WebKit at
 *      390: marketing visible 501ms→856ms, wedding at 2029ms.
 *   3. The browser tab on a couple's wedding site read "Openinvite: the
 *      wedding planning platform". The couple's site advertised us to their
 *      guests.
 *
 * The shell is built from THIS build's own dist/index.html — so its script and
 * stylesheet references are correct by construction, with no rewriting step to
 * drift — and its <head> is replaced with guest-appropriate meta. Its #root is
 * empty, so there is nothing to paint before React mounts.
 *
 * WHAT THE META MAY CONTAIN. Nothing wedding-specific. This shell is one
 * static file serving every wedding, so it cannot carry names, dates or
 * photographs even if we wanted it to — and under the advisor's privacy ruling
 * a password-protected site must get generic meta regardless. Per-wedding
 * cards are Option B (a server-rendered head), and the binding constraint
 * there is that the decision keys on websitePasswordEnabled DIRECTLY, never on
 * the gate's runtime result: api/wedding-by-slug.js documents a fail-open
 * (websitePasswordEnabled true with no stored credential serves the site
 * publicly), and a card keyed on gate state would leak through it.
 *
 * Deliberately absent:
 *   og:url    — the marketing snapshot hard-codes the site root, which is
 *               wrong for every guest URL. An absent canonical beats a wrong
 *               one; unfurlers fall back to the fetched URL.
 *   og:image  — we have no neutral asset that is honest for every wedding, so
 *               twitter:card is "summary" rather than advertising a large
 *               image we do not supply.
 */

/** Meta the guest shell carries. Wedding-independent by construction. */
export const GUEST_SHELL_META = {
  title: 'Wedding invitation',
  description: 'Open your invitation to see the details and reply.',
  ogTitle: 'You are invited',
};

const HEAD_BLOCK = `
    <!-- Guest shell — see scripts/lib/guestShell.mjs. Wedding-independent by
         construction: one static file serves every wedding, so it carries no
         names, dates or photographs. -->
    <title>${GUEST_SHELL_META.title}</title>
    <meta name="description" content="${GUEST_SHELL_META.description}" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta property="og:title" content="${GUEST_SHELL_META.ogTitle}" />
    <meta property="og:description" content="${GUEST_SHELL_META.description}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary" />
`;

/** Tags carried over from the app shell — identity and platform chrome only. */
const STRIP_PATTERNS = [
  /<title>[\s\S]*?<\/title>\s*/gi,
  /<meta\s+name=["']description["'][^>]*>\s*/gi,
  /<meta\s+name=["']application-name["'][^>]*>\s*/gi,
  /<meta\s+name=["']apple-mobile-web-app-title["'][^>]*>\s*/gi,
  /<meta\s+property=["']og:[^"']*["'][^>]*>\s*/gi,
  /<meta\s+name=["']twitter:[^"']*["'][^>]*>\s*/gi,
  /<link\s+rel=["']canonical["'][^>]*>\s*/gi,
  /<meta\s+name=["']robots["'][^>]*>\s*/gi,
];

/**
 * @param {string} indexHtml — this build's fresh dist/index.html
 * @returns {string} the guest shell
 * @throws if the result is not what it claims to be. A shell that silently
 *   kept the marketing meta would reproduce the exact bug this removes, so
 *   every guarantee is asserted here and the build fails loudly instead.
 */
export function buildGuestShell(indexHtml) {
  if (!/<head>[\s\S]*<\/head>/i.test(indexHtml)) {
    throw new Error('[guestShell] input has no <head> — not an index.html');
  }

  let out = indexHtml;
  for (const re of STRIP_PATTERNS) out = out.replace(re, '');
  out = out.replace(/<\/head>/i, `${HEAD_BLOCK}  </head>`);

  // ── guarantees, asserted rather than assumed ──────────────────────────
  const titles = out.match(/<title>/gi) || [];
  if (titles.length !== 1) throw new Error(`[guestShell] expected 1 <title>, got ${titles.length}`);
  if (!out.includes(`<title>${GUEST_SHELL_META.title}</title>`)) {
    throw new Error('[guestShell] the guest title is not present');
  }
  const ogTitles = out.match(/<meta\s+property=["']og:title["']/gi) || [];
  if (ogTitles.length !== 1) throw new Error(`[guestShell] expected 1 og:title, got ${ogTitles.length}`);
  if (/og:url|og:image|twitter:image/i.test(out)) {
    throw new Error('[guestShell] og:url/og:image must not appear — see the module header');
  }
  // The body must be empty. If a snapshot's DOM ever leaks in here, the flash
  // comes straight back and nothing else in this file would notice.
  const body = out.slice(out.indexOf('<body'));
  const rootInner = body.match(/<div id="root">([\s\S]*?)<\/div>/i)?.[1] ?? '';
  if (rootInner.trim() !== '') throw new Error('[guestShell] #root is not empty — the shell must paint nothing');
  if (/Because planning your wedding|All the powerful tools/i.test(out)) {
    throw new Error('[guestShell] marketing copy present in the guest shell');
  }
  return out;
}

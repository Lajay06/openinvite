/**
 * api/change-address.js — THE ADDRESS MOVES ONLY WHEN THE COUPLE SAYS SO.
 *
 * Owner ruling, Run 4 S8b: the address NEVER changes silently. A change is a
 * deliberate action, the old slug is kept as an alias, and /w/<old> 301s to
 * /w/<new> (api/guest-page.js). RSVP token links are unaffected — they resolve
 * by token, not by slug.
 *
 * ── WHY THIS IS NOT PART OF claim-slug ─────────────────────────────────────
 *
 * claim-slug DERIVES an address from the names and then FREEZES it the moment
 * an invitation has been shared (claim-slug.js:167), with a fail-closed branch
 * whose comment reads: "a wrong 'yes' breaks a link already sent, and no
 * apology recovers that." That freeze was the only protection those links had.
 *
 * The alias and the 301 are what protect them now, which is precisely why a
 * deliberate rename may pass the freeze — and precisely why it must be its own
 * endpoint. claim-slug runs on every studio mount; giving that call a mode that
 * can move a published address would put a destructive action one stray
 * argument away from a routine one.
 *
 * ── THIS ENDPOINT DOES NOT WRITE ───────────────────────────────────────────
 *
 * It validates and answers with what to write. The client then PUTs with its
 * OWN token, so the update passes the entity's owner-scoped RLS
 * (created_by_id = user.id) rather than riding the admin key. Same shape as
 * claim-slug, and for the same reason: the admin key can write anyone's
 * record, so it is never the thing that writes on a couple's behalf when the
 * couple's own token will do.
 *
 * The admin key is used for READS only — checking whether an address is taken
 * requires seeing rows the caller does not own, which their token cannot
 * return (see claim-slug's note on the same point).
 */
import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { canonicalSlug, isReservedSlug, withAlias, previousSlugsOf } from './_lib/slugCanon.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

const unwrapList = (p) => (Array.isArray(p) ? p : (p?.data || p?.results || []));

async function adminGet(path) {
  const res = await fetch(`${BASE44_API}${path}`, { headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` } });
  if (!res.ok) throw new Error(`Base44 GET failed (${res.status})`);
  return unwrapList(await res.json());
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // TIGHTER THAN claim-slug's 30/min. This is a deliberate, rare action; a
  // caller making it ten times a minute is not a couple renaming their site.
  const { limited } = checkRateLimit(getClientIp(req), 'change-address', 6, 60_000);
  if (limited) return res.status(429).json({ error: 'Too many requests — please wait a moment.' });

  if (!BASE44_ADMIN_KEY || !BASE44_APP_ID) {
    console.error('[change-address] admin key or app id not configured');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });

  const { weddingId, newSlug } = req.body || {};
  if (!weddingId || typeof newSlug !== 'string') return res.status(400).json({ error: 'invalid' });

  const wanted = canonicalSlug(newSlug);
  if (!wanted) return res.status(400).json({ error: 'not-an-address', reason: 'empty' });
  if (isReservedSlug(wanted)) return res.status(409).json({ error: 'reserved' });

  try {
    const mine = (await adminGet(
      `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${encodeURIComponent(JSON.stringify({ id: weddingId }))}`))[0];
    if (!mine || String(mine.created_by_id) !== String(caller.id)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const current = canonicalSlug(mine.slug);
    if (wanted === current) return res.status(200).json({ slug: current, unchanged: true });

    // TAKEN AS A SLUG OR AS AN ALIAS. An address another wedding is redirecting
    // FROM is still spoken for: handing it to this couple would make that
    // couple's old links resolve to a stranger's wedding, which is the one
    // outcome worse than a dead link.
    const bySlug = await adminGet(
      `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${encodeURIComponent(JSON.stringify({ slug: wanted }))}`);
    const byAlias = await adminGet(
      `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${encodeURIComponent(JSON.stringify({ previousSlugs: wanted }))}`);
    const claimed = [...bySlug, ...byAlias].filter(
      (w) => w && !w.is_test && String(w.id) !== String(weddingId)
        && (canonicalSlug(w.slug) === wanted || previousSlugsOf(w).includes(wanted)),
    );
    if (claimed.length) return res.status(409).json({ error: 'taken' });

    // WHAT TO WRITE, not the writing of it. `withAlias` keeps every address
    // this wedding has ever had and refuses to leave the new one pointing at
    // itself.
    return res.status(200).json({
      slug: wanted,
      previousSlugs: withAlias(mine, current, wanted),
      previous: current || null,
    });
  } catch (err) {
    console.error('[change-address] failed:', err.message);
    return res.status(500).json({ error: 'change-failed' });
  }
}

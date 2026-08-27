/**
 * api/claim-slug.js — the one place a wedding address is assigned.
 *
 * ── WHAT THIS IS AND IS NOT ───────────────────────────────────────────────
 * THIS ENDPOINT IS AUTHORITATIVE FOR OUR CODE AND ADVISORY AGAINST THE
 * PLATFORM. Every one of the seven slug write sites was client-side, so this
 * is not a boundary we are moving to — it is one we are creating. Base44 still
 * permits an authenticated owner to write their own record directly through
 * the SDK, and nothing at this layer can stop that.
 *
 * DO NOT DELETE THE OTHER TWO LAYERS AS REDUNDANT. There are three:
 *   1. this endpoint       — prevents what our code would otherwise do
 *   2. verify-after-write  — catches the race this cannot prevent
 *   3. the publish backstop — catches what reached the record another way
 * One layer would have been enough if the platform had a unique constraint.
 * It does not: no entity schema in this app declares uniqueness, and the REST
 * surface offers no conditional write. So the race is real, cannot be
 * prevented, and can only be DETECTED AND RESOLVED.
 *
 * ── THE SAFETY PROPERTY THAT MATTERS MOST ─────────────────────────────────
 * A SLUG MAY BE REASSIGNED ONLY BEFORE IT HAS EVER BEEN SHARED. Yielding is
 * survivable at publish time, when no invitation exists. Afterwards it is
 * catastrophic: the link is in other people's inboxes and we do not get to
 * change it.
 *
 * WeddingDetails carries no published/shared field, so the evidence lives on
 * Guest: an issued `rsvp_link_id`, an `invitation_sent` flag, or an
 * `invite_sent_at` stamp. `rsvp_link_id` is the important one — a link can
 * exist before anyone pressed send, and once it exists the address is out.
 *
 * WHEN A WRONG "NO" COSTS A MOMENT AND A WRONG "YES" IS PERMANENT, FAIL
 * CLOSED. If the guest read fails we refuse to yield rather than assume zero
 * guests: a refused yield means a couple keeps an address they can change
 * later; a yield that fires on a failed read breaks a link in someone's inbox
 * forever, and no apology recovers that.
 */
import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { canonicalSlug, deriveSlug, slugRootFromNames } from './_lib/slugCanon.js';

const BASE44_API = 'https://base44.app/api';
// VITE_BASE44_APP_ID, not BASE44_APP_ID. That is the name every other server
// endpoint reads — wedding-by-slug, song-request-submit and my-wedding-details
// all use it — and it is what is actually set in the environment. Written from
// the shape the codebase already had rather than the name it ought to have,
// because the wrong one meant this endpoint answered 500 'Server not
// configured' in production while every guard around it passed: nothing in the
// build or the test suite reads a deployed env var.
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID;
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(p) {
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.results)) return p.results;
  return [];
}

async function adminGet(path) {
  const res = await fetch(`${BASE44_API}${path}`, { headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` } });
  if (!res.ok) throw new Error(`Base44 GET ${path} failed (${res.status})`);
  return unwrapList(await res.json());
}


/**
 * READS STAY ON THE ADMIN KEY, and this is not an oversight.
 *
 * The caller's token would return only rows THEY own — Base44 filters
 * owner-scoped reads silently, with a 200 and a short list. Ambiguity
 * detection depends on seeing OTHER couples' records, so a caller-token read
 * would report "nobody holds this address" for every address held by someone
 * else, and the endpoint would hand out addresses that are already taken.
 *
 * Mixed credentials, on purpose, exactly as api/my-wedding-details.js does:
 * admin to SEE, the caller to ACT.
 */
const holdersOf = (slug) =>
  adminGet(`/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${encodeURIComponent(JSON.stringify({ slug }))}`)
    .then(rows => rows.filter(w => w && w.slug === slug && !w.is_test));

/**
 * Has this wedding's address ever left the building?
 * Throws on a read failure so the caller fails CLOSED.
 */
async function hasBeenShared(ownerId) {
  const guests = await adminGet(
    `/apps/${BASE44_APP_ID}/entities/Guest?q=${encodeURIComponent(JSON.stringify({ created_by_id: ownerId }))}`);
  return guests.some(g => g && (g.rsvp_link_id || g.rsvp_link_id_hash || g.invitation_sent || g.invite_sent_at));
}

/**
 * Who yields when two records hold the same address?
 * Earliest created_date wins; id breaks the tie. Total, deterministic, and
 * computed identically by both sides of a race with no coordination — which
 * matters because both sides run this check independently. If both yielded,
 * the address would belong to nobody; if neither did, nothing would be fixed.
 */
function loser(rows) {
  const sorted = [...rows].sort((a, b) => {
    const ta = Date.parse(a.created_date || '') || Infinity;
    const tb = Date.parse(b.created_date || '') || Infinity;
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id));
  });
  return sorted.slice(1);
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  const { limited } = checkRateLimit(ip, 'claim-slug', 30, 60_000);
  if (limited) return res.status(429).json({ error: 'Too many requests — please wait a moment.' });

  if (!BASE44_ADMIN_KEY || !BASE44_APP_ID) {
    console.error('[claim-slug] admin key or app id not configured');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });

  // Held for the WRITE only. Reads stay on the admin key deliberately — see
  // holdersOf below.
  const auth = req.headers.authorization || '';
  const callerToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!callerToken) return res.status(401).json({ error: 'Unauthorized' });

  const { weddingId } = req.body || {};
  if (!weddingId) return res.status(400).json({ error: 'invalid' });

  try {
    const mine = (await adminGet(
      `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${encodeURIComponent(JSON.stringify({ id: weddingId }))}`))[0];
    if (!mine || String(mine.created_by_id) !== String(caller.id)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const current = canonicalSlug(mine.slug);
    const root = slugRootFromNames(mine);

    // A wedding with no names has nothing to show a guest, and the resolver
    // already refuses an empty address. Nothing freezes, because nothing is
    // frozen until names exist.
    if (!root) return res.status(200).json({ slug: null, reason: 'no-names' });

    // THE FREEZE. The address follows the names until the first invitation
    // exists, then never moves again — the link is in someone's inbox and we
    // do not get to change it.
    //
    // It guards CHANGING an address, not assigning a first one: a record with
    // no address has nothing in anyone's inbox to break, so an invitation
    // issued before an address existed must not lock the couple out of ever
    // having one.
    if (current) {
      let shared;
      try {
        shared = await hasBeenShared(caller.id);
      } catch (e) {
        // FAIL CLOSED. A wrong "no" costs a moment; a wrong "yes" breaks a
        // link already sent, and no apology recovers that.
        console.error(`[claim-slug] treating ${weddingId} as FROZEN: could not read guests (${e.message}).`);
        return res.status(200).json({ slug: mine.slug, frozen: true, reason: 'read-failed' });
      }
      if (shared) return res.status(200).json({ slug: mine.slug, frozen: true });
    }

    // THE DETERMINISTIC TIE-BREAK, still doing the job it was built for.
    //
    // Two records can derive the same address simultaneously — the platform has
    // no unique constraint and no conditional write, so the race is real and can
    // only be DETECTED. Without a tie-break both sides would then see the other
    // holding "their" address and both would move, forever. Earliest
    // created_date wins, id breaks the tie: computed identically by both sides
    // with no coordination, so exactly one of them yields.
    if (current) {
      const holders = await holdersOf(mine.slug);
      if (holders.length > 1 && !loser(holders).some(w => String(w.id) === String(weddingId))) {
        return res.status(200).json({ slug: mine.slug, unchanged: true, wonRace: true });
      }
    }

    // Every address in use, EXCEPT this record's own — otherwise a couple
    // whose names have not changed would collide with themselves and climb a
    // rung on every visit.
    const all = await adminGet(`/apps/${BASE44_APP_ID}/entities/WeddingDetails`);
    const taken = new Set(
      all.filter(w => String(w.id) !== String(weddingId))
         .map(w => canonicalSlug(w.slug))
         .filter(Boolean));

    const derived = deriveSlug(root, taken, mine.weddingDate);
    if (!derived) {
      console.error(`[claim-slug] ladder exhausted for root ${JSON.stringify(root)} on ${weddingId}`);
      return res.status(200).json({ slug: mine.slug || null, reason: 'exhausted' });
    }

    if (derived === current) return res.status(200).json({ slug: mine.slug, unchanged: true });
    return res.status(200).json({ slug: derived });
  } catch (err) {
    // The couple never sees this. There is no address editor and no message —
    // the second couple is never told they are second. A derivation that fails
    // leaves the record exactly as it was, and the next call retries.
    console.error('[claim-slug] derivation failed:', err.message);
    return res.status(500).json({ error: 'derive-failed' });
  }
}

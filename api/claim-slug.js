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
import { canonicalSlug, isReservedSlug, suggestSlug } from './_lib/slugCanon.js';

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
 * THE WRITE USES THE CALLER'S OWN TOKEN, NEVER THE ADMIN KEY.
 *
 * WeddingDetails.update is owner-scoped, and BASE44_ADMIN_KEY has no session
 * identity matching {{user.id}} — so an admin write is a flat 403. This
 * endpoint shipped writing with the admin key and therefore NEVER ONCE
 * SUCCEEDED: verified in the production logs, both from a script and from the
 * owner's own attempt through the publish modal.
 *
 * PRIOR ART: api/my-wedding-details.js already does exactly this, on this same
 * entity, with a `callerFetch` helper and a header explaining why. The pattern
 * was solved before this file existed.
 *
 * THE TOKEN IS NEVER LOGGED, NEVER PERSISTED, AND GOES NOWHERE BUT BASE44.
 *
 * AND THERE IS NO ADMIN FALLBACK. If the caller's token is absent this refuses.
 * Falling back to the admin key would be the most dangerous line in the file:
 * Base44's own RLS is what stops a caller claiming on a record they do not own,
 * and an admin write would bypass exactly that. NO TOKEN MEANS REFUSE, never
 * escalate.
 */
async function callerPut(id, body, callerToken) {
  if (!callerToken) throw new Error('no caller token — refusing to write');
  const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${callerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Base44 PUT WeddingDetails/${id} failed (${res.status})`);
  return res.json();
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

  const { weddingId, slug: requested } = req.body || {};
  const slug = canonicalSlug(requested);

  if (!slug) {
    return res.status(400).json({ error: 'invalid', message: 'Choose an address for your site.' });
  }
  if (isReservedSlug(slug)) {
    return res.status(409).json({ error: 'reserved',
      message: 'That address is reserved. Pick another name.' });
  }

  try {
    const mine = (await adminGet(
      `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${encodeURIComponent(JSON.stringify({ id: weddingId }))}`))[0];
    if (!mine || String(mine.created_by_id) !== String(caller.id)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (canonicalSlug(mine.slug) === slug) return res.status(200).json({ ok: true, slug, unchanged: true });

    // PRE-CHECK. It can lie — another claim may land between this read and the
    // write below — which is exactly why the verify step exists.
    const before = await holdersOf(slug);
    if (before.length > 0) {
      const takenSet = new Set((await adminGet(
        `/apps/${BASE44_APP_ID}/entities/WeddingDetails`)).map(w => canonicalSlug(w.slug)).filter(Boolean));
      return res.status(409).json({ error: 'taken',
        message: 'That address is taken.',
        suggestion: suggestSlug(slug, takenSet, mine.weddingDate) || null });
    }

    await callerPut(weddingId, { slug }, callerToken);

    // VERIFY AFTER WRITE. One holder is success. More than one means a race
    // already happened, and the pre-check above told us nothing.
    const after = await holdersOf(slug);
    if (after.length <= 1) return res.status(200).json({ ok: true, slug });

    const yielders = loser(after);
    const weYield = yielders.some(w => String(w.id) === String(weddingId));
    console.error(`[claim-slug] RACE on ${JSON.stringify(slug)}: ${after.length} holders — ` +
      `${after.map(w => w.id).join(', ')}. This record ${weYield ? 'YIELDS' : 'KEEPS'}.`);

    if (!weYield) return res.status(200).json({ ok: true, slug });

    // We lost the race. Reassigning is only permitted while the address has
    // never been shared — and a read failure here refuses rather than assumes.
    let shared;
    try {
      shared = await hasBeenShared(caller.id);
    } catch (e) {
      console.error(`[claim-slug] REFUSING TO YIELD ${weddingId}: could not read guests (${e.message}). ` +
        'Failing closed — a wrong "no" costs a moment, a wrong "yes" breaks a link already sent.');
      return res.status(409).json({ error: 'taken', message: 'That address is taken.', suggestion: null });
    }
    if (shared) {
      console.error(`[claim-slug] REFUSING TO YIELD ${weddingId}: invitations already exist for this wedding. ` +
        'The address is in guests\' inboxes and cannot be changed. Needs manual resolution.');
      return res.status(409).json({ error: 'conflict-after-share',
        message: 'That address is already in use and your invitations have gone out. Contact us and we will sort it.' });
    }

    await callerPut(weddingId, { slug: '' }, callerToken);
    const takenSet = new Set((await adminGet(
      `/apps/${BASE44_APP_ID}/entities/WeddingDetails`)).map(w => canonicalSlug(w.slug)).filter(Boolean));
    return res.status(409).json({ error: 'taken', message: 'That address is taken.',
      suggestion: suggestSlug(slug, takenSet, mine.weddingDate) || null });
  } catch (err) {
    // A SAVE FAILURE IS NOT A COLLISION, and a couple mid-edit must be able to
    // tell them apart. 'Something went wrong' was what the owner actually saw
    // when the write 403'd — the generic failure this product has spent a day
    // eliminating, produced by the very backstop whose job was to speak.
    //
    // The second sentence is the thing they most need to hear mid-edit: their
    // wedding is intact, and only this one action failed.
    console.error('[claim-slug] write failed:', err.message);
    return res.status(500).json({
      error: 'save-failed',
      message: 'We couldn\'t save that address just now. Nothing else has changed — please try again.',
    });
  }
}

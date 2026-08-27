/**
 * src/lib/weddingAddress.js — keeping a wedding's address in step with its names.
 *
 * THERE IS NO ADDRESS EDITOR. Nobody types this. A wedding's address is derived
 * from the couple's names, and the question "why do they have to be able to
 * edit it?" turned out to have no answer: nobody had ever asked to. Two days
 * were spent defending an editor that existed because it had been built.
 *
 * WHAT REPLACED IT
 *   · The address derives from the names, normalized once (api/_lib/slugCanon.js).
 *   · On a collision each rung adds a REAL FACT — the year, then the month,
 *     then the day — never a random token. This goes on printed cards and gets
 *     read aloud; `bskg8405` reads as a tracking code on a product people pay
 *     for. StudioWebsite.jsx really did append `Math.random().toString(36)`.
 *   · It follows the names until the first invitation exists, then freezes
 *     forever. A name mistyped at signup is fixed by fixing the name.
 *   · THE SECOND COUPLE IS NEVER TOLD THEY ARE SECOND. No message, no choice,
 *     no suggestion to accept. They get an address.
 *
 * WHY THE WRITE HAPPENS HERE AND NOT ON THE SERVER
 * The server derives; the client writes. `WeddingDetails.update` through the
 * SDK is the path EventDetails uses to rename a partner every day, so it is
 * proven; the server's own forwarded-token PUT answered 422 and was never
 * proven. Deriving where the data is and writing where the write works keeps
 * the unproven path out of the critical path entirely.
 */
import { base44 } from '@/api/base44Client';

/**
 * Bring the address into step with the names. Safe to call whenever names
 * change or a record loads; it is a no-op when nothing needs to move.
 *
 * NEVER THROWS AT A SURFACE. There is no interface to report to — a failure
 * leaves the record exactly as it was and the next call retries.
 *
 * @returns {{changed: boolean, slug: string|null, reason?: string}}
 */
export async function syncWeddingAddress(weddingId) {
  if (!weddingId) return { changed: false, slug: null, reason: 'no-record' };
  try {
    const token = localStorage.getItem('base44_access_token');
    const res = await fetch('/api/claim-slug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ weddingId }),
    });
    if (!res.ok) return { changed: false, slug: null, reason: `http-${res.status}` };
    const body = await res.json().catch(() => ({}));

    // no names yet · frozen by an invitation · already correct · ladder spent
    if (!body.slug || body.frozen || body.unchanged) {
      return { changed: false, slug: body.slug ?? null, reason: body.reason };
    }

    await base44.entities.WeddingDetails.update(weddingId, { slug: body.slug });
    return { changed: true, slug: body.slug };
  } catch (err) {
    console.error('[weddingAddress] could not sync:', err?.message);
    return { changed: false, slug: null, reason: 'error' };
  }
}

// Still the one canonical form, for anywhere an address is displayed.
export { canonicalSlug } from '../../api/_lib/slugCanon.js';

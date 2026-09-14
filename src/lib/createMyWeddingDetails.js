import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';

/**
 * src/lib/createMyWeddingDetails.js
 *
 * THE ONE PLACE A WEDDING RECORD IS CREATED.
 *
 * ── NULL MEANS TWO THINGS ──────────────────────────────────────────────────
 *
 * Every page held the same shape:
 *
 *     const r = await getMyWeddingDetails();   // on mount
 *     setRecordId(r?.id || null);
 *     …
 *     if (recordId) await WeddingDetails.update(recordId, payload);
 *     else          await WeddingDetails.create(payload);
 *
 * and every page's load wrapped that read in a catch that showed a toast and
 * let the form render anyway. So `recordId` was null in two completely
 * different situations — "this account has no record yet" and "I could not
 * find out" — and the create could not tell them apart. A couple whose read
 * failed once, then typed into the form behind the toast, got a second record.
 *
 * ── AND A SECOND RECORD IS A SUBSTITUTION ──────────────────────────────────
 *
 * Every surface resolves the couple's wedding as the NEWEST owned record
 * (resolveMyWedding's `mostRecent`; api/my-wedding-details' `getMyWedding`).
 * A new row is always newer, so it becomes the wedding, and the row holding
 * everything they had entered stops being resolved anywhere — not deleted,
 * orphaned, which leaves no trace. DECISION-LOG 2026-09-14.
 *
 * ── SO THE CHECK MOVED TO THE WRITE ────────────────────────────────────────
 *
 * A record read on mount says nothing about the state of the account at the
 * moment of a save that may be minutes later, and a null read at mount is
 * exactly the case that needs the check most. This re-reads at WRITE time,
 * through the same owner-scoped endpoint, in `strict` mode — which is the
 * distinction the old code did not have:
 *
 *     a record  -> UPDATE it. Never create.
 *     a failure -> THROW. Never create. The caller surfaces it.
 *     none      -> CREATE, the only path that reaches a create at all.
 *
 * Failing a save is recoverable: the couple retries and their work is still
 * there. Creating a duplicate is not: their work is still there too, and
 * nothing will ever show it to them again.
 *
 * ── WHY THE COST IS ACCEPTABLE ─────────────────────────────────────────────
 *
 * This adds one GET before a create. It does NOT add one before an update:
 * callers that already hold an id keep calling `WeddingDetails.update`
 * directly, and that is the overwhelmingly common path — the extra read
 * happens only where the code was about to create a row, which is once per
 * account in the intended case.
 *
 * @param {Record<string, unknown>} payload fields to write
 * @returns {Promise<{id: string}>} the record written to — existing or new
 * @throws if the caller's own record could not be read. Callers must let this
 *   surface: swallowing it puts back the exact null this exists to remove.
 */
export async function createMyWeddingDetails(payload) {
  // strict: true is the whole point. Without it this helper would receive the
  // same ambiguous null the call sites used to, and would be decoration.
  const existing = await getMyWeddingDetails({ strict: true });
  if (existing?.id) {
    await base44.entities.WeddingDetails.update(existing.id, payload);
    return existing;
  }
  return base44.entities.WeddingDetails.create(payload);
}

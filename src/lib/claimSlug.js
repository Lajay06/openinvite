/**
 * The client half of claiming a wedding address.
 *
 * Every surface that lets a couple set their address calls THIS, never
 * `WeddingDetails.update({ slug })` directly. Three surfaces used to normalize
 * three different ways and a fourth wrote raw keystrokes, which is why
 * "Jay Ella", "jay-ella" and "jay--ella" were all reachable addresses.
 *
 * The endpoint is authoritative for our code and advisory against the platform
 * — an owner can still write their own record through the SDK — so this is one
 * of three layers, not the only one. See api/claim-slug.js.
 */
import { base44 } from '@/api/base44Client';

/** @returns {{ok:true, slug:string} | {ok:false, reason:string, message:string, suggestion?:string}} */
export async function claimSlug(weddingId, slug) {
  const token = localStorage.getItem('base44_access_token');
  const res = await fetch('/api/claim-slug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ weddingId, slug }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, slug: body.slug };
  return {
    ok: false,
    reason: body.error || 'server',
    // Their words, never ours about the system. A couple typing the name they
    // wanted and being told "no" is a small heartbreak in a product about
    // their wedding, so the refusal offers them something.
    // NOT a generic fallback. The endpoint distinguishes 'taken' from
    // 'save-failed' and this must not collapse them back together — a couple
    // mid-edit needs to know whether their address is gone or their save is.
    message: body.message
      || 'We couldn\'t save that address just now. Nothing else has changed — please try again.',
    suggestion: body.suggestion || null,
  };
}

// Re-exported so a surface can show the canonical form as the couple types,
// rather than discovering at save time that their address was rewritten.
export { canonicalSlug } from '../../api/_lib/slugCanon.js';
void base44;

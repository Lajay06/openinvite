/**
 * src/lib/professionalCodes.js
 *
 * ONE REFERRAL ENGINE, TWO KINDS. goals/2026-10-14-professional.md, Partner
 * codes, and goals/2026-10-10-pay-it-forward.md (lane C).
 *
 *   couple   lane C's pay-it-forward: a code, a join, a shared US$10 promotion
 *            code for the friend, and no reward for the referrer.
 *   partner  a professional's code: 10% off Pro or Ultra for the couple, and
 *            bill credit for the workspace, US$20 a Pro and US$50 an Ultra.
 *
 * Pure: the same rules run in the browser (to show), on the server (to
 * decide) and in the webhook branch (to record). Nothing here moves money.
 *
 * Partner credit is PENDING until the couple's refund window has passed, then
 * EARNED, then CREDITED to the workspace's Stripe customer balance by the
 * daily job, never more than the monthly cap. A refund before it is earned
 * cancels it. The refund policy names no fixed window (it says "as required
 * by law"), so the window is the goal's minimum, 14 days, until the owner
 * rules otherwise.
 */

export const KINDS = {
  couple: { key: 'couple', discount: { type: 'amount', usd: 10 }, reward: null },
  partner: { key: 'partner', discount: { type: 'percent', percent: 10, plans: ['pro', 'ultra'] }, reward: { pro: 20, ultra: 50 } },
};

export const REFUND_WINDOW_DAYS = 14;
export const MONTHLY_CAP_USD = 500;
export const MAX_NAMED_CODES = 10;
export const CODE_RE = /^[A-Z0-9]{4,16}$/;
const DAY = 86400000;

export function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}
export const isValidCode = (raw) => CODE_RE.test(normalizeCode(raw));
export const isValidEmailShape = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

/** A first code from a name: "Holly Reed Events" reads HOLLY10. Collisions get a digit. */
export function suggestCode(name, taken = []) {
  const word = String(name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean)[0] || 'PLAN';
  const base = `${word.slice(0, 10)}10`;
  const set = new Set(taken.map(normalizeCode));
  if (!set.has(base)) return base;
  for (let i = 2; i < 100; i++) if (!set.has(`${word.slice(0, 9)}${i}0`)) return `${word.slice(0, 9)}${i}0`;
  return `${word.slice(0, 6)}${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

/** Unique across every workspace, compared case-insensitively. */
export function isCodeFree(code, allCodes) {
  const c = normalizeCode(code);
  return !(allCodes || []).some((x) => normalizeCode(x.code) === c && x.status !== 'revoked');
}

/** Team and Agency may hold up to 10 named codes; Solo and the trial hold the one. */
export function codeLimit(plan) {
  return plan === 'team' || plan === 'agency' ? MAX_NAMED_CODES : 1;
}

/**
 * Should this purchase earn the workspace a reward? Every rule the goal
 * names, in one place. `couple` carries hashes the server computed:
 * { userHash, emailHash, stripeCustomerId }. Returns { ok, reason }.
 */
export function rewardDecision({ code, plan, couple, workspace, memberEmailHashes = [], existingRewards = [], giftApplied = false }) {
  if (!code || code.status !== 'active') return { ok: false, reason: 'code_inactive' };
  if (!KINDS.partner.reward[plan]) return { ok: false, reason: 'plan_not_eligible' };
  if (giftApplied) return { ok: false, reason: 'stacked_with_gift' };
  if (couple?.emailHash && (couple.emailHash === workspace?.owner_email_hash || memberEmailHashes.includes(couple.emailHash))) return { ok: false, reason: 'self_referral' };
  if (couple?.stripeCustomerId && couple.stripeCustomerId === workspace?.stripe_customer_id) return { ok: false, reason: 'self_referral' };
  if (couple?.userHash && couple.userHash === workspace?.owner_user_id_hash) return { ok: false, reason: 'self_referral' };
  if ((existingRewards || []).some((r) => r.couple_user_id_hash && r.couple_user_id_hash === couple?.userHash && r.status !== 'canceled')) return { ok: false, reason: 'already_rewarded' };
  return { ok: true, reason: null };
}

export function rewardFor(plan) { return KINDS.partner.reward[plan] || 0; }

export function earnAfter(purchasedAt, days = REFUND_WINDOW_DAYS) {
  return new Date(new Date(purchasedAt).getTime() + days * DAY).toISOString();
}

/**
 * The daily settle. Pending rewards past their window become earned; a
 * refunded purchase cancels a reward that is still pending. Returns patches.
 * `refundedCoupleHashes` comes from Stripe, read by the job.
 */
export function settle(rewards, now = new Date(), refundedCoupleHashes = []) {
  const refunded = new Set(refundedCoupleHashes);
  const out = [];
  for (const r of rewards || []) {
    if (r.status !== 'pending') continue;
    if (refunded.has(r.couple_user_id_hash)) out.push({ id: r.id, status: 'canceled' });
    else if (Date.parse(r.earn_after) <= now.getTime()) out.push({ id: r.id, status: 'earned' });
  }
  return out;
}

/**
 * Which earned rewards may be credited this month without passing the cap.
 * The rest stay earned and carry to next month. `creditedThisMonth` is the
 * sum already credited this calendar month (UTC).
 */
export function creditable(rewards, creditedThisMonth = 0, cap = MONTHLY_CAP_USD) {
  let room = Math.max(0, cap - creditedThisMonth);
  const out = [];
  for (const r of (rewards || []).filter((x) => x.status === 'earned').sort((a, b) => String(a.earn_after).localeCompare(String(b.earn_after)))) {
    if (r.amount <= room) { out.push(r); room -= r.amount; }
  }
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_TEXT = { pending: 'Pending', earned: 'Earned', credited: 'Credited', canceled: 'Canceled' };

/**
 * The partner page's rows: "a couple, Ultra, 3 Nov". Never a couple's name,
 * email or id, named field by field.
 */
export function partnerRows(rewards, codes) {
  return (rewards || []).slice().sort((a, b) => String(b.created_date).localeCompare(String(a.created_date))).map((r) => {
    const d = new Date(r.created_date);
    return {
      who: 'a couple',
      plan: r.plan === 'ultra' ? 'Ultra' : 'Pro',
      date: Number.isNaN(d.getTime()) ? '' : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
      code: (codes || []).find((c) => c.id === r.code_id)?.code || '',
      amount: r.amount,
      status: STATUS_TEXT[r.status] || 'Pending',
    };
  });
}

export function partnerTotals(rewards) {
  const sum = (st) => (rewards || []).filter((r) => st.includes(r.status)).reduce((t, r) => t + (Number(r.amount) || 0), 0);
  return { pending: sum(['pending']), earned: sum(['earned']), credited: sum(['credited']), uses: (rewards || []).filter((r) => r.status !== 'canceled').length };
}

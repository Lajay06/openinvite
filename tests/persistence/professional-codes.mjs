/**
 * tests/persistence/professional-codes.mjs
 *
 * Openinvite Professional: partner codes and rewards, the one referral engine.
 * goals/2026-10-14-professional.md, Partner codes.
 *
 * PLANT (R19): a reward rule that forgets self-referral by a team member must
 * fail the same check.
 */
import { pass, fail } from './_shared.mjs';
import { rewardDecision, rewardFor, earnAfter, settle, creditable, partnerRows, partnerTotals, normalizeCode, isValidCode, isCodeFree, suggestCode, codeLimit, KINDS, REFUND_WINDOW_DAYS } from '../../src/lib/professionalCodes.js';

export function runProfessionalCodes(decide = rewardDecision) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, partner codes and rewards:\n');

  check('professional codes: 10% off Pro or Ultra; US$20 a Pro, US$50 an Ultra', KINDS.partner.discount.percent === 10 && rewardFor('pro') === 20 && rewardFor('ultra') === 50 && rewardFor('free') === 0, 'as the goal');
  check('professional codes: the couple kind (lane C) rewards nobody', KINDS.couple.reward === null, 'no reward');
  check('professional codes: codes are case-insensitive and unique', normalizeCode(' holly10 ') === 'HOLLY10' && !isCodeFree('holly10', [{ code: 'HOLLY10', status: 'active' }]) && isCodeFree('holly10', [{ code: 'HOLLY10', status: 'revoked' }]), 'HOLLY10');
  check('professional codes: a suggested code reads like HOLLY10 and avoids a taken one', suggestCode('Holly Reed Events') === 'HOLLY10' && suggestCode('Holly Reed Events', ['HOLLY10']) !== 'HOLLY10' && isValidCode(suggestCode('Holly Reed Events', ['HOLLY10'])), suggestCode('Holly Reed Events', ['HOLLY10']));
  check('professional codes: Team and Agency hold 10 named codes; Solo holds one', codeLimit('team') === 10 && codeLimit('agency') === 10 && codeLimit('solo') === 1, 'limits');

  const code = { id: 'c', status: 'active' };
  const ws = { owner_user_id_hash: 'owner', owner_email_hash: 'owner@', stripe_customer_id: 'cus_ws' };
  const couple = { userHash: 'couple', emailHash: 'couple@', stripeCustomerId: 'cus_c' };
  const base = { code, plan: 'ultra', couple, workspace: ws, memberEmailHashes: ['jo@'], existingRewards: [] };
  check('professional codes: a fresh couple buying Ultra earns the workspace a reward', decide(base).ok, 'ok');
  check('professional codes: no self-referral by the owner’s email, Stripe customer or a team member', !decide({ ...base, couple: { ...couple, emailHash: 'owner@' } }).ok && !decide({ ...base, couple: { ...couple, stripeCustomerId: 'cus_ws' } }).ok && !decide({ ...base, couple: { ...couple, emailHash: 'jo@' } }).ok, 'self');
  check('professional codes: one reward per couple', !decide({ ...base, existingRewards: [{ couple_user_id_hash: 'couple', status: 'pending' }] }).ok && decide({ ...base, existingRewards: [{ couple_user_id_hash: 'couple', status: 'canceled' }] }).ok, 'once');
  check('professional codes: no stacking with a gift, and a revoked code earns nothing', !decide({ ...base, giftApplied: true }).ok && !decide({ ...base, code: { status: 'revoked' } }).ok, 'refused');

  const t0 = '2026-10-01T00:00:00Z';
  check(`professional codes: credit is pending for ${REFUND_WINDOW_DAYS} days`, earnAfter(t0) === '2026-10-15T00:00:00.000Z', earnAfter(t0));
  const rewards = [
    { id: 'a', status: 'pending', earn_after: '2026-10-10T00:00:00Z', couple_user_id_hash: 'x', amount: 50 },
    { id: 'b', status: 'pending', earn_after: '2026-10-20T00:00:00Z', couple_user_id_hash: 'y', amount: 20 },
    { id: 'c', status: 'pending', earn_after: '2026-10-10T00:00:00Z', couple_user_id_hash: 'refunded', amount: 50 },
  ];
  const patches = settle(rewards, new Date('2026-10-14T00:00:00Z'), ['refunded']);
  check('professional codes: past the window it is earned; a refund before then cancels it', JSON.stringify(patches) === '[{"id":"a","status":"earned"},{"id":"c","status":"canceled"}]', JSON.stringify(patches));
  const earned = [50, 50, 50, 20].map((amount, i) => ({ id: `e${i}`, status: 'earned', amount, earn_after: `2026-10-0${i + 1}` }));
  check('professional codes: no more than US$500 credited a month; the rest carries forward', creditable(earned, 400).map((x) => x.id).join() === 'e0,e1' && creditable(earned, 500).length === 0, creditable(earned, 400).map((x) => x.id).join());

  const rows = partnerRows([{ id: 'r', code_id: 'c', plan: 'ultra', amount: 50, status: 'pending', created_date: '2026-11-03T10:00:00Z', couple_user_id_hash: 'secret', couple_email: 'ava@example.com' }], [{ id: 'c', code: 'HOLLY10' }]);
  check('professional codes: the partner page reads "a couple, Ultra, 3 Nov" and never a name or email', rows[0].who === 'a couple' && rows[0].plan === 'Ultra' && rows[0].date === '3 Nov' && !JSON.stringify(rows).includes('secret') && !JSON.stringify(rows).includes('@'), JSON.stringify(rows[0]));
  check('professional codes: totals split pending, earned and credited', JSON.stringify(partnerTotals([{ status: 'pending', amount: 50 }, { status: 'earned', amount: 20 }, { status: 'canceled', amount: 50 }])) === '{"pending":50,"earned":20,"credited":0,"uses":2}', 'split');

  if (decide === rewardDecision) {
    const planted = (x) => (x.couple?.emailHash === 'jo@' ? { ok: true } : rewardDecision(x));
    check('PLANT: a rule that forgets team members is told apart', planted({ ...base, couple: { ...couple, emailHash: 'jo@' } }).ok, 'planted rewards a team member');
  }
  return r;
}

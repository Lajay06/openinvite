/**
 * Orientation layer (Next up, variant A) — behavioural pins.
 *
 * Driven by injected journey data, so these run without a browser. The
 * rendering half is covered by the standing render rule (every state rendered
 * before merge is requested); these hold the DECISIONS.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
// The PURE half — no data-client imports, so this runs under plain Node.
import { JOURNEY_STEPS, getJourneyProgress } from '../../src/lib/journeySteps.js';

const __dir = dirname(fileURLToPath(import.meta.url));

/** A wedding record shaped like the DECRYPTED one getMyWeddingDetails returns. */
const wedding = (over = {}) => ({
  pageSections: { home: [1], 'our-story': [1], celebration: [1] },
  rsvpContent: { enabled: true },
  websiteEnabled: true,
  budget: { total: 154000 },
  mainCeremony: { venueName: 'Crown Sydney' },
  ...over,
});
const counts = (over = {}) => ({ guestCount: 202, vendorCount: 9, scheduleCount: 20, ...over });

export async function runNextUp() {
  const results = [];
  console.log('\n  Next up — orientation, never a nag and never an upsell:\n');
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  // ── the budget step, against the shape its caller actually supplies ──────
  const full = getJourneyProgress(wedding(), counts(), { plan: 'ultra' });
  check('a complete couple has every step done', full.allDone, `${full.doneCount}/7`);
  check('  including budget, read from the DECRYPTED record',
    full.steps.find((s) => s.key === 'budget')?.done === true, 'budget done');

  // The bug that would exist if a raw (ciphertext) record were passed instead.
  const cipher = getJourneyProgress(wedding({ budget: 'gAAAAAB...ciphertext' }), counts(), { plan: 'ultra' });
  check('a CIPHERTEXT budget makes the step read incomplete — why the source pin exists',
    cipher.steps.find((s) => s.key === 'budget')?.done === false, 'incomplete, silently');

  // ── ordering ────────────────────────────────────────────────────────────
  const unbuilt = getJourneyProgress(
    wedding({ pageSections: { home: [1] }, websiteEnabled: false }), counts(), { plan: 'ultra' });
  const publish = unbuilt.steps.find((s) => s.key === 'publish');
  check('publish is NOT proposable while website is incomplete',
    publish.proposable === false && publish.blockedBy.includes('website'), JSON.stringify(publish.blockedBy));
  check('  and the proposed step is never publish',
    unbuilt.steps[unbuilt.nextIndex]?.key !== 'publish', unbuilt.steps[unbuilt.nextIndex]?.key);

  // rsvp deliberately has no website prerequisite (advisor ruling).
  const rsvpStep = JOURNEY_STEPS.find((s) => s.key === 'rsvp');
  check('rsvp declares NO requires — tokens resolve without a published site',
    !rsvpStep.requires || rsvpStep.requires.length === 0, JSON.stringify(rsvpStep.requires || []));

  // ── free plan: orientation must not become upsell pressure ───────────────
  const freeAllGatedLeft = getJourneyProgress(
    wedding({ pageSections: {}, rsvpContent: {}, websiteEnabled: false }), counts(), { plan: 'free' });
  check('a free plan NEVER proposes a plan-locked step',
    freeAllGatedLeft.nextIndex === -1
      || freeAllGatedLeft.steps[freeAllGatedLeft.nextIndex].planLocked === false,
    `proposed: ${freeAllGatedLeft.steps[freeAllGatedLeft.nextIndex]?.key ?? 'none'}`);
  check('  with only gated work left, nothing is proposable',
    freeAllGatedLeft.nothingProposable === true, 'nothingProposable');
  check('  and that is NOT reported as allDone (it would be a lie)',
    freeAllGatedLeft.allDone === false, `allDone=${freeAllGatedLeft.allDone}`);

  // An ultra couple in the same state DOES get pointed at the gated work.
  const ultraSame = getJourneyProgress(
    wedding({ pageSections: {}, rsvpContent: {}, websiteEnabled: false }), counts(), { plan: 'ultra' });
  check('the same state on Ultra proposes the gated step',
    ultraSame.steps[ultraSame.nextIndex]?.ultraGated === true, ultraSame.steps[ultraSame.nextIndex]?.key);

  // ── a proposed step is always actionable ────────────────────────────────
  const partway = getJourneyProgress(wedding({ rsvpContent: {} }), counts(), { plan: 'ultra' });
  const proposed = partway.steps[partway.nextIndex];
  check('a proposed step always carries a route', !!proposed?.route, proposed?.route);
  check('  and is never already done', proposed?.done === false, `${proposed?.key} done=${proposed?.done}`);

  // ── no data means no block ──────────────────────────────────────────────
  const src = readFileSync(resolve(__dir, '../../src/pages/DailyUpdate.jsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('DailyUpdate renders NextUp only in the ready phase with a journey',
    /phase === 'ready' && journey &&/.test(src), 'gated on both');
  check('  and nulls the journey when the wedding record failed to load',
    /failed\.includes\('wedding details'\)[\s\S]{0,80}setJourney\(null\)/.test(src), 'null on failure');

  // ── THE SOURCE PIN ──────────────────────────────────────────────────────
  // A raw WeddingDetails read hands isComplete ciphertext (see above) and the
  // budget step reports incomplete forever, looking exactly like an unset
  // budget. DailyUpdate must stay on the decrypting reader.
  check('DailyUpdate sources the wedding record from getMyWeddingDetails()',
    /getMyWeddingDetails\(/.test(src), 'decrypting reader');
  check('  and never reads WeddingDetails raw',
    !/entities\.WeddingDetails\.(filter|list|get)\b/.test(src), 'no raw entity read');

  // ── no gamification ─────────────────────────────────────────────────────
  const nextUpSrc = readFileSync(resolve(__dir, '../../src/components/dashboard/NextUp.jsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const banned = [/streak/i, /\bpoints\b/i, /percent/i, /progressbar/i, /%\s*complete/i];
  const hit = banned.filter((re) => re.test(nextUpSrc));
  check('NextUp contains no streak, points, percentage or progress-bar language',
    hit.length === 0, hit.length ? hit.map(String).join(', ') : 'none');

  return results;
}

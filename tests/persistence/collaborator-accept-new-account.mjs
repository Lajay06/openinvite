/**
 * tests/persistence/collaborator-accept-new-account.mjs
 *
 * A BRAND-NEW ACCOUNT FROM AN INVITE LANDS ON THE INVITE, WITH NO TRIAL AND NO
 * WEDDING OF ITS OWN.
 *
 * Item 4 of goals/2026-10-10-collaborators-safe-and-truthful.md, under the
 * named exception for src/pages/ChoosePlan.jsx. Register and Login both send
 * every new session through /choose-plan with ?next= kept, and ChoosePlan
 * used to answer a new account with the plan step, whose "Start free" writes
 * plan_step_completed and trialStartedAt and goes to /onboarding, dropping
 * next. Now, when next is a collaborator accept path, ChoosePlan sends the
 * visitor straight there and writes nothing.
 *
 * Two halves:
 *   1. isCollaboratorAcceptPath, EXECUTED: its source is read out of the .jsx
 *      (plain JavaScript) and run, so the cases test the code that ships.
 *   2. The effect, read with comments stripped: the accept branch comes first,
 *      navigates to next and returns, and calls nothing that writes or that
 *      reads a wedding. Every other next keeps the plan step as it was.
 *
 * The plant: ChoosePlan without the branch turns half 2 red. Proven by hand
 * and recorded in the PR body.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

function loadIsAcceptPath(src) {
  const start = src.indexOf('export function isCollaboratorAcceptPath(');
  if (start === -1) return null;
  const end = src.indexOf('\n}\n', start);
  const body = src.slice(start, end + 2).replace('export function', 'function');
  return new Function(`${body}\nreturn isCollaboratorAcceptPath;`)();
}

/** The block of `if (<cond>) {` up to its own closing brace. */
function blockAfter(src, opener) {
  const at = src.indexOf(opener);
  if (at === -1) return null;
  let depth = 0;
  for (let i = at + opener.length - 1; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') { depth--; if (depth === 0) return src.slice(at, i + 1); }
  }
  return null;
}

export async function runCollaboratorAcceptNewAccount() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const raw = fs.readFileSync(path.join(ROOT, 'src/pages/ChoosePlan.jsx'), 'utf8');
  const src = stripComments(raw, { trailing: true });

  // ── 1. the path test, executed ────────────────────────────────────────────
  console.log('\n  Only a real accept path counts:\n');
  const isAccept = loadIsAcceptPath(src);
  ok('isCollaboratorAcceptPath exists in ChoosePlan.jsx', typeof isAccept === 'function', 'exported');
  if (typeof isAccept === 'function') {
    const cases = [
      ['an accept link with its signed token', '/collaborate/accept/eyJvd25lciI6IngifQ.c2lnX3Rlc3Q-', true],
      ['the dashboard', '/DailyUpdate', false],
      ['nothing', null, false],
      ['the accept route with no token', '/collaborate/accept/', false],
      ['a path that climbs out of it', '/collaborate/accept/x/../../DailyUpdate', false],
      ['a query on the end', '/collaborate/accept/x?next=//elsewhere.example', false],
      ['another host', '//elsewhere.example/collaborate/accept/x', false],
      ['a full URL', 'https://elsewhere.example/collaborate/accept/x', false],
    ];
    for (const [label, input, want] of cases) ok(`  ${label}: ${want}`, isAccept(input) === want, String(input));
  }

  // ── 2. the effect ─────────────────────────────────────────────────────────
  console.log('\n  The invite comes first, and nothing is written:\n');
  const effect = blockAfter(src, 'useEffect(() => {');
  const branch = effect && blockAfter(effect, 'if (isCollaboratorAcceptPath(next)) {');
  ok('the effect has an accept branch', !!branch, branch ? 'found' : 'missing');
  ok('  before the plan-step check', !!branch && effect.indexOf(branch) < effect.indexOf('isPastPlanStep(user)'), 'first');
  ok('  and after auth has loaded, so a session is settled', !!branch && effect.indexOf('if (isLoadingAuth) return;') < effect.indexOf(branch), 'isLoadingAuth first');
  ok('  it goes to next, replacing the history entry, and stops', !!branch && /navigate\(next, \{ replace: true \}\);\s*return;/.test(branch), 'navigate(next) then return');
  ok('  it writes nothing: no updateMe, so no plan_step_completed and no trialStartedAt',
     !!branch && !/updateMe|plan_step_completed|trialStartedAt/.test(branch), 'no writes');
  ok('  it reads no wedding and never goes to onboarding',
     !!branch && !/getMyWeddingDetails|onboarding/.test(branch), 'no wedding, no /onboarding');

  console.log('\n  Every other next keeps the plan step as it was:\n');
  ok('the plan-step check still redirects a past account to next or onboarding',
     /getMyWeddingDetails\(\)\s*\.then\(\(wedding\) => navigate\(needsOnboarding\(wedding\) \? '\/onboarding' : next, \{ replace: true \}\)\)/.test(effect || ''), 'unchanged');
  ok('  and "Start free" still writes the trial and goes to onboarding',
     /updateMe\(\{ plan_step_completed: true, trialStartedAt: new Date\(\)\.toISOString\(\) \}\)/.test(src) && /navigate\('\/onboarding'\);/.test(src), 'goFree unchanged');

  return results;
}

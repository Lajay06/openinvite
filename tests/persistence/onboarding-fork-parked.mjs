/**
 * tests/persistence/onboarding-fork-parked.mjs
 *
 * "ONE LAST THING." IS PARKED, NOT DELETED, AND NOTHING IS LOST WITH IT.
 * Owner ruling 2026-10-14: onboarding goes from its last question straight to
 * "You're all set", the step counter counts seven, and the fork's code stays
 * behind a flag for later.
 *
 * What it holds:
 *   - the flag is off, and with it the fork and the detailed path it opened
 *     are hidden; every step and component is still in the file
 *   - the last question's Continue runs the same quick save Get started now
 *     ran, with that question's answer in it, before "You're all set" shows,
 *     and a failed save stays put with the error, as the fork did
 *   - a draft saved on the parked fork resumes on the last question, never on
 *     "You're all set" with the save skipped
 *   - the "You're all set" checklist is a plain list: no border, no fill
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => stripComments(readFileSync(resolve(ROOT, p), 'utf8'));

export async function runOnboardingForkParked() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Onboarding: the fork parked, nothing lost:\n');
  const src = read('src/pages/Onboarding.jsx');

  check('the fork is parked behind a flag that is off', /export const ONBOARDING_FORK_ON = false;/.test(src));
  check('  and hidden with the detailed path, by isStepVisible',
    /if \(!ONBOARDING_FORK_ON && \(step === 'fork' \|\| PATH_A_STEPS\.includes\(step\)\)\) return false;/.test(src));
  check('  but not deleted: the step, its render and its component are all still there',
    /'fork',/.test(src) && /currentStep === 'fork' && \(/.test(src) && /<OnboardingStep8Fork/.test(src) && /const handlePathB = async/.test(src));
  check('the step counter counts what is visible, so it reads seven',
    /const effectiveCoreSteps = CORE_STEPS\.filter\(step => isStepVisible\(step, user\?\.plan\)\);/.test(src) && /totalSteps: effectiveCoreSteps\.length/.test(src));

  const goNext = src.slice(src.indexOf('const goNext = async'), src.indexOf('const goBack'));
  check('the last question saves before "You\'re all set", with its own answer',
    /if \(!ONBOARDING_FORK_ON && STEPS\[nextIndex\] === 'completion'\)/.test(goNext)
      && /const result = await saveOnboarding\('quick', merged\);/.test(goNext)
      && goNext.indexOf("saveOnboarding('quick', merged)") < goNext.indexOf('setCurrentStepIndex(nextIndex);'));
  check('  and a failed save stays on the question with the error, as the fork did',
    /setSaveError\(result\.error \|\| 'Something went wrong saving your details\.'\);\s*\}\s*return;/.test(goNext) && /setLastAttemptedPath\('quick'\)/.test(goNext));
  check('saveOnboarding writes the answers it is given', /const saveOnboarding = async \(path, data = onboardingData\) =>/.test(src) && /buildWeddingDetailsPayload\(data\)/.test(src));
  check('a draft on the parked fork resumes on the last question, not on "You\'re all set"',
    /if \(!ONBOARDING_FORK_ON && STEPS\[resumeIndex\] === 'completion'\) \{\s*resumeIndex = nextVisibleIndex\(STEPS\.indexOf\('completion'\) - 1, -1, currentUser\?\.plan\);/.test(src));

  const done = read('src/components/onboarding/OnboardingCompletion.jsx');
  const item = done.slice(done.indexOf('CHECKLIST_ITEMS.map'), done.indexOf('</motion.div>', done.indexOf('CHECKLIST_ITEMS.map')));
  check('"You\'re all set" lists its three lines plainly: no border, no fill, no padding',
    /style=\{\{ display: 'flex', alignItems: 'center', gap: 12 \}\}/.test(item) && !/border|background|padding/.test(item));
  return r;
}

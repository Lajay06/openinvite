/**
 * A REPLY ENDS ON THE REPLY.
 *
 * Owner report, Run 6 U3: submitting an RSVP opens the polls.
 *
 * ── WHAT IT DID ────────────────────────────────────────────────────────────
 *
 * Two doorways, both automatic:
 *
 *   on submit   setStep(activePolls.length > 0 ? 'polls' : 'done')
 *   on load     setStep(hasUnvotedPolls ? 'polls' : 'done')
 *
 * So a guest who came to say yes was handed a questionnaire instead of a
 * confirmation, and the one thing they came for — did that land? — scrolled
 * away underneath it. A returning guest got the same treatment on arrival.
 *
 * The polls are not removed and not hidden: the done screen offers them
 * whenever any are unanswered. Offered, not imposed.
 *
 * ── WHY THE CHECKS ARE SHAPED THIS WAY ─────────────────────────────────────
 *
 * "Does not auto-open" is an ABSENCE, and an absence needs the presence beside
 * it or it is satisfied by deleting the feature. So each check that forbids the
 * jump is paired with one that requires the offer.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const raw = readFileSync(join(ROOT, 'src/components/rsvp/RSVPPage.jsx'), 'utf8');
const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export async function runRsvpPollsAreOffered() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  console.log('\n  The polls wait to be asked for:\n');

  // THE ABSENCE: no code path sets the step to polls except a guest pressing
  // for them. Two of the three setStep('polls') calls were automatic.
  const autoJumps = [...code.matchAll(/setStep\((?:activePolls[^)]*\?\s*)?'polls'/g)].length;
  const onClickJump = /onClick=\{\(\) => setStep\('polls'\)\}/.test(code);
  check('nothing sends a guest to the polls on its own',
    autoJumps === (onClickJump ? 1 : 0),
    `${autoJumps} setStep('polls') call(s); ${onClickJump ? 'one is the button' : 'no button found'}`);

  check('  the submit lands on the confirmation', /setStep\('done'\);/.test(code) && !/setStep\(activePolls\.length > 0 \? 'polls' : 'done'\)/.test(code),
    "setStep('done') after a reply is saved");
  check('  and so does a returning guest', !/setStep\(hasUnvotedPolls \? 'polls' : 'done'\)/.test(code),
    'arriving with a reply on file shows the reply');

  // THE PRESENCE: the offer, so the absence above is not just a deletion.
  check('the confirmation offers the polls', /data-open-polls/.test(code) && onClickJump,
    'a button on the done screen');
  check('  only when there is something to answer',
    /\{\(hasUnvotedPolls \|\| activePolls\.length > 0\) && \(/.test(code),
    'no empty invitation to answer nothing');
  check('  and the polls step still exists to open',
    /if \(step === 'polls'\) \{/.test(code), 'the screen is there, it is just not forced');

  // The guest was still told their reply landed — the thing the jump buried.
  check('the confirmation still says the reply landed',
    /We can't wait to celebrate with you|Thank you for letting us know/.test(raw),
    'the heading a guest came for');

  return results;
}

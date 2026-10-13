/**
 * tests/persistence/publish-state-one-answer.mjs
 *
 * EIGHT PLACES ASKED "IS IT LIVE?" AND THREE ANSWERED WRONGLY.
 *
 * Owner ruling 2026-10-12: live means `websiteEnabled && slug`, the three that
 * tested the flag alone were bugs, and the answer is a state rather than a
 * boolean so every surface can say the same three things.
 *
 * ── WHAT THE BUG LOOKED LIKE TO A COUPLE ──────────────────────────────────
 *
 * A wedding with `websiteEnabled: true` and no `slug` has no reachable URL:
 * `/w/undefined` is not a site. The builder's right panel said "Website is
 * Live", the studio hub badged it "Live", and the setup journey marked the step
 * complete. Three surfaces telling someone their site was published when no
 * guest could open it, and a fourth word, "Draft", for the same state the other
 * five called something else.
 *
 * ── WHY THE CHECKS ARE PER SITE ───────────────────────────────────────────
 *
 * The module is pure and tested directly below. The six callers are React, so
 * they are asserted by source: each must take its answer from this module and
 * must not retype the condition. That is the part that regresses, because
 * retyping it is easier than importing it, which is how there came to be six.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import {
  publishState, isLive, publishLabel, publishSentence, PUBLISH_STATE, PUBLISH_LABEL, PUBLISH_SENTENCE,
} from '../../src/lib/publishState.js';

const read = (p) => stripComments(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));

/** The six, and the symbol each one must be taking its answer from. */
const SITES = [
  ['src/components/studio/guest-suite/StudioShareTab.jsx', /publishSentence\(details\)/, 'publishSentence'],
  ['src/components/website-builder/PublishModal.jsx', /publishSentence\(details\)/, 'publishSentence'],
  ['src/components/universe-studio/UniverseWorldView.jsx', /isLive\(weddingDetails\)/, 'isLive'],
  ['src/components/website-builder/WBRightPanel.jsx', /publishSentence\(details\)/, 'publishSentence'],
  ['src/pages/StudioHub.jsx', /publishLabel\(wedding\)/, 'publishLabel'],
  ['src/lib/journeySteps.js', /isComplete: \(wedding\) => isLive\(wedding\)/, 'isLive'],
  // THE EIGHTH, found while repairing the guards: StudioWebsite.jsx had a
  // CORRECT inline copy, which the first scan missed. It is aliased on import
  // so its local boolean keeps its name.
  ['src/pages/StudioWebsite.jsx', /const isLive = isLiveSite\(details\)/, 'isLiveSite'],
  // THE NINTH, 2026-10-13. The send gate had two correct hand-rolled branches,
  // which is why the first sweep passed over it: it was not wrong, it was
  // separate. Being separate is what let the server disagree with it.
  ['src/components/guests/SendInvitesModal.jsx', /const sendability = publishState\(wedding\)/, 'publishState'],
];

export async function runPublishStateOneAnswer() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE RULE ────────────────────────────────────────────────────────────
  ok('a slug and the flag is live',
     publishState({ slug: 'priya-and-dev', websiteEnabled: true }) === 'live', 'live');
  ok('  a slug without the flag is hidden',
     publishState({ slug: 'priya-and-dev', websiteEnabled: false }) === 'hidden', 'hidden');
  ok('  the flag WITHOUT a slug is no_address, never live',
     publishState({ websiteEnabled: true }) === 'no_address', 'no_address');
  ok('  and neither is no_address',
     publishState({}) === 'no_address' && publishState(null) === 'no_address'
       && publishState(undefined) === 'no_address', 'no_address');

  // ADDRESS FIRST: a wedding with no slug is not "hidden", because the toggle's
  // position is not the useful fact about it.
  ok('  address is asked before the flag, so no slug never reads as hidden',
     publishState({ websiteEnabled: false }) === 'no_address', 'no_address');

  ok('isLive is true for exactly one of the three states',
     isLive({ slug: 's', websiteEnabled: true }) === true
       && isLive({ slug: 's', websiteEnabled: false }) === false
       && isLive({ websiteEnabled: true }) === false, 'one of three');

  // A TRUTHY FLAG IS NOT THE FLAG. websiteEnabled arrives from an entity and
  // 'false' or 1 would otherwise decide a couple's site was published.
  ok('  and only a real true counts, not any truthy value',
     isLive({ slug: 's', websiteEnabled: 'true' }) === false
       && isLive({ slug: 's', websiteEnabled: 1 }) === false, 'strict true');

  // ── ONE VOCABULARY ──────────────────────────────────────────────────────
  ok('the three labels are the ruled words',
     PUBLISH_LABEL.no_address === 'No address yet'
       && PUBLISH_LABEL.hidden === 'Hidden'
       && PUBLISH_LABEL.live === 'Live', 'No address yet / Hidden / Live');
  ok('  "Draft" is not one of them any more',
     !Object.values(PUBLISH_LABEL).includes('Draft'), 'gone');
  ok('  the sentence form names the Guest Suite, never the Website',
     PUBLISH_SENTENCE.live === 'Guest Suite is live'
       && PUBLISH_SENTENCE.hidden === 'Guest Suite is hidden'
       && PUBLISH_SENTENCE.no_address === 'No address yet'
       && !Object.values(PUBLISH_SENTENCE).some(v => /Website/i.test(v)),
     'Guest Suite');
  ok('  and the helpers agree with the tables',
     publishLabel({ slug: 's', websiteEnabled: true }) === 'Live'
       && publishSentence({ slug: 's' }) === 'Guest Suite is hidden', 'agree');
  ok('  every state has a label and a sentence',
     Object.values(PUBLISH_STATE).every(s => PUBLISH_LABEL[s] && PUBLISH_SENTENCE[s]), '3 of 3');

  // ── ALL SIX TAKE THEIR ANSWER FROM THE MODULE ───────────────────────────
  for (const [file, pattern, symbol] of SITES) {
    const src = read(file);
    const short = file.split('/').pop();
    ok(`${short} takes its answer from publishState.js`,
       pattern.test(src) && /publishState/.test(src), symbol);
    // AND DOES NOT RETYPE THE CONDITION. This is the regression that matters:
    // a seventh copy arrives by someone typing it rather than importing it.
    ok(`  ${short} does not retype the condition`,
       !/websiteEnabled\s*&&\s*[\w?.]*slug/.test(src)
         && !/websiteEnabled\s*\?\s*'Live'/.test(src)
         && !/!!\s*wedding\?\.websiteEnabled/.test(src),
       'no hand-rolled copy');
  }

  // ── THE SEND GATE KEEPS BOTH MESSAGES ──────────────────────────────────
  //
  // Collapsing them to one would lose the distinction the couple needs: an
  // address is claimed in one place and publishing happens in another, so
  // "not published yet" sends someone to the wrong screen when the real answer
  // is that they have no address at all.
  const modal = read('src/components/guests/SendInvitesModal.jsx');
  ok('the send gate still answers no-address and not-published separately',
     /PUBLISH_STATE\.NO_ADDRESS/.test(modal) && /Claim your website address first/.test(modal)
       && /not published yet/.test(modal), 'two messages');
  ok('  and it refuses anything that is not live, not merely hidden',
     /sendability !== PUBLISH_STATE\.LIVE/.test(modal), 'not-live, not not-hidden');

  // ── AND THE SERVER IS LEFT ALONE, DELIBERATELY ──────────────────────────
  //
  // Each server reader found the row BY its slug, so a slug check there would
  // ask whether the thing it just looked up exists. Owner ruling the same day.
  // api/send-invites.js IS NOT IN THIS LIST, and now asks the module instead.
  // It was in it, on the strength of a claim that it found its row by slug. It
  // does not: it is scoped to created_by_id, so nothing there had established
  // that an address exists, and it let a slugless wedding through while the
  // modal refused it. Asserted below as a module user.
  for (const server of ['api/guest-page.js', 'api/wedding-by-slug.js', 'api/wedding-poll-results.js']) {
    const src = read(server);
    ok(`  ${server.split('/').pop()} still tests the flag on its own`,
       /websiteEnabled !== true/.test(src) && !/publishState/.test(src), 'unchanged');
  }

  // ── THE SEND ENDPOINT REFUSES BOTH WAYS OF NOT BEING LIVE ──────────────
  const send = read('api/send-invites.js');
  ok('api/send-invites.js asks publishState.js',
     /const sendability = publishState\(wedding\)/.test(send), 'publishState');
  ok('  and refuses a slugless send, which it used to allow',
     /sendability === PUBLISH_STATE\.NO_ADDRESS/.test(send) && /website_no_address/.test(send),
     '409 website_no_address');
  ok('  as well as an unpublished one, keeping its original reason code',
     /sendability !== PUBLISH_STATE\.LIVE/.test(send) && /website_unpublished/.test(send),
     '409 website_unpublished');
  ok('  both before anything is rendered or sent',
     send.indexOf('website_no_address') < send.indexOf('renderInvitationEmail({')
       && send.indexOf('website_unpublished') < send.indexOf('renderInvitationEmail({'),
     'refusals precede the render');
  ok('  and it still does not re-read the flag with the admin key',
     !/adminList\('WeddingDetails'|entities\/WeddingDetails/.test(send.split('const sendability')[1]?.slice(0, 400) || ''),
     'body-based layer, unchanged');

  return results;
}

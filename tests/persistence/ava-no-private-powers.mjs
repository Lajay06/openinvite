/**
 * tests/persistence/ava-no-private-powers.mjs
 *
 * THE THREE THINGS THE OWNER REPORTED, EACH PINNED BY A CHECK THAT CAN FAIL.
 *
 * From real use: Ava (a) repeats herself, (b) ignores the page she was opened
 * from, (c) offers to do things she cannot do. All three were reproduced on a
 * running build with the model stubbed and the prompt recorded — and all three
 * turned out to be properties of the REQUEST, not of the model:
 *
 *   · two consecutive modal turns produced byte-identical 3004-character
 *     prompts, because no conversation was sent at all
 *   · neither contained "/budget" while the modal was open on Budget
 *   · the pod's prompt contained no "ACTION:{" anywhere in 2775 characters —
 *     it had no action mirror, no parser and no confirm card, so every offer
 *     it made was unbacked by construction
 *
 * A prompt is not observable from a screenshot, which is why the defects
 * survived. These checks read the assembled prompt directly.
 *
 * EACH SECTION CARRIES ITS OWN PLANTED FAILURE (R19). The plant is not a
 * comment saying what would happen — it is a degraded input fed to the same
 * assertion, with the assertion required to reject it. A guard that has only
 * ever seen the passing case has not been tested.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTION_MIRROR, buildAvaPrompt, historyBlock, pageBlock, mirrorInstructions, unwrapLlmReply } from '../../src/lib/avaRequest.js';
import { filterUnbackedOffers, isOffer, resolveOffer } from '../../src/lib/avaOfferFilter.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'src');
const read = (p) => readFileSync(join(SRC, p), 'utf8');

/**
 * Source with comments removed. Fourth time in this suite that a check has had
 * to be taught the difference between code and the comment explaining it — the
 * sample-content guard learned it three times. A guard that fails on the
 * sentence recording why something is gone forbids writing that sentence down.
 */
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Sentence overlap between two answers, 0..1. The repetition measure. */
export function sentenceOverlap(a, b) {
  const norm = (t) => String(t).toLowerCase().replace(/\s+/g, ' ').trim();
  const sents = (t) => norm(t).split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => s.length > 12);
  const A = sents(a);
  const B = new Set(sents(b));
  if (!A.length) return 0;
  return A.filter((s) => B.has(s)).length / A.length;
}

/** The repetition threshold. Above this, the second answer is the first again. */
const OVERLAP_MAX = 0.5;

export async function runAvaNoPrivatePowers() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Ava has no private powers — and knows the page, and knows what she said:\n');

  // ── (c) UNBACKED OFFERS ─────────────────────────────────────────────────
  //
  // The owner's exact example. One sentence is backed by create_guest and one
  // is backed by nothing at all.
  const REPLY = 'I can see nine guests without an email address. Want me to add your cousin to the guest list? I can also set up a reminder for you.';
  {
    const full = filterUnbackedOffers(REPLY, ACTION_MIRROR);
    check('an offer the mirror backs survives',
      full.text.includes('Want me to add your cousin'), full.kept.join(' | ') || 'nothing kept');
    check('  an offer the mirror does NOT back is removed',
      !full.text.includes('set up a reminder'), full.removed.join(' | ') || 'nothing removed');
    check('  and it is replaced with nothing, not with an apology',
      !/cannot|can't|sorry|unable/i.test(full.text) && full.text.endsWith('?'),
      JSON.stringify(full.text.slice(-40)));
    check('  perception is not proposal — "I can see" survives',
      full.text.startsWith('I can see nine guests'), 'reported, not offered');

    // PLANT: a mirror with no add-guest action. The same sentence must now go.
    const noGuest = ACTION_MIRROR.filter((a) => a.type !== 'create_guest');
    const planted = filterUnbackedOffers(REPLY, noGuest);
    check('PLANT: with no add-guest action in the mirror, the offer is removed',
      !/add your cousin/i.test(planted.text) && planted.kept.length === 0,
      `removed ${planted.removed.length}: ${planted.removed.join(' | ')}`);
    check('  and the reporting sentence still stands',
      planted.text.trim() === 'I can see nine guests without an email address.', planted.text);

    // The empty mirror is the pod's real value, so it gets its own case.
    const none = filterUnbackedOffers(REPLY, []);
    check('  a frame with no powers at all makes no offers',
      none.removed.length === 2 && none.kept.length === 0, `${none.removed.length} removed`);
    check('  and its prompt says so in the first line',
      mirrorInstructions([]).startsWith('YOU CAN PERFORM NO ACTIONS'),
      mirrorInstructions([]).split('\n')[0]);
  }

  // EVERY MIRROR ACTION RESOLVES TO A REAL EXECUTOR. The mirror is a promise
  // list; this is what makes it a true one. Read off AvaModal's own maps.
  {
    // THE EXECUTOR MOVED, so this assertion moves with it. It used to read
    // AvaModal, where every write lived inside confirmAction's closure. Ruling
    // 11's port took them to src/lib/avaExecute.js so the pod could share ONE
    // code path rather than a copy — the contract is the same and its address
    // is not.
    const exec = readFileSync(join(SRC, 'lib/avaExecute.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const missing = ACTION_MIRROR.filter((a) => !new RegExp(`['"]?${a.type}['"]?\\s*[:=]|===\\s*'${a.type}'`).test(exec));
    check(`every one of the ${ACTION_MIRROR.length} mirror actions has an executor`,
      missing.length === 0, missing.map((a) => a.type).join(', ') || ACTION_MIRROR.map((a) => a.type).join(', '));
    const orphan = [...exec.matchAll(/^\s{4}(create_\w+|update_\w+):\s*\(\)/gm)].map((m) => m[1]);
    const notInMirror = orphan.filter((t) => !ACTION_MIRROR.some((a) => a.type === t));
    check('  and no executor exists that the mirror does not declare',
      notInMirror.length === 0, notInMirror.join(', ') || `${orphan.length} executors, all declared`);
  }

  // ── (a) REPETITION ──────────────────────────────────────────────────────
  {
    const first = { role: 'user', content: 'Is this enough?' };
    const answer = { role: 'ava', content: 'Your plan is 42,000 and you have committed 31,500.' };
    const second = { role: 'user', content: 'Is this enough?' };

    const p1 = buildAvaPrompt({ page: '/budget', messages: [first], userText: first.content });
    const p2 = buildAvaPrompt({ page: '/budget', messages: [first, answer, second], userText: second.content });

    check('two turns of the same question do NOT produce the same prompt',
      p1 !== p2, `${p1.length} chars then ${p2.length} chars`);
    check("  the second prompt carries Ava's own previous answer",
      p2.includes('Your plan is 42,000'), 'prior answer present');
    check('  and instructs her not to restate it',
      /Do not[\s\S]{0,40}restate/i.test(p2), 'the do-not-restate line is present');

    // The measure the owner asked for, exercised on both the failing and the
    // passing case so the threshold means something.
    check(`sentence overlap: an answer repeated verbatim scores above ${OVERLAP_MAX}`,
      sentenceOverlap(answer.content, answer.content) > OVERLAP_MAX,
      `${sentenceOverlap(answer.content, answer.content).toFixed(2)}`);
    check('  a genuinely different answer scores below it',
      sentenceOverlap(answer.content, 'The florist quote is still outstanding.') <= OVERLAP_MAX,
      `${sentenceOverlap(answer.content, 'The florist quote is still outstanding.').toFixed(2)}`);

    // PLANT: the old assembly, which sent no history at all. Both turns must
    // come out identical, and the check above must reject that.
    const noHistory = (userText) => ['CONTEXT', 'VOICE', `User: ${userText}`].join('\n\n');
    check('PLANT: an assembly that sends no history produces identical prompts',
      noHistory('Is this enough?') === noHistory('Is this enough?')
        && historyBlock([]) === '',
      'the pre-fix shape, reproduced and rejected');
  }

  // ── (b) PAGE CONTEXT ────────────────────────────────────────────────────
  {
    const p = buildAvaPrompt({ page: '/budget', messages: [], userText: 'Is this enough?' });
    check('the route is declared in the prompt', p.includes('PAGE: /budget'), 'PAGE: /budget');
    check('  and it is the first thing after the wedding context, not buried mid-paragraph',
      p.indexOf('PAGE: /budget') < p.indexOf('Couple: Is this enough?'), 'declared before the question');
    check('  with an instruction about what to do with it',
      /question with no stated[\s\S]{0,30}subject is about this page/i.test(p), 'the referent rule is stated');
    check('  a frame with no route adds no page block at all',
      pageBlock('') === '' && !buildAvaPrompt({ userText: 'x' }).includes('PAGE:'), 'absent, not empty-labelled');

    // PLANT: the pre-fix pod line, which carried the route as prose.
    const buried = 'You are Ava. The user is currently on the /budget page of their Openinvite dashboard. Use the wedding context below.';
    check('PLANT: the route buried in a voice line is not a declared page block',
      !/^PAGE: /m.test(buried), 'the old shape, and it does not satisfy the check above');
  }

  // ── ONE BRAIN, TWO FRAMES ───────────────────────────────────────────────
  {
    const modal = code('components/layout/AvaModal.jsx');
    const pod = code('components/layout/AvaChatPod.jsx');
    for (const [name, src] of [['AvaModal', modal], ['AvaChatPod', pod]]) {
      check(`${name} assembles its prompt through the shared builder`,
        /buildAvaPrompt\(/.test(src), 'buildAvaPrompt');
      check(`  ${name} filters unbacked offers before rendering`,
        /filterUnbackedOffers\(/.test(src), 'filterUnbackedOffers');
      check(`  ${name} unwraps the reply rather than stringifying the envelope`,
        /unwrapLlmReply\(/.test(src) && !/JSON\.stringify\(res\)/.test(src), 'unwrapLlmReply');
    }
    check('neither frame hand-rolls its own action list any more',
      !/ACTION:\{"type"/.test(modal) || /ACTION_MIRROR/.test(modal),
      'the mirror is generated from ACTION_MIRROR');
    check('the envelope unwrap handles both shapes and neither silently',
      unwrapLlmReply('plain') === 'plain'
        && unwrapLlmReply({ result: 'wrapped' }) === 'wrapped'
        && unwrapLlmReply({ nonsense: 1 }, 'FB') === 'FB',
      'string, {result}, and a fallback');
  }

  // ── THE OFFER DETECTOR ITSELF ───────────────────────────────────────────
  {
    const OFFERS = ['Want me to add her?', 'Shall I book that?', 'I could add a line for flowers.', 'Let me update that vendor.'];
    const NOT = ['You have nine guests without an email.', 'The venue is The Old Cellar.', 'I can see four vendors booked.'];
    check('every offer form is detected',
      OFFERS.every(isOffer), `${OFFERS.filter(isOffer).length}/${OFFERS.length}`);
    check('  and no statement of fact is mistaken for one',
      NOT.every((s) => !isOffer(s)), NOT.filter(isOffer).join(' | ') || `${NOT.length} statements untouched`);
    check('  an offer resolves to the action that backs it',
      resolveOffer('Want me to add your cousin to the guest list?')?.type === 'create_guest',
      resolveOffer('Want me to add your cousin to the guest list?')?.type || 'none');
    check('  and an invented power resolves to nothing',
      resolveOffer('Want me to email the caterer for you?') === null
        && resolveOffer('Shall I call the venue?') === null,
      'no mirror action claims them');
  }

  return results;
}

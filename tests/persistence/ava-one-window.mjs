/**
 * tests/persistence/ava-one-window.mjs
 *
 * THREE AVA WINDOWS, AND A BUTTON THAT DID NOTHING.
 *
 * Owner's live test found three different Ava surfaces: the pod, a blue
 * "Ask Ava — wedding favours" dialog, and a pink "Seating arrangement
 * specialist" modal. Spec 3.2-3.3: one Ava, one entry point per page, the pod
 * knowing the page it was opened from.
 *
 * AND FOUR DEAD BUTTONS. AvaButton dispatched `new CustomEvent('openAva')` for
 * any caller that gave it no onClick, and NOTHING HAS EVER LISTENED FOR IT.
 * Account, Event details, Polls and Q&A all used that path; all four did
 * nothing at all when pressed. The owner reported the Event details one — the
 * other three were the same bug, unreported. A CustomEvent with no listener
 * fails silently: nothing throws, nothing logs, and the only symptom is a
 * person pressing a button and being ignored.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterActionsToMirror } from '../../src/lib/avaExecute.js';
import { ACTION_MIRROR, pageBlock } from '../../src/lib/avaRequest.js';
import { AVA_OPEN_EVENT } from '../../src/lib/avaOpen.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

export async function runAvaOneWindow() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  One Ava — the entry points, the page context, and the pod that remembers:\n');

  // ── THE DEAD EVENT NOW HAS A LISTENER ───────────────────────────────────
  {
    const button = code('src/components/shared/AvaButton.jsx');
    const layout = code('src/Layout.jsx');
    check('AvaButton opens Ava through the shared helper, not a bare CustomEvent',
      /openAva\(\{ seedQuestion, pageContext \}\)/.test(button) && !/new CustomEvent\('openAva'\)/.test(button),
      'openAva({ seedQuestion, pageContext })');
    check('  and the Layout LISTENS for it — the half that never existed',
      /addEventListener\(AVA_OPEN_EVENT/.test(layout) && /setChatOpen\(true\)/.test(layout),
      `addEventListener('${AVA_OPEN_EVENT}')`);
    check('  the listener is removed on unmount', /removeEventListener\(AVA_OPEN_EVENT/.test(layout), 'cleaned up');
    check('  and the event carries the page it was fired from',
      /page: window\.location\.pathname/.test(code('src/lib/avaOpen.js')),
      'read at dispatch time, so no caller can forget it');
  }

  // ── THE FOUR BUTTONS THAT DID NOTHING ───────────────────────────────────
  {
    const WAS_DEAD = ['src/pages/Account.jsx', 'src/pages/EventDetails.jsx', 'src/pages/Polls.jsx', 'src/pages/QandA.jsx'];
    const bare = WAS_DEAD.filter(p => /<AvaButton\s+label="[^"]*"\s*\/>/.test(code(p)));
    check('none of the four dead buttons is bare any more',
      bare.length === 0, bare.join(', ') || `${WAS_DEAD.length} of ${WAS_DEAD.length} carry a seed and a page context`);
    const seeded = WAS_DEAD.filter(p => /seedQuestion="/.test(code(p)) && /pageContext="/.test(code(p)));
    check('  each seeds a question and says what its page is for',
      seeded.length === WAS_DEAD.length, `${seeded.length} of ${WAS_DEAD.length}`);
  }

  // ── THE TWO RETIRED SURFACES ────────────────────────────────────────────
  {
    const favours = code('src/pages/WeddingFavours.jsx');
    const seating = code('src/pages/Seating.jsx');
    check('the blue "Ask Ava — wedding favours" dialog is gone',
      !/Ask Ava — wedding favours/.test(favours) && !/<DialogContent[^>]*wedding favours/.test(favours),
      'no bespoke dialog left');
    check('  and its own InvokeLLM call with it — it sent no wedding context at all',
      !/InvokeLLM/.test(favours), 'the fourth Ava knew the least about the couple');
    check('  the page opens the pod instead, with its question seeded',
      /<AvaButton/.test(favours) && /seedQuestion="Suggest wedding favour ideas/.test(favours), 'AvaButton');
    check('the "seating arrangement specialist" modal is gone',
      !/seating arrangement specialist/i.test(seating) && !/<AvaModal/.test(seating), 'no second window');
    check('  and its prompt became the pod\'s page context, not a lost sentence',
      /pageContext="arranges their tables/.test(seating), 'the context moved; the window did not survive');
  }

  // ── ONE ENTRY POINT PER PAGE (spec 3.3) ─────────────────────────────────
  {
    const pages = readdirSync(join(ROOT, 'src/pages')).filter(f => f.endsWith('.jsx'));
    const offenders = [];
    for (const f of pages) {
      const src = code(`src/pages/${f}`);
      const buttons = (src.match(/<AvaButton/g) || []).length;
      if (buttons > 1) offenders.push(`${f}: ${buttons} Ava buttons`);
    }
    check('no page carries more than one Ava entry point',
      offenders.length === 0, offenders.join(' | ') || `${pages.length} pages checked`);
  }

  // ── THE PAGE CONTEXT REACHES THE PROMPT ─────────────────────────────────
  {
    const withCtx = pageBlock('/seating', 'arranges their tables and seats their guests.');
    check('the page block carries the page AND what the page is for',
      /^PAGE: \/seating/m.test(withCtx) && /This page is where the couple arranges their tables/.test(withCtx),
      'both lines present');
    check('  and a page with no context still declares the route',
      pageBlock('/polls') === pageBlock('/polls', ''), 'context is optional, the route is not');
  }

  // ── NAVIGATE TO WHERE YOU ALREADY ARE ───────────────────────────────────
  {
    const nav = [{ type: 'navigate', data: { path: '/polls' } }];
    check('PLANT: a "go to page" card for the page already open is never rendered',
      filterActionsToMirror(nav, ACTION_MIRROR, '/polls').length === 0, 'dropped before it is a card');
    check('  a trailing slash and case do not defeat it',
      filterActionsToMirror([{ type: 'navigate', data: { path: '/Polls/' } }], ACTION_MIRROR, '/polls').length === 0,
      'normalised');
    check('  but a card to a DIFFERENT page still works',
      filterActionsToMirror(nav, ACTION_MIRROR, '/budget').length === 1, 'kept');
    check('  and the executor refuses it too, because a card outlives its route',
      /You are already on that page/.test(code('src/lib/avaExecute.js')), 'guarded twice');
  }

  // ── HISTORY LIVES IN THE LAYOUT (spec 3.4), TRANSCRIPT ONLY (ruling 8) ──
  {
    const layout = code('src/Layout.jsx');
    const pod = code('src/components/layout/AvaChatPod.jsx');
    check('the conversation is Layout state, so closing the pod does not erase it',
      /const \[avaMessages, setAvaMessages\]/.test(layout) && /messages=\{avaMessages\}/.test(layout),
      'lifted out of the component that unmounts on close');
    check('  dismissed proposals are kept beside it, so a No survives a reopen',
      /const \[avaDismissed, setAvaDismissed\]/.test(layout), 'avaDismissed');
    check('  one plain Clear, with no confirmation ceremony',
      /onClear=\{\(\) => \{ setAvaMessages\(\[\]\); setAvaDismissed\(new Set\(\)\); \} \}/.test(layout.replace(/\s+/g, ' '))
        || /onClear/.test(layout), 'Clear wipes both');
    check('  the pod no longer owns the transcript',
      !/const \[messages, setMessages\] = useState/.test(pod), 'passed in');
    check('NO CROSS-DAY MEMORY (ruling 8): the transcript is in memory, not stored',
      !/localStorage\.setItem\('ava|sessionStorage\.setItem\('ava/.test(layout) && !/localStorage/.test(pod),
      'gone on reload, and it holds no facts about the wedding');
  }

  return results;
}

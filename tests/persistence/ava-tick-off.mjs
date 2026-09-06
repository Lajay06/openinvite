/**
 * tests/persistence/ava-tick-off.mjs
 *
 * TICKING SOMETHING OFF THE TO-DO LIST ACTUALLY TICKS IT OFF.
 *
 * The owner confirmed a mark-done card and got "Could not do that". It was not
 * a model failure and not an intermittent one: EVERY tick-off had always
 * failed, and the four words were the same four words for every kind of
 * failure the assistant can have.
 *
 * THE CHAIN, each link reproduced against the real executor:
 *
 *   1. avaRequest.js asked the model for `update_todo needs id`.
 *   2. avaContextFormat.js sends the to-do list as title, due date and
 *      priority. No id. Nothing has ever given the model one.
 *   3. So the id was invented, `Note.update(<invented>, …)` 404'd, and the
 *      executor THREW rather than returning {ok:false}.
 *   4. Both frames caught that with a bare `catch {}` — no toast at all.
 *   5. AvaActionCard printed its fixed STATUS_TEXT.error, discarding the
 *      sentence the executor had gone to the trouble of writing.
 *
 * Every one of those five is checked below, because fixing any four of them
 * still leaves a couple who cannot tick anything off.
 */
import { pass, fail } from './_shared.mjs';
import { executeAvaAction } from '../../src/lib/avaExecute.js';
import { matchTodoByTitle, normalizeTitle } from '../../src/lib/todoMatch.js';
import { ACTION_FIELD_RULES } from '../../src/lib/avaRequest.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Line comments first — a stray "/*" inside a "//" line otherwise opens a
// block comment that runs to the next "*/" and swallows the file.
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

const FRESH = () => [
  { id: 'a1', title: 'Order the invitations',    completed: false },
  { id: 'a2', title: 'Book the florist',         completed: false },
  { id: 'a3', title: 'Book the florist deposit', completed: false },
  { id: 'a4', title: 'Send thank-you cards',     completed: true  },
];

/** Runs one tick-off against a fresh list, with Base44's real 404 behavior. */
async function tick(data) {
  const todos = FRESH();
  const wrote = [];
  const deps = {
    listTodos: async () => todos,
    entities: { Note: { update: async (id, patch) => {
      const row = todos.find((t) => t.id === id);
      if (!row) throw new Error('HTTP 404: Object not found');
      wrote.push({ id, patch }); Object.assign(row, patch); return row;
    } } },
  };
  try {
    const out = await executeAvaAction({ type: 'update_todo', data }, deps);
    return { ...out, wrote, todos };
  } catch (err) {
    return { ok: false, threw: err.message, error: null, wrote, todos };
  }
}

export async function runAvaTickOff() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Ticking something off the to-do list ticks it off:\n');

  // ── THE OWNER'S CASE ────────────────────────────────────────────────────
  {
    const r = await tick({ title: 'order invitations', completed: true });
    check('PLANT: "order invitations" ticks off "Order the invitations"',
      r.ok === true && r.wrote.length === 1 && r.wrote[0].id === 'a1',
      r.ok ? 'wrote a1' : (r.error || r.threw));
    check('  and marks the status too, not just the checkbox',
      r.wrote[0]?.patch?.completed === true && r.wrote[0]?.patch?.status === 'Done',
      'a row with completed:true and status:"In progress" sits in the wrong column forever');
    check('  and does NOT rename it to the words that found it',
      r.todos.find((t) => t.id === 'a1').title === 'Order the invitations',
      'the couple\'s phrasing is how the row was found, not what it is called');
  }

  // ── AN INVENTED ID IS SURVIVABLE, WHICH IS THE WHOLE POINT ──────────────
  {
    const r = await tick({ id: 'todo_1', title: 'order invitations', completed: true });
    check('PLANT: an id the model invented no longer fails the action',
      r.ok === true && r.wrote[0]?.id === 'a1', r.ok ? 'fell through to the title' : (r.error || r.threw));
    const real = await tick({ id: 'a2', completed: true });
    check('  and a real id is still used first, with no title needed',
      real.ok === true && real.wrote[0]?.id === 'a2', real.ok ? 'wrote a2' : (real.error || real.threw));
  }

  // ── FAILURE SAYS WHAT HAPPENED ──────────────────────────────────────────
  {
    const missing = await tick({ title: 'buy a horse', completed: true });
    check('PLANT: a to-do that does not exist is named, not shrugged at',
      missing.ok === false && missing.error === 'I could not find a to-do called "buy a horse".',
      missing.error || missing.threw);
    check('  and nothing was written',
      missing.wrote.length === 0, 'a refusal that half-wrote would be worse than the bug');

    const nameless = await tick({ completed: true });
    check('an action with no title at all says so',
      nameless.ok === false && /could not tell which to-do/.test(nameless.error || ''),
      nameless.error || nameless.threw);
  }

  // ── AMBIGUITY REFUSES RATHER THAN GUESSES ───────────────────────────────
  {
    const r = await tick({ title: 'florist', completed: true });
    check('PLANT: two to-dos that both fit refuses and names both',
      r.ok === false && /more than one/.test(r.error || '')
        && /Book the florist"/.test(r.error || '') && /Book the florist deposit"/.test(r.error || ''),
      r.error || r.threw);
    check('  and writes nothing', r.wrote.length === 0,
      'ticking off the wrong one is a silent error found weeks later');
    const exact = await tick({ title: 'book the florist', completed: true });
    check('  but an exact title still wins over the longer one',
      exact.ok === true && exact.wrote[0]?.id === 'a2', exact.ok ? 'wrote a2' : (exact.error || exact.threw));
  }

  // ── AN ALREADY-DONE TO-DO IS NOT A CANDIDATE ────────────────────────────
  {
    const r = await tick({ title: 'thank you cards', completed: true });
    check('a to-do already ticked off is not offered again',
      r.ok === false && /could not find/.test(r.error || ''), r.error || r.threw);
  }

  // ── THE MATCHER ITSELF ──────────────────────────────────────────────────
  {
    check('the matcher drops case, punctuation and the small words',
      normalizeTitle('ORDER, the Invitations!') === normalizeTitle('order invitations'),
      `both normalize to "${normalizeTitle('order invitations')}"`);
    check('  and an empty request matches nothing rather than everything',
      matchTodoByTitle(FRESH(), '').todo === null && matchTodoByTitle(FRESH(), '   ').todo === null,
      'no match');
  }

  // ── THE FOUR OTHER LINKS IN THE CHAIN ───────────────────────────────────
  check('the prompt asks for the title, not an id nothing sends',
    /needs title/.test(ACTION_FIELD_RULES.update_todo) && !/needs id/.test(ACTION_FIELD_RULES.update_todo),
    ACTION_FIELD_RULES.update_todo.slice(0, 60) + '…');

  {
    const card = code('src/components/layout/AvaActionCard.jsx');
    check('the card prints the executor\'s sentence when there is one',
      /action\.status === 'error' && action\.error \? action\.error/.test(card)
        && /\{statusText\(action\)\}/.test(card),
      '"Could not do that" is the fallback, not the message');
    check('  and the card names the to-do it is about',
      /Tick \$\{data\.title \? `"\$\{data\.title\}"` : 'that'\} off/.test(card),
      'so the couple can see it picked the right one before confirming');
  }

  for (const f of ['src/components/layout/AvaChatPod.jsx', 'src/components/layout/AvaModal.jsx']) {
    const src = code(f);
    // SCOPED TO THE CONFIRM PATH, not the file. Both frames also have a bare
    // `catch {}` around sendMessage, and that one is fine — it puts a sentence
    // in the transcript. Forbidding the shape everywhere would have made this
    // guard demand a change to code that is already correct.
    const confirm = src.slice(src.indexOf('executeAvaAction(action'));
    const body = confirm.slice(0, confirm.indexOf('const cancelAction'));
    check(`${f.split('/').pop()} does not swallow a thrown failure`,
      /catch \(err\)/.test(body) && /status: 'error', error: message/.test(body)
        && !/\}\s*catch\s*\{/.test(body),
      'a 404 from the backend is the kind only a throw carries');
    check(`  and passes the to-do reader through`,
      /listTodos: \(\) => getMyRecords\('Note'\)/.test(src), 'scoped to this couple, not every couple');
  }

  return results;
}

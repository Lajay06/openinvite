/**
 * tests/persistence/ava-pod-actions.mjs
 *
 * RULING 11'S PORT: the pod gets the confirm card, and one executor serves
 * both frames.
 *
 * The spec recorded the empty pod mirror as correct "until the confirm card is
 * ported to it". This is that port, and these are the properties it must not
 * lose on the way.
 *
 * ONE EXECUTOR. The writes lived inside AvaModal's own confirmAction closure,
 * so giving the pod the same powers by copying would have made two code paths
 * that write to the couple's database and drift apart — "one brain, two
 * frames" one layer below the prompt.
 *
 * THE PLANT THAT FOUND A REAL HOLE. Offering "add my cousin Priya to the guest
 * list" in the pod produced a CONFIRM CARD, even though create_guest is not in
 * the pod's mirror. The mirror constrained the prompt, and it constrained the
 * offer SENTENCES (avaOfferFilter.js) — and nothing constrained the parsed
 * ACTION BLOCKS. A model that emitted one anyway got a card, and a card is a
 * button that writes. filterActionsToMirror is that hole closed, and it is why
 * a plant is run rather than described.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeAvaAction, filterActionsToMirror, ACTION_ENTITY, POD_EXCLUDED_TYPES } from '../../src/lib/avaExecute.js';
import { ACTION_MIRROR, mirrorInstructions } from '../../src/lib/avaRequest.js';
import { parseActions } from '../../src/lib/avaActions.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const POD_MIRROR = ACTION_MIRROR.filter(a => !POD_EXCLUDED_TYPES.includes(a.type));

/** Recording writers, so the whole path runs with no client and no network. */
function recorder() {
  const writes = [];
  const rec = (label) => (...args) => { writes.push([label, ...args]); return Promise.resolve({ id: 'row-1' }); };
  return {
    writes,
    deps: {
      entities: {
        Note:     { create: rec('Note.create'),     update: rec('Note.update') },
        Budget:   { create: rec('Budget.create') },
        Vendor:   { create: rec('Vendor.create'),   update: rec('Vendor.update') },
        Schedule: { create: rec('Schedule.create') },
      },
      createGuest: rec('createGuest'),
      updateGuest: rec('updateGuest'),
      navigate: rec('navigate'),
    },
  };
}

export async function runAvaPodActions() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The pod has the confirm card, and both frames share one executor:\n');

  // ── THE MIRROR ──────────────────────────────────────────────────────────
  check('the pod mirror is a SUBSET of ACTION_MIRROR, never a second list',
    POD_MIRROR.every(a => ACTION_MIRROR.includes(a)), `${POD_MIRROR.length} of ${ACTION_MIRROR.length}`);
  check('  guest-list edits are out of it',
    !POD_MIRROR.some(a => a.type.endsWith('_guest')), POD_MIRROR.map(a => a.type).join(', '));
  check('  and the modal still has them',
    ACTION_MIRROR.some(a => a.type === 'create_guest'), 'the modal is opened from the guest page');
  check('every mirror action has an executor',
    ACTION_MIRROR.every(a => a.type in ACTION_ENTITY),
    ACTION_MIRROR.filter(a => !(a.type in ACTION_ENTITY)).map(a => a.type).join(', ') || `${ACTION_MIRROR.length} of ${ACTION_MIRROR.length}`);
  check('the pod is never TOLD about an action it cannot do',
    !/create_guest/.test(mirrorInstructions(POD_MIRROR)) && /create_guest/.test(mirrorInstructions(ACTION_MIRROR)),
    'field rules are emitted per mirror entry, not as one block');

  // ── EVERY POD ACTION, THROUGH THE REAL EXECUTOR ─────────────────────────
  {
    const { writes, deps } = recorder();
    const CASES = [
      ['create_todo',        { title: 'Confirm florist final count', due_date: '2027-05-01', priority: 'high' }, 'Note.create'],
      ['update_todo',        { id: 'row-1', completed: true },                                                   'Note.update'],
      ['create_budget_item', { category: 'flowers', item_name: 'Ceremony arch', budgeted_amount: 1800 },          'Budget.create'],
      ['create_vendor',      { name: 'Fleur & Stem', category: 'flowers', status: 'quoted' },                     'Vendor.create'],
      ['create_schedule',    { event_name: 'Rehearsal dinner', event_date: '2027-06-11', start_time: '19:00' },   'Schedule.create'],
    ];
    for (const [type, data, expected] of CASES) {
      const r = await executeAvaAction({ type, data }, deps);
      const last = writes[writes.length - 1];
      check(`${type} validates and writes through ${expected}`,
        r.ok && last?.[0] === expected, r.ok ? last?.[0] : r.error);
    }
    // The two fields TodoList.jsx itself writes, forced rather than trusted.
    const created = writes.find(w => w[0] === 'Note.create')?.[1];
    check('  a to-do is written with view_type todo, or the to-do page cannot see it',
      created?.view_type === 'todo', `view_type=${created?.view_type}`);
    const ticked = writes.find(w => w[0] === 'Note.update')?.[2];
    check('  ticking one off sets BOTH completed and status, or it sits in the wrong column',
      ticked?.completed === true && ticked?.status === 'Done', JSON.stringify(ticked));
  }

  // ── THE VALIDATION GATE IS UNMOVED ──────────────────────────────────────
  {
    const { writes, deps } = recorder();
    const bad = await executeAvaAction({ type: 'create_budget_item', data: { category: 'flowers' } }, deps);
    check('a write missing a required field REFUSES rather than writing defaults',
      !bad.ok && /needs/.test(bad.error) && writes.length === 0, bad.error);
    const enumBad = await executeAvaAction({ type: 'create_vendor', data: { name: 'X', category: 'not-a-category' } }, deps);
    check('  and an out-of-enum value refuses too, because Base44 would store it',
      !enumBad.ok && writes.length === 0, enumBad.error);
    const unknown = await executeAvaAction({ type: 'summon_a_pony', data: {} }, deps);
    check('  an action with no executor is refused by name',
      !unknown.ok && /summon_a_pony/.test(unknown.error), unknown.error);
  }

  // ── PLANT 1: A GUEST EDIT PRODUCES NO CARD ──────────────────────────────
  {
    const reply = 'I can add her.\nACTION:{"type":"create_guest","data":{"name":"Priya","rsvp_status":"pending"}}';
    const { actions } = parseActions(reply);
    check('PLANT: the model CAN still emit a guest action — the parser sees it',
      actions.length === 1 && actions[0].type === 'create_guest', 'parsed');
    check('  but the pod mirror drops it before it can become a card',
      filterActionsToMirror(actions, POD_MIRROR).length === 0, '0 cards');
    check('  while the modal, which is opened from the guest page, keeps it',
      filterActionsToMirror(actions, ACTION_MIRROR).length === 1, '1 card');
    check('  and the pod renders cards only from the filtered list',
      /filterActionsToMirror\(actions, POD_MIRROR, /.test(code('src/components/layout/AvaChatPod.jsx')),
      'filterActionsToMirror(actions, POD_MIRROR, location.pathname)');
  }

  // ── PLANT 2: A DISMISSED PROPOSAL IS NOT RE-OFFERED ─────────────────────
  {
    const pod = code('src/components/layout/AvaChatPod.jsx');
    check('PLANT: a cancelled action is remembered by what it WOULD DO, not by its id',
      /const actionKey = \(a\) => `\$\{a\.type\}:\$\{JSON\.stringify\(a\.data \|\| \{\}\)\}`/.test(pod),
      'type + data — a re-offer arrives with a fresh id every time');
    check('  cancelling records it', /setDismissed\(prev => new Set\(prev\)\.add\(actionKey\(action\)\)\)/.test(pod), 'recorded on cancel');
    check('  and a later identical proposal is filtered out before rendering',
      /backed\.filter\(a => !dismissed\.has\(actionKey\(a\)\)\)/.test(pod), 'dropped, not re-offered');
  }

  // ── ONE CODE PATH ───────────────────────────────────────────────────────
  {
    const modal = code('src/components/layout/AvaModal.jsx');
    const pod = code('src/components/layout/AvaChatPod.jsx');
    for (const [name, src] of [['AvaModal', modal], ['AvaChatPod', pod]]) {
      check(`${name} writes through the shared executor`, /executeAvaAction\(/.test(src), 'executeAvaAction');
      check(`  ${name} renders the shared card`, /<AvaActionCard/.test(src), 'AvaActionCard');
    }
    check('neither frame still carries its own entity map',
      !/base44\.entities\.Budget\.create/.test(modal) && !/base44\.entities\.Budget\.create/.test(pod),
      'the writers live in avaExecute.js alone');
    check('the card is one component with a tone, not two components',
      /tone="dark"/.test(pod) && /tone="light"/.test(modal), 'dark in the pod, light in the modal');
  }

  return results;
}

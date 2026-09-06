/**
 * src/lib/avaExecute.js
 *
 * ONE EXECUTOR FOR BOTH FRAMES. The confirm card's other half.
 *
 * Ruling 11 says the pod's empty mirror stands "until the confirm card is
 * ported to it". Porting the card is the visible half; this is the half that
 * matters. The executor lived inside AvaModal's own `confirmAction` closure
 * (AvaModal.jsx:157-200), so giving the pod the same powers by copying it
 * would have produced two code paths that write to the couple's database and
 * drift apart — which is precisely the shape "one brain, two frames" exists to
 * prevent, one layer below the prompt.
 *
 * WHAT DOES NOT CHANGE HERE. The validation gate is unmoved:
 * `validateAvaAction` runs before every write, and a failure REFUSES rather
 * than writing a row of defaults (RULE 6d). Base44 answers 200 for a write of
 * undeclared fields and silently discards them, so the toast would otherwise
 * report success over a dropped write — that is the whole reason
 * avaActionValidation.js exists and none of it is relaxed to make the pod work.
 *
 * NESTED WRITES ARE STILL OUT. `validateAvaAction` checks TOP-LEVEL fields
 * only and says so at its own site. A budget PLAN allocation lives at
 * WeddingDetails.budget.categories.<key> — three levels deep, and the encrypted
 * column at that. So "budget allocation" here is the itemised Budget record the
 * Budget page's expense list already reads, and a plan write waits for the
 * validator to grow rather than slipping past it.
 */
import { validateAvaAction } from './avaActionValidation.js';

/**
 * THE MIRROR THE POD GETS.
 *
 * Guest-list edits are deliberately absent. A guest is a person with an email
 * address, an RSVP and a seat, and adding one from a chat window — where the
 * couple confirms a one-line card rather than filling the guest form — creates
 * a half-record that then has to be found and completed. The modal keeps
 * create_guest/update_guest because it is opened FROM the guest page with that
 * page's context; the pod is opened from anywhere.
 *
 * Expressed as a list of types rather than a second mirror, so it can only
 * ever be a subset of ACTION_MIRROR and cannot invent a power of its own.
 */
export const POD_EXCLUDED_TYPES = ['create_guest', 'update_guest'];

/** The entity each action writes to; null for actions that write nothing. */
export const ACTION_ENTITY = {
  create_guest: 'Guest',
  update_guest: 'Guest',
  create_budget_item: 'Budget',
  create_vendor: 'Vendor',
  update_vendor: 'Vendor',
  create_schedule: 'Schedule',
  create_todo: 'Note',
  update_todo: 'Note',
  navigate: null,
};

/**
 * DROP ANY PROPOSAL THE FRAME'S MIRROR DOES NOT BACK.
 *
 * THE PLANT THAT FOUND THIS. Offering "add my cousin Priya to the guest list"
 * in the pod produced a confirm card, even though create_guest is not in the
 * pod's mirror. The mirror constrained the PROMPT and it constrained the
 * OFFER SENTENCES (avaOfferFilter.js) — and nothing constrained the parsed
 * ACTION blocks. A model that emits one anyway got a card, and a card is a
 * button that writes.
 *
 * That is "Ava has no private powers" one level below where it was enforced:
 * the prompt is a request, the offer filter guards the prose, and this guards
 * the thing that actually writes.
 */
export function filterActionsToMirror(actions, mirror, currentPath) {
  const allowed = new Set((mirror || []).map(a => a.type));
  const here = String(currentPath || '').replace(/\/+$/, '').toLowerCase();
  return (actions || []).filter((a) => {
    if (!allowed.has(a?.type)) return false;
    // A "go to page" card for the page already open is dropped before it is
    // rendered, not refused after it is pressed. The executor refuses it too,
    // because a card can outlive the route it was proposed on.
    if (a.type === 'navigate' && here) {
      const target = String(a.data?.path || '').replace(/\/+$/, '').toLowerCase();
      if (target && target === here) return false;
    }
    return true;
  });
}

/** Actions that update an existing row rather than creating one. */
const IS_UPDATE = (type) => type.startsWith('update_');

/**
 * Validate and execute one confirmed action.
 *
 * @param {{type: string, data: object}} action
 * @param {object} deps  the writers, injected — so a test can run the whole
 *                       path without a Base44 client and without a network.
 * @returns {Promise<{ok: boolean, error: string|null, entity: string|null}>}
 */
export async function executeAvaAction(action, deps) {
  const type = action?.type;
  if (!type || !(type in ACTION_ENTITY)) {
    return { ok: false, error: `Ava tried an action I don't recognize (${type}).`, entity: null };
  }

  if (type === 'navigate') {
    // A CARD THAT OFFERS TO TAKE YOU WHERE YOU ALREADY ARE.
    //
    // Owner report: the Polls page's button opened the pod and offered a "Go
    // to page" card for the page already open. Confirming it navigated from
    // /polls to /polls — a control that does nothing, which is worse than an
    // absent one because the couple presses it and learns the assistant is not
    // paying attention.
    const target = String(action.data?.path || '').replace(/\/+$/, '').toLowerCase();
    const here = String(deps.currentPath || '').replace(/\/+$/, '').toLowerCase();
    if (target && here && target === here) {
      return { ok: false, error: 'You are already on that page.', entity: null, suppressed: true };
    }
    deps.navigate?.(action.data?.path);
    return { ok: true, error: null, entity: null };
  }

  const entity = ACTION_ENTITY[type];
  const { ok, cleaned, error } = validateAvaAction(entity, action.data, { isUpdate: IS_UPDATE(type) });
  if (!ok) return { ok: false, error, entity };

  const writers = {
    create_guest:       () => deps.createGuest(cleaned),
    update_guest:       () => deps.updateGuest(action.data.id, cleaned),
    create_budget_item: () => deps.entities.Budget.create(cleaned),
    create_vendor:      () => deps.entities.Vendor.create(cleaned),
    update_vendor:      () => deps.entities.Vendor.update(action.data.id, cleaned),
    create_schedule:    () => deps.entities.Schedule.create(cleaned),
    // A to-do is a Note with view_type 'todo' — TodoList.jsx:159 filters on
    // exactly that, so a Note written without it is invisible on the page it
    // was created for. Forced here rather than trusted to the model.
    create_todo:        () => deps.entities.Note.create({ ...cleaned, view_type: 'todo', status: cleaned.status || 'Ideas' }),
    // Marking done is two fields, not one: TodoList.jsx:218 writes both, and a
    // row with completed:true but status:'In progress' sits in the wrong column
    // forever.
    update_todo:        () => deps.entities.Note.update(action.data.id, cleaned.completed
      ? { ...cleaned, status: 'Done' }
      : cleaned),
  };

  await writers[type]();
  return { ok: true, error: null, entity };
}

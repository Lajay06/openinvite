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
import { validateAvaAction, validateNestedWrite } from './avaActionValidation.js';
import { matchTodoByTitle } from './todoMatch.js';

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
  // The PLAN, not an expense line: WeddingDetails.budget.categories.<key>.
  set_budget_allocation: 'WeddingDetails',
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
 * THE ROW AN UPDATE IS ABOUT MUST EXIST BEFORE ANYTHING IS WRITTEN.
 *
 * update_vendor and update_guest carried the same defect the to-do tick-off
 * did: the prompt asked for an id (avaRequest.js) and the context sent names
 * without one (avaContextFormat.js), so the id was invented and the write
 * 404'd — surfacing as a thrown error the frames swallowed and a card reading
 * "Could not do that". The context now carries `[id …]` on every vendor and
 * every guest, and this checks the model actually used one.
 *
 * A MISS IS NAMED, NOT SHRUGGED AT, and it names what the couple asked for
 * rather than the id, because "I could not find a vendor called Fleur & Stem"
 * is a sentence they can act on and a hex string is not.
 */
async function resolveExistingRow(list, id, { noun, asked }) {
  const rows = (await list?.()) || [];
  const row = id ? rows.find((r) => r.id === id) : null;
  if (row) return { row, error: null };
  const label = asked ? `"${asked}"` : null;
  return {
    row: null,
    error: label
      ? `I could not find a ${noun} called ${label}.`
      : `I could not tell which ${noun} you meant.`,
  };
}

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

  // THE ONE NESTED WRITE, and it does not go through the top-level checker
  // because the top-level checker cannot see it. `budget` IS a declared field,
  // so an object with a misspelled category inside passes every check there and
  // is stored intact — nothing refuses it and nothing reads it, and the couple
  // gets a success toast over a Budget page that did not change.
  if (type === 'set_budget_allocation') {
    const category = String(action.data?.category || '').toLowerCase().trim();
    // The model emits "3500", "$3,500" and 3500 interchangeably. Coerced BEFORE
    // the rule runs, so the rule stays strict about what may be stored: a value
    // that is not a number after this is not a number at all.
    //
    // ONLY IF THERE IS A DIGIT IN IT. Stripping non-numerics from "lots" leaves
    // "", and Number("") is 0 — so the friendly coercion turned a word into a
    // ZERO ALLOCATION and wrote it. Caught by its own guard before this shipped;
    // a strings-to-numbers convenience that silently invents a number is worse
    // than no convenience.
    const raw = action.data?.amount;
    const amount = typeof raw === 'string' && /[0-9]/.test(raw)
      ? Number(raw.replace(/[^0-9.-]/g, ''))
      : raw;
    const v = validateNestedWrite('WeddingDetails.budget.categories', category, amount);
    if (!v.ok) return { ok: false, error: v.error, entity: 'WeddingDetails' };

    // READ, MERGE, WRITE. The plan is one encrypted column holding all thirteen
    // keys; writing only the changed one would erase the other twelve.
    const wd = await deps.readWeddingDetails?.();
    if (!wd) return { ok: false, error: 'I could not read your budget plan.', entity: 'WeddingDetails' };
    const plan = wd.budget || {};
    await deps.putWeddingFields({
      budget: { total: plan.total ?? null, categories: { ...(plan.categories || {}), [category]: amount } },
    });
    return { ok: true, error: null, entity: 'WeddingDetails' };
  }

  const entity = ACTION_ENTITY[type];
  const { ok, cleaned, error } = validateAvaAction(entity, action.data, { isUpdate: IS_UPDATE(type) });
  if (!ok) return { ok: false, error, entity };

  if (type === 'update_vendor' || type === 'update_guest') {
    const isVendor = type === 'update_vendor';
    const { error: missing } = await resolveExistingRow(
      isVendor ? deps.listVendors : deps.listGuests,
      action.data?.id,
      { noun: isVendor ? 'vendor' : 'guest', asked: action.data?.name },
    );
    if (missing) return { ok: false, error: missing, entity };
    // The name is how the row was FOUND when one was given, not what it is
    // renamed to — the same rule the tick-off follows for titles.
    if (action.data?.id) delete cleaned.name;
  }

  // WHICH TO-DO. The model has never been able to answer this: the prompt asked
  // for an id (avaRequest.js) and the context sends titles only
  // (avaContextFormat.js), so every id in a tick-off action was invented and
  // every tick-off 404'd. Resolved here, against the couple's own list, before
  // anything is written — and a failure names the to-do rather than shrugging.
  let todoId = action.data?.id;
  if (type === 'update_todo') {
    const asked = action.data?.title || '';
    const todos = (await deps.listTodos?.()) || [];
    const byId = todoId ? todos.find((t) => t.id === todoId) : null;
    if (!byId) {
      const { todo, ambiguous } = matchTodoByTitle(todos, asked);
      if (ambiguous.length) {
        return { ok: false, entity, error:
          `There is more than one to-do like "${asked}" — ${ambiguous.map((t) => `"${t.title}"`).join(' and ')}. Which one?` };
      }
      if (!todo) {
        return { ok: false, entity, error: asked
          ? `I could not find a to-do called "${asked}".`
          : 'I could not tell which to-do you meant.' };
      }
      todoId = todo.id;
    }
    // The couple's phrasing is how the row was FOUND, never what it is renamed
    // to: resolving "order invitations" must not rewrite "Order the
    // invitations" into the words that happened to find it.
    delete cleaned.title;
  }

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
    update_todo:        () => deps.entities.Note.update(todoId, cleaned.completed
      ? { ...cleaned, status: 'Done' }
      : cleaned),
  };

  await writers[type]();
  return { ok: true, error: null, entity };
}

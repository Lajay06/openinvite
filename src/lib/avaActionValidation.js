/**
 * src/lib/avaActionValidation.js
 *
 * Validates Ava's LLM-generated action payloads against the schema before any
 * create/update reaches Base44.
 *
 * WHY THIS EXISTS
 * ---------------
 * AvaModal's confirmAction() passed `action.data` — raw model output — straight
 * into base44.entities.*.create/update. Base44 answers 200 for a write of
 * undeclared fields and silently discards them, so Ava reported success while
 * the data evaporated. Two of the six action types were broken by construction
 * (the prompt's own examples taught field names that do not exist), and a third
 * taught an out-of-enum value.
 *
 * That is gotcha #11's lesson in a new costume: model output is never trusted
 * into a write path unchecked. And it is RULE 6d — a write that cannot succeed
 * must fail loudly, never behind a success toast.
 *
 * THE THREE CHECKS
 * ----------------
 *   1. UNKNOWN FIELDS  -> stripped, logged. A model that invents `total_amount`
 *      should not silently lose the number, but neither should one stray key
 *      block an otherwise good write. Stripping + logging is the middle path,
 *      and the log is what makes a prompt regression findable.
 *   2. MISSING REQUIRED -> the action FAILS. This is the case that produced a
 *      row of nothing but defaults. Better a visible error than a schedule item
 *      with no name, no date and no time.
 *   3. OUT-OF-ENUM     -> the action FAILS. Base44 does NOT enforce enums
 *      (gotcha #20) — it stores whatever it is given. So `rsvp_status:
 *      "confirmed"` persists happily and then matches no filter anywhere,
 *      making the guest invisible to every RSVP tally. Storing a poisoned value
 *      is worse than dropping it, so this one refuses rather than strips.
 *
 * THE NESTED CASE, which the scope limit above said would come. It said: "If
 * an action ever writes a nested object, this must grow with it." It has.
 *
 * `set_budget_allocation` writes WeddingDetails.budget.categories.<key> — three
 * levels down, and the encrypted column at that. The top-level check cannot see
 * that far: `budget` is a declared field, so an object with a misspelled
 * category key inside it passes every check here and is stored intact. Nothing
 * refuses it and nothing reads it, so the couple sets an allocation, sees a
 * success toast, and finds the Budget page unchanged.
 *
 * SO NESTED WRITES ARE ALLOWED ONLY DOWN A DECLARED PATH, and the declaration
 * carries the leaf rule with it. Not "nested writes are now checked" — one
 * path, named, with the values it accepts written next to it. Adding a second
 * nested action means adding a second entry and its rule, deliberately, rather
 * than a general nested-object walker that would let the next action through
 * on the strength of this one's review.
 */
// Relative, not the '@/' alias: this module is imported directly by
// tests/persistence/ava-action-validation.mjs under plain Node, which does not
// resolve Vite aliases. Vite handles a relative path identically.
import { ENTITY_FIELDS } from './entityFields.generated.js';
import { BUDGET_CATEGORY_KEYS } from './budgetCategories.js';

/**
 * EVERY NESTED PATH AVA MAY WRITE, and what a value at its leaf must be.
 *
 * `key` names the one variable segment; `keyIn` is the set it must belong to
 * — the SAME list the Budget page renders its inputs from, so a category the
 * form does not offer cannot be set from a chat window either (R30: validate
 * against the consumer, not against a schema that would accept anything).
 * `leaf` returns null for an acceptable value or the sentence explaining the
 * refusal.
 */
export const NESTED_WRITE_PATHS = {
  'WeddingDetails.budget.categories': {
    key: 'category',
    keyIn: BUDGET_CATEGORY_KEYS,
    leaf: (v) => {
      if (typeof v !== 'number' || !Number.isFinite(v)) return 'must be a number';
      if (v < 0) return 'cannot be negative';
      if (!Number.isInteger(v)) return 'must be a whole amount, with no cents';
      return null;
    },
  },
};

/**
 * Check one nested write before it is merged into the record.
 *
 * @param {string} path   the full dotted path, e.g. 'WeddingDetails.budget.categories'
 * @param {string} key    the leaf key, e.g. 'flowers'
 * @param {*}      value  the value to store there
 * @returns {{ok: boolean, error: string|null}}
 */
export function validateNestedWrite(path, key, value) {
  const rule = NESTED_WRITE_PATHS[path];
  // FAIL CLOSED on an undeclared path. This is the whole point of a list: a
  // nested write nobody reviewed does not get through because the mechanism
  // that carries the reviewed one exists.
  if (!rule) return { ok: false, error: `Ava may not write to ${path}.` };
  if (!key || !rule.keyIn.includes(key)) {
    return { ok: false, error: `"${key}" is not one of your budget categories.` };
  }
  const bad = rule.leaf(value);
  if (bad) return { ok: false, error: `An allocation ${bad}.` };
  return { ok: true, error: null };
}

/** Fields Base44 manages itself — never writable, never worth logging as a strip. */
const SERVER_MANAGED = new Set(['id', 'created_date', 'updated_date', 'created_by_id', 'created_by']);

/**
 * @param {string} entity      Entity name as declared in the mirror, e.g. 'Budget'.
 * @param {object} data        The model's payload.
 * @param {object} [opts]
 * @param {boolean} [opts.isUpdate]  Updates are partial, so required fields are
 *                                   not re-checked — only creates must be whole.
 * @returns {{ok: boolean, cleaned: object, stripped: string[], missingRequired: string[], badEnum: Array<{field: string, value: *, allowed: string[]}>, error: string|null}}
 */
export function validateAvaAction(entity, data, opts = {}) {
  const schema = ENTITY_FIELDS[entity];
  const stripped = [];
  const badEnum = [];

  // An unknown entity means the action map and the mirror have diverged. Fail
  // closed: writing to an entity we cannot describe is the whole problem.
  if (!schema) {
    return {
      ok: false, cleaned: {}, stripped, missingRequired: [], badEnum,
      error: `Unknown entity "${entity}" — not in the schema mirror.`,
    };
  }

  const declared = new Set(schema.fields);
  const cleaned = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (SERVER_MANAGED.has(k)) continue;
    if (!declared.has(k)) { stripped.push(k); continue; }
    const allowed = schema.enums[k];
    if (allowed && v != null && !allowed.includes(v)) {
      badEnum.push({ field: k, value: v, allowed });
      continue;
    }
    cleaned[k] = v;
  }

  // Only creates need to be whole. On an update the row already exists.
  const missingRequired = opts.isUpdate
    ? []
    : schema.required.filter((f) => cleaned[f] === undefined || cleaned[f] === '');

  if (stripped.length) {
    console.warn(
      `[ava] ${entity}: dropped ${stripped.length} field(s) not in the schema — ${stripped.join(', ')}. ` +
      `Ava's prompt may be teaching stale field names.`
    );
  }

  let error = null;
  if (badEnum.length) {
    const b = badEnum[0];
    error = `${entity}.${b.field} cannot be "${b.value}" — allowed: ${b.allowed.join(', ')}.`;
  } else if (missingRequired.length) {
    error = `${entity} needs ${missingRequired.join(', ')} — Ava did not provide ${missingRequired.length > 1 ? 'them' : 'it'}.`;
  }

  return { ok: !error, cleaned, stripped, missingRequired, badEnum, error };
}

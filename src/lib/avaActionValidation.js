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
 * SCOPE LIMIT, deliberately: top-level fields only. Every Ava action writes a
 * flat object (see ACTION_INSTRUCTIONS), so there is no nested case to check
 * today. If an action ever writes a nested object, this must grow with it —
 * WeddingDetails.assetContent is declared three levels deep and a wrong leaf key
 * is dropped exactly as silently.
 */
// Relative, not the '@/' alias: this module is imported directly by
// tests/persistence/ava-action-validation.mjs under plain Node, which does not
// resolve Vite aliases. Vite handles a relative path identically.
import { ENTITY_FIELDS } from './entityFields.generated.js';

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

/**
 * scripts/generate-entity-fields.mjs
 *
 * Emits src/lib/entityFields.generated.js from the RULE 12 schema mirror
 * (base44/entities/*.jsonc).
 *
 * WHY A GENERATED FILE
 * --------------------
 * Ava's action validator runs in the browser and needs to know which fields
 * each entity declares. The mirror is .jsonc — comments and all — which Vite
 * cannot import, and shipping 48 full schemas to the client would be wasteful
 * when the validator only needs three things per entity: the field names, the
 * required list, and the enums.
 *
 * The alternative was hand-maintaining a second copy of the field lists, which
 * is exactly the drift that let Note.status rot undetected (#483). A generated
 * file plus a CI sync test means the mirror stays the single source: change the
 * mirror without regenerating and CI fails.
 *
 * Run: npm run generate:entity-fields
 * Checked by: tests/persistence/entity-fields-sync.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const MIRROR = resolve(ROOT, 'base44/entities');
const OUT = resolve(ROOT, 'src/lib/entityFields.generated.js');

/** Strip // line comments — the mirror is JSONC, not JSON. */
function parseJsonc(text) {
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''));
}

export function buildMap() {
  const map = {};
  for (const file of readdirSync(MIRROR).filter((f) => f.endsWith('.jsonc')).sort()) {
    const entity = file.replace(/\.jsonc$/, '');
    const schema = parseJsonc(readFileSync(resolve(MIRROR, file), 'utf8'));
    const props = schema.properties || {};
    const enums = {};
    for (const [name, def] of Object.entries(props)) {
      if (Array.isArray(def?.enum)) enums[name] = def.enum;
    }
    map[entity] = {
      fields: Object.keys(props).sort(),
      required: Array.isArray(schema.required) ? [...schema.required].sort() : [],
      enums,
    };
  }
  return map;
}

export function render(map) {
  return `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Source: base44/entities/*.jsonc (the RULE 12 schema mirror).
 * Regenerate: npm run generate:entity-fields
 * Enforced by: tests/persistence/entity-fields-sync.mjs
 *
 * Only what the Ava action validator needs: declared top-level field names,
 * the required list, and enums. Nested sub-keys are deliberately NOT included
 * — see src/lib/avaActionValidation.js for why that limit is safe here.
 */
/* eslint-disable */
export const ENTITY_FIELDS = ${JSON.stringify(map, null, 2)};
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = render(buildMap());
  writeFileSync(OUT, out);
  const n = Object.keys(buildMap()).length;
  console.log(`generated src/lib/entityFields.generated.js — ${n} entities`);
}

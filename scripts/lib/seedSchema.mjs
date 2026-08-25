/**
 * seedSchema — validate the render harness's seed against the REAL Base44
 * entity schemas in base44/entities/*.jsonc.
 *
 * WHY THIS EXISTS. Five times, the seed named a field the product does not
 * read, or shaped one differently from the entity:
 *
 *   1. note.body        — the product reads note.text
 *   2. homeContent.blocks — absent entirely, so every block pass measured nothing
 *   3. faq              — WeddingFAQPage reads qna
 *   4. my-wedding-details stubbed as { details: record } — the endpoint
 *      returns the record, so EVERY dashboard pass read an object with no
 *      wedding fields on it
 *   5. no custom event at all, so the per-event invite flow had no state
 *
 * Every one was found by accident, downstream, after something else broke.
 * None of them failed anything at the time. A seed field the product never
 * reads is not a harmless extra: it renders the empty state, and the pass
 * reports it as clean. THAT IS A MEASUREMENT OF NOTHING PRESENTED AS A PASS.
 *
 * So this fails LOUDLY AT STARTUP rather than silently at measurement.
 *
 * WHAT IT CANNOT CATCH, stated so nobody trusts it further than it goes:
 * a field that exists in the schema and is spelled correctly but that the
 * PAGE UNDER TEST does not read (faq/qna is exactly this — `faq` is a real
 * WeddingDetails field). Schema conformance proves the shape is storable, not
 * that the surface consumes it. That gap is what assertRendersContent covers.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '../../base44/entities');

/** Parse a .jsonc — comments stripped, strings preserved. */
function parseJsonc(text) {
  let out = '', inStr = false, esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue; }
    out += c;
  }
  return JSON.parse(out);
}

export function loadEntitySchemas() {
  const schemas = {};
  for (const f of readdirSync(DIR)) {
    if (!f.endsWith('.jsonc')) continue;
    schemas[f.replace('.jsonc', '')] = parseJsonc(readFileSync(join(DIR, f), 'utf8'));
  }
  return schemas;
}

const HARNESS_ONLY = new Set(['id', 'created_date', 'updated_date', 'created_by', 'created_by_id']);

/**
 * Walk a seeded record against a schema node, collecting problems.
 * Only reports fields the schema DEFINES and the seed contradicts, plus seed
 * keys the schema does not know at all — the case that produced all five bugs.
 */
function walk(value, schema, path, out) {
  if (!schema || typeof schema !== 'object') return;
  const t = schema.type;

  if (t === 'object' && schema.properties && value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of Object.keys(value)) {
      if (HARNESS_ONLY.has(k)) continue;
      if (!schema.properties[k]) {
        // additionalProperties:true means the entity genuinely accepts extras.
        if (schema.additionalProperties === true) continue;
        out.push({ path: `${path}.${k}`, problem: 'not a field on this entity', got: typeof value[k] });
        continue;
      }
      walk(value[k], schema.properties[k], `${path}.${k}`, out);
    }
    return;
  }
  if (t === 'array' && Array.isArray(value)) {
    value.forEach((v, i) => walk(v, schema.items, `${path}[${i}]`, out));
    return;
  }
  if (value == null) return;
  const actual = Array.isArray(value) ? 'array' : typeof value;
  if (t === 'array' && actual !== 'array') out.push({ path, problem: 'should be an array', got: actual });
  else if (t === 'object' && actual !== 'object') out.push({ path, problem: 'should be an object', got: actual });
  else if ((t === 'string' || t === 'number' || t === 'boolean') && actual !== t)
    out.push({ path, problem: `should be a ${t}`, got: actual });
  if (schema.enum && !schema.enum.includes(value))
    out.push({ path, problem: `not in enum [${schema.enum.slice(0, 6).join(', ')}]`, got: JSON.stringify(value) });
}

/** Validate one entity's seeded rows. Returns a list of problems. */
export function validateEntity(name, rows, schemas) {
  const schema = schemas[name];
  if (!schema) return [{ path: name, problem: 'no such entity schema in base44/entities', got: '' }];
  const out = [];
  (Array.isArray(rows) ? rows : [rows]).forEach((row, i) =>
    walk(row, schema, `${name}[${i}]`, out));
  return out;
}

/**
 * SCHEMA DRIFT REGISTER — fields the PRODUCT demonstrably reads that
 * base44/entities/*.jsonc does not declare.
 *
 * These are NOT seed bugs. Each is read by real product code, so either the
 * repo's .jsonc has fallen behind the live Base44 schema, or the field is
 * being silently dropped on write (BASE44_PLATFORM_NOTES: unknown fields are
 * silently dropped). Those two have very different consequences and only a
 * live schema read can tell them apart — which is the advisor's call, not the
 * harness's.
 *
 * They are listed rather than ignored so the count is visible every run. The
 * usage figures are the evidence for each being real; if one ever drops to
 * zero it belongs in the seed's bin, not here.
 */
// RESOLVED AGAINST THE LIVE SCHEMA. Five entries came off this list once the
// advisor read Base44 directly, and none were drift:
//   · venueName / the time siblings are DECLARED, but NESTED —
//     mainCeremony.venueName, mainCeremony.startTime/endTime. The repo .jsonc
//     is stale, not the schema.
//   · locked / passwordProtected are DERIVED by api/wedding-by-slug from the
//     stored websitePasswordEnabled + websitePassword. 35 files read `locked`
//     off an API RESPONSE, not off an entity. Declaring them would mirror a
//     derived fact into storage — the exact drift the schema warns about.
//   · customGifts / registryProducts are likewise BUILT by wedding-by-slug
//     (line 134) from the RegistryProduct and CustomGift entities.
//   · faq and ourStory were SEED INVENTIONS. Nothing reads them: the readers
//     already use qna, ourStoryContent and registryContent. Verified there is
//     no WRITE path to any of the four, so no couple's work was ever dropped.
// The lesson kept: a field the product 'reads' may be reading an API response,
// not a stored column. Count usages against the SOURCE, not the name.
export const SCHEMA_DRIFT = {
  'WeddingDetails.locked':            'read by 35 product files',
  'WeddingDetails.passwordProtected': 'read by 5',
  'WeddingDetails.mainCeremony.time': 'sibling of startTime, read by the RSVP + celebration paths',
  'WeddingDetails.reception.time':    'sibling of startTime, read by the RSVP + celebration paths',
};

const driftKey = (path) => path.replace(/^(\w+)\[\d+\]/, '$1');

/**
 * Fail LOUDLY AT STARTUP on any seed field the entity schema does not know,
 * excluding the drift register. Returns the drift actually hit, so a caller
 * can print it rather than let it pass unseen.
 */
/**
 * Fields api/wedding-by-slug ADDS to its response that are not stored columns.
 * PUBLISHED_WEDDING models that RESPONSE, not an entity row, so validating it
 * against the entity schema is a category error for these four.
 *
 * `locked` and `passwordProtected` are computed from websitePasswordEnabled +
 * websitePassword; `customGifts` and `registryProducts` are built at line 134
 * from the CustomGift and RegistryProduct entities. Declaring any of them as
 * storage would mirror a derived fact — the drift the schema warns about.
 */
export const API_DERIVED_ON_WEDDING_RESPONSE = new Set([
  'locked', 'passwordProtected', 'customGifts', 'registryProducts',
]);

export function assertSeedMatchesSchemas(seed, extra = {}) {
  const schemas = loadEntitySchemas();
  const problems = [], drift = [];
  const check = (name, rows) => {
    for (const p of validateEntity(name, rows, schemas)) {
      (SCHEMA_DRIFT[driftKey(p.path)] ? drift : problems).push(p);
    }
  };
  for (const [name, rows] of Object.entries(seed)) check(name, rows);
  // `extra` is the API-response fixture. Strip the derived fields before
  // checking the rest of its shape against the entity.
  for (const [name, rows] of Object.entries(extra)) {
    const stripped = (Array.isArray(rows) ? rows : [rows]).map(r => {
      const c = { ...r };
      for (const k of API_DERIVED_ON_WEDDING_RESPONSE) delete c[k];
      return c;
    });
    check(name, stripped);
  }

  if (problems.length) {
    const lines = problems.map(p => `    ${p.path}: ${p.problem}${p.got ? ` (got ${p.got})` : ''}`);
    throw new Error(
      `\n  SEED DOES NOT MATCH base44/entities/*.jsonc — ${problems.length} problem(s):\n` +
      lines.join('\n') +
      '\n\n  A seed field the product never reads is not a harmless extra: the surface\n' +
      '  renders its EMPTY STATE and the pass reports it as clean. Fix the seed, or\n' +
      '  add the field to SCHEMA_DRIFT with the evidence that the product reads it.\n');
  }
  return drift;
}

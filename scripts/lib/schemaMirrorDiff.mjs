/**
 * scripts/lib/schemaMirrorDiff.mjs
 *
 * DOES base44/entities/ STILL SAY WHAT BASE44 SAYS? The pure half of the
 * drift check: no network, no credential, no file system beyond the mirror,
 * so the comparison itself can be exercised with fixtures in CI while the
 * live read stays an on-demand thing the owner runs.
 *
 * ── WHY A DRIFT CHECK EXISTS AT ALL ───────────────────────────────────────
 *
 * Base44 is the source of truth for schemas (owner ruling, 2026-10-13) and
 * base44/entities/*.jsonc is a mirror of it. A mirror with no comparison is a
 * second source of truth that nobody has checked, and this one is load
 * bearing in two places that fail quietly:
 *
 *   1. scripts/lib/base44Read.mjs decides whether an admin-key read is
 *      allowed by reading the MIRROR's rls.read. The admin key against an
 *      owner-scoped entity returns 200 and an EMPTY ARRAY, no error. So if
 *      live has tightened a read rule and the mirror still says
 *      "read": null, every check of the form "nothing leaked" or "no rows
 *      match" starts passing for the wrong reason. That is why rls drift is
 *      the highest severity here and is reported first.
 *
 *   2. scripts/lib/schemaDropScan.mjs derives its SCHEMAS from the same
 *      mirror, and Base44 SILENTLY DROPS unknown fields on write. A field
 *      that exists in the mirror but not live reads as registered, so the
 *      drop scan calls a write safe when the data is going nowhere.
 *
 * Three times in one session the mirror was reported as Base44's live state
 * when it was not, which is what produced standing rule 3: every description
 * edit is read from Base44 live, never from the repo mirror. A rule is a
 * sentence in a document. This is the instrument.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────
 *
 * It never writes, to either side. There is a PUT /entity-schemas that would
 * push the mirror up and a generator that would pull live down, and this
 * touches neither: a drift check that fixes drift is a migration, and a
 * migration needs a ruling per field, not an exit code. It reports, and a
 * person decides.
 */

/** Stable stringify: key order must not read as drift. */
export function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
}

const same = (a, b) => stable(a) === stable(b);

/**
 * STRIP ONLY WHOLE-LINE COMMENTS, which is what the mirror actually carries
 * and what every other reader of it already does (base44Read.mjs,
 * schemaDropScan.mjs). A general // stripper would cut into any description
 * containing a URL, and these descriptions do carry them.
 */
export function parseMirrorFile(raw) {
  return JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''));
}

/**
 * Accepts every shape the live side arrives in, because there are two readers
 * and they disagree: the HTTP route returns { schemas: [{ entity_name,
 * entity_schema }] }, and a capture pasted from the workspace connector is
 * often already a plain name -> schema object. Guessing wrong here would read
 * as "every entity is missing", which is the loudest possible false alarm.
 */
export function normalizeLive(payload) {
  const out = new Map();
  const rows = Array.isArray(payload) ? payload
    : Array.isArray(payload?.schemas) ? payload.schemas
      : null;
  if (rows) {
    for (const row of rows) {
      const name = row?.entity_name ?? row?.name;
      const schema = row?.entity_schema ?? row?.schema;
      if (name && schema) out.set(name, schema);
    }
    return out;
  }
  if (payload && typeof payload === 'object') {
    for (const [name, schema] of Object.entries(payload)) {
      if (schema && typeof schema === 'object') out.set(name, schema);
    }
  }
  return out;
}

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

/**
 * Compares one entity's two schemas. Field order, and the mirror's own "name"
 * key, are not drift.
 */
function diffEntity(entity, live, mirror, findings) {
  // ── rls first: the one that turns a failing check into a passing one ─────
  if (!same(live?.rls ?? null, mirror?.rls ?? null)) {
    findings.push({
      severity: 'critical',
      kind: 'rls',
      entity,
      detail: `live rls ${stable(live?.rls ?? null)} vs mirror ${stable(mirror?.rls ?? null)}`,
      why: 'base44Read.mjs reads the MIRROR to decide an admin-key read; an admin-key read of an owner-scoped entity returns 200 and an empty array',
    });
  }

  // A type can be an ARRAY (['string','null'] is how a nullable field is
  // declared here), so this compares by value. With !== it compared two equal
  // arrays by reference and reported five Guest fields as drift against a
  // capture taken from the mirror itself.
  if (!same(live?.type ?? null, mirror?.type ?? null)) {
    findings.push({
      severity: 'high', kind: 'entity-type', entity,
      detail: `live type ${JSON.stringify(live?.type ?? null)} vs mirror ${JSON.stringify(mirror?.type ?? null)}`,
    });
  }

  const liveProps = live?.properties ?? {};
  const mirrorProps = mirror?.properties ?? {};
  const names = [...new Set([...Object.keys(liveProps), ...Object.keys(mirrorProps)])].sort();

  for (const field of names) {
    const l = liveProps[field];
    const m = mirrorProps[field];
    if (l && !m) {
      findings.push({
        severity: 'high', kind: 'field-only-live', entity, field,
        detail: `live has ${field} (${l.type ?? 'no type'}), the mirror does not`,
        why: 'the mirror is incomplete, so any guard reading it does not know this field exists',
      });
      continue;
    }
    if (m && !l) {
      findings.push({
        severity: 'high', kind: 'field-only-mirror', entity, field,
        detail: `the mirror has ${field} (${m.type ?? 'no type'}), live does not`,
        why: 'Base44 silently drops writes to an undeclared field, and schemaDropScan reads the mirror, so it would call this write safe',
      });
      continue;
    }
    if (!same(l.type ?? null, m.type ?? null)) {
      findings.push({
        severity: 'high', kind: 'field-type', entity, field,
        detail: `live ${JSON.stringify(l.type ?? null)} vs mirror ${JSON.stringify(m.type ?? null)}`,
      });
    }
    if (!same(l.enum ?? null, m.enum ?? null)) {
      findings.push({
        severity: 'medium', kind: 'enum', entity, field,
        detail: `live ${stable(l.enum ?? null)} vs mirror ${stable(m.enum ?? null)}`,
      });
    }
    if (!same(l.items ?? null, m.items ?? null)) {
      findings.push({
        severity: 'medium', kind: 'items', entity, field,
        detail: `live ${stable(l.items ?? null)} vs mirror ${stable(m.items ?? null)}`,
      });
    }
    if ((l.description ?? null) !== (m.description ?? null)) {
      findings.push({
        severity: 'low', kind: 'description', entity, field,
        detail: 'the wording differs',
        live: l.description ?? null,
        mirror: m.description ?? null,
      });
    }
  }

  const liveReq = [...(live?.required ?? [])].sort();
  const mirrorReq = [...(mirror?.required ?? [])].sort();
  if (!same(liveReq, mirrorReq)) {
    findings.push({
      severity: 'medium', kind: 'required', entity,
      detail: `live ${stable(liveReq)} vs mirror ${stable(mirrorReq)}`,
    });
  }
}

/**
 * @param {Map<string, object>} live
 * @param {Map<string, object>} mirror
 * @returns {Array<object>} findings, most severe first
 */
export function diffSchemas(live, mirror) {
  const findings = [];

  // PRESENCE BEFORE PROPERTIES. An empty live map means the read failed, not
  // that the app has no entities, and reporting 51 deletions would be the
  // wrong alarm entirely.
  if (live.size === 0) {
    return [{
      severity: 'critical', kind: 'no-live-schemas', entity: null,
      detail: 'the live side carries no schemas at all, so nothing was compared',
      why: 'a failed or empty read must not read as "every entity was deleted"',
    }];
  }

  const names = [...new Set([...live.keys(), ...mirror.keys()])].sort();
  for (const entity of names) {
    const l = live.get(entity);
    const m = mirror.get(entity);
    if (l && !m) {
      findings.push({
        severity: 'high', kind: 'entity-only-live', entity,
        detail: `live defines ${entity}, the mirror has no file for it`,
        why: 'base44Read.mjs fails CLOSED on an unmirrored entity, so every admin-key read of it throws',
      });
      continue;
    }
    if (m && !l) {
      findings.push({
        severity: 'high', kind: 'entity-only-mirror', entity,
        detail: `the mirror has ${entity}, live does not define it`,
      });
      continue;
    }
    diffEntity(entity, l, m, findings);
  }

  findings.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  return findings;
}

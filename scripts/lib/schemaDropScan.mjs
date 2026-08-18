/**
 * scripts/lib/schemaDropScan.mjs
 *
 * Shared scan logic behind both `npm run audit:schema` (scripts/audit-schema.mjs,
 * human-readable report) and the schema-drift guard test
 * (tests/persistence/schema-drift-guard.mjs, pass/fail assertions in the
 * persistence suite). Extracted so the two never drift from each other —
 * one scanner, two consumers.
 *
 * IMPORTANT LIMITATION, confirmed empirically 2026-07: Base44's schema
 * metadata is NOT reachable from a plain script authenticated with a bearer
 * token or the admin key — `/apps/:id/entities/:entity/schema`,
 * `/apps/:id/schema`, and `/apps/:id/entities/:entity/meta` all 404 against
 * the live REST API, and the `@base44/sdk` client exposes no runtime
 * schema-fetch method (only build-time codegen via the CLI's "Dynamic
 * Types" feature).
 *
 * SCHEMAS ARE NOW DERIVED FROM base44/entities/*.jsonc AT RUNTIME (2026-08-18),
 * replacing a hand-maintained snapshot embedded in this file.
 *
 * The snapshot approach failed exactly as its own comment warned it would:
 * it was last refreshed 2026-07, and by 2026-08 the Guest entry was missing
 * all five fields added since — encrypted_guest_pii and the four Track E
 * token columns. A scanner comparing code against its own stale memory
 * under-reports drift silently, and nothing tells you the memory is stale.
 *
 * The mirror is a better source for one structural reason: RULE 12 requires
 * it to be synced from the live schema in the same PR as any declaration
 * change, so it is version-controlled, reviewable in a diff, and already
 * maintained. It covers all 33 entities this scanner knows about (48 files
 * in total). An embedded copy has none of those properties and one extra
 * failure mode.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC   = resolve(__dir, '..', '..', 'src');

// ── Schemas, derived from the checked-in mirror ─────────────────────────────

/**
 * Entities whose schema declaration does NOT constrain what persists.
 *
 * The built-in `User` entity accepts arbitrary custom fields regardless of
 * declaration — confirmed empirically 2026-07 by writing
 * `__persistence_probe_undeclared_field__` and reading it back through a
 * separate GET. Every custom entity silently drops undeclared fields; User
 * does not.
 *
 * Without this, the scanner reports every undeclared User field as
 * "LIVE BUG (written+read, data loss)". It was doing exactly that for four
 * fields — notification_prefs, plan_step_completed, trialStartedAt,
 * tipsModalShown — all false positives, and all contradicted by a note in
 * BASE44_PLATFORM_NOTES.md that already said a User DROPPED finding is
 * "likely a false positive by the nature of this entity". A scanner whose
 * loudest findings are known-wrong is a scanner people stop reading.
 */
export const SCHEMALESS_ENTITIES = ['User'];

/** Flattens a JSON-Schema `properties` map into the flat shape the scan uses. */
function flatten(properties) {
  const flat = {};
  const nested = {};
  for (const [name, def] of Object.entries(properties || {})) {
    flat[name] = 1;
    // Object-valued fields: record their declared children so a dotted path
    // like `mainCeremony.dressCode` can be resolved. A field with no declared
    // children stays absent from `nested`, which the resolver reads as "open"
    // — the same behaviour the embedded snapshot had.
    const props = def?.properties || def?.items?.properties;
    if (props && Object.keys(props).length) nested[name] = Object.keys(props);
  }
  return { flat, nested };
}

function loadSchemasFromMirror() {
  const dir = resolve(__dir, '..', '..', 'base44', 'entities');
  const out = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.jsonc')) continue;
    const entity = file.replace(/\.jsonc$/, '');
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(dir, file), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
    } catch {
      continue;   // an unparseable mirror file is reported by the caller, not swallowed here
    }
    const { flat, nested } = flatten(parsed.properties);
    if (Object.keys(nested).length) flat._nested = nested;
    out[entity] = flat;
  }
  return out;
}

export const SCHEMAS = loadSchemasFromMirror();


// ── Helpers ───────────────────────────────────────────────────────────────────

function isRegistered(entity, fieldPath) {
  // The built-in User entity persists arbitrary fields regardless of what its
  // schema declares (BASE44_PLATFORM_NOTES.md), so a DROPPED verdict against it
  // is always a false positive. Short-circuit before the schema lookup — its
  // mirror file is a partial stub and would otherwise fail every field.
  if (SCHEMALESS_ENTITIES.includes(entity)) return true;
  const schema = SCHEMAS[entity];
  if (!schema) return null; // unknown entity
  const parts = fieldPath.split('.');
  if (parts.length === 1) {
    if (parts[0] === '_nested' || parts[0] === '_uncertain') return false; // internal
    if (schema._uncertain?.includes(parts[0])) return 'uncertain';
    return parts[0] in schema;
  }
  const [top, ...rest] = parts;
  if (!(top in schema) && !schema._nested?.[top]) return false;
  const nested = schema._nested?.[top];
  if (!nested) return 'open'; // top-level registered but sub-keys untracked (open object)
  return nested.includes(rest[0]);
}

function relPath(abs) {
  return abs.replace(resolve(__dir, '..', '..') + '/', '');
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full));
    else if (/\.(jsx|js|mjs)$/.test(entry) && !entry.includes('.test.'))
      out.push(full);
  }
  return out;
}

function extractKeys(text, prefix = '', maxDepth = 2, depth = 0) {
  if (depth >= maxDepth) return [];
  const keys = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (text[i] === '"' || text[i] === "'") {
      const q = text[i++];
      while (i < n && text[i] !== q) { if (text[i] === '\\') i++; i++; }
      i++;
      continue;
    }
    if (text[i] === '/' && text[i+1] === '/') {
      while (i < n && text[i] !== '\n') i++;
      continue;
    }
    if (text[i] === '/' && text[i+1] === '*') {
      i += 2;
      while (i < n - 1 && !(text[i] === '*' && text[i+1] === '/')) i++;
      i += 2;
      continue;
    }
    const keyMatch = text.slice(i).match(/^([a-zA-Z_$][\w$]*)\s*:/);
    if (keyMatch) {
      const key = keyMatch[1];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      i += keyMatch[0].length;
      while (i < n && /\s/.test(text[i])) i++;
      if (text[i] === '{') {
        i++;
        const subKeys = extractKeys(text.slice(i), fullKey, maxDepth, depth + 1);
        keys.push(...subKeys);
        let d = 1;
        while (i < n && d > 0) {
          if (text[i] === '{') d++;
          else if (text[i] === '}') d--;
          i++;
        }
      } else {
        let d = 0;
        while (i < n) {
          if (text[i] === '{' || text[i] === '(' || text[i] === '[') d++;
          else if (text[i] === '}' || text[i] === ')' || text[i] === ']') {
            if (d === 0) break;
            d--;
          } else if (text[i] === ',' && d === 0) break;
          else if (text[i] === '"' || text[i] === "'") {
            const q = text[i++];
            while (i < n && text[i] !== q) { if (text[i] === '\\') i++; i++; }
          }
          i++;
        }
      }
      continue;
    }
    if (text.slice(i, i+3) === '...') {
      keys.push(prefix ? `${prefix}.__spread__` : '__spread__');
      i += 3;
      let d = 0;
      while (i < n) {
        if (text[i] === '{' || text[i] === '(' || text[i] === '[') d++;
        else if ((text[i] === '}' || text[i] === ')' || text[i] === ']') && d === 0) break;
        else if ((text[i] === '}' || text[i] === ')' || text[i] === ']')) d--;
        else if (text[i] === ',' && d === 0) break;
        i++;
      }
      continue;
    }
    if (text[i] === '}') break;
    i++;
  }
  return keys;
}

function extractArg(src, pos, argIndex) {
  let i = pos;
  const n = src.length;
  let arg = 0;
  let argStart = pos;
  let depth = 0;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = src[i++];
      while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++;
      continue;
    }
    if (c === '/' && src[i+1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i+1] === '*') { i+=2; while (i < n-1 && !(src[i]==='*'&&src[i+1]==='/')) i++; i+=2; continue; }
    if ((c === '{' || c === '(' || c === '[') ) depth++;
    else if ((c === '}' || c === ')' || c === ']') && depth > 0) depth--;
    else if ((c === ')') && depth === 0) {
      if (arg === argIndex) return { text: src.slice(argStart, i).trim(), end: i };
      return null;
    } else if (c === ',' && depth === 0) {
      if (arg === argIndex) return { text: src.slice(argStart, i).trim(), end: i };
      arg++;
      argStart = i + 1;
    }
    i++;
  }
  return null;
}

const KNOWN_WRITES = [
  { entity:'WeddingDetails', field:'attire',            file:'src/pages/Styling.jsx', line:107, note:'sectionKey="attire"' },
  { entity:'WeddingDetails', field:'flowers',           file:'src/pages/Styling.jsx', line:107, note:'sectionKey="flowers"' },
  { entity:'WeddingDetails', field:'decorations',       file:'src/pages/Styling.jsx', line:107, note:'sectionKey="decorations"' },
  { entity:'WeddingDetails', field:'beauty',            file:'src/pages/Beauty.jsx', line:126, note:'full = { ...latestRef.current, beauty: nextBeauty }' },
  { entity:'WeddingDetails', field:'entertainmentDetails', file:'src/pages/EntertainmentDetails.jsx', line:169, note:'full = { ...latestRef.current, entertainmentDetails: next }' },
  // src/pages/Catering.jsx (wrote WeddingDetails.foodAndBeverage) was
  // deleted in the round-6 vendor-consolidation pass — an orphaned,
  // unreachable duplicate of FoodBeverage.jsx's Catering tab, which
  // writes the (differently-named) foodBeverage field instead.
  { entity:'Guest', field:'song_request',   file:'src/components/rsvp/RSVPPage.jsx', line:160, note:'spread of form object' },
  { entity:'Guest', field:'rsvp_note',      file:'src/components/rsvp/RSVPPage.jsx', line:160, note:'spread of form object' },
  { entity:'Guest', field:'poll_votes',     file:'src/components/rsvp/RSVPPage.jsx', line:203, note:'{ poll_votes: mergedVotes }' },
  { entity:'__dynamic__', field:'__dynamic__', file:'src/components/layout/AvaModal.jsx', line:147, note:'action.data passed to create/update — fields determined by Ava LLM response' },
  { entity:'WeddingDetails', field:'__spread_details__', file:'src/pages/AvaStudioWebsite.jsx', line:282, note:'full details variable — includes registered fields (coverPhoto, welcomeMessage, coupleStory, qna, registryContent) + whatever updateField was called with' },
];

const ENTITY_PATTERNS = [
  /base44\.entities\.(\w+)\.(?:create|update)\s*\(/g,
  // Notification and Hotel added PR6 completeness pass — both write via the
  // `const X = base44.entities.X;` then bare `X.create/update(...)` form,
  // which only this fixed-name list catches (the generic
  // base44.entities.(\w+) pattern above only matches non-destructured call
  // sites). Notification was already in GUARDED_ENTITIES but silently
  // never scanned since it was missing here — a dead guard entry.
  /\b(WeddingDetails|Guest|Budget|Schedule|Vendor|Note|Task|Table|VenueAsset|VowSpeech|RegistryItem|RegistryProduct|CustomGift|ReceivedGift|VendorLog|VendorTask|Collaborator|Music|GuestMessage|SongRequest|StoryMilestone|Photo|LiveStream|StreamChat|WebsiteTheme|CustomEventPage|MoodboardItem|Invitation|ThemeDetails|Notification|Hotel)\.(?:create|update)\s*\(/g,
  /base44\.auth\.updateMe\s*\(/g,
];

function dedupeByField(arr) {
  const m = new Map();
  for (const f of arr) {
    const k = `${f.entity}|${f.field}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(f);
  }
  return [...m.values()].map(group => ({
    ...group[0],
    allSites: group.map(g => `${g.file}:${g.line}`).join('  '),
  }));
}

/**
 * Runs the full static scan + classification. Returns raw (non-deduped)
 * REGISTERED/DROPPED/UNCERTAIN arrays plus deduped-by-field versions.
 */
export function runSchemaDropScan() {
  const findings = [];
  const files = walkFiles(SRC);

  for (const filePath of files) {
    let src;
    try { src = readFileSync(filePath, 'utf8'); } catch { continue; }
    const getLine = (pos) => src.slice(0, pos).split('\n').length;

    for (const pat of ENTITY_PATTERNS) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(src)) !== null) {
        const isUpdateMe = m[0].includes('updateMe');
        const entity = isUpdateMe ? 'User' : m[1];
        const callPos = m.index + m[0].length;
        const isUpdate = !isUpdateMe && m[0].includes('.update');
        const argIdx = isUpdate ? 1 : 0;

        const arg = extractArg(src, callPos, argIdx);
        if (!arg) continue;

        const text = arg.text.trim();
        if (!text.startsWith('{')) {
          findings.push({
            entity, field: '__var_ref__:' + text.slice(0, 40),
            file: relPath(filePath), line: getLine(m.index), certain: false,
          });
          continue;
        }

        const keys = extractKeys(text.slice(1), '', 2);
        for (const key of keys) {
          if (key.endsWith('.__spread__')) {
            findings.push({ entity, field: key, file: relPath(filePath), line: getLine(m.index), certain: false });
          } else {
            findings.push({ entity, field: key, file: relPath(filePath), line: getLine(m.index), certain: true });
          }
        }
      }
    }
  }

  for (const k of KNOWN_WRITES) {
    findings.push({ entity: k.entity, field: k.field, file: k.file, line: k.line, certain: k.field !== '__dynamic__' && !k.field.startsWith('__'), knownWrite: true, note: k.note });
  }

  const seen = new Set();
  const deduped = [];
  for (const f of findings) {
    const key = `${f.entity}|${f.field}|${f.file}|${f.line}`;
    if (!seen.has(key)) { seen.add(key); deduped.push(f); }
  }

  const REGISTERED = [], DROPPED = [], UNCERTAIN = [];

  for (const f of deduped) {
    if (!f.certain || f.entity === '__dynamic__' || f.field.startsWith('__')) {
      UNCERTAIN.push(f);
      continue;
    }
    if (['id','created_date','updated_date','created_by_id','created_by','is_sample'].includes(f.field)) {
      REGISTERED.push({ ...f, note: 'Base44 system field' });
      continue;
    }
    const schema = SCHEMAS[f.entity];
    if (!schema) {
      UNCERTAIN.push({ ...f, note: 'Entity schema unknown' });
      continue;
    }
    const reg = isRegistered(f.entity, f.field);
    if (reg === true || reg === 'open') {
      REGISTERED.push(f);
    } else if (reg === 'uncertain') {
      UNCERTAIN.push({ ...f, note: 'In _uncertain list — may be auth-level or silently dropped; manual round-trip needed' });
    } else if (reg === false) {
      DROPPED.push(f);
    } else {
      UNCERTAIN.push({ ...f, note: 'Unknown entity' });
    }
  }

  return {
    registered: REGISTERED,
    dropped: DROPPED,
    uncertain: UNCERTAIN,
    droppedDeduped: dedupeByField(DROPPED),
    registeredDeduped: dedupeByField(REGISTERED),
  };
}

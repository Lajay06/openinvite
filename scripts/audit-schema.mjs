/**
 * scripts/audit-schema.mjs
 *
 * Schema-drop audit: finds every field written to a Base44 entity across the
 * codebase and classifies it as REGISTERED (persists), DROPPED (silently
 * discarded), or UNCERTAIN (dynamic / can't resolve statically).
 *
 * Usage:  npm run audit:schema
 *
 * The actual scan + embedded schema snapshot live in scripts/lib/schemaDropScan.mjs
 * (shared with tests/persistence/schema-drift-guard.mjs, which turns the
 * same DROPPED list into pass/fail assertions in the persistence suite) —
 * this file is just the human-readable report on top of it.
 *
 * Sanity-check baseline (these must show REGISTERED for the method to be
 * correct): theme.*, guestCount, guestType, onboardingCompleted,
 * mainCeremony.dressCode, guestSuiteAccommodation.places.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSchemaDropScan, SCHEMAS } from './lib/schemaDropScan.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC   = resolve(__dir, '..', 'src');

function isRegistered(entity, fieldPath) {
  const schema = SCHEMAS[entity];
  if (!schema) return null;
  const parts = fieldPath.split('.');
  if (parts.length === 1) {
    if (parts[0] === '_nested' || parts[0] === '_uncertain') return false;
    if (schema._uncertain?.includes(parts[0])) return 'uncertain';
    return parts[0] in schema;
  }
  const [top, ...rest] = parts;
  if (!(top in schema) && !schema._nested?.[top]) return false;
  const nested = schema._nested?.[top];
  if (!nested) return 'open';
  return nested.includes(rest[0]);
}

// ── Check reads for DROPPED fields ───────────────────────────────────────────

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full));
    else if (/\.(jsx|js|mjs)$/.test(entry) && !entry.includes('.test.')) out.push(full);
  }
  return out;
}

const allFiles = walkFiles(SRC);

function fieldIsRead(field) {
  const topLevel = field.split('.')[0];
  const readPat = new RegExp(`[?.]${topLevel}\\b|\\['${topLevel}'\\]|\\["${topLevel}"\\]`);
  for (const filePath of allFiles) {
    let src;
    try { src = readFileSync(filePath, 'utf8'); } catch { continue; }
    if (readPat.test(src)) return true;
  }
  return false;
}

const { dropped: DROPPED, uncertain: UNCERTAIN, droppedDeduped: droppedDedupedRaw, registeredDeduped: regDeduped } = runSchemaDropScan();

for (const d of DROPPED) d.isRead = fieldIsRead(d.field);
DROPPED.sort((a, b) => (b.isRead ? 1 : 0) - (a.isRead ? 1 : 0));

function dedupeWithReadInfo(arr) {
  const m = new Map();
  for (const f of arr) {
    const k = `${f.entity}|${f.field}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(f);
  }
  return [...m.values()].map(group => ({
    ...group[0],
    isRead: group.some(g => g.isRead),
    allSites: group.map(g => `${g.file}:${g.line}`).join('  '),
  }));
}

const droppedDeduped = dedupeWithReadInfo(DROPPED);

// ── Report ────────────────────────────────────────────────────────────────────

const W = 68;
const hr  = '═'.repeat(W);
const hr2 = '─'.repeat(W);

console.log(`\n${hr}`);
console.log('  Base44 Schema-Drop Audit — Openinvite');
console.log(`  ${new Date().toISOString()}`);
console.log(`${hr}\n`);

console.log(`⛔  DROPPED FIELDS (${droppedDeduped.length} unique field paths) — written but NOT in schema`);
console.log('    Base44 returns HTTP 200 but the data is silently discarded.\n');

const droppedByEntity = {};
for (const d of droppedDeduped) {
  (droppedByEntity[d.entity] = droppedByEntity[d.entity] || []).push(d);
}

for (const [entity, fields] of Object.entries(droppedByEntity)) {
  console.log(`  ── ${entity} ──────────────────────────────────────────`);
  for (const f of fields) {
    const severity = f.isRead ? '🔴 LIVE BUG (written+read, data loss)' : '🟡 dead write (written, never read)';
    console.log(`  ⛔  ${f.field}`);
    console.log(`       ${severity}`);
    console.log(`       Sites: ${f.allSites}`);
    if (f.note) console.log(`       Note:  ${f.note}`);
  }
  console.log();
}

console.log(`${hr2}\n`);
console.log(`⚠️   UNCERTAIN (${UNCERTAIN.filter((v,i,a) => a.findIndex(x=>x.entity===v.entity&&x.field===v.field)===i).length} unique field paths) — can't resolve statically, needs manual review\n`);

function dedupeByField(arr) {
  const m = new Map();
  for (const f of arr) {
    const k = `${f.entity}|${f.field}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(f);
  }
  return [...m.values()].map(group => ({ ...group[0], allSites: group.map(g => `${g.file}:${g.line}`).join('  ') }));
}

const unc = dedupeByField(UNCERTAIN.filter(u => u.entity !== '__dynamic__'));
const dynCount = UNCERTAIN.filter(u => u.entity === '__dynamic__').length;

for (const u of unc.slice(0, 30)) {
  const fieldDisplay = u.field.startsWith('__var_ref__:') ? `[variable: ${u.field.slice(12)}]` : u.field;
  console.log(`  ⚠️   ${u.entity} → ${fieldDisplay}`);
  console.log(`       ${u.file}:${u.line}${u.note ? '  — ' + u.note : ''}`);
}
if (dynCount > 0) {
  console.log(`  ⚠️   AvaModal (AvaModal.jsx:147–152): entity + fields determined by LLM at runtime`);
  console.log(`       Passes action.data directly to create/update — fields are whatever Ava generates.`);
  console.log(`       Verify the LLM prompt constrains field names to registered schema fields.`);
}
if (unc.length > 30) console.log(`  … and ${unc.length - 30} more (variable references and spreads)`);

console.log(`\n${hr2}\n`);
console.log(`✅  REGISTERED — spot-check of known-good baselines\n`);
const baselines = [
  ['WeddingDetails','guestCount'], ['WeddingDetails','guestType'],
  ['WeddingDetails','theme.aesthetic'], ['WeddingDetails','theme.faith'],
  ['WeddingDetails','mainCeremony.dressCode'], ['WeddingDetails','guestSuiteAccommodation.places'],
  ['WeddingDetails','polls'], ['User','onboardingCompleted'],
  ['WeddingDetails','emergencyContacts.primary'], ['WeddingDetails','experienceGuide.categories'],
  ['WeddingDetails','assetContent'], ['WeddingDetails','onboardingDraft'], ['WeddingDetails','onboardingStepIndex'],
];
for (const [entity, field] of baselines) {
  const reg = isRegistered(entity, field);
  const status = (reg === true || reg === 'open') ? '✅ REGISTERED' : '❌ NOT REGISTERED — method error!';
  console.log(`  ${status.padEnd(20)} ${entity}.${field}`);
}

console.log(`\n${hr}\n`);
console.log('  SUMMARY');
console.log(`${hr2}`);
console.log(`  ⛔  DROPPED      : ${droppedDeduped.length} unique field paths`);
console.log(`       🔴 Live bug (written+read)  : ${droppedDeduped.filter(d=>d.isRead).length}`);
console.log(`       🟡 Dead write (write-only)  : ${droppedDeduped.filter(d=>!d.isRead).length}`);
console.log(`  ⚠️   UNCERTAIN    : ${unc.length + (dynCount > 0 ? 1 : 0)} (${unc.length} var-refs/spreads + ${dynCount > 0 ? '1 dynamic AvaModal' : '0 dynamic'})`);
console.log(`  ✅  REGISTERED   : ${regDeduped.length} (static scan, not exhaustive)`);
console.log(`${hr}\n`);

console.log('  ACTION REQUIRED: only the ⛔ DROPPED list needs attention.');
console.log('  Do NOT register fields unsupervised — typo\'d names get cemented.');
console.log('  Review each entry with the dev before registering or redirecting writes.\n');

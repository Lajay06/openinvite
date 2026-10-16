/**
 * tests/persistence/schema-mirror-diff.mjs
 *
 * THE DRIFT CHECK'S COMPARISON, EXERCISED WITH FIXTURES, PLUS THE ONE THING
 * ABOUT THE REAL MIRROR THAT CAN BE CHECKED WITHOUT A CREDENTIAL.
 *
 * scripts/schema-mirror-drift.mjs reads Base44 live and diffs it against
 * base44/entities/. The read is on demand and the owner runs it. The
 * COMPARISON is pure, so it belongs in CI, and it has to be here rather than
 * only in the script for the reason every guard in this directory exists: a
 * diff that reports nothing looks exactly like a diff that found nothing.
 *
 * So every drift class below is planted and asserted caught, and a matching
 * pair is asserted to produce no findings at all. If this file is ever green
 * because the engine returned [] for everything, the clean-pair assertion is
 * the only one that would still pass, and it is deliberately the least of
 * them.
 */

import { pass, fail } from './_shared.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { normalizeLive, parseMirrorFile, diffSchemas, stable } from '../../scripts/lib/schemaMirrorDiff.mjs';

const ROOT = resolve(new URL('../../', import.meta.url).pathname);
const MIRROR_DIR = join(ROOT, 'base44/entities');

/** One minimal entity, used as the base both sides start from. */
const BASE = () => ({
  name: 'Thing',
  type: 'object',
  properties: {
    label: { type: 'string', description: 'What the thing is called.' },
    state: { type: 'string', enum: ['draft', 'live'], description: 'Where it is.' },
  },
  required: ['label'],
  rls: { read: null },
});

const asLive = (schema, name = 'Thing') => normalizeLive({ schemas: [{ entity_name: name, entity_schema: schema }] });
const asMirror = (schema, name = 'Thing') => new Map([[name, schema]]);

/** The findings for one planted change, as kinds. */
function kindsFor(mutate) {
  const live = BASE();
  const mirror = BASE();
  mutate(live, mirror);
  return diffSchemas(asLive(live), asMirror(mirror)).map((f) => f.kind);
}

export async function runSchemaMirrorDiff() {
  const r = [];
  const ok = (name, cond, note) => r.push(cond ? pass(name, note) : fail(name, 'see name', note));

  // ── the clean pair, first, so a change to the engine that breaks equality
  //    shows up as noise on every other assertion rather than silence ──────
  const clean = diffSchemas(asLive(BASE()), asMirror(BASE()));
  ok('two identical schemas produce no findings', clean.length === 0, `${clean.length} finding(s)`);

  // Key order is not drift. The mirror is hand-edited and live is serialized
  // by somebody else's JSON encoder; if order counted, every run would be red.
  const reordered = { rls: { read: null }, required: ['label'], properties: BASE().properties, type: 'object', name: 'Thing' };
  ok('  and neither is key order', diffSchemas(asLive(reordered), asMirror(BASE())).length === 0,
     'the mirror is hand-edited, live is machine-serialized');

  // ── rls, the one that turns a failing check into a passing one ───────────
  const rlsKinds = kindsFor((live) => { live.rls = { read: { created_by_id: '{{user.id}}' } }; });
  ok('an rls read rule tightened on live is caught', rlsKinds.includes('rls'), rlsKinds.join(', ') || 'nothing');
  const rlsFinding = diffSchemas(
    asLive({ ...BASE(), rls: { read: { created_by_id: '{{user.id}}' } } }), asMirror(BASE()),
  )[0];
  ok('  and it is reported CRITICAL, ahead of everything else', rlsFinding?.severity === 'critical', rlsFinding?.severity);
  ok('  with the reason an admin-key read would go quiet',
     /empty array/.test(rlsFinding?.why || ''), 'the 200-and-empty failure is named in the finding');

  // ── presence, both directions, and they are NOT the same finding ────────
  const onlyLive = diffSchemas(asLive(BASE()), new Map());
  ok('an entity live but not mirrored is caught', onlyLive[0]?.kind === 'entity-only-live', onlyLive[0]?.kind);
  const onlyMirror = diffSchemas(asLive(BASE(), 'Other'), asMirror(BASE()));
  ok('  an entity mirrored but not live is a different finding',
     onlyMirror.some((f) => f.kind === 'entity-only-mirror'), onlyMirror.map((f) => f.kind).join(', '));

  const fieldLive = kindsFor((live) => { live.properties.extra = { type: 'number' }; });
  ok('a field live but not mirrored is caught', fieldLive.includes('field-only-live'), fieldLive.join(', '));
  const fieldMirror = kindsFor((_live, mirror) => { mirror.properties.extra = { type: 'number' }; });
  ok('  a field mirrored but not live is caught, and says writes to it are dropped',
     fieldMirror.includes('field-only-mirror'), fieldMirror.join(', '));

  // ── shape ───────────────────────────────────────────────────────────────
  //
  // A NULLABLE FIELD'S TYPE IS AN ARRAY, and that is a regression fixture, not
  // a hypothetical: the first run of this engine against a capture taken from
  // the mirror ITSELF reported five Guest fields as drift, because ['string',
  // 'null'] !== ['string','null'] compares two equal arrays by reference.
  ok('two equal array types are not drift',
     !kindsFor((live, mirror) => {
       live.properties.label.type = ['string', 'null'];
       mirror.properties.label.type = ['string', 'null'];
     }).includes('field-type'),
     "['string','null'] equals itself");
  ok('  but an array type that really differs is',
     kindsFor((live, mirror) => {
       live.properties.label.type = ['string', 'null'];
       mirror.properties.label.type = ['string'];
     }).includes('field-type'),
     'nullable on live, not in the mirror');
  ok('a changed field type is caught',
     kindsFor((live) => { live.properties.label.type = 'number'; }).includes('field-type'), 'string to number');
  ok('a changed enum is caught',
     kindsFor((live) => { live.properties.state.enum = ['draft', 'live', 'archived']; }).includes('enum'), 'a value added live');
  ok('a changed required list is caught',
     kindsFor((live) => { live.required = ['label', 'state']; }).includes('required'), 'state became required');
  ok('  but required order is not drift',
     !kindsFor((live, mirror) => { live.required = ['label', 'state']; mirror.required = ['state', 'label']; }).includes('required'),
     'compared as a set');
  ok('a changed items schema is caught',
     kindsFor((live) => { live.properties.label = { type: 'array', items: { type: 'string' } }; }).includes('items'),
     'an array whose element type moved');

  // ── descriptions: the whole reason the mirror is read at all ────────────
  const descKinds = kindsFor((live) => { live.properties.label.description = 'Something else entirely.'; });
  ok('a reworded description is caught', descKinds.includes('description'), descKinds.join(', '));
  const descFinding = diffSchemas(
    asLive({ ...BASE(), properties: { ...BASE().properties, label: { type: 'string', description: 'New words.' } } }),
    asMirror(BASE()),
  ).find((f) => f.kind === 'description');
  ok('  and carries both wordings, so the fix can be read off the report',
     descFinding?.live === 'New words.' && /What the thing is called/.test(descFinding?.mirror || ''),
     'live and mirror text both printed');

  // ── an empty live read is NEVER "everything was deleted" ────────────────
  const empty = diffSchemas(new Map(), asMirror(BASE()));
  ok('an empty live read reports a failed read, not 51 deletions',
     empty.length === 1 && empty[0].kind === 'no-live-schemas', empty.map((f) => f.kind).join(', '));

  // ── the live payload arrives in more than one shape ─────────────────────
  ok('the HTTP response shape is understood',
     normalizeLive({ schemas: [{ entity_name: 'A', entity_schema: { type: 'object' } }], total: 1 }).has('A'),
     '{ schemas: [{ entity_name, entity_schema }] }');
  ok('  a bare name-to-schema capture is too',
     normalizeLive({ A: { type: 'object' } }).has('A'), 'what a connector capture usually looks like');
  ok('  and a bare array', normalizeLive([{ name: 'A', schema: { type: 'object' } }]).has('A'), '[{ name, schema }]');

  // ── THE REAL MIRROR, which needs no credential to check ────────────────
  const files = readdirSync(MIRROR_DIR).filter((f) => f.endsWith('.jsonc'));
  ok('the mirror is there to be compared', files.length > 40, `${files.length} entity file(s)`);
  const broken = [];
  let described = 0;
  for (const f of files) {
    try {
      const schema = parseMirrorFile(readFileSync(join(MIRROR_DIR, f), 'utf8'));
      described += Object.values(schema.properties ?? {}).filter((p) => p?.description).length;
    } catch (err) { broken.push(`${f}: ${err.message.split('\n')[0]}`); }
  }
  ok('  every mirror file parses after comment stripping', broken.length === 0,
     broken.length ? broken.slice(0, 3).join('; ') : `${files.length} file(s)`);
  ok('  and they carry the descriptions the drift check compares', described > 300,
     `${described} described field(s)`);

  // The comment stripper must not cut into a description that contains a URL,
  // which several of these do.
  ok('  a URL inside a description survives the stripper',
     parseMirrorFile('{\n  // a comment\n  "d": "see https://base44.app/docs"\n}').d === 'see https://base44.app/docs',
     'only whole-line comments are stripped');

  ok('stable() sorts keys so equal schemas compare equal',
     stable({ b: 1, a: 2 }) === stable({ a: 2, b: 1 }), 'order-insensitive');

  return r;
}

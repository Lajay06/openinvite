/**
 * scripts/schema-mirror-drift.mjs
 *
 * ON DEMAND, READ ONLY: does base44/entities/ still match Base44 live?
 *
 * Usage
 *   npm run drift:schema                    read live, compare, report
 *   npm run drift:schema -- --from cap.json compare a saved capture instead
 *   npm run drift:schema -- --quiet         findings only, no clean lines
 *
 * Exit 0 clean, 1 drift found, 2 could not read the live side.
 *
 * ── TWO SOURCES FOR THE LIVE SIDE, ON PURPOSE ─────────────────────────────
 *
 * --from takes a JSON capture and needs NO CREDENTIAL AT ALL, which is the
 * mode to prefer: the workspace connector's list_entity_schemas can produce
 * it, the comparison is then reproducible by anyone, and nothing in this
 * repo has to hold a key to check its own mirror.
 *
 * Without --from it reads GET /api/apps/{app_id}/entity-schemas with
 * BASE44_ADMIN_KEY as a bearer token. Two things to know before trusting a
 * clean result from that path:
 *
 *   · That route is documented BETA ("avoid depending on it in production").
 *   · /entity-schemas was probed on 2026-08-17 and answered 404 or 401,
 *     which is recorded in scripts/lib/base44Read.mjs's header. It is in the
 *     platform catalog now. Whether the ADMIN KEY may call it is a separate
 *     question from whether the route exists, and the first real run is the
 *     thing that answers it.
 *
 * So a non-200 is reported as "could not read", exit 2, never as "no drift".
 * The failure this is built against is a check that passes because it saw
 * nothing.
 *
 * THE CREDENTIAL IS NEVER PRINTED, not in an error, not in a URL, not in a
 * header dump. It is read from the environment and passed to fetch, and the
 * only thing said about it is whether it was set.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { normalizeLive, parseMirrorFile, diffSchemas } from './lib/schemaMirrorDiff.mjs';

const ROOT = resolve(new URL('../', import.meta.url).pathname);
const MIRROR_DIR = join(ROOT, 'base44/entities');
const BASE44_API = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

const argv = process.argv.slice(2);
const argOf = (flag) => { const i = argv.indexOf(flag); return i === -1 ? null : argv[i + 1]; };
const QUIET = argv.includes('--quiet');
const FROM = argOf('--from');

function loadMirror() {
  const schemas = new Map();
  const unparseable = [];
  for (const file of readdirSync(MIRROR_DIR).filter((f) => f.endsWith('.jsonc')).sort()) {
    const entity = file.replace(/\.jsonc$/, '');
    try {
      schemas.set(entity, parseMirrorFile(readFileSync(join(MIRROR_DIR, file), 'utf8')));
    } catch (err) {
      unparseable.push(`${file}: ${err.message.split('\n')[0]}`);
    }
  }
  return { schemas, unparseable };
}

async function readLive() {
  if (FROM) {
    const path = resolve(process.cwd(), FROM);
    if (!existsSync(path)) throw new Error(`--from file not found: ${FROM}`);
    return { payload: JSON.parse(readFileSync(path, 'utf8')), source: `capture ${FROM}` };
  }
  const key = process.env.BASE44_ADMIN_KEY;
  if (!key) {
    throw new Error(
      'BASE44_ADMIN_KEY is not set, and no --from capture was given.\n'
      + '  Either export it in the shell that runs this (never paste it into a file\n'
      + '  this repo tracks), or pass a capture: --from <file.json>.',
    );
  }
  const url = `${BASE44_API}/apps/${APP_ID}/entity-schemas`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `GET /apps/${APP_ID}/entity-schemas answered ${res.status}.\n`
      + `  ${body.slice(0, 300)}\n`
      + '  A non-200 is NOT a clean result. If this is 401 or 404, the admin key cannot\n'
      + '  call this route and the capture path is the one to use: read the schemas with\n'
      + "  the workspace connector's list_entity_schemas and pass them with --from.",
    );
  }
  return { payload: await res.json(), source: `live ${url}` };
}

const line = (s = '') => { if (!QUIET) console.log(s); };

async function main() {
  line('');
  line('═══════════════════════════════════════════════════════');
  line('  Schema mirror drift: Base44 live vs base44/entities/');
  line('═══════════════════════════════════════════════════════');
  line('');

  const { schemas: mirror, unparseable } = loadMirror();
  if (unparseable.length) {
    console.error(`  ✗ ${unparseable.length} mirror file(s) could not be parsed, so they were not compared:`);
    for (const u of unparseable) console.error(`      ${u}`);
    console.error('');
  }

  let live, source;
  try {
    ({ payload: live, source } = await readLive());
  } catch (err) {
    console.error(`  ✗ could not read the live side.\n\n  ${err.message}\n`);
    process.exit(2);
  }

  const liveMap = normalizeLive(live);
  line(`  live:   ${liveMap.size} entity schema(s) from ${source}`);
  line(`  mirror: ${mirror.size} file(s) in base44/entities/`);
  line('');

  const findings = diffSchemas(liveMap, mirror);

  if (findings.length === 0 && unparseable.length === 0) {
    line('  ✓ No drift. Every mirrored entity matches live, field for field,');
    line('    including rls rules, enums, required lists and descriptions.');
    line('');
    process.exit(0);
  }

  const bySeverity = {};
  for (const f of findings) (bySeverity[f.severity] ??= []).push(f);

  for (const severity of ['critical', 'high', 'medium', 'low']) {
    const rows = bySeverity[severity];
    if (!rows?.length) continue;
    console.log(`  ── ${severity.toUpperCase()} (${rows.length}) ─────────────────────────────────────`);
    console.log('');
    for (const f of rows) {
      const where = f.field ? `${f.entity}.${f.field}` : (f.entity ?? '(whole read)');
      console.log(`  ${where}  [${f.kind}]`);
      console.log(`      ${f.detail}`);
      if (f.kind === 'description') {
        console.log(`      live:   ${JSON.stringify(f.live)}`);
        console.log(`      mirror: ${JSON.stringify(f.mirror)}`);
      }
      if (f.why) console.log(`      why it matters: ${f.why}`);
      console.log('');
    }
  }

  console.log('───────────────────────────────────────────────────────');
  console.log(`  ${findings.length} drift finding(s). Base44 is the source of truth:`);
  console.log('  the mirror is what changes, and each change is read from live.');
  console.log('  Nothing was written to either side.');
  console.log('');
  process.exit(1);
}

main().catch((err) => { console.error(`\n  ✗ ${err.message}\n`); process.exit(2); });

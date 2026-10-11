/**
 * tests/persistence/mobile-dates.mjs
 *
 * EVERY DATE A COUPLE READS ON THE PHONE IS NUMERIC, IN THEIR ACCOUNT'S FORMAT.
 *
 * Mobile parity 6 of goals/2026-10-10-mobile-pass.md, after #917 and #941 on
 * the web: dashboard dates go through src/lib/dashboardDate.js, day/month/year
 * or month/day/year as the account chose, with no weekday in front. The
 * advisor's ruling keeps one written date, the invitation email's.
 *
 * BY ELIMINATION. No file list: every source file under src/mobile is read,
 * and any locale date formatter, weekday or written month in it is a failure
 * unless it is one of the two guest-facing lines named below. Both are text a
 * GUEST reads, which is the line goals/2026-10-10-mobile-pass.md item 6 draws:
 *
 *   1. The invitation email's date (SendInvitesScreen.jsx `dateStr`), the
 *      advisor's named exception. It becomes the {date} merge tag in the
 *      email body.
 *   2. The invitation starter design's date (PlanContainer.jsx `shown`),
 *      copied from InvitationBuilder.jsx so the desktop builder opens the same
 *      record. It is printed on the invitation itself. Reported to the
 *      advisor with this PR as a second guest-facing case.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SHELL = 'src/mobile';
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

const GUEST_FACING = [
  { file: 'src/mobile/screens/guests/SendInvitesScreen.jsx', line: /^const dateStr = weddingDate \? new Date\(weddingDate\)\.toLocaleDateString\(/ },
  { file: 'src/mobile/screens/plan/PlanContainer.jsx', line: /^const shown = weddingDate \? new Date\(`\$\{weddingDate\}T00:00:00`\)\.toLocaleDateString\(/ },
];
const WRITTEN = /toLocaleDateString\(|DateTimeFormat\(|\bweekday:\s*'|\bmonth:\s*'(?:long|short|narrow)'/;

function walk(dir) {
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.(jsx?|tsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

async function loadFormat() {
  try {
    const { build } = await import('esbuild');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oi-mobile-dates-'));
    const out = path.join(dir, 'format.mjs');
    await build({
      entryPoints: [path.join(ROOT, 'src/mobile/lib/format.js')], outfile: out, bundle: true,
      format: 'esm', platform: 'node', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
    });
    const m = await import(pathToFileURL(out).href);
    fs.rmSync(dir, { recursive: true, force: true });
    return m;
  } catch (e) { return { __error: e.message }; }
}

export async function runMobileDates() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const safe = (fn) => { try { return fn(); } catch (e) { return `threw: ${e.message}`; } };

  // ── ELIMINATION ──────────────────────────────────────────────────────────
  const files = walk(path.join(ROOT, SHELL));
  ok('the sweep reads the whole shell', files.length > 100, `${files.length} files`);
  const offenders = [];
  const exemptionsUsed = new Set();
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    for (const raw of code(rel).split('\n')) {
      if (!WRITTEN.test(raw)) continue;
      const hit = GUEST_FACING.find((g) => g.file === rel && g.line.test(raw.trim()));
      if (hit) { exemptionsUsed.add(hit.file); continue; }
      offenders.push(`${rel}: ${raw.trim().slice(0, 100)}`);
    }
  }
  ok('no written or weekday date in src/mobile outside the guest-facing lines',
     offenders.length === 0, offenders.slice(0, 6).join(' | ') || 'every date numeric');
  ok('  and both guest-facing lines are still where they are named',
     GUEST_FACING.every((g) => exemptionsUsed.has(g.file)), [...exemptionsUsed].join(', ') || 'none found');

  // The email line is an exception only because it is the email's: it must
  // still be the value the email body's merge tag receives.
  const send = code('src/mobile/screens/guests/SendInvitesScreen.jsx');
  ok("  the email's written date still feeds the email", /replaceMergeTags\([^)]*\bdateStr\b/.test(send), 'replaceMergeTags(..., dateStr)');

  // ── THE FORMATTER, RUN ───────────────────────────────────────────────────
  const fmt = await loadFormat();
  ok('the shell formatters bundle and load', !fmt.__error && typeof fmt.dateShort === 'function', fmt.__error || 'dateShort exported');
  ok('  and there is no long written form any more', !('dateLong' in fmt), 'dateLong removed');
  const withFormat = (dateFormat, fn) => {
    const prev = globalThis.localStorage;
    globalThis.localStorage = { getItem: (k) => (k === 'oi_user' && dateFormat ? JSON.stringify({ dateFormat }) : null) };
    try { return fn(); } finally { globalThis.localStorage = prev; }
  };
  const dmy = withFormat(null, () => safe(() => fmt.dateShort('2027-03-20')));
  const mdy = withFormat('mdy', () => safe(() => fmt.dateShort('2027-03-20')));
  ok('a date reads day/month/year by default', dmy === '20/03/2027', dmy);
  ok('  and month/day/year when the account chose it', mdy === '03/20/2027', mdy);
  const due = withFormat(null, () => safe(() => fmt.dueLabel('2027-03-20', new Date('2027-03-01T09:00:00'))));
  ok('  and a due date says so numerically', due === 'Due 20/03/2027', due);

  // ── THE ONES THAT WERE NOT THROUGH format.js ─────────────────────────────
  const through = [
    'src/mobile/screens/plan/ScheduleScreen.jsx', 'src/mobile/features/EntityListScreen.jsx', 'src/mobile/features/registry.js',
    'src/mobile/data/offlineCache.js', 'src/mobile/data/dailyUpdate.js', 'src/mobile/notifications/feed.js',
  ];
  const missing = through.filter((rel) => !/import \{ formatDashboardDate \} from '@\/lib\/dashboardDate';/.test(code(rel)));
  ok('the screens that formatted their own dates use dashboardDate.js', missing.length === 0, missing.join(', ') || `${through.length} files`);

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileDates();
  process.exit(r.every(Boolean) ? 0 : 1);
}

/**
 * scripts/tour-recordings/record-all.mjs
 *
 * RECORD EVERY CHAPTER AT BOTH WIDTHS, THEN PRINT THE MEDIA MAP.
 *
 * Usage, with a preview server already running on the build you want recorded:
 *
 *   npx vite preview --port 4230 --strictPort &
 *   CAPTURE_BASE_URL=http://localhost:4230 node scripts/tour-recordings/record-all.mjs
 *   CAPTURE_BASE_URL=... node scripts/tour-recordings/record-all.mjs --upload
 *   CAPTURE_BASE_URL=... node scripts/tour-recordings/record-all.mjs --only=guests,help
 *
 * WITHOUT --upload NOTHING LEAVES THE MACHINE. That is the default on purpose:
 * re-recording after a UI change is the common case, and looking at the result
 * before it is published is the cheap way to catch a chapter that now opens on
 * a different tab.
 *
 * WHY THE RECORDINGS ARE NOT COMMITTED. Eighteen videos is tens of megabytes in
 * a repository that ships none, and they are already addressable by URL. The
 * scripts are the artifact that is kept, which is the goal's own instruction:
 * "keep the scripts in scripts/tour-recordings/ so they can be re-recorded
 * after any UI change."
 */
import { readdirSync } from 'node:fs';
import { recordChapter, WIDTHS } from './lib/record.mjs';
import { cloudinaryConfig, uploadRecording, deliveryUrls } from './lib/cloudinary.mjs';
import { CHAPTERS } from '../../src/lib/studioTour.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4230';
const OUT = process.env.RECORDING_OUT || '/tmp/openinvite-tour-recordings';
const upload = process.argv.includes('--upload');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()) : null;

const files = readdirSync(new URL('./chapters/', import.meta.url)).filter((f) => f.endsWith('.mjs'));
const scripted = new Map();
for (const f of files) {
  const mod = await import(new URL(`./chapters/${f}`, import.meta.url));
  scripted.set(mod.default.key, mod.default);
}

// THE ORDER IS THE TOUR'S OWN, not the directory's. A chapter with no script
// yet is named and skipped rather than silently absent.
const queue = CHAPTERS.map((c) => c.key).filter((k) => !only || only.includes(k));
const missing = queue.filter((k) => !scripted.has(k));
if (missing.length) console.log(`  no script yet, skipped: ${missing.join(', ')}`);

const results = {};
const failures = [];
let cloudinaryRequests = 0;

for (const key of queue) {
  const chapter = scripted.get(key);
  if (!chapter) continue;
  const target = CHAPTERS.find((c) => c.key === key)?.seconds ?? null;
  results[key] = {};
  for (const w of WIDTHS) {
    process.stdout.write(`  ${key} @ ${w.label} ... `);
    // ONE BROKEN CHAPTER MUST NOT TAKE THE RUN DOWN. A selector that moved
    // costs one recording; aborting costs the other seventeen and the twelve
    // minutes they took, and it hides every other chapter that also moved.
    try {
      const r = await recordChapter(chapter, { ...w, base: BASE, outDir: OUT });
      cloudinaryRequests += r.cloudinary;
      const drift = target ? (r.seconds - target).toFixed(1) : 'n/a';
      console.log(`${r.seconds}s (target ${target ?? '?'}, ${Number(drift) > 0 ? '+' : ''}${drift}), ${(r.bytes / 1024).toFixed(0)} KB, ${r.frames} frames`);
      results[key][w.label] = { ...r };
    } catch (e) {
      failures.push(`${key} @ ${w.label}: ${String(e.message || e).split('\n')[0].slice(0, 130)}`);
      console.log('FAILED');
    }
  }
}

if (upload) {
  const config = cloudinaryConfig();
  if (!config) { console.error('  CLOUDINARY_URL missing or malformed. Nothing uploaded.'); process.exit(1); }
  for (const [key, widths] of Object.entries(results)) {
    for (const [label, r] of Object.entries(widths)) {
      const body = await uploadRecording({ file: r.file, chapterKey: key, widthLabel: label, config });
      r.urls = deliveryUrls({ cloud: config.cloud, publicId: body.public_id, version: body.version, widthLabel: label });
      console.log(`  uploaded ${key}/${label}: ${body.bytes} bytes, ${body.duration}s`);
    }
  }
}

if (failures.length) {
  console.log(`\n  ${failures.length} recording(s) FAILED:`);
  failures.forEach((f) => console.log(`    ${f}`));
}
console.log(`\n  Cloudinary image requests while recording: ${cloudinaryRequests}`);
console.log('\n  MEDIA block for src/lib/studioTour.js:\n');
const lines = ['export const MEDIA = {'];
for (const c of CHAPTERS) {
  const r = results[c.key];
  if (!r || !r['1440']?.urls) { lines.push(`  ${JSON.stringify(c.key)}: null,`); continue; }
  const d = r['1440'], p = r['390'];
  lines.push(`  ${JSON.stringify(c.key)}: {`);
  lines.push(`    poster: '${d.urls.poster}',`);
  lines.push(`    webm: '${d.urls.webm}',`);
  lines.push(`    mp4: '${d.urls.mp4}',`);
  lines.push(`    seconds: ${d.seconds},`);
  if (p?.urls) {
    lines.push(`    phone: {`);
    lines.push(`      poster: '${p.urls.poster}',`);
    lines.push(`      webm: '${p.urls.webm}',`);
    lines.push(`      mp4: '${p.urls.mp4}',`);
    lines.push(`      seconds: ${p.seconds},`);
    lines.push(`    },`);
  }
  lines.push('  },');
}
lines.push('};');
console.log(lines.join('\n'));

/**
 * scripts/tour-recordings/record-tour-page.mjs
 *
 * THE /tour CLIPS THAT NO STUDIO TOUR CHAPTER COVERS, AT BOTH WIDTHS.
 *
 * /tour reuses a chapter recording wherever a chapter films the same page.
 * Where none does (seating, budget, the guest site), the clip lives here, in
 * ./tour-page/, in the same shape as a chapter, and is recorded the same way:
 * the rich fixture, the drawn cursor, 30 fps, one second held at the end.
 *
 *   CAPTURE_BASE_URL=http://localhost:4230 node scripts/tour-recordings/record-tour-page.mjs
 *   CAPTURE_BASE_URL=... node scripts/tour-recordings/record-tour-page.mjs --only=seating,site --upload
 *
 * Uploads go to studio-tour/tour-page/<clip>/<width>, next to the chapters,
 * with the same mp4 and poster derivatives and the same 1.5 MB ceiling.
 * WITHOUT --upload NOTHING LEAVES THE MACHINE.
 */
import { readdirSync } from 'node:fs';
import { recordChapter, WIDTHS } from './lib/record.mjs';
import { cloudinaryConfig, uploadRecording, deliveryUrls } from './lib/cloudinary.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4230';
const OUT = process.env.RECORDING_OUT || '/tmp/openinvite-tour-recordings';
const upload = process.argv.includes('--upload');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()) : null;

const clips = [];
for (const f of readdirSync(new URL('./tour-page/', import.meta.url)).filter((x) => x.endsWith('.mjs')).sort()) {
  const mod = (await import(new URL(`./tour-page/${f}`, import.meta.url))).default;
  if (!only || only.includes(mod.key)) clips.push(mod);
}

const results = {};
const failures = [];
for (const clip of clips) {
  results[clip.key] = {};
  for (const w of WIDTHS) {
    process.stdout.write(`  ${clip.key} @ ${w.label} ... `);
    try {
      const r = await recordChapter(clip, { ...w, base: BASE, outDir: `${OUT}/tour-page` });
      console.log(`${r.seconds}s, ${(r.bytes / 1024).toFixed(0)} KB, ${r.frames} frames`);
      results[clip.key][w.label] = r;
    } catch (e) {
      failures.push(`${clip.key} @ ${w.label}: ${String(e.message || e).split('\n')[0].slice(0, 130)}`);
      console.log('FAILED');
    }
  }
}

if (upload) {
  const config = cloudinaryConfig();
  if (!config) { console.error('  CLOUDINARY_URL missing or malformed. Nothing uploaded.'); process.exit(1); }
  for (const [key, widths] of Object.entries(results)) {
    for (const [label, r] of Object.entries(widths)) {
      const body = await uploadRecording({ file: r.file, chapterKey: `tour-page/${key}`, widthLabel: label, config });
      r.urls = deliveryUrls({ cloud: config.cloud, publicId: body.public_id, version: body.version, widthLabel: label });
      console.log(`  uploaded tour-page/${key}/${label}: ${body.bytes} bytes, ${body.duration}s`);
    }
  }
}

if (failures.length) {
  console.log(`\n  ${failures.length} recording(s) FAILED:`);
  failures.forEach((f) => console.log(`    ${f}`));
}
console.log('\n  Entries for TOUR_PAGE_MEDIA in src/lib/studioTour.js:\n');
for (const [key, r] of Object.entries(results)) {
  const d = r['1440'], p = r['390'];
  if (!d?.urls) { console.log(`  ${key}: null,`); continue; }
  console.log(`  ${key}: {`);
  console.log(`    poster: '${d.urls.poster}',\n    webm: '${d.urls.webm}',\n    mp4: '${d.urls.mp4}',\n    seconds: ${d.seconds},`);
  if (p?.urls) console.log(`    phone: {\n      poster: '${p.urls.poster}',\n      webm: '${p.urls.webm}',\n      mp4: '${p.urls.mp4}',\n      seconds: ${p.seconds},\n    },`);
  console.log('  },');
}

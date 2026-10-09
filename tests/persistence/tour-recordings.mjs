/**
 * tests/persistence/tour-recordings.mjs
 *
 * THE RECORDINGS, CHECKED WITHOUT THE NETWORK.
 *
 * Every chapter's footage lives at studio-tour/<chapter>/<width> on Cloudinary
 * and is referenced by URL from src/lib/studioTour.js. Two different things can
 * go wrong with that and they need two different guards:
 *
 *   THE MAP can drift. A chapter renamed, a width dropped, a poster pointing at
 *   the placeholder long after its footage exists, a `seconds` nobody
 *   re-measured after the script changed. All of that is readable here, with no
 *   credential and no request, so it runs in CI on every PR.
 *
 *   THE DELIVERY can drift. A file that 404s, a transcode that comes back over
 *   the 1.5 MB ceiling. Only a request can know, so that is
 *   tour-recordings-live.mjs, which runs locally beside hero-masters-live.mjs
 *   for exactly the reason that one does: CI is not where this repo asks
 *   Cloudinary questions.
 *
 * `seconds` IS MEASURED, NOT DECLARED. The recording script counts the frames
 * it wrote and divides by the frame rate, so the number in the map is the
 * length of the file. CHAPTERS[].seconds stays the TARGET the script is written
 * against, and the drift between them is what this guard bounds: a recording
 * that wanders far from its target is a script that no longer does what its
 * chapter says.
 */
import { CHAPTERS, MEDIA, PLACEHOLDER_POSTER, mediaFor } from '../../src/lib/studioTour.js';
import { pass, fail } from './_shared.mjs';

/** How far a measured recording may sit from its chapter's target, in seconds. */
const DRIFT = 3;
/** The brief's window, and the copy guard checks the targets against it too. */
const MIN_SECONDS = 8;
const MAX_SECONDS = 20;

export function runTourRecordings() {
  // THE RUNNER SPREADS WHAT THIS RETURNS. scripts/test-ci.mjs does
  // `results.push(...await fn())`, so a guard returns an ARRAY OF BOOLEANS and
  // nothing else; returning a summary object crashes the module before a single
  // assertion is counted, and the run reports it as crashed rather than failed.
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Tour recordings, read off the media map with no network:\n');

  // ── 1. every chapter is accounted for, either footage or an honest null ──
  const keys = CHAPTERS.map((c) => c.key);
  check('every chapter has a MEDIA key', keys.every((k) => k in MEDIA),
    keys.filter((k) => !(k in MEDIA)).join(', ') || 'all nine');
  check('MEDIA holds no key that is not a chapter',
    Object.keys(MEDIA).every((k) => keys.includes(k)),
    Object.keys(MEDIA).filter((k) => !keys.includes(k)).join(', ') || 'none');

  const withFootage = keys.filter((k) => MEDIA[k]);
  const without = keys.filter((k) => !MEDIA[k]);
  console.log(`  ${withFootage.length} chapter(s) with footage, ${without.length} without${without.length ? `: ${without.join(', ')}` : ''}`);

  // ── 2. a chapter with no footage still draws, on the shared placeholder ──
  for (const key of without) {
    const m = mediaFor(key);
    check(`${key} falls back to the placeholder poster`,
      m.poster === PLACEHOLDER_POSTER && !m.hasFootage, m.poster === PLACEHOLDER_POSTER ? 'placeholder' : m.poster);
  }

  // ── 3. every recorded chapter, at both widths ────────────────────────────
  for (const key of withFootage) {
    const entry = MEDIA[key];
    const pairs = [['1440', entry], ['390', entry.phone]];
    for (const [label, side] of pairs) {
      const at = `${key} @ ${label}`;
      if (!side) { check(`${at} exists`, false, 'missing'); continue; }

      // <width>, or <width>-<take> since takes stopped overwriting their path.
      const want = `studio-tour/${key}/${label}`;
      for (const [field, ext] of [['webm', '.webm'], ['mp4', '.mp4'], ['poster', '.jpg']]) {
        const url = side[field];
        const ok = typeof url === 'string'
          && url.startsWith('https://res.cloudinary.com/')
          && new RegExp(`/${want}(-\\d{14})?\\${ext}$`).test(url);
        check(`${at} ${field} points at ${want}${ext}`, ok, ok ? 'ok' : String(url).slice(0, 90));
      }

      // The mp4 is a transcode, and an unbounded one is a size nobody chose.
      check(`${at} mp4 carries a bounded transcode`,
        /\/vc_h264,q_auto[^/]*,br_\d+k\//.test(side.mp4 || ''),
        (String(side.mp4).match(/upload\/([^/]+)\//) || [, 'none'])[1]);
      // The poster is the frame at 1.0s, as the brief asks.
      check(`${at} poster is the frame at 1.0s`,
        /\/so_1\.0[,/]/.test(side.poster || ''),
        (String(side.poster).match(/upload\/([^/]+)\//) || [, 'none'])[1]);
      check(`${at} poster is not the placeholder`, side.poster !== PLACEHOLDER_POSTER);

      // ── 4. the measured length ────────────────────────────────────────────
      const target = CHAPTERS.find((c) => c.key === key)?.seconds;
      const secs = side.seconds;
      check(`${at} is inside the brief's ${MIN_SECONDS} to ${MAX_SECONDS} seconds`,
        typeof secs === 'number' && secs >= MIN_SECONDS && secs <= MAX_SECONDS, `${secs}s`);
      check(`${at} is within ${DRIFT}s of its chapter target`,
        typeof secs === 'number' && Math.abs(secs - target) <= DRIFT,
        `${secs}s against a target of ${target}s`);
    }

    // ── 5. the web panel reads the desktop set, the phone set is additive ──
    const web = mediaFor(key);
    check(`${key} resolves to the 1440 footage by default`,
      web.webm === entry.webm && web.hasFootage, web.hasFootage ? '1440' : 'no footage');
    const phone = mediaFor(key, { phone: true });
    check(`${key} resolves to the 390 footage when asked`,
      phone.webm === entry.phone?.webm, phone.webm === entry.phone?.webm ? '390' : 'fell back');
  }

  return r;
}

/**
 * tests/persistence/upload-failure-message.mjs
 *
 * AN UPLOAD THAT FAILS SAYS WHY.
 *
 * MediaLibraryModal caught every upload failure with a bare `catch {` —
 * binding nothing — and replaced it with "Failed to upload <name>.": the
 * file's name and not one word about the reason. A couple whose hero video was
 * refused could not tell a file that was too large from a network that dropped
 * from a session that had expired. Neither could we, because the server's own
 * answer was discarded at the moment it arrived.
 *
 * This is the same shape as the `catch {` in UniverseStudio that cost a full
 * diagnostic pass on 2026-09-05, and as api/send-invites' 500 that named the
 * floor and not the room.
 *
 * ── WHERE THE REAL CEILING IS, AND WHY THIS FILE CANNOT NAME IT ────────────
 *
 * The upload does not pass through our own API. The Base44 SDK POSTs multipart
 * straight from the browser to
 *   base44.app/api/apps/<id>/integration-endpoints/Core/UploadFile
 * so Vercel's 100 MB body limit does not apply on this path, and no Cloudinary
 * preset is involved either. The ceiling is Base44's, and nothing in this
 * repository establishes it — uploadValidation's 500 MB is our own number with
 * no evidence behind it.
 *
 * That gap IS the bug: if Base44 refuses below 500 MB, every video between the
 * two passes our check and dies at the network. Surfacing the server's status
 * and message is the only way anyone learns the real figure, which is why this
 * guard pins the surfacing rather than a number.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export async function runUploadFailureMessage() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const { uploadFailureMessage, uploadLimitsLabel, validateUploadFile } = await import('../../src/lib/uploadValidation.js');
  // Read from the rejection message rather than retyped, so this guard cannot
  // drift from the constant it is checking.
  const VIDEO_MAX_MB = Number((validateUploadFile({ size: 10 ** 12, type: 'video/mp4' }, 'image_or_video') || '').match(/up to (\d+) MB/)?.[1]);
  const video = { size: 120 * 1024 * 1024, type: 'video/mp4', name: 'hero.mp4' };

  // ── 1. the reason reaches the couple, per cause ───────────────────────────
  const tooBig = uploadFailureMessage({ response: { status: 413, data: { error: 'Payload too large' } } }, video);
  check('a refused-for-size upload says so', /too large/i.test(tooBig), tooBig);
  check('  and names the size they actually picked', /120\.0 MB/.test(tooBig),
    'a limit without your own number beside it is a rule, not an answer');
  check('  and carries the server\'s own words', /Payload too large/.test(tooBig), 'not paraphrased away');

  const wrongType = uploadFailureMessage({ response: { status: 415 } }, video);
  check('a refused-for-type upload says so', /type was refused/i.test(wrongType), wrongType);

  const expired = uploadFailureMessage({ response: { status: 401 } }, video);
  check('an expired session says to sign in', /sign in again/i.test(expired), expired);

  // NO STATUS IS ITS OWN ANSWER. A large file over a phone network drops
  // mid-upload regularly, and "your file is wrong" is the wrong thing to tell
  // someone whose connection failed.
  const dropped = uploadFailureMessage(new Error('Network Error'), video);
  check('an upload that never reached the server says that', /did not reach the server/i.test(dropped), dropped);
  check('  and does not blame the file', !/too large|type/i.test(dropped), 'connection, not content');

  // ── 2. nothing is silent ──────────────────────────────────────────────────
  for (const [what, err] of [['an empty object', {}], ['null', null], ['a bare string', 'boom']]) {
    const msg = uploadFailureMessage(err, video);
    check(`  even ${what} produces a sentence`, typeof msg === 'string' && msg.length > 20, msg.slice(0, 60));
  }

  // ── 3. the limits are stated before a file is chosen ──────────────────────
  const label = uploadLimitsLabel();
  // NO INVENTED NUMBER ON SCREEN. VIDEO_MAX_BYTES is ours and unsourced; the
  // real ceiling is Base44's and unmeasured. A size we made up, printed beside
  // the picker, reads as a promise the server has not made — and the first
  // refusal below it would be the product lying. Types yes, number no, until
  // it is measured.
  check('the label states the types', /MP4 or MOV/.test(label) && /JPEG/.test(label), label);
  check('  and promises the reason rather than leaving it a mystery', /reason will be shown/i.test(label),
    'the refusal explains itself');
  // THE NUMBER ON SCREEN IS THE PRODUCT CAP, and it follows the constant rather
  // than being retyped — a label and a check that can disagree is how 500 MB
  // survived here unsourced for as long as it did.
  //
  // It is NOT the platform ceiling, which sits above 200 MB and at or below
  // 240 MB (BASE44_PLATFORM_NOTES.md). Two different claims, deliberately kept
  // apart: one is what we promise, the other is what Base44 happens to allow
  // today, and conflating them is how a limit stops being re-checked.
  check('  and the size it names is the product cap', new RegExp(`Videos up to ${VIDEO_MAX_MB} MB`).test(label),
    `${VIDEO_MAX_MB} MB — a product decision, not the platform's ceiling`);
  check('    with the length it means in practice', /about a minute at 1080p/.test(label),
    'a couple thinks in seconds of footage, not megabytes');
  const modal = read('src/components/website-builder/MediaLibraryModal.jsx');
  // THE ATTRIBUTE, NOT A PREFIX OF IT. This was /data-upload-limits/, which
  // matches `data-upload-limits-removed` just as happily — a plant that
  // renamed the attribute stayed green. The boundary is the assertion.
  check('  and the uploader shows them up front',
    /data-upload-limits[\s=>]/.test(modal) && /uploadLimitsLabel\(\)/.test(modal),
    'beside the drop zone, before a file is picked');

  // ── 4. the catch is bound ─────────────────────────────────────────────────
  // THE DEFECT ITSELF, pinned so it cannot come back wearing the same shape.
  const code = modal.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  check('the upload catch binds its error', !/\}\s*catch\s*\{/.test(code),
    /\}\s*catch\s*\{/.test(code) ? 'a bare catch is back' : 'catch (err)');
  check('  and the generic message is gone', !/Failed to upload \$\{item\.file\.name\}/.test(code),
    'the name of the file was never the answer');

  // ── 5. the client check still rejects before the network ──────────────────
  // Surfacing server errors is not a licence to stop checking locally: a
  // 600 MB file should never leave the machine.
  const huge = validateUploadFile({ size: 600 * 1024 * 1024, type: 'video/mp4' }, 'image_or_video');
  check('an over-limit video is refused locally', !!huge, huge);
  const ok = validateUploadFile({ size: 10 * 1024 * 1024, type: 'video/mp4' }, 'image_or_video');
  check('  and an ordinary one is not', ok === null, 'null means fine');

  // ── THE REFUSAL IS CALM AND HAS SOMETHING TO DO NEXT ─────────────────────
  //
  // "File too large" states a verdict and leaves the couple holding a video
  // they cannot use. The cap is a PRODUCT decision (50 MB) rather than the
  // platform's ceiling (above 200, at or below 240 — see
  // BASE44_PLATFORM_NOTES.md), so the couple is not up against a hard wall:
  // trimming or re-exporting genuinely solves it, and saying so costs a clause.
  const over = validateUploadFile({ size: 80 * 1024 * 1024, type: 'video/mp4' }, 'image_or_video');
  check('  the refusal names the couple\'s own size', /80 MB/.test(over || ''), over);
  check('    and the limit, from the constant rather than a literal',
    new RegExp(`up to ${VIDEO_MAX_MB} MB`).test(over || ''), `${VIDEO_MAX_MB} MB`);
  check('    and says what to do about it', /trimming|smaller size/i.test(over || ''), 'trim or re-export');
  check('    without a verdict for a sentence', !/^File too large/.test(over || ''), 'calm pass');

  // A video at the cap passes; one over it does not. The boundary, both sides.
  check('  a video under the cap passes',
    validateUploadFile({ size: (VIDEO_MAX_MB - 1) * 1024 * 1024, type: 'video/mp4' }, 'image_or_video') === null,
    `${VIDEO_MAX_MB - 1} MB`);

  return results;
}

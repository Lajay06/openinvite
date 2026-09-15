/**
 * src/lib/uploadValidation.js
 *
 * Shared file-upload validation helpers.
 * Used by all components that call base44.integrations.Core.UploadFile().
 *
 * Exports:
 *   validateUploadFile(file, mode) → string | null
 *     Returns null if the file passes all checks.
 *     Returns a human-readable error string if the file is rejected.
 *
 * Modes:
 *   'image'          — JPEG / PNG / WebP / GIF, max 50 MB
 *   'image_or_video' — above images + MP4 / WebM / QuickTime, max 50 MB images / 500 MB video
 *   'document'       — PDF / Word / JPEG / PNG, max 50 MB
 *   'audio'          — MP3 / WAV / OGG / M4A, max 20 MB
 */

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const ALLOWED_DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);

const IMAGE_MAX_BYTES = 50  * 1024 * 1024; //  50 MB
// A PRODUCT DECISION, NOT THE PLATFORM'S CEILING — AND THE TWO ARE DIFFERENT
// NUMBERS ON PURPOSE.
//
// The platform ceiling sits above 200 MB and at or below 240 MB: a probe on the
// smoke account took 25, 50, 100 and 200 MB (HTTP 200 in 7s, 13s, 24s and 47s)
// without a refusal, and the owner's own measurements bracket it from above —
// 25 MB succeeded, 240 MB failed. That range is in BASE44_PLATFORM_NOTES.md,
// deliberately not as a midpoint.
//
// THE CAP HERE IS 50 MB, far below it. Owner's decision 2026-09-15,
// superseding an earlier 200. The reasons are not about what Base44 accepts:
//
//   - 200 MB took 47 SECONDS on a good desktop connection. On a phone that is
//     minutes of a progress bar, and the couple most likely to upload a hero
//     video is doing it from a phone.
//   - a hero video is a few seconds of movement behind a headline, not a film.
//     50 MB is about a minute at 1080p, already longer than the loop needs.
//   - a limit met early, with a sentence saying to trim or compress, is kinder
//     than one met after a four-minute upload fails.
//
// What this must NOT become is another 500 MB: a figure with no reasoning
// attached, written down once and then read as a fact. The reasoning is above;
// the platform's own limit is in the notes; they are separate claims.
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // product decision — see the note above
const DOC_MAX_BYTES   = 50  * 1024 * 1024; //  50 MB
const AUDIO_MAX_BYTES = 20  * 1024 * 1024; //  20 MB — a background track, not a full album

/**
 * @param {File}   file
 * @param {'image'|'image_or_video'|'document'|'audio'} [mode='image']
 * @returns {string|null}  null = valid, string = error message to show to user
 */
export function validateUploadFile(file, mode = 'image') {
  const type = file.type;

  if (mode === 'audio') {
    if (!ALLOWED_AUDIO_TYPES.has(type)) {
      return 'Invalid file type — please upload an MP3, WAV, OGG, or M4A audio file.';
    }
    if (file.size > AUDIO_MAX_BYTES) {
      return 'File too large — maximum audio size is 20 MB.';
    }
    return null;
  }

  if (mode === 'image') {
    if (!ALLOWED_IMAGE_TYPES.has(type)) {
      return 'Invalid file type — please upload a JPEG, PNG, WebP, or GIF image.';
    }
    if (file.size > IMAGE_MAX_BYTES) {
      return 'File too large — maximum image size is 50 MB.';
    }
    return null;
  }

  if (mode === 'image_or_video') {
    const isImage = ALLOWED_IMAGE_TYPES.has(type);
    const isVideo = ALLOWED_VIDEO_TYPES.has(type);
    if (!isImage && !isVideo) {
      return 'Invalid file type — please upload a JPEG, PNG, WebP, or GIF image, or an MP4, WebM, or QuickTime video.';
    }
    const limit = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
    const limitLabel = isVideo ? `${VIDEO_MAX_BYTES / (1024 * 1024)} MB` : `${IMAGE_MAX_BYTES / (1024 * 1024)} MB`;
    if (file.size > limit) {
      // CALM, AND WITH SOMETHING TO DO NEXT. "File too large" states a verdict
      // and leaves the couple holding a video they cannot use; trimming or
      // compressing is the way out and costs one clause to say.
      return isVideo
        ? `That video is ${(file.size / (1024 * 1024)).toFixed(0)} MB. Videos can be up to ${limitLabel} — try trimming it, or exporting at a smaller size.`
        : `That image is ${(file.size / (1024 * 1024)).toFixed(0)} MB. Images can be up to ${limitLabel} — try exporting it at a smaller size.`;
    }
    return null;
  }

  if (mode === 'document') {
    if (!ALLOWED_DOC_TYPES.has(type)) {
      return 'Invalid file type — please upload a PDF, Word document, JPEG, or PNG file.';
    }
    if (file.size > DOC_MAX_BYTES) {
      return 'File too large — maximum document size is 50 MB.';
    }
    return null;
  }

  return null;
}


/**
 * WHAT TO SAY WHEN AN UPLOAD FAILS, AND WHY IT HAS TO COME FROM THE SERVER.
 *
 * MediaLibraryModal caught every upload failure with a bare `catch {` and
 * replaced it with "Failed to upload <name>." — the file's name and not one
 * word about why. A couple whose video was refused could not tell a file that
 * was too large from a network that dropped from a session that had expired,
 * and neither could we: the server's own answer was discarded at the moment
 * it arrived.
 *
 * ── THE LIMIT THIS FILE DECLARES IS OURS, NOT THE PLATFORM'S ───────────────
 *
 * VIDEO_MAX_BYTES is 500 MB and nothing in this repository establishes that
 * number. The upload does not pass through our own API at all: the Base44 SDK
 * POSTs multipart straight from the browser to
 *   base44.app/api/apps/<id>/integration-endpoints/Core/UploadFile
 * so Vercel's 100 MB body limit does not apply, and no Cloudinary preset is
 * involved on this path either. The real ceiling is Base44's, and it is not
 * documented here.
 *
 * If Base44's limit is below 500 MB — which is the ordinary case — then every
 * video between the two passes our check and fails at the network, which is
 * exactly the reported symptom. Surfacing the server's own status and message
 * is therefore not only better manners; it is the only way anyone finds out
 * what the real number is.
 */
const STATUS_REASONS = {
  413: 'That file is too large for the server to accept.',
  415: 'That file type was refused by the server.',
  400: 'The server refused that file.',
  401: 'Your session has expired — sign in again and retry.',
  403: 'Your session is not allowed to upload here — sign in again and retry.',
  429: 'Too many uploads at once — wait a moment and retry.',
};

/**
 * A sentence a couple can act on, built from what the server actually said.
 *
 * @param {unknown} err   the thrown error, bound rather than discarded
 * @param {File}    file  the file that failed, for the size in the message
 * @returns {string}
 */
export function uploadFailureMessage(err, file) {
  const status = err?.response?.status ?? err?.status ?? null;
  // Axios puts the body on response.data; Base44's errors carry a message.
  const serverSaid = err?.response?.data?.error
    || err?.response?.data?.message
    || (typeof err?.response?.data === 'string' ? err.response.data : '')
    || '';
  const mb = file?.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '';

  if (status && STATUS_REASONS[status]) {
    return `${STATUS_REASONS[status]}${mb ? ` Yours is ${mb}.` : ''}${serverSaid ? ` (${String(serverSaid).slice(0, 120)})` : ''}`;
  }
  // NO STATUS AT ALL means the request never got an answer — offline, blocked,
  // or the connection dropped mid-upload, which a large file over a phone
  // network does regularly. Naming that is the difference between "try again"
  // and "your file is wrong".
  if (!status) {
    return `Upload did not reach the server${mb ? ` (${mb})` : ''} — check your connection and retry.`;
  }
  return `The server refused that file (HTTP ${status})${serverSaid ? `: ${String(serverSaid).slice(0, 120)}` : ''}.`;
}

/**
 * WHAT TO SAY BEFORE A FILE IS CHOSEN, WITHOUT INVENTING A NUMBER.
 *
 * The first version of this printed "Videos up to 500 MB" — VIDEO_MAX_BYTES,
 * which is OUR number and has no source. Nothing in this repository, the
 * Base44 SDK, or BASE44_PLATFORM_NOTES establishes it, and the real ceiling
 * belongs to Base44, which this upload path reaches directly from the browser.
 *
 * Telling a couple a size we made up is worse than telling them nothing: it
 * reads as a promise, and the first time the server refuses something smaller
 * the product has lied to them. Owner ruling 2026-09-15: state the types, and
 * say that a refusal will explain itself — which it now does, because
 * uploadFailureMessage surfaces the server's own status and words.
 *
 * The number returns here once it is MEASURED, not before.
 */
export function uploadLimitsLabel() {
  // A DELIBERATE UNDER-PROMISE. 200 MB is a verified FLOOR, not a measured
  // ceiling — 25/50/100/200 all succeeded and no refusal was found, so the
  // true limit is higher and unknown. The owner's call: a couple choosing a
  // file needs a number, 200 MB is already large for a hero video, and a
  // number we have watched succeed is the opposite of the 500 MB that was here
  // before with no source at all.
  return `Videos up to ${VIDEO_MAX_BYTES / (1024 * 1024)} MB (about a minute at 1080p), MP4 or MOV. Images up to ${IMAGE_MAX_BYTES / (1024 * 1024)} MB, JPEG, PNG, WebP or GIF. If an upload is refused, the reason will be shown here.`;
}

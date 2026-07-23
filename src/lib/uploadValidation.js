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
const VIDEO_MAX_BYTES = 500 * 1024 * 1024; // 500 MB
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
    const limitLabel = isVideo ? '500 MB' : '50 MB';
    if (file.size > limit) {
      return `File too large — maximum ${isVideo ? 'video' : 'image'} size is ${limitLabel}.`;
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

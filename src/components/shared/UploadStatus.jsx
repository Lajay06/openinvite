import React from 'react';
import { useReducedMotion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * UploadStatus — the one shared upload-feedback UI, rendered inline at the
 * exact spot the file will appear (a thumbnail slot, a dropzone, a cover
 * photo frame) rather than only a corner toast, which is easy to miss —
 * that gap is exactly why users assumed nothing was happening and
 * refreshed mid-upload. Used identically by every upload site, driven by
 * the shared useFileUpload() hook's status.
 *
 * status:
 *   'uploading' — a placeholder box with an indeterminate progress bar
 *                 (no real byte-progress is available from the upload
 *                 path — see useFileUpload.js's own comment) and
 *                 "Uploading…"; a static bar under reduced motion.
 *   'error'     — an inline message + a "Retry" pill.
 *   'success' / 'idle' — renders nothing; the caller swaps in the real
 *                 thumbnail/image once it has the uploaded file_url.
 *
 * dark — set true on dark-surface hosts (e.g. MediaLibraryModal's #1A1A1A
 *        panel) so text/borders stay legible against a dark background.
 */
export default function UploadStatus({ status, error, onRetry, height = 120, style, dark = false }) {
  const prefersReducedMotion = useReducedMotion();

  if (status === 'idle' || status === 'success') return null;

  if (status === 'uploading') {
    return (
      <div
        style={{
          height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10,
          background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(10,10,10,0.03)',
          border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(10,10,10,0.08)',
          ...style,
        }}
      >
        <div style={{ width: '60%', maxWidth: 160, height: 4, background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(10,10,10,0.08)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              position: 'absolute', top: 0, bottom: 0, width: '40%', borderRadius: 999, background: '#E03553',
              left: prefersReducedMotion ? '30%' : undefined,
              animation: prefersReducedMotion ? 'none' : 'uploadIndeterminate 1.2s ease-in-out infinite',
            }}
          />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
          Uploading…
        </span>
      </div>
    );
  }

  // status === 'error'
  return (
    <div
      style={{
        minHeight: height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, background: '#fee2e2', border: '1px solid rgba(153,27,27,0.15)', padding: '16px 20px', textAlign: 'center',
        ...style,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', fontFamily: PJS }}>
        {error || 'Upload failed.'}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary" style={{ fontSize: 11 }}>
          Retry
        </button>
      )}
    </div>
  );
}

import { useCallback, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { validateUploadFile } from '@/lib/uploadValidation';

/**
 * useFileUpload — one shared upload lifecycle for every upload site in the
 * app (builder, moodboard, attire, vendor docs, our story, photo gallery,
 * seating, website customization). Previously each site hand-rolled its own
 * setUploadingX(true/false) boolean and a toast — easy to miss, and gave no
 * visible feedback at the actual upload spot (a thumbnail placeholder,
 * a progress state, an inline error), which is why users assumed nothing
 * was happening and refreshed mid-upload.
 *
 * base44.integrations.Core.UploadFile is a thin proxy over
 * `axios.post(.../integration-endpoints/Core/UploadFile, formData)` (see
 * node_modules/@base44/sdk/dist/modules/integrations.js) — the proxy takes
 * a single `data` argument with no way to pass an axios `onUploadProgress`
 * callback through, so real byte-level progress isn't available here
 * without bypassing the SDK's own auth/base-URL handling. `status` is
 * therefore an indeterminate state, not a percentage — UploadStatus.jsx
 * renders it as an animated (or static, under reduced motion) indeterminate
 * bar rather than fabricating a fake progress number.
 *
 * @param {'image'|'image_or_video'|'document'} mode — passed straight to validateUploadFile
 * @returns {{
 *   status: 'idle'|'uploading'|'success'|'error',
 *   error: string|null,
 *   upload: (file: File) => Promise<{file_url: string}|null>,
 *   retry: () => Promise<{file_url: string}|null>,
 *   reset: () => void,
 * }}
 */
export function useFileUpload(mode = 'image') {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const lastFileRef = useRef(null);

  const runUpload = useCallback(async (file) => {
    lastFileRef.current = file;
    setError(null);

    const validationError = validateUploadFile(file, mode);
    if (validationError) {
      setStatus('error');
      setError(validationError);
      return null;
    }

    setStatus('uploading');
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setStatus('success');
      return result;
    } catch (err) {
      console.error('[useFileUpload] upload failed:', err);
      setStatus('error');
      setError('Upload failed. Please try again.');
      return null;
    }
  }, [mode]);

  const upload = useCallback((file) => runUpload(file), [runUpload]);

  const retry = useCallback(() => {
    if (!lastFileRef.current) return Promise.resolve(null);
    return runUpload(lastFileRef.current);
  }, [runUpload]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    lastFileRef.current = null;
  }, []);

  return { status, error, upload, retry, reset };
}

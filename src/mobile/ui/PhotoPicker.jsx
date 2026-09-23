import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RefreshCw } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { RowGroup } from './Row';
import Row from './Row';
import PillButton from './PillButton';
import ProgressBar from './ProgressBar';
import { useFileUpload } from '@/hooks/useFileUpload';
import { isNative, pickPhoto } from '../native';
import { useOnline } from '../shell/OfflineBanner';

/**
 * The exact string src/hooks/useFileUpload.js sets when an upload throws —
 * a network or server failure, with no reason it can name. Its OTHER errors
 * are validation results ("too large", "not an image"), which are specific,
 * client-side and true whatever the connection is doing, so those are shown
 * as they come. If the hook's wording ever drifts, this stops matching and
 * the couple sees that string instead: less tailored, never wrong.
 */
const NO_REASON_GIVEN = 'Upload failed. Please try again.';

/**
 * "Take photo" or "Choose from library" in a bottom sheet, then upload
 * through the same hook and Base44 upload endpoint the desktop uses
 * (src/hooks/useFileUpload.js). Progress and a retry on failure. On the
 * web the two rows open a file input instead. onUploaded(file_url).
 */
export default function PhotoPicker({ open, onClose, onUploaded, title = 'Add a photo' }) {
  const { upload, retry, status, error, reset } = useFileUpload('image');
  const online = useOnline();
  const [phase, setPhase] = useState('pick'); // pick | uploading | error | done
  const fileRef = useRef(null);

  const run = async (file) => {
    if (!file) { setPhase('pick'); return; }
    setPhase('uploading');
    const result = await upload(file);
    if (result?.file_url) { setPhase('done'); onUploaded?.(result.file_url); close(); }
    else setPhase('error');
  };
  const choose = async (source) => {
    if (isNative()) { const f = await pickPhoto(source); if (f) run(f); return; }
    if (fileRef.current) { fileRef.current.setAttribute('capture', source === 'camera' ? 'environment' : ''); if (source !== 'camera') fileRef.current.removeAttribute('capture'); fileRef.current.click(); }
  };
  const close = () => { reset(); setPhase('pick'); onClose?.(); };
  const again = async () => { setPhase('uploading'); const r = await retry(); if (r?.file_url) { onUploaded?.(r.file_url); close(); } else setPhase('error'); };

  // WHY THE CONNECTION IS NOT BLAMED BY DEFAULT. This said "Check your
  // connection and try again" on a phone that was online, the same
  // misplaced blame the load and save states carried. The connection is
  // named only when there is none, and every branch says plainly that the
  // photo is not saved — an upload sheet that closes on success is exactly
  // where a vague failure reads as one.
  const reason = error && error !== NO_REASON_GIVEN
    ? error
    : online
      ? 'It has not been saved. Try again, or choose another photo.'
      : 'You are offline, so it never reached us. It is still on your phone; try again once you are back on a connection.';

  return (
    <BottomSheet open={open} onClose={close} title={title}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => run(e.target.files?.[0])} />
      {phase === 'uploading' || status === 'uploading' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0 16px' }}>
          <p className="oi-m-body oi-m-strong">Uploading</p>
          <ProgressBar value={1} max={1} note="Sending your photo. This can take a moment on a slow connection." />
        </div>
      ) : phase === 'error' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0 16px' }}>
          <p className="oi-m-body oi-m-strong">Your photo did not upload</p>
          <p className="oi-m-meta">{reason}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <PillButton variant="primary" icon={RefreshCw} onClick={again}>Try again</PillButton>
            <PillButton variant="secondary" onClick={() => setPhase('pick')}>Choose another</PillButton>
          </div>
        </div>
      ) : (
        <RowGroup>
          <Row icon={Camera} tile="tint" label="Take photo" onClick={() => choose('camera')} />
          <Row icon={ImageIcon} tile="neutral" label="Choose from library" onClick={() => choose('library')} />
        </RowGroup>
      )}
    </BottomSheet>
  );
}

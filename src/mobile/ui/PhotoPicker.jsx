import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RefreshCw } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { RowGroup } from './Row';
import Row from './Row';
import PillButton from './PillButton';
import ProgressBar from './ProgressBar';
import { useFileUpload } from '@/hooks/useFileUpload';
import { isNative, pickPhoto } from '../native';

/**
 * "Take photo" or "Choose from library" in a bottom sheet, then upload
 * through the same hook and Base44 upload endpoint the desktop uses
 * (src/hooks/useFileUpload.js). Progress and a retry on failure. On the
 * web the two rows open a file input instead. onUploaded(file_url).
 */
export default function PhotoPicker({ open, onClose, onUploaded, title = 'Add a photo' }) {
  const { upload, retry, status, error, reset } = useFileUpload('image');
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
          <p className="oi-m-body oi-m-strong">That did not upload</p>
          <p className="oi-m-meta">{error || 'Check your connection and try again.'}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <PillButton variant="primary" icon={RefreshCw} onClick={again}>Try again</PillButton>
            <PillButton variant="secondary" onClick={() => setPhase('pick')}>Choose another</PillButton>
          </div>
        </div>
      ) : (
        <RowGroup>
          <Row icon={Camera} tile="blush" label="Take photo" onClick={() => choose('camera')} />
          <Row icon={ImageIcon} tile="sand" label="Choose from library" onClick={() => choose('library')} />
        </RowGroup>
      )}
    </BottomSheet>
  );
}

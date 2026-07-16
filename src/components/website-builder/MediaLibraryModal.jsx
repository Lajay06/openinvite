import React, { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';
import { validateUploadFile } from '@/lib/uploadValidation';
import UploadStatus from '@/components/shared/UploadStatus';

let queueItemId = 0;

const STOCK_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #0f3460 0%, #533483 100%)',
  'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
  'linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)',
  'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #1d4350 0%, #a43931 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%)',
  'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
  'linear-gradient(135deg, #cc2b5e 0%, #753a88 100%)',
  'linear-gradient(135deg, #005c97 0%, #363795 100%)',
];

export default function MediaLibraryModal({ library, onClose, onSelect, onUploaded }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('uploaded');
  const [queue, setQueue] = useState([]); // [{ id, file, status: 'uploading'|'error', error }]
  const [dragOver, setDragOver] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const fileInputRef = useRef(null);

  const uploading = queue.some(q => q.status === 'uploading');

  const uploadOne = useCallback(async (item) => {
    setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploading', error: null } : i));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: item.file });
      const fileType = item.file.type.startsWith('video/') ? 'video' : 'photo';
      onUploaded({ url: file_url, name: item.file.name, type: fileType });
      setQueue(q => q.filter(i => i.id !== item.id));
    } catch {
      setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'error', error: `Failed to upload ${item.file.name}.` } : i));
    }
  }, [onUploaded]);

  const uploadFiles = useCallback((files) => {
    const fileArray = Array.from(files);

    // Validate every file before uploading any
    for (const file of fileArray) {
      const err = validateUploadFile(file, 'image_or_video');
      if (err) { toast.error(`${file.name}: ${err}`); return; }
    }

    const items = fileArray.map(file => ({ id: ++queueItemId, file, status: 'uploading', error: null }));
    setQueue(q => [...q, ...items]);
    items.forEach(uploadOne);
  }, [uploadOne]);

  const retryItem = useCallback((id) => {
    setQueue(q => {
      const item = q.find(i => i.id === id);
      if (item) uploadOne(item);
      return q;
    });
  }, [uploadOne]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files?.length) uploadFiles(files);
  }, [uploadFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleAddVideoUrl = () => {
    const trimmed = videoUrl.trim();
    if (!trimmed) return;
    const item = { url: trimmed, name: trimmed.split('/').pop() || 'Video', type: 'video_url' };
    onUploaded(item);
    setVideoUrl('');
    toast.success('Video URL added');
  };

  const filteredUploaded = library.filter(item => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredVideos = library.filter(item =>
    item.type === 'video' || item.type === 'video_url'
  );

  const isVideo = selected && (selected.type === 'video' || selected.type === 'video_url');

  const TABS = [
    { id: 'uploaded', label: 'Uploaded' },
    { id: 'videos', label: 'Videos' },
    { id: 'stock', label: 'Stock photos' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#1A1A1A', width: '90vw', maxWidth: 1000, height: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', background: '#111111', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <h3 style={{ flex: 1, margin: 0, fontSize: 15, fontWeight: 600, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Media library</h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '6px 14px', background: '#E03553', color: '#FFFFFF', border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {uploading ? 'Uploading…' : '+ Upload'}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', lineHeight: 1, padding: '2px 4px' }}
          >
            ×
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            multiple
            style={{ display: 'none' }}
            onChange={e => { uploadFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        {/* Tab bar + search */}
        <div style={{ padding: '0 20px', background: '#111111', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 0, flex: 1 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: 'transparent',
                  color: tab === t.id ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderBottom: tab === t.id ? '2px solid #FFFFFF' : '2px solid transparent',
                  fontFamily: 'inherit',
                  transition: 'color 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab !== 'stock' && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.06)',
                padding: '5px 10px',
                fontSize: 12,
                outline: 'none',
                width: 160,
                color: '#FFFFFF',
                fontFamily: 'inherit',
              }}
            />
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

          {/* ── UPLOADED TAB ── */}
          {tab === 'uploaded' && (
            <>
              {/* Drag & drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `1px dashed ${dragOver ? '#E03553' : 'rgba(255,255,255,0.15)'}`,
                  background: dragOver ? 'rgba(224,53,83,0.05)' : 'rgba(255,255,255,0.02)',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: 16,
                  transition: 'all 0.15s',
                }}
              >
                <Upload size={20} color={dragOver ? '#E03553' : 'rgba(255,255,255,0.2)'} style={{ display: 'block', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: 12, color: dragOver ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', fontFamily: 'inherit' }}>
                  Drop photos or videos here, or click to upload
                </p>
              </div>

              {queue.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: filteredUploaded.length ? 8 : 0 }}>
                  {queue.map(item => (
                    <div key={item.id} style={{ aspectRatio: '1' }}>
                      <UploadStatus
                        status={item.status}
                        error={item.error}
                        onRetry={() => retryItem(item.id)}
                        dark
                        height="100%"
                        style={{ height: '100%', minHeight: 0 }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {filteredUploaded.length === 0 && queue.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.5)' }}>No uploads yet</p>
                  <p style={{ fontSize: 13, margin: 0 }}>Upload photos or videos to use them in your website</p>
                </div>
              ) : (
                <MediaGrid items={filteredUploaded} selected={selected} onSelect={setSelected} />
              )}
            </>
          )}

          {/* ── VIDEOS TAB ── */}
          {tab === 'videos' && (
            <>
              {/* Paste URL row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddVideoUrl()}
                  placeholder="YouTube, Vimeo or .mp4 URL"
                  style={{
                    flex: 1,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '8px 12px',
                    fontSize: 13,
                    color: '#FFFFFF',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleAddVideoUrl}
                  style={{ padding: '8px 16px', background: '#E03553', color: '#FFFFFF', border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  Add video
                </button>
              </div>

              {filteredVideos.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.5)' }}>No videos yet</p>
                  <p style={{ fontSize: 13, margin: 0 }}>Upload a video or paste a URL above</p>
                </div>
              ) : (
                <MediaGrid items={filteredVideos} selected={selected} onSelect={setSelected} />
              )}
            </>
          )}

          {/* ── STOCK TAB ── */}
          {tab === 'stock' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {STOCK_GRADIENTS.map((grad, i) => (
                <div
                  key={i}
                  style={{ aspectRatio: '1', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
                >
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '0 8px', fontFamily: 'inherit', fontWeight: 500 }}>
                    Stock library<br />coming soon
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected && (
          <div style={{ padding: '12px 20px', background: '#111111', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {/* Thumbnail preview */}
            {(selected.type === 'video' || selected.type === 'video_url') ? (
              <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>▶</span>
              </div>
            ) : (
              <img src={selected.thumbnail || selected.url} style={{ width: 44, height: 44, objectFit: 'cover', flexShrink: 0 }} alt="" />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#FFFFFF', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.name.length > 30 ? selected.name.slice(0, 30) + '…' : selected.name}
              </p>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#FFFFFF', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 999 }}>
                {isVideo ? 'Video' : 'Photo'}
              </span>
            </div>

            <button
              onClick={() => { onSelect(selected.url); onClose(); }}
              style={{ padding: '8px 20px', background: '#E03553', color: '#FFFFFF', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {isVideo ? 'Use this video' : 'Use this photo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaGrid({ items, selected, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
      {items.map((item, idx) => {
        const isSelected = selected?.url === item.url;
        const isVideo = item.type === 'video' || item.type === 'video_url';
        return (
          <div
            key={item.id || idx}
            onClick={() => onSelect(item)}
            style={{
              aspectRatio: '1',
              overflow: 'hidden',
              cursor: 'pointer',
              border: isSelected ? '2px solid #E03553' : '2px solid transparent',
              position: 'relative',
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            {isVideo ? (
              item.type === 'video_url' ? (
                <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 28, opacity: 0.5 }}>▶</span>
                </div>
              ) : (
                <video
                  src={item.url}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              )
            ) : (
              <img
                src={item.thumbnail || item.url}
                alt={item.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}

            {/* Video badge */}
            {isVideo && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, background: 'rgba(0,0,0,0.6)', color: '#FFFFFF', fontSize: 10, fontWeight: 600, padding: '2px 6px', fontFamily: 'inherit' }}>
                Video
              </div>
            )}

            {/* Selected check */}
            {isSelected && (
              <div style={{ position: 'absolute', top: 6, right: 6, background: '#E03553', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 11, fontWeight: 700 }}>
                ✓
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

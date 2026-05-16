import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

export default function MediaLibraryModal({ library, onClose, onSelect, onUploaded }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const filtered = library.filter(item => {
    if (filter === 'photos' && item.type !== 'photo') return false;
    if (filter === 'videos' && item.type !== 'video') return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUpload = async (files) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onUploaded({ url: file_url, name: file.name, type: 'photo' });
      } catch {
        toast.error('Upload failed');
      }
    }
    setUploading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#FFFFFF', width: '90vw', maxWidth: 1000, height: '82vh', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ flex: 1, margin: 0, fontSize: 18, fontWeight: 700, color: '#0A0A0A' }}>Media Library</h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ padding: '8px 16px', background: '#0A0A0A', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {uploading ? 'Uploading…' : '+ Upload'}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
        </div>

        {/* Filters + Search */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #EEEEEE', display: 'flex', gap: 8, alignItems: 'center' }}>
          {['all', 'photos', 'videos'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', border: `1px solid ${filter === f ? '#0A0A0A' : '#DDD'}`, background: filter === f ? '#0A0A0A' : 'transparent', color: filter === f ? '#FFF' : '#555', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'inherit' }}>
              {f}
            </button>
          ))}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search media..."
            style={{ marginLeft: 'auto', border: 'none', borderBottom: '1px solid #DDD', padding: '4px 0', fontSize: 13, outline: 'none', width: 180, fontFamily: 'inherit' }}
          />
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#0A0A0A' }}>No media yet</p>
              <p style={{ fontSize: 14, marginBottom: 20 }}>Upload photos to use them in your website sections</p>
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', background: '#0A0A0A', color: '#FFF', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                Upload Photos
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {filtered.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => setSelected(item)}
                  style={{ aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: selected?.id === item.id ? '3px solid #E03553' : '3px solid transparent', position: 'relative', background: '#F0F0F0' }}
                >
                  <img src={item.thumbnail || item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {selected?.id === item.id && (
                    <div style={{ position: 'absolute', top: 6, right: 6, background: '#E03553', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 12, fontWeight: 700 }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={selected.thumbnail || selected.url} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} alt="" />
            <span style={{ flex: 1, fontSize: 13, color: '#444', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</span>
            <button
              onClick={() => { onSelect(selected.url); onClose(); }}
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#E03553,#803D81)', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              Use This Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
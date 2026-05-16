import React, { useState } from 'react';
import { X } from 'lucide-react';

const PAGE_TEMPLATES = [
  { id: 'blank', name: 'Blank Page', description: 'Start from scratch' },
  { id: 'text-photos', name: 'Text + Photos', description: 'Story-style layout' },
  { id: 'event-details', name: 'Event Details', description: 'Ceremony & reception style' },
  { id: 'gallery', name: 'Gallery', description: 'Photo-forward layout' },
  { id: 'contact-info', name: 'Contact / Info', description: 'Practical information' },
];

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function NewPageModal({ onClose, onCreate, weddingSlug }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [template, setTemplate] = useState('blank');

  const handleNameChange = (v) => {
    setName(v);
    if (!slugEdited) setSlug(toSlug(v));
  };

  const handleSlugChange = (v) => {
    setSlug(toSlug(v));
    setSlugEdited(true);
  };

  const handleCreate = () => {
    if (!name.trim() || !slug.trim()) return;
    onCreate({ id: slug, name: name.trim(), slug, template, sections: [] });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: 420, background: '#fff', borderRadius: 12,
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>Create a New Page</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: 6 }}>
              Page Name
            </label>
            <input
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Wedding Party, Our Pets"
              style={{ width: '100%', border: '1px solid #EEE', borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#E03553'}
              onBlur={e => e.target.style.borderColor = '#EEE'}
              autoFocus
            />
          </div>

          {/* URL slug */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: 6 }}>
              Page URL
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EEE', borderRadius: 6, overflow: 'hidden' }}>
              <span style={{ padding: '10px 10px', fontSize: 12, color: '#999', background: '#F9F9F9', borderRight: '1px solid #EEE', whiteSpace: 'nowrap', flexShrink: 0 }}>
                /w/{weddingSlug || 'your-names'}/
              </span>
              <input
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="page-url"
                style={{ flex: 1, border: 'none', padding: '10px 10px', fontSize: 13, outline: 'none', fontFamily: 'monospace', background: 'transparent' }}
              />
            </div>
          </div>

          {/* Template */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', display: 'block', marginBottom: 8 }}>
              Page Template
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PAGE_TEMPLATES.map(t => (
                <div key={t.id} onClick={() => setTemplate(t.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${template === t.id ? '#0A0A0A' : '#EEE'}`,
                  background: template === t.id ? '#F9F9F9' : '#fff',
                  transition: 'all 0.15s',
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${template === t.id ? '#0A0A0A' : '#DDD'}`,
                    background: template === t.id ? '#0A0A0A' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {template === t.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>{t.name}</p>
                    <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '11px 0', border: '1px solid #DDD', borderRadius: 6,
              background: 'transparent', color: '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancel</button>
            <button onClick={handleCreate} disabled={!name.trim() || !slug.trim()} style={{
              flex: 2, padding: '11px 0', border: 'none', borderRadius: 6,
              background: name.trim() && slug.trim() ? 'linear-gradient(135deg,#E03553,#803D81)' : '#DDD',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: name.trim() && slug.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
            }}>Create Page</button>
          </div>
        </div>
      </div>
    </div>
  );
}
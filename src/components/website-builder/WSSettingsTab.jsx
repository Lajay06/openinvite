import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';

export default function WSSettingsTab({ details, onChange, existingId }) {
  const [copied, setCopied] = useState(false);
  const origin = window.location.origin;
  const siteUrl = details.slug ? `${origin}/w/${details.slug}` : '';
  const displayUrl = details.slug ? `openinvite.com/w/${details.slug}` : '';

  const copyLink = () => {
    if (!siteUrl) { toast.error('Set a URL slug first.'); return; }
    navigator.clipboard.writeText(siteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  const whatsapp = () => {
    if (!siteUrl) { toast.error('Set a URL slug first.'); return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(`You're invited! View our wedding website: ${siteUrl}`)}`, '_blank');
  };

  const reset = async () => {
    if (!window.confirm('Reset all website content? This cannot be undone.')) return;
    if (existingId) {
      await base44.entities.WeddingDetails.update(existingId, {
        welcomeMessage: '', coupleStory: '', heroVideoUrl: '', coverPhoto: '',
        mainCeremony: {}, reception: {}, qna: [], enabledPages: ['home', 'rsvp'],
      });
      toast.success('Website reset.');
      setTimeout(() => window.location.reload(), 500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* URL */}
      <div>
        <p style={sectionLabel}>Your Website URL</p>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EEEEEE', background: '#FAFAFA', padding: '8px 12px', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>openinvite.com/w/</span>
          <input
            value={details.slug || ''}
            onChange={e => onChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="your-wedding"
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#0A0A0A', outline: 'none' }}
          />
        </div>
        {siteUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F5', padding: '8px 12px' }}>
            <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#444', wordBreak: 'break-all' }}>{siteUrl}</span>
            <button onClick={copyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', flexShrink: 0, display: 'flex' }}>
              {copied ? <Check size={14} color="#22C55E" /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* Status */}
      <div>
        <p style={sectionLabel}>Website Status</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', border: '1px solid #EEEEEE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: details.websiteEnabled ? '#22C55E' : '#CCCCCC' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>
                Website is {details.websiteEnabled ? 'Live' : 'Hidden'}
              </p>
              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                {details.websiteEnabled ? 'Guests can see your website' : 'Only you can see it'}
              </p>
            </div>
          </div>
          <Toggle value={details.websiteEnabled} onChange={v => onChange('websiteEnabled', v)} green />
        </div>
      </div>

      {/* Password */}
      <div>
        <p style={sectionLabel}>Password Protection</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 13, color: '#0A0A0A', margin: 0 }}>Require password to view</p>
          <Toggle value={!!(details.websitePassword?.trim())} onChange={v => onChange('websitePassword', v ? ' ' : '')} />
        </div>
        {details.websitePassword?.trim() && (
          <input
            value={details.websitePassword}
            onChange={e => onChange('websitePassword', e.target.value)}
            type="text"
            placeholder="Enter password"
            style={{ width: '100%', border: 'none', borderBottom: '1px solid #DDD', padding: '7px 0', fontSize: 13, outline: 'none', background: 'transparent', boxSizing: 'border-box' }}
          />
        )}
      </div>

      {/* Share */}
      <div>
        <p style={sectionLabel}>Share Your Website</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={copyLink} style={fullBtn('#0A0A0A', false)}>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
          {siteUrl && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <QRCode value={siteUrl} size={160} />
            </div>
          )}
          <button onClick={whatsapp} style={fullBtn('#25D366', true)}>
            <Share2 size={14} /> Share on WhatsApp
          </button>
        </div>
      </div>

      {/* Danger */}
      <div style={{ borderTop: '1px solid #EEEEEE', paddingTop: 20 }}>
        <p style={{ ...sectionLabel, color: '#E03553' }}>Danger Zone</p>
        <button onClick={reset} style={{ padding: '9px 20px', border: '1px solid #E03553', background: 'transparent', color: '#E03553', cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Reset Website Content
        </button>
      </div>
    </div>
  );
}

function Toggle({ value, onChange, green = false }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
      background: value ? (green ? '#22C55E' : '#E03553') : '#DDDDDD', position: 'relative', transition: 'background 0.2s',
    }}>
      <div style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: '#fff', top: 2, left: value ? 22 : 2, transition: 'left 0.2s' }} />
    </button>
  );
}

// Minimal QR code using Google Charts API
function QRCode({ value, size = 160 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(value)}&size=${size}x${size}&margin=10`;
  return (
    <div>
      <img src={url} width={size} height={size} alt="QR Code" style={{ display: 'block' }} />
    </div>
  );
}

const sectionLabel = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#AAAAAA', marginBottom: 10 };
const fullBtn = (bg, white) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  width: '100%', padding: '11px 0', border: white ? 'none' : `1px solid ${bg}`,
  background: white ? bg : 'transparent', color: white ? '#fff' : bg,
  cursor: 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em',
});
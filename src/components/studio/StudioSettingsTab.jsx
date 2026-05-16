import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';

export default function StudioSettingsTab({ wedding, onChange, existingId }) {
  const [copied, setCopied] = useState(false);

  const siteUrl = wedding.slug ? `${window.location.origin}/w/${wedding.slug}` : '';

  const copyLink = () => {
    if (!siteUrl) { toast.error('Set a URL first.'); return; }
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const whatsappShare = () => {
    if (!siteUrl) { toast.error('Set a URL first.'); return; }
    const msg = encodeURIComponent(`You're invited to our wedding! View our website: ${siteUrl}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset your website content? This cannot be undone.')) return;
    if (existingId) {
      await base44.entities.WeddingDetails.update(existingId, {
        welcomeMessage: '', coupleStory: '', heroVideoUrl: '', coverPhoto: '',
        mainCeremony: {}, reception: {}, qna: [], enabledPages: ['home', 'rsvp']
      });
      toast.success('Website reset.');
      window.location.reload();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* URL */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#AAAAAA', marginBottom: 12 }}>Your Website URL</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FAFAFA', border: '1px solid #EEEEEE', padding: '8px 12px', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>{window.location.origin}/w/</span>
          <input
            value={wedding.slug || ''}
            onChange={e => onChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="your-wedding"
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#0A0A0A', outline: 'none' }}
          />
        </div>
        <p style={{ fontSize: 10, color: '#AAAAAA' }}>Only lowercase letters, numbers and hyphens.</p>
      </div>

      {/* Status */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#AAAAAA', marginBottom: 12 }}>Website Status</p>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px', border: '1px solid #EEEEEE', background: '#FAFAFA'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: wedding.websiteEnabled ? '#22C55E' : '#CCCCCC' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>
                Website is {wedding.websiteEnabled ? 'LIVE' : 'HIDDEN'}
              </p>
              <p style={{ fontSize: 11, color: '#888888', margin: 0 }}>
                {wedding.websiteEnabled ? 'Guests can see your website' : 'Only you can see your website'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onChange('websiteEnabled', !wedding.websiteEnabled)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none',
              background: wedding.websiteEnabled ? '#22C55E' : '#DDDDDD',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0
            }}
          >
            <div style={{
              position: 'absolute', width: 20, height: 20, borderRadius: '50%',
              background: '#fff', top: 2, left: wedding.websiteEnabled ? 22 : 2, transition: 'left 0.2s'
            }} />
          </button>
        </div>
      </div>

      {/* Password */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#AAAAAA', marginBottom: 12 }}>Password Protection</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: '#0A0A0A', margin: 0 }}>Require password to view</p>
          <button
            onClick={() => onChange('websitePassword', wedding.websitePassword ? '' : ' ')}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none',
              background: wedding.websitePassword?.trim() ? '#E03553' : '#DDDDDD',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
            }}
          >
            <div style={{
              position: 'absolute', width: 18, height: 18, borderRadius: '50%',
              background: '#fff', top: 2, left: wedding.websitePassword?.trim() ? 20 : 2, transition: 'left 0.2s'
            }} />
          </button>
        </div>
        {wedding.websitePassword?.trim() && (
          <input
            value={wedding.websitePassword}
            onChange={e => onChange('websitePassword', e.target.value)}
            placeholder="Enter password"
            type="password"
            style={{
              width: '100%', border: 'none', borderBottom: '1px solid #DDDDDD',
              padding: '7px 0', fontSize: 13, color: '#0A0A0A', outline: 'none',
              background: 'transparent', boxSizing: 'border-box'
            }}
          />
        )}
      </div>

      {/* Share */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#AAAAAA', marginBottom: 12 }}>Share Your Website</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={copyLink}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', border: '1px solid #0A0A0A', background: 'transparent',
              cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase'
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={whatsappShare}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', border: '1px solid #25D366', background: '#25D366',
              cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff'
            }}
          >
            <Share2 size={12} /> WhatsApp
          </button>
        </div>
        {siteUrl && (
          <p style={{ fontSize: 11, color: '#888888', marginTop: 10, wordBreak: 'break-all' }}>{siteUrl}</p>
        )}
      </div>

      {/* Danger zone */}
      <div style={{ borderTop: '1px solid #EEEEEE', paddingTop: 24 }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#E03553', marginBottom: 12 }}>Danger Zone</p>
        <button
          onClick={handleReset}
          style={{
            padding: '9px 20px', border: '1px solid #E03553', background: 'transparent',
            color: '#E03553', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase'
          }}
        >
          Reset Website Content
        </button>
      </div>
    </div>
  );
}
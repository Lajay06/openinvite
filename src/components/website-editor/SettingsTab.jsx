import React, { useState } from 'react';
import { Check, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function SettingsTab({ wedding, onChange }) {
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const handleSlugChange = async (newSlug) => {
    onChange('slug', newSlug);
    
    if (!newSlug.trim()) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    setTimeout(() => {
      // Simple check - in production would query backend
      setSlugAvailable(true);
      setCheckingSlug(false);
    }, 500);
  };

  const handleCopyLink = () => {
    if (!wedding.slug) {
      toast.error('Please set a URL slug first.');
      return;
    }
    const link = `${window.location.origin}/w/${wedding.slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const EditInput = ({ label, value, onChange: onInput, type = 'text' }) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888888', letterSpacing: '0.1em', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onInput(e.target.value)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid #DDDDDD',
          padding: '8px 0',
          fontSize: '14px',
          color: '#0A0A0A',
          outline: 'none',
          transition: 'border-color 0.2s ease',
          boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderBottomColor = '#0A0A0A'}
        onBlur={e => e.target.style.borderBottomColor = '#DDDDDD'}
      />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* URL / SLUG */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Website URL
        </h3>
        <EditInput
          label="URL Slug"
          value={wedding.slug}
          onChange={handleSlugChange}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
          <p style={{ fontSize: '11px', color: '#888888', margin: 0, flex: 1 }}>
            openinvite.com.au/w/{wedding.slug || 'your-slug'}
          </p>
          {slugAvailable !== null && (
            slugAvailable ? (
              <Check style={{ width: '14px', height: '14px', color: '#22C55E' }} />
            ) : (
              <X style={{ width: '14px', height: '14px', color: '#EF4444' }} />
            )
          )}
        </div>
      </div>

      {/* PASSWORD PROTECTION */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Password Protection
          </h3>
          <button
            onClick={() => onChange('websitePassword', wedding.websitePassword ? '' : 'password123')}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              border: 'none',
              background: wedding.websitePassword ? '#E03553' : '#DDDDDD',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '20px',
                height: '20px',
                background: '#FFFFFF',
                borderRadius: '50%',
                top: '2px',
                left: wedding.websitePassword ? '22px' : '2px',
                transition: 'left 0.2s ease',
              }}
            />
          </button>
        </div>

        {wedding.websitePassword && (
          <EditInput
            label="Password"
            value={wedding.websitePassword}
            onChange={v => onChange('websitePassword', v)}
            type="password"
          />
        )}
      </div>

      {/* WEBSITE STATUS */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Website Status
          </h3>
          <button
            onClick={() => onChange('websiteEnabled', !wedding.websiteEnabled)}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              border: 'none',
              background: wedding.websiteEnabled ? '#E03553' : '#DDDDDD',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '20px',
                height: '20px',
                background: '#FFFFFF',
                borderRadius: '50%',
                top: '2px',
                left: wedding.websiteEnabled ? '22px' : '2px',
                transition: 'left 0.2s ease',
              }}
            />
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#888888', margin: 0 }}>
          {wedding.websiteEnabled ? 'Your website is live' : 'Your website is hidden'}
        </p>
      </div>

      {/* SHARE */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Share
        </h3>
        <Button
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={handleCopyLink}
          disabled={!wedding.slug}
        >
          <Share2 className="w-4 h-4" />
          Copy Link
        </Button>
      </div>
    </div>
  );
}
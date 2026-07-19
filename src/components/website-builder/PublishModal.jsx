import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { interactiveDivProps } from '@/lib/a11y';

function ToggleSwitch({ value, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!value)}
      aria-label={label ? `Toggle ${label}` : 'Toggle'}
      aria-pressed={value}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: value ? '#E03553' : '#CCCCCC', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s', padding: 0,
      }}
    >
      <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 2, left: value ? 18 : 2, transition: 'left 0.2s' }} />
    </button>
  );
}

export default function PublishModal({ onClose, details, onUpdate }) {
  const [tab, setTab] = useState(details?.initialTab || 'website');
  const [slugInput, setSlugInput] = useState(details?.slug || '');
  const [copied, setCopied] = useState(false);

  // Keep the slug field in sync if a fresh `details` prop arrives (e.g.
  // after the auto-slug-from-name effect fires in the parent) while this
  // modal is already open.
  useEffect(() => {
    setSlugInput(details?.slug || '');
  }, [details?.slug]);

  const hasRealSlug = !!details?.slug;
  // window.location.host, not a hardcoded literal — so the link shown
  // and shared always matches wherever this is actually running (a
  // Vercel preview, www., etc.), never a stale/wrong domain.
  const siteHost = typeof window !== 'undefined' ? window.location.host : 'openinvite.com.au';
  const siteUrl = hasRealSlug ? `${siteHost}/w/${details.slug}` : null;

  const togglePublish = async () => {
    const next = { websiteEnabled: !details?.websiteEnabled };
    await base44.entities.WeddingDetails.update(details.id, next);
    onUpdate(next);
  };

  const saveSlug = async () => {
    const next = { slug: slugInput };
    await base44.entities.WeddingDetails.update(details.id, next);
    onUpdate(next);
  };

  const updateField = async (field, value) => {
    const next = { [field]: value };
    await base44.entities.WeddingDetails.update(details.id, next);
    onUpdate(next);
  };

  const copyLink = () => {
    if (!siteUrl) return;
    navigator.clipboard.writeText(`https://${siteUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const couple1 = details?.couple1Name || details?.coupleNames?.split(' & ')?.[0] || 'John';
  const couple2 = details?.couple2Name || details?.coupleNames?.split(' & ')?.[1] || 'Sarah';

  const [emailSubject, setEmailSubject] = useState(`${couple1} & ${couple2}'s Wedding — Save the Date`);
  const [emailMessage, setEmailMessage] = useState(
    `We're so excited to share our wedding website with you!\n\nVisit: https://${siteUrl || `${siteHost}/w/`}\n\nWe can't wait to celebrate with you.\n\nWith love,\n${couple1} & ${couple2}`
  );

  const TABS = [
    { id: 'website', label: '🌐 Website' },
    { id: 'share', label: '🔗 Share' },
    { id: 'email', label: '✉️ Email' },
    { id: 'qr', label: '⬛ QR Code' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
      {...interactiveDivProps(onClose, { label: 'Close' })}
    >
      <div style={{ background: '#FFFFFF', width: 620, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEE', display: 'flex', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, flex: 1 }}>Share Your Wedding</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EEE', flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '12px 8px', border: 'none', background: 'none',
                fontSize: 12, fontWeight: 600,
                color: tab === t.id ? '#0A0A0A' : '#888',
                borderBottom: tab === t.id ? '2px solid #E03553' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {tab === 'website' && (
            <div>
              {/* Status */}
              <div style={{ padding: 16, background: '#F8F8F8', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: details?.websiteEnabled ? '#22C55E' : '#AAAAAA', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
                    {!hasRealSlug ? 'Set a URL below before publishing' : details?.websiteEnabled ? 'Your website is live' : 'Your website is not published yet'}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{siteUrl || 'No URL set yet'}</p>
                </div>
                <button
                  onClick={togglePublish}
                  disabled={!hasRealSlug}
                  style={{
                    padding: '8px 20px', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                    cursor: hasRealSlug ? 'pointer' : 'not-allowed',
                    opacity: hasRealSlug ? 1 : 0.4,
                    background: details?.websiteEnabled ? 'transparent' : 'linear-gradient(135deg, #E03553, #803D81)',
                    color: details?.websiteEnabled ? '#E03553' : '#FFF',
                    border: details?.websiteEnabled ? '1px solid #E03553' : 'none',
                  }}
                >
                  {details?.websiteEnabled ? 'Unpublish' : 'Publish Now'}
                </button>
              </div>

              {/* URL */}
              <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>YOUR URL</p>
              <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 20, borderBottom: '1px solid #DDD' }}>
                <span style={{ fontSize: 13, color: '#888', padding: '10px 12px', background: '#F5F5F5', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>{siteHost}/w/</span>
                <input
                  value={slugInput}
                  onChange={e => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  style={{ flex: 1, border: 'none', padding: '10px 8px', fontSize: 13, outline: 'none', background: 'transparent' }}
                />
                <button onClick={saveSlug} disabled={!slugInput} style={{ padding: '10px 16px', background: '#0A0A0A', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 600, cursor: slugInput ? 'pointer' : 'not-allowed', opacity: slugInput ? 1 : 0.4, fontFamily: 'inherit' }}>Save</button>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Password Protection</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Require guests to enter a password</p>
                </div>
                <ToggleSwitch value={!!details?.websitePasswordEnabled} onChange={v => updateField('websitePasswordEnabled', v)} label="Password protection" />
              </div>
              {details?.websitePasswordEnabled && (
                <input
                  defaultValue={details?.websitePassword || ''}
                  onBlur={e => updateField('websitePassword', e.target.value)}
                  placeholder="Set password for guests..."
                  style={{ width: '100%', borderBottom: '1px solid #DDD', border: 'none', padding: '8px 0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                />
              )}
            </div>
          )}

          {tab === 'share' && (
            <div>
              {!hasRealSlug ? (
                <p style={{ fontSize: 14, color: '#888', marginBottom: 0 }}>Set your website's URL on the <strong>Website</strong> tab first — sharing needs a real link to send.</p>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>Share your wedding website with family and friends.</p>

                  {/* Copy link */}
                  <div style={{ display: 'flex', marginBottom: 24 }}>
                    <div style={{ flex: 1, padding: '12px 16px', background: '#F8F8F8', fontSize: 13, color: '#444', fontFamily: 'monospace', borderBottom: '1px solid #DDD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {siteUrl}
                    </div>
                    <button onClick={copyLink} style={{ padding: '12px 20px', background: '#0A0A0A', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>SHARE VIA</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'WhatsApp', icon: '💬', action: () => window.open(`https://wa.me/?text=${encodeURIComponent(`You're invited! https://${siteUrl}`)}`) },
                      { label: 'Email', icon: '✉️', action: () => setTab('email') },
                      { label: 'SMS', icon: '📱', action: () => window.open(`sms:?body=${encodeURIComponent(`You're invited! https://${siteUrl}`)}`) },
                      { label: 'Facebook', icon: '📘', action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://${siteUrl}`)}`) },
                    ].map(opt => (
                      <button key={opt.label} onClick={opt.action} style={{ padding: '14px', border: '1px solid #EEE', background: '#FFF', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'email' && (
            <div>
              {!hasRealSlug ? (
                <p style={{ fontSize: 14, color: '#888', marginBottom: 0 }}>Set your website's URL on the <strong>Website</strong> tab first — the invitation needs a real link to send.</p>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>Send your wedding website link directly to guests by email.</p>

                  <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>SUBJECT</p>
                  <input
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    style={{ width: '100%', border: 'none', borderBottom: '1px solid #DDD', padding: '10px 0', fontSize: 13, outline: 'none', marginBottom: 16, fontFamily: 'inherit', background: 'transparent' }}
                  />

                  <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>MESSAGE</p>
                  <textarea
                    rows={6}
                    value={emailMessage}
                    onChange={e => setEmailMessage(e.target.value)}
                    style={{ width: '100%', border: '1px solid #EEE', padding: '12px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 16, boxSizing: 'border-box' }}
                  />

                  <a
                    href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`}
                    style={{ display: 'block', textAlign: 'center', width: '100%', padding: '14px', background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', boxSizing: 'border-box' }}
                  >
                    Open in Email App
                  </a>
                </>
              )}
            </div>
          )}

          {tab === 'qr' && (
            <div style={{ textAlign: 'center' }}>
              {!hasRealSlug ? (
                <p style={{ fontSize: 14, color: '#888' }}>Set your website's URL on the <strong>Website</strong> tab first — the QR code needs a real link to encode.</p>
              ) : (
                <>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>Guests can scan this QR code to instantly open your wedding website.</p>

              <div style={{ width: 200, height: 200, margin: '0 auto 24px', border: '1px solid #EEE', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://${siteUrl}`)}&color=0A0A0A&bgcolor=FFFFFF`}
                  alt="QR Code"
                  style={{ width: 180, height: 180 }}
                />
              </div>

              <p style={{ fontSize: 12, color: '#888', marginBottom: 24, fontFamily: 'monospace' }}>{siteUrl}</p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`https://${siteUrl}`)}&color=0A0A0A&bgcolor=FFFFFF`}
                  download="wedding-qr-code.png"
                  style={{ padding: '10px 24px', background: '#0A0A0A', color: '#FFF', textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
                >
                  Download PNG
                </a>
              </div>

              <p style={{ fontSize: 12, color: '#888', marginTop: 24, lineHeight: 1.6, maxWidth: 400, margin: '24px auto 0' }}>
                Print on your Save the Dates, Menu Cards, or Welcome Signage so guests can easily find your website.
              </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
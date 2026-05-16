import React, { useState } from 'react';
import { X, Copy, CheckCircle, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const underlineInput = {
  flex: 1, borderBottom: '1px solid rgba(10,10,10,0.18)', border: 'none',
  borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(10,10,10,0.18)',
  background: 'none', fontSize: 13, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
};

export default function ShareRegistryModal({ onClose, registryData }) {
  const [copied, setCopied] = useState(false);
  const registryUrl = window.location.origin + '/registry';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(registryUrl);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareMessage = `Check out our wedding registry! We've registered at ${registryData.storeItems.length} store(s) and have ${registryData.products.length} items on our list. ${registryUrl}`;
  const shareViaEmail = () => window.open(`mailto:?subject=${encodeURIComponent('Our Wedding Registry')}&body=${encodeURIComponent(shareMessage)}`, '_blank');
  const shareViaSMS = () => window.open(`sms:?body=${encodeURIComponent(shareMessage)}`, '_blank');
  const shareViaFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(registryUrl)}`, '_blank', 'width=600,height=400');
  const shareViaWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Share2 size={14} style={{ color: 'rgba(10,10,10,0.4)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Share your registry</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* URL + Copy */}
          <div>
            <p style={{ ...labelStyle, marginBottom: 10 }}>Your registry link</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input value={registryUrl} readOnly style={underlineInput} />
              <button onClick={copyToClipboard} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexShrink: 0 }}>
                {copied ? <><CheckCircle size={12} />Copied</> : <><Copy size={12} />Copy</>}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div>
            <p style={{ ...labelStyle, marginBottom: 10 }}>Registry summary</p>
            <div style={{ display: 'flex' }}>
              {[
                { label: 'Platforms', value: registryData.storeItems.length },
                { label: 'Products', value: registryData.products.length },
                { label: 'Cash funds', value: registryData.customGifts.length },
              ].map((s, i, arr) => (
                <div key={i} style={{ flex: 1, padding: '16px 20px', border: '1px solid rgba(10,10,10,0.08)', borderRight: i < arr.length - 1 ? 'none' : '1px solid rgba(10,10,10,0.08)', textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
                  <p style={labelStyle}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Share via */}
          <div>
            <p style={{ ...labelStyle, marginBottom: 10 }}>Share via</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Email', fn: shareViaEmail, color: '#E03553' },
                { label: 'SMS', fn: shareViaSMS, color: '#6b7700' },
                { label: 'Facebook', fn: shareViaFacebook, color: '#1877F2' },
                { label: 'WhatsApp', fn: shareViaWhatsApp, color: '#25D366' },
              ].map(s => (
                <button key={s.label} onClick={s.fn} className="btn-editorial-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform links */}
          {registryData.storeItems.length > 0 && (
            <div>
              <p style={{ ...labelStyle, marginBottom: 10 }}>Registry platforms</p>
              <div style={{ border: '1px solid rgba(10,10,10,0.08)' }}>
                {registryData.storeItems.map((store, i, arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {store.image_url && <img src={store.image_url} alt={store.store_name} style={{ width: 24, height: 24, objectFit: 'contain' }} />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{store.store_name}</span>
                    </div>
                    <a href={store.url} target="_blank" rel="noopener noreferrer" className="btn-editorial-secondary" style={{ fontSize: 11, textDecoration: 'none' }}>Visit</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'center' }}>
            Share this link with guests so they can view and purchase from your registry.
          </p>
        </div>
      </div>
    </div>
  );
}

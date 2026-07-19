import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";

const WHATSAPP_GREEN = "#25D366";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function WhatsAppConnect({ onConnect, isConnected, connectedPhone }) {
  const [showDisconnect, setShowDisconnect] = useState(false);

  const handleConnect = () => {
    const phoneInput = prompt("Enter your WhatsApp phone number (with country code, e.g., +61412345678):");
    if (phoneInput) onConnect(phoneInput);
  };

  const handleDisconnect = () => {
    onConnect(null);
    setShowDisconnect(false);
  };

  if (isConnected) {
    return (
      <>
        <div style={{ background: `rgba(37,211,102,0.06)`, border: `1px solid rgba(37,211,102,0.4)`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 20, height: 20, background: WHATSAPP_GREEN, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>WhatsApp connected</p>
              <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>{connectedPhone}</p>
            </div>
          </div>
          <button onClick={() => setShowDisconnect(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.6)'}>
            <X size={14} />
          </button>
        </div>

        {showDisconnect && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 24 }}>
            <div style={{ background: '#FFFFFF', padding: 28, maxWidth: 400, width: '100%' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8 }}>Disconnect WhatsApp?</h3>
              <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 20, lineHeight: 1.6 }}>
                You'll no longer be able to send WhatsApp messages to your guests.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowDisconnect(false)} className="btn-editorial-secondary" style={{ flex: 1, fontSize: 13 }}>Cancel</button>
                <button onClick={handleDisconnect} className="btn-primary" style={{ flex: 1, fontSize: 13 }}>Disconnect</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.4)', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ width: 36, height: 36, background: WHATSAPP_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
        <MessageCircle size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>Connect WhatsApp</p>
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 16, lineHeight: 1.6 }}>
          Send and receive messages with your guests directly via WhatsApp — no app switching needed.
        </p>
        <button onClick={handleConnect}
          style={{ background: WHATSAPP_GREEN, color: '#FFFFFF', border: 'none', padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 999, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          Connect WhatsApp
        </button>
      </div>
    </div>
  );
}

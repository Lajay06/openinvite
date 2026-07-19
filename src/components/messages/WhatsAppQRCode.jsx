import React, { useState } from "react";
import { Download, X } from "lucide-react";

const WHATSAPP_GREEN = "#25D366";

export default function WhatsAppQRCode({ phoneNumber }) {
  const [showModal, setShowModal] = useState(false);

  if (!showModal) {
    return (
      <button onClick={() => setShowModal(true)}
        style={{ padding: '9px 20px', background: 'transparent', border: `1.5px solid ${WHATSAPP_GREEN}`, color: WHATSAPP_GREEN, borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'opacity 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        Generate QR code
      </button>
    );
  }

  const qrValue = `https://wa.me/${phoneNumber}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}`;

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = "whatsapp-qr-code.png";
    link.click();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 24 }}
      onClick={() => setShowModal(false)}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', padding: 32, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>WhatsApp QR code</span>
          <button onClick={() => setShowModal(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>

        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 20, lineHeight: 1.6 }}>
          Guests can scan this QR code to message you on WhatsApp
        </p>

        <div style={{ background: '#FFFFFF', padding: 16, border: '1px solid rgba(10,10,10,0.08)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
          <img src={qrUrl} alt="WhatsApp QR Code" style={{ width: 200, height: 200 }} />
        </div>

        <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 20 }}>{phoneNumber}</p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowModal(false)} className="btn-editorial-secondary" style={{ flex: 1, fontSize: 13 }}>Close</button>
          <button onClick={downloadQR}
            style={{ flex: 1, padding: '9px 16px', background: WHATSAPP_GREEN, color: '#FFFFFF', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Download size={14} />Download
          </button>
        </div>
      </div>
    </div>
  );
}

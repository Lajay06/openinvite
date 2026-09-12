import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const WHATSAPP_GREEN = "#25D366";

function WhatsAppQRModal({ phoneNumber, onClose }) {
  const qrValue = `https://wa.me/${phoneNumber}`;

  // THIS ONE SENT A PHONE NUMBER. The others leaked a guest-suite address,
  // which is at least something the couple hands out on purpose; this put a
  // WhatsApp number in a query string to a third party every time the modal
  // opened, and again on every download. Drawn in the browser now, from the
  // same `qrcode` dependency the product already ships.
  const [qrSvg, setQrSvg] = useState('');
  const [qrPng, setQrPng] = useState('');
  useEffect(() => {
    let live = true;
    import('qrcode')
      .then(async (qr) => {
        const svg = await qr.toString(qrValue, { type: 'svg', margin: 1, width: 200, color: { dark: '#0A0A0A', light: '#FFFFFF' } });
        const png = await qr.toDataURL(qrValue, { margin: 1, width: 400, color: { dark: '#0A0A0A', light: '#FFFFFF' } });
        if (live) { setQrSvg(svg); setQrPng(png); }
      })
      .catch(() => { if (live) { setQrSvg(''); setQrPng(''); } });
    return () => { live = false; };
  }, [qrValue]);

  const downloadQR = () => {
    if (!qrPng) return;
    const link = document.createElement("a");
    link.href = qrPng;
    link.download = "whatsapp-qr-code.png";
    link.click();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose title="WhatsApp QR code" className="max-w-[400px] p-8" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>WhatsApp QR code</span>
          <button onClick={onClose}
            aria-label="Close WhatsApp QR code modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>

        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 20, lineHeight: 1.6 }}>
          Guests can scan this QR code to message you on WhatsApp
        </p>

        <div style={{ background: '#FFFFFF', padding: 16, border: '1px solid rgba(10,10,10,0.12)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
          <div role="img" aria-label={`WhatsApp QR code for ${phoneNumber}`} style={{ width: 200, height: 200 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>

        <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 20 }}>{phoneNumber}</p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn-editorial-secondary" style={{ flex: 1, fontSize: 13 }}>Close</button>
          <button onClick={downloadQR}
            style={{ flex: 1, padding: '9px 16px', background: WHATSAPP_GREEN, color: '#FFFFFF', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Download size={14} />Download
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

  return <WhatsAppQRModal phoneNumber={phoneNumber} onClose={() => setShowModal(false)} />;
}

import React, { useState } from 'react';
import { Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Share panel for the guest song-request page (music rebuild, 2026-08-18).
 *
 * Was a modal pointing at `/playlist/contribute` — a route that does not exist
 * in App.jsx. The real guest page has always been /w/:slug/music, so the share
 * link never worked. Now inline on the Music page's Share block, built from the
 * wedding's own slug.
 *
 * QR follows the house pattern (api.qrserver.com), matching PublishModal and
 * StudioShareTab. Swapping all four sites to local generation is a logged
 * backlog ticket and deliberately NOT done here.
 */
const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
};
const underlineInput = {
  flex: 1, border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 13, color: '#0A0A0A',
  fontFamily: PJS, outline: 'none', padding: '6px 0', minWidth: 0,
};

export default function SharePlaylist({ slug }) {
  const [copied, setCopied] = useState(false);

  // No slug means the couple has not published a site yet, so there is no guest
  // URL to share. Say that rather than offering a link that 404s.
  if (!slug) {
    return (
      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '14px 0 0', maxWidth: 560 }}>
        Publish your wedding site first — the song-request page lives on it, so
        there is no link to share until then.
      </p>
    );
  }

  const shareUrl = `${window.location.origin}/w/${slug}/music`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}&color=0A0A0A&bgcolor=FFFFFF`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: 16, maxWidth: 560 }}>
      <p style={{ ...labelStyle, marginBottom: 10 }}>Guest link</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input value={shareUrl} readOnly style={underlineInput} />
        <button onClick={handleCopy} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexShrink: 0 }}>
          {copied ? <><CheckCircle size={12} />Copied</> : <><Copy size={12} />Copy</>}
        </button>
      </div>

      <div style={{ marginTop: 28 }}>
        <p style={{ ...labelStyle, marginBottom: 10 }}>QR code</p>
        <img
          src={qrUrl}
          alt={`QR code linking to ${shareUrl}`}
          width={180}
          height={180}
          style={{ display: 'block', border: '1px solid rgba(10,10,10,0.12)' }}
        />
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginTop: 10 }}>
          Print it for the tables so guests can request a song from their seat.
        </p>
      </div>
    </div>
  );
}

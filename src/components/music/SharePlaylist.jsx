import React, { useState, useEffect } from 'react';
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
 * The QR is drawn locally by `qrcode`. It used to follow "the house pattern"
 * — api.qrserver.com, matching PublishModal and StudioShareTab — with a
 * comment here calling the swap "a logged backlog ticket and deliberately NOT
 * done". That ticket is closed: all five sites are local now. The house
 * pattern was sending couples' addresses and guests' phone numbers to a
 * third party, which is a bad thing for a house pattern to be.
 */
const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
};
const underlineInput = {
  flex: 1, border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 13, color: '#0A0A0A',
  fontFamily: PJS, outline: 'none', padding: '6px 0', minWidth: 0,
};

export default function SharePlaylist({ slug }) {
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState('');
  useEffect(() => {
    let live = true;
    if (!slug) { setQrSvg(''); return undefined; }
    import('qrcode')
      .then((qr) => qr.toString(`${window.location.origin}/w/${slug}/music`, { type: 'svg', margin: 1, width: 180, color: { dark: '#0A0A0A', light: '#FFFFFF' } }))
      .then((svg) => { if (live) setQrSvg(svg); })
      .catch(() => { if (live) setQrSvg(''); });
    return () => { live = false; };
  }, [slug]);

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
        <div
          role="img"
          aria-label={`QR code linking to ${shareUrl}`}
          style={{ width: 180, height: 180, display: 'block', border: '1px solid rgba(10,10,10,0.12)' }}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginTop: 10 }}>
          Print it for the tables so guests can request a song from their seat.
        </p>
      </div>
    </div>
  );
}

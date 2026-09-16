import React, { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DEFAULT_COUNTRY, toE164, needsCountryCode } from "@/lib/phoneE164";
import CountryPicker from "@/components/shared/CountryPicker";
import { useDefaultCountry } from "@/lib/defaultCountry";

const WHATSAPP_GREEN = "#25D366";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

/**
 * THE COUPLE'S OWN WHATSAPP NUMBER — FOR THE QR CODE, AND FOR NOTHING ELSE.
 *
 * Owner ruling, Run 5 T9: the feature stays, the "connect" theater goes. This
 * was framed as connecting an account — save a number, and the WhatsApp
 * controls on the Messages page appear; remove it, and they vanish. Nothing
 * about a message to a guest ever used it. wa.me is addressed with THE
 * GUEST'S number and opens on the couple's own device, signed in to whatever
 * account is on it. The stored number's one real use is the QR code a guest
 * scans to message the couple, which is what this now says it is for.
 *
 * `isConnected` is gone with the framing: a saved number is a saved number,
 * and `savedNumber` is the whole state.
 */
export default function WhatsAppConnect({ onSave, savedNumber }) {
  const [showRemove, setShowRemove] = useState(false);
  // THE prompt() IS GONE (owner ruling, Run 4 S3). It was the only prompt() in
  // the product and the worst place for one: the field that most needs a
  // country-code picker was a box the browser drew, in system type, blocking
  // the page until it was answered. Its wording carried the instruction the
  // interface should have carried — "with country code, e.g., +61412345678" —
  // which is the picker beside the field now.
  const [entering, setEntering] = useState(false);
  const [draft, setDraft] = useState('');
  // Same as the guest form: the venue's country, else AU.
  const venueCountry = useDefaultCountry();
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [countryTouched, setCountryTouched] = useState(false);
  useEffect(() => { if (!countryTouched) setCountry(venueCountry); }, [venueCountry, countryTouched]);
  const unreadable = needsCountryCode(draft, country);

  const handleSave = () => {
    const e164 = toE164(draft, country);
    if (!e164) return;
    onSave(e164);
    setEntering(false); setDraft('');
  };

  const handleRemove = () => {
    onSave(null);
    setShowRemove(false);
  };

  if (savedNumber) {
    return (
      <>
        <div style={{ background: `rgba(37,211,102,0.06)`, border: `1px solid rgba(37,211,102,0.4)`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 20, height: 20, background: WHATSAPP_GREEN, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>Your WhatsApp number (for guests to message you)</p>
              <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>{savedNumber}</p>
            </div>
          </div>
          <button onClick={() => setShowRemove(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.6)'}>
            <X size={14} />
          </button>
        </div>

        <Dialog open={showRemove} onOpenChange={(open) => { if (!open) setShowRemove(false); }}>
          <DialogContent title="Remove saved WhatsApp number?" className="max-w-[400px] p-7">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8 }}>Remove saved WhatsApp number?</h3>
            <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 20, lineHeight: 1.6 }}>
              The QR code below will go with it. Messaging guests is unaffected — that opens WhatsApp on your device either way.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowRemove(false)} className="btn-editorial-secondary" style={{ flex: 1, fontSize: 13 }}>Cancel</button>
              <button onClick={handleRemove} className="btn-primary" style={{ flex: 1, fontSize: 13 }}>Remove</button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.4)', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ width: 36, height: 36, background: WHATSAPP_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
        <MessageCircle size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>Your WhatsApp number (for guests to message you)</p>
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 16, lineHeight: 1.6 }}>
          Add it and we&rsquo;ll make a QR code your guests can scan to message you. Messaging guests does not need it — that opens WhatsApp on your device.
        </p>
        {entering ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <CountryPicker value={country} onChange={(iso) => { setCountryTouched(true); setCountry(iso); }} />
              <input
                type="tel"
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !unreadable && draft.trim()) handleSave(); }}
                placeholder="Your WhatsApp number"
                data-whatsapp-number
                style={{ flex: 1, minWidth: 0, border: '1px solid rgba(10,10,10,0.15)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none' }}
              />
            </div>
            {unreadable && (
              <p data-whatsapp-warning style={{ fontSize: 12, color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                That does not look like a phone number. Check the country and the digits.
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} disabled={unreadable || !draft.trim()}
                style={{ background: WHATSAPP_GREEN, color: '#FFFFFF', border: 'none', padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: unreadable || !draft.trim() ? 'not-allowed' : 'pointer', opacity: unreadable || !draft.trim() ? 0.5 : 1, borderRadius: 999, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Save number
              </button>
              <button onClick={() => { setEntering(false); setDraft(''); }} className="btn-editorial-secondary" style={{ fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEntering(true)}
            style={{ background: WHATSAPP_GREEN, color: '#FFFFFF', border: 'none', padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 999, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            Save number
          </button>
        )}
      </div>
    </div>
  );
}

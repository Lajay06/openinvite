import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const sans = "'Plus Jakarta Sans', sans-serif";

function ToggleSwitch({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: value ? '#22C55E' : '#DDDDDD', position: 'relative', flexShrink: 0, transition: 'background 0.2s', padding: 0
    }}>
      <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, left: value ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

export default function StudioShare() {
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [guests, setGuests] = useState([]);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Email composer state
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [emailType, setEmailType] = useState('website-share');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentHistory, setSentHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [d, gList] = await Promise.all([
        getMyWeddingDetails(),
        getMyRecords('Guest'),
      ]);
      if (d) { setDetails(d); setDetailsId(d.id); }
      setGuests(gList);
    };
    load();
  }, []);

  useEffect(() => {
    const defaultSubjects = {
      'save-the-date': `Save the Date — ${details?.coupleNames || 'Our Wedding'}`,
      'website-share': `Our wedding website is live — ${details?.coupleNames || ''}`,
      'rsvp-reminder': `RSVP Reminder — ${details?.coupleNames || 'Our Wedding'}`,
      'update': `Wedding Update from ${details?.coupleNames || 'the couple'}`,
    };
    setEmailSubject(defaultSubjects[emailType] || '');
  }, [emailType, details]);

  const updateField = async (field, value) => {
    const updated = { ...details, [field]: value };
    setDetails(updated);
    if (detailsId) await base44.entities.WeddingDetails.update(detailsId, { [field]: value });
  };

  const togglePublish = async () => {
    const next = !details?.websiteEnabled;
    await updateField('websiteEnabled', next);
    toast.success(next ? 'Website is now live!' : 'Website hidden');
  };

  const copyLink = () => {
    const url = `${window.location.origin}/w/${details?.slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success('Link copied!');
  };

  const downloadQR = () => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}/w/${details?.slug}`)}&color=0A0A0A&bgcolor=FFFFFF`;
    const a = document.createElement('a'); a.href = url; a.download = 'wedding-qr.png'; a.click();
  };

  const toggleGuest = (id) => setSelectedGuests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredGuests = guests.filter(g => {
    if (!guestSearch) return true;
    const q = guestSearch.toLowerCase();
    return (g.name || '').toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q);
  });

  const handleSend = async () => {
    if (!selectedGuests.length) return;
    setSending(true);
    const recipientGuests = guests.filter(g => selectedGuests.includes(g.id));
    let successCount = 0;
    for (const guest of recipientGuests) {
      if (!guest.email) continue;
      const personalised = emailMessage.replace(/{guestName}/g, guest.name || 'Guest');
      try {
        await base44.integrations.Core.SendEmail({
          to: guest.email,
          subject: emailSubject,
          body: `${personalised}\n\n${window.location.origin}/w/${details?.slug}`,
        });
        successCount++;
      } catch {}
    }
    setSentHistory(prev => [{ type: emailType, count: successCount, date: new Date().toLocaleDateString() }, ...prev]);
    toast.success(`Sent to ${successCount} guest${successCount !== 1 ? 's' : ''}!`);
    setSelectedGuests([]);
    setSending(false);
  };

  const saveSlug = async (val) => {
    const slug = val.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    await updateField('slug', slug);
    toast.success('URL saved!');
  };

  const [slugInput, setSlugInput] = useState('');
  useEffect(() => { if (details?.slug) setSlugInput(details.slug); }, [details?.slug]);

  if (!details) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans }}>
      <div style={{ width: 24, height: 24, border: '2px solid #EEE', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const siteUrl = `${window.location.origin}/w/${details.slug || 'your-wedding'}`;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: sans }}>
      {/* TOP BAR */}
      <div style={{ height: 56, background: '#FFFFFF', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate('/studio/guest-suite/share')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, padding: '4px 6px', fontFamily: sans }}>
          <ChevronLeft size={16} /> Guest Suite
        </button>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>Share Your Wedding</p>
      </div>

      {/* STATUS BANNER */}
      <div style={{ padding: '20px 40px', background: details?.websiteEnabled ? 'rgba(34,197,94,0.06)' : '#FAFAFA', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: details?.websiteEnabled ? '#22C55E' : '#DDDDDD', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0A0A0A' }}>{details?.websiteEnabled ? 'Your website is live' : 'Your website is not published yet'}</p>
          <p style={{ margin: 0, fontSize: 13, color: '#888', fontFamily: 'monospace' }}>{siteUrl}</p>
        </div>
        <button onClick={togglePublish} style={{ padding: '10px 24px', background: details?.websiteEnabled ? 'transparent' : 'linear-gradient(135deg, #E03553, #803D81)', color: details?.websiteEnabled ? '#E03553' : '#FFF', border: details?.websiteEnabled ? '1px solid #E03553' : 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: sans }}>
          {details?.websiteEnabled ? 'Unpublish' : 'Publish Website'}
        </button>
        {details?.websiteEnabled && details?.slug && (
          <a href={`/w/${details.slug}`} target="_blank" rel="noreferrer" style={{ padding: '10px 24px', border: '1px solid #0A0A0A', color: '#0A0A0A', fontWeight: 700, fontSize: 13, textDecoration: 'none', fontFamily: sans }}>
            View Live Site ↗
          </a>
        )}
      </div>

      {/* THREE COLUMN BODY */}
      <div style={{ display: 'flex', gap: 0, padding: '32px 40px', alignItems: 'flex-start', maxWidth: 1400, margin: '0 auto', boxSizing: 'border-box' }}>

        {/* LEFT — SHARE OPTIONS */}
        <div style={{ width: 300, flexShrink: 0, marginRight: 24 }}>

          {/* YOUR LINK */}
          <div style={{ border: '1px solid #EEEEEE', padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', marginBottom: 12 }}>
              <div style={{ flex: 1, padding: '10px 12px', background: '#F8F8F8', fontSize: 12, color: '#444', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid #DDD' }}>
                openinvite.com.au/w/{details?.slug || 'your-wedding'}
              </div>
              <button onClick={copyLink} style={{ padding: '10px 16px', background: '#0A0A0A', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sans, whiteSpace: 'nowrap' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'WhatsApp', bg: '#25D366', icon: '💬', action: () => window.open(`https://wa.me/?text=${encodeURIComponent(`You're invited to our wedding! View our website: ${siteUrl}`)}`) },
                { label: 'Facebook', bg: '#1877F2', icon: 'f', action: () => window.open(`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`) },
                { label: 'SMS', bg: '#0A84FF', icon: '✉', action: () => window.open(`sms:?body=${encodeURIComponent(`You're invited! ${siteUrl}`)}`) },
                { label: 'Copy Link', bg: '#0A0A0A', icon: '🔗', action: copyLink },
              ].map(opt => (
                <button key={opt.label} onClick={opt.action} style={{ padding: '10px', background: opt.bg, color: '#FFF', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', fontFamily: sans }}>
                  <span>{opt.icon}</span>{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* URL SETTINGS */}
          <div style={{ border: '1px solid #EEEEEE', padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#888', margin: '0 0 6px' }}>Your URL</p>
            <div style={{ display: 'flex', border: '1px solid #DDD', marginBottom: 12 }}>
              <span style={{ padding: '8px 10px', background: '#F8F8F8', fontSize: 11, color: '#888', flexShrink: 0, fontFamily: 'monospace' }}>openinvite.com.au/w/</span>
              <input value={slugInput} onChange={e => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                style={{ flex: 1, border: 'none', padding: '8px 10px', fontSize: 12, outline: 'none', fontFamily: 'monospace', minWidth: 0 }} />
              <button onClick={() => saveSlug(slugInput)} style={{ padding: '8px 12px', background: '#0A0A0A', color: '#FFF', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: sans }}>Save</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 8, borderTop: '1px solid #F5F5F5' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>Password Protection</p>
                <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Guests must enter password</p>
              </div>
              <ToggleSwitch value={!!(details?.websitePassword?.trim())} onChange={v => updateField('websitePassword', v ? 'password' : '')} />
            </div>
            {details?.websitePassword?.trim() && (
              <input value={details?.websitePassword || ''} onChange={e => updateField('websitePassword', e.target.value)} placeholder="Set password..."
                style={{ width: '100%', borderBottom: '1px solid #DDD', border: 'none', padding: '8px 0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: sans, marginBottom: 12 }} />
            )}
          </div>
        </div>

        {/* CENTER — EMAIL */}
        <div style={{ flex: 1, minWidth: 0, marginRight: 24 }}>
          <div style={{ border: '1px solid #EEEEEE', padding: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px' }}>Email Your Guests</p>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>Send your wedding website directly to your guest list.</p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {[
                { label: 'All Guests', count: guests.length, action: () => setSelectedGuests(guests.map(g => g.id)) },
                { label: "Not Yet RSVP'd", count: guests.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').length, action: () => setSelectedGuests(guests.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').map(g => g.id)) },
                { label: 'Attending', count: guests.filter(g => g.rsvp_status === 'attending').length, action: () => setSelectedGuests(guests.filter(g => g.rsvp_status === 'attending').map(g => g.id)) },
                { label: 'Declined', count: guests.filter(g => g.rsvp_status === 'declined').length, action: () => setSelectedGuests(guests.filter(g => g.rsvp_status === 'declined').map(g => g.id)) },
              ].map(opt => (
                <button key={opt.label} onClick={opt.action} style={{ padding: '6px 12px', border: '1px solid #EEEEEE', background: '#FAFAFA', fontSize: 12, fontWeight: 600, color: '#444', cursor: 'pointer', fontFamily: sans }}>{opt.label} ({opt.count})</button>
              ))}
            </div>

            <div style={{ border: '1px solid #EEEEEE', marginBottom: 16 }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #EEEEEE', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input placeholder="Search guests..." value={guestSearch} onChange={e => setGuestSearch(e.target.value)}
                  style={{ flex: 1, border: 'none', fontSize: 13, outline: 'none', fontFamily: sans }} />
                <span style={{ fontSize: 12, color: '#888', flexShrink: 0, fontFamily: sans }}>{selectedGuests.length} selected</span>
                {selectedGuests.length > 0 && <button onClick={() => setSelectedGuests([])} style={{ fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sans }}>Clear</button>}
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {filteredGuests.length === 0 ? (
                  <p style={{ padding: '16px 12px', fontSize: 13, color: '#888', margin: 0, fontFamily: sans }}>No guests yet. <a href="/Guests" style={{ color: '#E03553', fontWeight: 600 }}>Add guests →</a></p>
                ) : filteredGuests.map(guest => (
                  <div key={guest.id} onClick={() => toggleGuest(guest.id)} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: '1px solid #F5F5F5', background: selectedGuests.includes(guest.id) ? 'rgba(224,53,83,0.04)' : '#FFF' }}>
                    <div style={{ width: 16, height: 16, border: `1px solid ${selectedGuests.includes(guest.id) ? '#E03553' : '#DDD'}`, background: selectedGuests.includes(guest.id) ? '#E03553' : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selectedGuests.includes(guest.id) && <span style={{ color: '#FFF', fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0A0A0A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guest.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{guest.email || 'No email'}</p>
                    </div>
                    <div style={{ fontSize: 11, padding: '2px 8px', background: guest.rsvp_status === 'attending' ? '#F0FDF4' : guest.rsvp_status === 'declined' ? '#FFF1F2' : '#F8F8F8', color: guest.rsvp_status === 'attending' ? '#16A34A' : guest.rsvp_status === 'declined' ? '#E03553' : '#888', fontWeight: 600, flexShrink: 0, fontFamily: sans }}>
                      {guest.rsvp_status || 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { id: 'save-the-date', label: 'Save the Date', desc: 'First announcement' },
                { id: 'website-share', label: 'Website Share', desc: 'Share your website link' },
                { id: 'rsvp-reminder', label: 'RSVP Reminder', desc: 'Nudge non-responders' },
                { id: 'update', label: 'Wedding Update', desc: 'Share new information' },
              ].map(type => (
                <div key={type.id} onClick={() => setEmailType(type.id)} style={{ padding: '12px', border: `1px solid ${emailType === type.id ? '#0A0A0A' : '#EEEEEE'}`, background: emailType === type.id ? '#0A0A0A' : '#FFF', cursor: 'pointer' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: emailType === type.id ? '#FFF' : '#0A0A0A' }}>{type.label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: emailType === type.id ? 'rgba(255,255,255,0.6)' : '#888', fontFamily: sans }}>{type.desc}</p>
                </div>
              ))}
            </div>

            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
              style={{ width: '100%', borderBottom: '1px solid #DDD', border: 'none', padding: '8px 0', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box', fontFamily: sans }} />

            <textarea value={emailMessage} onChange={e => setEmailMessage(e.target.value)} rows={5}
              style={{ width: '100%', border: '1px solid #EEEEEE', padding: '12px', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: sans, lineHeight: 1.6, marginBottom: 4, boxSizing: 'border-box' }} />
            <p style={{ fontSize: 11, color: '#AAAAAA', margin: '0 0 16px', fontFamily: sans }}>Tip: Use {'{guestName}'} to personalise each email automatically.</p>

            <button disabled={selectedGuests.length === 0 || sending} onClick={handleSend}
              style={{ width: '100%', padding: '14px', background: selectedGuests.length === 0 ? '#EEEEEE' : 'linear-gradient(135deg, #E03553, #803D81)', color: selectedGuests.length === 0 ? '#AAAAAA' : '#FFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: selectedGuests.length === 0 ? 'not-allowed' : 'pointer', fontFamily: sans }}>
              {sending ? 'Sending…' : selectedGuests.length === 0 ? 'Select guests to send' : `Send to ${selectedGuests.length} guest${selectedGuests.length !== 1 ? 's' : ''}`}
            </button>

            {sentHistory.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px solid #EEEEEE', paddingTop: 16 }}>
                {sentHistory.map((send, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F5F5F5' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: sans }}>{send.type.replace(/-/g, ' ')}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#888', fontFamily: sans }}>{send.count} guests · {send.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — QR + PRIVACY */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {/* QR CODE */}
          <div style={{ border: '1px solid #EEEEEE', padding: 20, marginBottom: 16, textAlign: 'center' }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(siteUrl)}&color=0A0A0A&bgcolor=FFFFFF`} alt="QR Code" style={{ width: 160, height: 160, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 16px', fontFamily: 'monospace', wordBreak: 'break-all' }}>openinvite.com.au/w/{details?.slug || 'your-wedding'}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={downloadQR} style={{ flex: 1, padding: '10px', background: '#0A0A0A', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sans }}>Download</button>
              <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', border: '1px solid #0A0A0A', background: 'transparent', color: '#0A0A0A', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sans }}>Print</button>
            </div>
            <p style={{ fontSize: 11, color: '#AAAAAA', marginTop: 12, lineHeight: 1.5, fontFamily: sans }}>Print on your Save the Dates, Menus, and Welcome Signage.</p>
          </div>

          {/* PRIVACY */}
          <div style={{ border: '1px solid #EEEEEE', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: sans }}>Password Protection</p>
                <p style={{ margin: 0, fontSize: 11, color: '#888', fontFamily: sans }}>Guests must enter a password</p>
              </div>
              <ToggleSwitch value={!!(details?.websitePassword?.trim())} onChange={v => updateField('websitePassword', v ? 'password' : '')} />
            </div>
            {details?.websitePassword?.trim() && (
              <input value={details?.websitePassword || ''} onChange={e => updateField('websitePassword', e.target.value)} placeholder="Set password..."
                style={{ width: '100%', borderBottom: '1px solid #DDD', border: 'none', padding: '8px 0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: sans, marginBottom: 16 }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F5F5F5', paddingTop: 16 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: sans }}>Hide from Search</p>
                <p style={{ margin: 0, fontSize: 11, color: '#888', fontFamily: sans }}>Don't index in Google</p>
              </div>
              <ToggleSwitch value={details?.hideFromSearch || false} onChange={v => updateField('hideFromSearch', v)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
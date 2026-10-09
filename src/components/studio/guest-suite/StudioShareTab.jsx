// Embeds the full StudioShare content directly as a tab (no separate page routing needed)
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';
import { isPending, isAttending, isDeclined } from '@/lib/guestRsvpTally';
import toast from 'react-hot-toast';
import { interactiveDivProps } from '@/lib/a11y';
import { useWebsitePasswordGate } from '@/lib/websitePasswordGate';
import ChangeAddressDialog from '@/components/event-details/ChangeAddressDialog';

import { coupleDisplayName } from '@/lib/coupleNames';
const sans = "'Plus Jakarta Sans', sans-serif";

function ToggleSwitch({ value, onChange, label }) {
  return (
    <button onClick={() => onChange(!value)} aria-label={label ? `Toggle ${label}` : 'Toggle'} aria-pressed={value} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: value ? '#22C55E' : '#DDDDDD', position: 'relative', flexShrink: 0, transition: 'background 0.2s', padding: 0 }}>
      <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, left: value ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

export default function StudioShareTab({ details: propDetails }) {
  const [details, setDetails] = useState(propDetails || null);
  const [detailsId, setDetailsId] = useState(propDetails?.id || null);
  const [guests, setGuests] = useState([]);
  const [addressOpen, setAddressOpen] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [emailType, setEmailType] = useState('website-share');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentHistory, setSentHistory] = useState([]);

  useEffect(() => {
    getMyGuestsWithRsvp().then(setGuests).catch(() => {});
  }, []);

  useEffect(() => {
    if (propDetails) { setDetails(propDetails); setDetailsId(propDetails.id); }
  }, [propDetails]);

  useEffect(() => {
    const defaultSubjects = {
      'save-the-date': `Save the Date — ${coupleDisplayName(details, 'Our Wedding')}`,
      'website-share': `Our guest suite is live — ${coupleDisplayName(details, '')}`,
      'rsvp-reminder': `RSVP Reminder — ${coupleDisplayName(details, 'Our Wedding')}`,
      'update': `Wedding Update from ${coupleDisplayName(details, 'the couple')}`,
    };
    setEmailSubject(defaultSubjects[emailType] || '');
  }, [emailType, details]);

  const updateField = async (field, value) => {
    const updated = { ...details, [field]: value };
    setDetails(updated);
    if (detailsId) await base44.entities.WeddingDetails.update(detailsId, { [field]: value });
  };

  // The gate hook persists through /api/my-wedding-details itself (the
  // credential is hashed server-side); this only keeps local state in step.
  const passwordGate = useWebsitePasswordGate(details, (patch) => {
    setDetails(prev => ({
      ...prev,
      websitePasswordEnabled: patch.websitePasswordEnabled ?? prev?.websitePasswordEnabled,
      ...(('websitePassword' in patch) ? { websitePasswordIsSet: !!patch.websitePassword?.trim() } : {}),
    }));
  });

  // THE QR IS GONE, AND SO IS THE ENCODER IT LAZY-LOADED.
  //
  // Item 12 of goals/2026-10-08-site-fixes-batch-1.md, 12a: "StudioShareTab,
  // PublishModal and WBRightPanel lose Copy, Copy Link, WhatsApp and QR and
  // any URL display. Email from the studio is the only way guests receive the
  // site." A QR is a link in another encoding, so it goes with the rest.
  //
  // The `qrcode` import went with it, which also takes a dynamic chunk out of
  // this tab. Two earlier commits (#726, #743) moved this QR off
  // api.qrserver.com to stop handing the couple's address to a service we do
  // not run; that reasoning is kept here rather than deleted with the code,
  // because the next person to want a QR on this tab should meet it.

  const togglePublish = async () => {
    const next = !details?.websiteEnabled;
    // THE SECOND PUBLISH CONTROL, AND IT HAD NO GATE AT ALL — not even the
    // disabled button the modal has. A couple with no names could go live
    // here at an address that does not exist.
    if (next && !details?.slug) {
      toast.error('Add your names first so your guest suite has an address.');
      return;
    }
    await updateField('websiteEnabled', next);
    toast.success(next ? 'Website is now live!' : 'Website hidden');
  };

  const toggleGuest = (id) => setSelectedGuests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const filteredGuests = guests.filter(g => { if (!guestSearch) return true; const q = guestSearch.toLowerCase(); return (g.name || '').toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q); });

  // STILL NOT A PLACEHOLDER, and now it has exactly one reader.
  //
  // This was `details.slug || 'your-wedding'`, and it fed the WhatsApp, SMS
  // and Facebook share actions and the QR, so a couple with no address could
  // hand guests `openinvite.com.au/w/your-wedding` over four channels. #745
  // made it empty instead. 12a removes all four of those readers; what is
  // left is the link inside the email body below, which is the one channel
  // the ruling keeps. It stays empty without an address for the same reason
  // as before: an email is the worst place for a guess.
  const siteUrl = details?.slug ? `${window.location.origin}/w/${details.slug}` : '';
  const hasAddress = !!details?.slug;

  const handleSend = async () => {
    if (!selectedGuests.length) return;
    setSending(true);
    const recipientGuests = guests.filter(g => selectedGuests.includes(g.id));
    let successCount = 0;
    let failCount = 0;
    for (const guest of recipientGuests) {
      if (!guest.email) continue;
      const personalised = emailMessage.replace(/{guestName}/g, guest.name || 'Guest');
      try {
        // `siteUrl`, NOT A SECOND COPY OF THE SAME TEMPLATE STRING. This line
        // used to build the address itself, so a couple with no slug emailed
        // guests `/w/undefined`. siteUrl is empty without an address, which is
        // an email with no link in it rather than an email with a broken one.
        await base44.integrations.Core.SendEmail({ to: guest.email, subject: emailSubject, body: `${personalised}${siteUrl ? `\n\n${siteUrl}` : ''}` });
        successCount++;
      } catch (err) {
        console.error('[StudioShareTab] SendEmail failed for', guest.email, err);
        failCount++;
      }
    }
    setSentHistory(prev => [{ type: emailType, count: successCount, date: new Date().toLocaleDateString() }, ...prev]);
    if (failCount > 0) {
      toast.error(`Sent to ${successCount} guest${successCount !== 1 ? 's' : ''} — ${failCount} failed, please try again for ${failCount === 1 ? 'that guest' : 'those guests'}.`);
    } else {
      toast.success(`Sent to ${successCount} guest${successCount !== 1 ? 's' : ''}!`);
    }
    setSelectedGuests([]);
    setSending(false);
  };


  if (!details) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(10,10,10,0.6)', fontFamily: sans }}>Loading…</div>;

  return (
    <div style={{ fontFamily: sans }}>
      {/* STATUS BANNER */}
      <div style={{ padding: '20px 40px', background: details?.websiteEnabled ? 'rgba(34,197,94,0.06)' : '#FAFAFA', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: (details?.websiteEnabled && hasAddress) ? '#22C55E' : '#DDDDDD', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0A0A0A' }}>
            {!hasAddress ? 'No address yet' : details?.websiteEnabled ? 'Your website is live' : 'Your website is not published yet'}
          </p>
          {/* THE ADDRESS USED TO BE PRINTED HERE, in monospace, as the status
              line. 12a removes every URL display from this tab, so the status
              says what the status is and the couple reaches the site itself
              through "View live site" beside it. */}
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: sans }}>
            {hasAddress
              ? 'Guests receive it by email from this page.'
              : <>Add your names in <a href="/EventDetails" style={{ color: '#E03553', fontWeight: 600 }}>Event details</a> and your address follows.</>}
          </p>
        </div>
        <button data-tour-target="guest-suite-publish" onClick={togglePublish} disabled={!hasAddress && !details?.websiteEnabled} style={{ padding: '10px 24px', background: details?.websiteEnabled ? 'transparent' : 'linear-gradient(135deg, #E03553, #803D81)', color: details?.websiteEnabled ? '#E03553' : '#FFF', border: details?.websiteEnabled ? '1px solid #E03553' : 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: sans }}>
          {details?.websiteEnabled ? 'Unpublish' : 'Publish Website'}
        </button>
        {details?.websiteEnabled && details?.slug && (
          <a href={`/w/${details.slug}`} target="_blank" rel="noreferrer" style={{ padding: '10px 24px', border: '1px solid #0A0A0A', color: '#0A0A0A', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>View Live Site ↗</a>
        )}
      </div>

      {/* THREE COLUMN BODY, WHICH STACKS ON A PHONE.
          It was a bare flex row with no wrap and no breakpoint, so at 390 the
          two columns shared the width with the fixed 280px sidebar and the
          email column collapsed to almost nothing: the message box measured
          26px and the send button 28px. Found by lane B's fixture audit at
          390, which is the only way it could be found, since nothing in the
          source says a width.

          THE CLASS DOES THE WORK, NOT AN INLINE STYLE. A media query cannot
          reach inline styles, and these columns are styled inline, so the
          stacking rule lives in src/index.css next to the builder header's,
          at the dashboard's existing 640px phone breakpoint. */}
      <div className="oi-share-body" style={{ display: 'flex', gap: 0, padding: '32px 40px', alignItems: 'flex-start', maxWidth: 1400, margin: '0 auto', boxSizing: 'border-box' }}>


        {/* CENTER — EMAIL */}
        <div className="oi-share-main" style={{ flex: 1, minWidth: 0, marginRight: 24 }}>
          <div style={{ border: '1px solid #EEEEEE', padding: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px' }}>Email Your Guests</p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 20px' }}>Send your guest suite directly to your guest list.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {[
                { label: 'All Guests', count: guests.length, action: () => setSelectedGuests(guests.map(g => g.id)) },
                { label: "Not Yet RSVP'd", count: guests.filter(isPending).length, action: () => setSelectedGuests(guests.filter(isPending).map(g => g.id)) },
                { label: 'Attending', count: guests.filter(isAttending).length, action: () => setSelectedGuests(guests.filter(isAttending).map(g => g.id)) },
                { label: 'Declined', count: guests.filter(isDeclined).length, action: () => setSelectedGuests(guests.filter(isDeclined).map(g => g.id)) },
              ].map(opt => (
                <button key={opt.label} onClick={opt.action} style={{ padding: '6px 12px', border: '1px solid #EEEEEE', background: '#FAFAFA', fontSize: 12, fontWeight: 600, color: '#444', cursor: 'pointer', fontFamily: sans }}>{opt.label} ({opt.count})</button>
              ))}
            </div>
            <div style={{ border: '1px solid #EEEEEE', marginBottom: 16 }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #EEEEEE', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input placeholder="Search guests..." value={guestSearch} onChange={e => setGuestSearch(e.target.value)} style={{ flex: 1, border: 'none', fontSize: 13, outline: 'none', fontFamily: sans }} />
                <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', flexShrink: 0 }}>{selectedGuests.length} selected</span>
                {selectedGuests.length > 0 && <button onClick={() => setSelectedGuests([])} style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sans }}>Clear</button>}
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {filteredGuests.length === 0 ? (
                  <p style={{ padding: '16px 12px', fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: 0 }}>No guests yet. <a href="/Guests" style={{ color: '#E03553', fontWeight: 600 }}>Add guests →</a></p>
                ) : filteredGuests.map(guest => (
                  <div key={guest.id} onClick={() => toggleGuest(guest.id)} {...interactiveDivProps(() => toggleGuest(guest.id), { label: guest.name })} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: '1px solid #F5F5F5', background: selectedGuests.includes(guest.id) ? 'rgba(224,53,83,0.04)' : '#FFF' }}>
                    <div style={{ width: 16, height: 16, border: `1px solid ${selectedGuests.includes(guest.id) ? '#E03553' : '#DDD'}`, background: selectedGuests.includes(guest.id) ? '#E03553' : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selectedGuests.includes(guest.id) && <span style={{ color: '#FFF', fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0A0A0A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guest.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(10,10,10,0.6)' }}>{guest.email || 'No email'}</p>
                    </div>
                    <div style={{ fontSize: 11, padding: '2px 8px', background: isAttending(guest) ? '#F0FDF4' : isDeclined(guest) ? '#FFF1F2' : '#F8F8F8', color: isAttending(guest) ? '#16A34A' : isDeclined(guest) ? '#E03553' : 'rgba(10,10,10,0.6)', fontWeight: 600, flexShrink: 0 }}>
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
                <div key={type.id} onClick={() => setEmailType(type.id)} {...interactiveDivProps(() => setEmailType(type.id), { label: type.label })} style={{ padding: '12px', border: `1px solid ${emailType === type.id ? '#0A0A0A' : '#EEEEEE'}`, background: emailType === type.id ? '#0A0A0A' : '#FFF', cursor: 'pointer' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: emailType === type.id ? '#FFF' : '#0A0A0A' }}>{type.label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: emailType === type.id ? 'rgba(255,255,255,0.6)' : 'rgba(10,10,10,0.6)' }}>{type.desc}</p>
                </div>
              ))}
            </div>
            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={{ width: '100%', borderBottom: '1px solid #DDD', border: 'none', padding: '8px 0', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box', fontFamily: sans }} />
            <textarea value={emailMessage} onChange={e => setEmailMessage(e.target.value)} rows={5} style={{ width: '100%', border: '1px solid #EEEEEE', padding: '12px', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: sans, lineHeight: 1.6, marginBottom: 4, boxSizing: 'border-box' }} />
            <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', margin: '0 0 16px' }}>Tip: Use {'{guestName}'} to personalize each email automatically.</p>
            <button disabled={selectedGuests.length === 0 || sending} onClick={handleSend} style={{ width: '100%', padding: '14px', background: selectedGuests.length === 0 ? '#EEEEEE' : 'linear-gradient(135deg, #E03553, #803D81)', color: selectedGuests.length === 0 ? 'rgba(10,10,10,0.3)' : '#FFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: selectedGuests.length === 0 ? 'not-allowed' : 'pointer', fontFamily: sans }}>
              {sending ? 'Sending…' : selectedGuests.length === 0 ? 'Select guests to send' : `Send to ${selectedGuests.length} guest${selectedGuests.length !== 1 ? 's' : ''}`}
            </button>
            {sentHistory.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px solid #EEEEEE', paddingTop: 16 }}>
                {sentHistory.map((send, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F5F5F5' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>{send.type.replace(/-/g, ' ')}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(10,10,10,0.6)' }}>{send.count} guests · {send.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: THE SITE'S OWN SETTINGS */}
        <div className="oi-share-aside" style={{ width: 280, flexShrink: 0 }}>
          <div style={{ border: '1px solid #EEEEEE', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>Password Protection</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(10,10,10,0.6)' }}>Guests must enter a password</p>
              </div>
              <ToggleSwitch value={passwordGate.wantsProtection} onChange={passwordGate.toggle} label="Password protection" />
            </div>
            {passwordGate.wantsProtection && (
              <div style={{ marginBottom: 16 }}>
                <input type="password" value={passwordGate.password} onChange={e => passwordGate.setPassword(e.target.value)} onBlur={passwordGate.commitPassword} placeholder={passwordGate.hasStoredPassword ? 'Set a new password…' : 'Set password...'} style={{ width: '100%', borderBottom: '1px solid #DDD', border: 'none', padding: '8px 0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: sans }} />
                {passwordGate.hasStoredPassword ? (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: sans }}>
                    A password is set. It can&rsquo;t be shown again — type a new one to replace it, or{' '}
                    <button onClick={passwordGate.clearPassword} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: '#E03553', cursor: 'pointer', textDecoration: 'underline' }}>remove it</button>.
                  </p>
                ) : passwordGate.incomplete && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: sans }}>Enter a password to turn protection on. Until you do, your site stays public.</p>
                )}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F5F5F5', paddingTop: 16 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>Hide from Search</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(10,10,10,0.6)' }}>Don't index in Google</p>
              </div>
              <ToggleSwitch value={details?.hideFromSearch || false} onChange={v => updateField('hideFromSearch', v)} label="Hide from search" />
            </div>
            {/* THE ADDRESS IS CHANGED FROM HERE NOW, and the address itself is
                still not printed.
                Item 3's ruling moved the capability off Event details and into
                item 12: "a single Change site address button to Settings next
                to Password protection that opens ChangeAddressDialog; the
                Settings page itself must not display the URL, the slug or any
                copyable link." So this is a button and nothing else. What the
                address currently IS belongs inside the dialog, which prints it
                as part of asking whether the couple really means it. */}
            <div style={{ borderTop: '1px solid #F5F5F5', paddingTop: 16, marginTop: 16 }}>
              <button
                data-change-site-address
                onClick={() => setAddressOpen(true)}
                disabled={!hasAddress}
                style={{
                  width: '100%', padding: '10px 0', border: '1px solid rgba(10,10,10,0.18)',
                  background: 'transparent', color: hasAddress ? '#0A0A0A' : 'rgba(10,10,10,0.3)',
                  fontSize: 12, fontWeight: 600, fontFamily: sans,
                  cursor: hasAddress ? 'pointer' : 'not-allowed',
                }}
              >
                Change site address
              </button>
              {!hasAddress && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: sans }}>
                  There is no address to change yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {addressOpen && (
        <ChangeAddressDialog
          weddingId={detailsId}
          currentSlug={details.slug}
          onClose={() => setAddressOpen(false)}
          onChanged={async ({ slug, previousSlugs }) => {
            // THE CLIENT WRITES, as it did from Event details: the endpoint
            // checks and reserves the address, and the record is updated with
            // the couple's own token so it meets owner-scoped RLS.
            setDetails(prev => ({ ...prev, slug, previousSlugs }));
            if (detailsId) await base44.entities.WeddingDetails.update(detailsId, { slug, previousSlugs });
          }}
        />
      )}
    </div>
  );
}
/**
 * EmailTemplates.jsx — retired the old plain-text preset system (5 hardcoded
 * {{double-brace}} templates, its own base44.integrations.Core.SendEmail send
 * path, its own AI-draft call) in favour of a template GALLERY: one card per
 * email type, each rendered through the single shared renderInvitationEmail()
 * template with the wedding's real universe styling and real data. Sending
 * — for real or as a test — always goes through SendInvitesModal / the
 * /api/send-invites path, never a second email mechanism.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { getWeddingEvents, getGuestEventResponse, getEventVenueAndDate } from '@/lib/weddingEvents';
import { renderInvitationEmail, EMAIL_TYPES, getBannerImageUrl, getDefaultBannerChoice } from '@/lib/emailTemplate';
import { TYPE_LABELS } from './SendInvitesModal';
import { FlaskConical, ArrowUpRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const F = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const RSVP_BASE = `${window.location.origin}/rsvp/`;

const TYPE_DESCRIPTIONS = {
  invite: 'The first ask — sent when a guest is added to your list.',
  reminder: 'A nudge for guests who were invited but haven\'t replied yet.',
  update: 'Something changed — venue, time, dress code. Keep everyone current.',
  thank_you_attending: 'Sent after a guest confirms they\'re coming.',
  thank_you_declined: 'Sent after a guest lets you know they can\'t make it.',
};

export default function EmailTemplates({ guests, onUseTemplate }) {
  const { user } = useAuth();
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingTestType, setSendingTestType] = useState(null);

  useEffect(() => {
    getMyWeddingDetails().then(w => { setWedding(w); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const coupleName = wedding?.coupleName || wedding?.couple_name || '';
  const universeId = wedding?.activeUniverse;

  const weddingEvents = useMemo(() => {
    if (!wedding) return [];
    return getWeddingEvents(wedding).map(ev => ({ ...ev, ...getEventVenueAndDate(wedding, ev) }));
  }, [wedding]);

  // A representative guest for the preview — first one with a real RSVP
  // link if there is one, otherwise a placeholder so the gallery still
  // renders before any guest has been invited.
  const sampleGuest = guests.find(g => g.rsvp_link_id) || null;
  const sampleEvents = sampleGuest
    ? weddingEvents.filter(ev => getGuestEventResponse(sampleGuest, ev).invited).map(ev => ({ name: ev.name, date: ev.date, startTime: ev.startTime, venue: ev.venue }))
    : weddingEvents.map(ev => ({ name: ev.name, date: ev.date, startTime: ev.startTime, venue: ev.venue }));
  const sampleRsvpUrl = sampleGuest ? `${RSVP_BASE}${sampleGuest.rsvp_link_id}` : `${RSVP_BASE}preview-token`;

  const bannerPhotos = { coverPhoto: wedding?.coverPhoto, venuePhotoUrl: wedding?.mainCeremony?.photoUrl };
  const bannerChoice = getDefaultBannerChoice(bannerPhotos);
  const bannerImageUrl = getBannerImageUrl(bannerPhotos, bannerChoice);

  const handleSendTest = async (type) => {
    if (!user?.email) { toast.error('No email on your account'); return; }
    setSendingTestType(type);
    const tid = toast.loading('Sending test email…');
    try {
      const res = await fetch('/api/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          universeId,
          bannerChoice,
          isTest: true,
          guests: [{ email: user.email, name: 'Test guest', rsvpUrl: sampleRsvpUrl, events: sampleEvents }],
          wedding: {
            coupleName, weddingDate: wedding?.weddingDate, venue: wedding?.mainCeremony?.venueName,
            coverPhoto: bannerPhotos.coverPhoto, venuePhotoUrl: bannerPhotos.venuePhotoUrl,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test send failed');
      toast.success(`Test email sent to ${user.email}`, { id: tid });
    } catch (err) {
      toast.error(err.message || 'Failed to send test', { id: tid });
    } finally {
      setSendingTestType(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite', color: 'rgba(10,10,10,0.3)' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', margin: '0 0 24px', maxWidth: 640, ...F }}>
        Every email type below is the same template, styled to your wedding's universe. "Use this" opens the send
        drawer with that type preselected; "Send test to me" emails you exactly what a guest would see.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
        {EMAIL_TYPES.map(type => {
          const html = renderInvitationEmail({
            universeId,
            type,
            coupleNames: coupleName,
            events: sampleEvents,
            rsvpUrl: sampleRsvpUrl,
            bannerImageUrl,
          }).html;
          const sendingTest = sendingTestType === type;

          return (
            <div key={type} style={{ border: '1px solid rgba(10,10,10,0.08)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 3px', ...F }}>{TYPE_LABELS[type]}</p>
                <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: 0, lineHeight: 1.4, ...F }}>{TYPE_DESCRIPTIONS[type]}</p>
              </div>

              <div style={{ height: 280, overflow: 'hidden', background: '#F5F5F5' }}>
                <iframe
                  title={`${TYPE_LABELS[type]} preview`}
                  srcDoc={html}
                  style={{
                    width: '166%', height: '166%', border: 'none', display: 'block',
                    transform: 'scale(0.6)', transformOrigin: 'top left', pointerEvents: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, padding: 12 }}>
                <button
                  onClick={() => onUseTemplate?.(type)}
                  className="btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}
                >
                  Use this
                  <ArrowUpRight size={13} />
                </button>
                <button
                  onClick={() => handleSendTest(type)}
                  disabled={sendingTest}
                  className="btn-editorial-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, opacity: sendingTest ? 0.6 : 1 }}
                >
                  {sendingTest ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FlaskConical size={13} />}
                  Send test to me
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

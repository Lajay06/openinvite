/**
 * src/pages/professional/VendorSheetPage.jsx
 *
 * /professional/vendor/:token, A VENDOR'S OWN RUN SHEET, NO ACCOUNT. Read-only,
 * designed at 390 first. Shows the vendor's items across every sheet, their
 * arrival and finish, and the planner's number for the day. Nothing about
 * guests, money or other vendors. The view is built by vendorSheetView, which
 * names every field it sends.
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { useProStore, STORE_LIVE } from '@/lib/professionalStore';
import { vendorSheetView, isVendorLinkLive, TOKEN_RE } from '@/lib/professionalVendors';
import { vendorRows, fmtTime, fmtDuration } from '@/lib/professionalRunSheet';
import { shortDate } from '@/lib/professionalEvents';
import { ASSET } from '@/components/public/OpeninviteLogo';
import { PRO, PJS, s } from '@/components/professional/proTheme';
import { TYPE } from '@/styles/typeScale';

const GONE = 'This link isn’t working. It may have expired or been turned off. Ask the planner who sent it for a new one.';

export default function VendorSheetPage() {
  const { token } = useParams();
  const store = useProStore();
  const [remote, setRemote] = useState(STORE_LIVE ? 'loading' : null);

  useEffect(() => {
    if (!STORE_LIVE || !TOKEN_RE.test(token || '')) { if (STORE_LIVE) setRemote('gone'); return undefined; }
    let alive = true;
    fetch(`/api/professional/vendor-sheet?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setRemote(j?.view || 'gone'); })
      .catch(() => { if (alive) setRemote('gone'); });
    return () => { alive = false; };
  }, [token]);

  let view = null;
  if (STORE_LIVE) view = remote && typeof remote === 'object' ? remote : null;
  else {
    const booking = store.ProVendorBooking.find((b) => b.link_token && b.link_token === token);
    if (booking && isVendorLinkLive(booking)) {
      const event = store.ProEvent.find((e) => e.id === booking.event_id);
      const vendor = store.VendorContact.find((v) => v.id === booking.vendor_id);
      const owner = store.ProMember.find((m) => (event?.assigned_member_ids || [])[0] === m.id) || store.ProMember.find((m) => m.role === 'owner');
      view = vendorSheetView({ event, booking, vendor, rows: vendorRows(store.RunSheetRow.filter((r) => r.event_id === booking.event_id), booking.vendor_id), planner: { name: owner?.name, phone: owner?.phone || '+1 415 555 0100' } });
    }
  }

  const scale = 16 / (ASSET.mark.y1 - ASSET.mark.y0 + 1);
  return (
    <div style={{ minHeight: '100vh', background: PRO.work, fontFamily: PJS, color: PRO.text }}>
      <header style={{ background: PRO.bar, height: PRO.barHeight, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <img src="/openinvite-logo.png" alt="Openinvite" style={{ height: Math.round(ASSET.height * scale) }} />
      </header>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {remote === 'loading' && <p style={s.secondary}>Loading the run sheet.</p>}
        {!view && remote !== 'loading' && <p style={{ ...s.card, ...s.body, margin: 0, lineHeight: 1.5 }}>{GONE}</p>}
        {view && (
          <>
            <section style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={s.label}>Run sheet for {view.vendor}</span>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{view.couple}</h1>
              <span style={s.secondary}>{shortDate(view.date)}{view.venue ? `, ${view.venue}` : ''}</span>
              {(view.arrive_minute !== null || view.finish_minute !== null) && (
                <span style={{ ...s.body, marginTop: 6 }}>
                  {view.arrive_minute !== null && <>Arrive <strong style={{ fontWeight: 600 }}>{fmtTime(view.arrive_minute)}</strong></>}
                  {view.arrive_minute !== null && view.finish_minute !== null && ', '}
                  {view.finish_minute !== null && <>finish <strong style={{ fontWeight: 600 }}>{fmtTime(view.finish_minute)}</strong></>}
                </span>
              )}
            </section>
            {view.planner?.phone && (
              <a href={`tel:${view.planner.phone}`} style={{ ...s.btnPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', fontSize: TYPE.input, textDecoration: 'none' }}>
                <Phone size={16} aria-hidden="true" /> Call {view.planner.name || 'the planner'}
              </a>
            )}
            <section aria-label="Your items" style={{ display: 'flex', flexDirection: 'column', gap: 1, background: PRO.border, border: `1px solid ${PRO.border}` }}>
              {view.rows.length === 0 && <p style={{ ...s.body, background: '#FFFFFF', margin: 0, padding: 16 }}>Nothing is on the run sheet for you yet.</p>}
              {view.rows.map((r, i) => (
                <div key={i} style={{ background: '#FFFFFF', padding: '12px 14px', display: 'flex', gap: 12 }}>
                  <div style={{ width: 72, flexShrink: 0 }}>
                    <div style={{ fontSize: TYPE.input, fontWeight: 600 }}>{fmtTime(r.start_minute)}</div>
                    <div style={s.secondary}>{fmtDuration(r.duration_minutes || 0)}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: TYPE.input, fontWeight: 600 }}>{r.item}</div>
                    <div style={s.secondary}>{[r.sheet, r.location].filter(Boolean).join(', ')}</div>
                    {r.cue && <div style={{ ...s.body, marginTop: 4 }}>Cue: {r.cue}</div>}
                  </div>
                </div>
              ))}
            </section>
            <p style={{ ...s.secondary, margin: 0, textAlign: 'center' }}>Made with Openinvite Professional</p>
          </>
        )}
      </main>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notificationCopy } from './copy';
import { deliver } from '../lib/images';
import { imageUrl } from '../images';
import '../styles/mobile.css';

/**
 * /m/preview/push, dev only. A realistic iOS lock screen: time, date, the
 * manifest's wallpaper photo, blurred notification cards showing six
 * Openinvite notifications from the real copy catalog, one expanded and
 * one grouped stack. `?state=banner` shows the in-app banner over Home
 * instead (that state lives on /m/preview?banner=1; this page links to it).
 * A design artifact: it sends nothing.
 */
const SAMPLE = [
  ['rsvp_attending', { names: ['Sarah', 'Tom'], count: 2, replied: 46, invited: 80 }, '9:41'],
  ['payment_due', { item: 'Florist deposit', vendor: 'Wildflower Studio', amount: '$450', due: 'Friday' }, '9:12'],
  ['message', { name: 'Amelia Nguyen', preview: 'Is there parking at The Fig Tree or should we book a cab?' }, '8:30'],
  ['song_request', { name: 'Jack Smith', song: 'Dancing in the Moonlight', artist: 'Toploader' }, '7:55'],
  ['gift', { name: 'The Walkers', item: 'Le Creuset casserole', amount: '$420' }, 'Yesterday'],
  ['briefing', { days: 180, sentence: '7 open tasks and 21 guests still to reply.' }, 'Yesterday'],
];

export default function PushPreview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [expanded, setExpanded] = useState(0);
  // The demo couple's cover, the couple's own photo on their lock screen
  // (the one identity photo the once-only rule allows; its former wallpaper
  // slot joined the splash pool in goal 6).
  const wallpaper = useMemo(() => deliver(imageUrl('fixtureCover'), { width: 390, height: 844, dpr: 2 }), []);
  const items = SAMPLE.map(([type, data, when]) => ({ type, when, ...notificationCopy(type, data) }));
  const now = new Date('2026-09-21T09:41:00');
  const grouped = params.get('grouped') !== '0';
  const single = items.slice(0, 3);
  const stack = items.slice(3);
  return (
    <div className="oi-mobile-root" style={{ background: '#0A0A0A' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'saturate(1.05)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.45) 100%)' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 12px 12px', color: '#FFFFFF' }}>
        <div style={{ textAlign: 'center', marginTop: 44 }}>
          <div style={{ fontSize: 20, lineHeight: '24px', fontWeight: 500, opacity: 0.95 }}>{now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div style={{ fontSize: 88, lineHeight: '92px', fontWeight: 600, letterSpacing: -2 }}>9:41</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8, paddingBottom: 56 }}>
          {single.map((it, i) => <Card key={it.type + i} item={it} expanded={expanded === i} onClick={() => setExpanded(i)} />)}
          {grouped && stack.length > 0 && <Stack items={stack} />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px 8px' }}>
          <Orb />
          <div style={{ width: 134, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.9)' }} />
          <Orb />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 10px)', right: 12, display: 'flex', gap: 8 }}>
        <button type="button" data-preview-control className="oi-m-pill oi-m-pill--light oi-m-pill--sm" onClick={() => navigate('/m/preview?banner=1')}>Show the in-app banner</button>
      </div>
    </div>
  );
}

function AppIcon() {
  return (
    <span style={{ width: 38, height: 38, borderRadius: 10, background: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
      <img src="/favicon.svg" alt="" style={{ width: 24, height: 24 }} />
    </span>
  );
}

function Card({ item, expanded, onClick, stacked = false, style }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', textAlign: 'left',
      padding: '12px 14px', borderRadius: 22, color: '#FFFFFF',
      background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.18)', boxShadow: stacked ? 'none' : '0 8px 24px rgba(0,0,0,0.12)', cursor: 'pointer', ...style,
    }}>
      <AppIcon />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
          <span style={{ fontSize: 13, lineHeight: '20px', opacity: 0.8, flexShrink: 0 }}>{item.when}</span>
        </div>
        <div style={{ fontSize: 15, lineHeight: '20px', opacity: 0.95, ...(expanded ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>{item.body}</div>
        {expanded && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.25)' }}>Open</span>
            <span style={{ fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.12)' }}>Later</span>
          </div>
        )}
      </div>
    </button>
  );
}

function Stack({ items }) {
  const [open, setOpen] = useState(false);
  if (open) return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{items.map((it, i) => <Card key={i} item={it} onClick={() => setOpen(false)} />)}</div>;
  return (
    <div style={{ position: 'relative', paddingBottom: 12 }}>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 0, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(24px)' }} />
      <div style={{ position: 'absolute', left: 8, right: 8, bottom: 6, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(24px)' }} />
      <Card item={{ ...items[0], body: `${items.length} more from Openinvite` }} onClick={() => setOpen(true)} stacked style={{ position: 'relative' }} />
    </div>
  );
}

function Orb() {
  return <span style={{ width: 48, height: 48, borderRadius: 999, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(20px)' }} />;
}

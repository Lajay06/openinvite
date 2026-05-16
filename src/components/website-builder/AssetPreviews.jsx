import React from 'react';

const serif = 'Cormorant Garamond, Georgia, serif';
const sans = "'Plus Jakarta Sans', sans-serif";

function couple(details) {
  if (details?.couple1Name && details?.couple2Name) return `${details.couple1Name} & ${details.couple2Name}`;
  return details?.coupleNames || 'Your Names';
}
function weddingDate(details) {
  if (!details?.weddingDate) return '15 March 2026';
  try { return new Date(details.weddingDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return details.weddingDate; }
}

export function SaveTheDatePreview({ details, content }) {
  const c = content || {};
  return (
    <div style={{ width: 600, height: 400, margin: '0 auto', position: 'relative', background: '#0A0A0A', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
      {c.photoUrl && <img src={c.photoUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 - (c.overlayStrength || 40) / 100 }} alt="" />}
      <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${(c.overlayStrength || 40) / 100})` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 48 }}>
        <div style={{ width: 48, height: 1, background: 'rgba(255,255,255,0.3)', marginBottom: 24 }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 20, fontFamily: sans, margin: '0 0 20px' }}>{c.customText || 'SAVE THE DATE'}</p>
        <h1 style={{ fontFamily: serif, fontWeight: 300, fontSize: 48, color: '#FFFFFF', letterSpacing: '0.1em', margin: '0 0 16px' }}>{couple(details)}</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.2em', margin: '0 0 8px', fontFamily: sans }}>{weddingDate(details)}</p>
        {details?.mainCeremony?.venueName && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', margin: 0, fontFamily: sans }}>{details.mainCeremony.venueName}</p>}
        <div style={{ width: 48, height: 1, background: 'rgba(255,255,255,0.3)', marginTop: 24 }} />
        {c.subtitle && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', marginTop: 16, fontFamily: sans }}>{c.subtitle}</p>}
      </div>
    </div>
  );
}

export function DigitalInvitationPreview({ details, content }) {
  const c = content || {};
  return (
    <div style={{ width: 480, minHeight: 640, margin: '0 auto', position: 'relative', background: '#FAF8F3', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
      {c.photoUrl && <img src={c.photoUrl} style={{ width: '100%', height: 220, objectFit: 'cover' }} alt="" />}
      {!c.photoUrl && <div style={{ width: '100%', height: 180, background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, fontFamily: sans, letterSpacing: '0.2em' }}>PHOTO</span></div>}
      <div style={{ padding: '40px 48px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: '#888', letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 20px', fontFamily: sans }}>Together with their families</p>
        <h1 style={{ fontFamily: serif, fontWeight: 300, fontSize: 42, color: '#0A0A0A', letterSpacing: '0.08em', margin: '0 0 8px' }}>{couple(details)}</h1>
        <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.2em', margin: '0 0 32px', fontFamily: sans }}>request the pleasure of your company</p>
        <div style={{ width: 40, height: 1, background: '#CCCCCC', margin: '0 auto 24px' }} />
        <p style={{ fontSize: 15, color: '#0A0A0A', fontFamily: serif, letterSpacing: '0.1em', margin: '0 0 4px' }}>{weddingDate(details)}</p>
        {details?.mainCeremony?.venueName && <p style={{ fontSize: 13, color: '#888', fontFamily: sans, margin: '0 0 32px' }}>{details.mainCeremony.venueName}</p>}
        {c.personalMessage && <p style={{ fontSize: 13, color: '#555', fontFamily: sans, lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>{c.personalMessage}</p>}
      </div>
    </div>
  );
}

export function MenuCardPreview({ details, content }) {
  const c = content || {};
  const bg = c.background === 'dark' ? '#0A0A0A' : c.background === 'ivory' ? '#FAF8F3' : '#FFFFFF';
  const textColor = c.background === 'dark' ? '#FFFFFF' : '#0A0A0A';
  const courses = ['starters', 'mains', 'desserts', 'drinks'];
  return (
    <div style={{ width: 340, minHeight: 480, background: bg, padding: '48px 40px', margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)', fontFamily: serif, color: textColor }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 8, fontFamily: sans }}>{c.title || 'MENU'}</p>
        <p style={{ fontWeight: 300, fontSize: 28, letterSpacing: '0.1em', margin: 0 }}>{couple(details)}</p>
        <div style={{ width: 32, height: 1, background: textColor, opacity: 0.2, margin: '16px auto' }} />
      </div>
      {courses.map(course => c[course]?.length > 0 && (
        <div key={course} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.4, marginBottom: 12, fontFamily: sans }}>{course}</p>
          {(c[course] || []).map((item, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <p style={{ fontWeight: 400, fontSize: 15, margin: '0 0 2px' }}>{item.name}</p>
              {item.description && <p style={{ fontSize: 12, opacity: 0.5, margin: 0, fontFamily: sans }}>{item.description}</p>}
            </div>
          ))}
        </div>
      ))}
      {courses.every(c2 => !c[c2]?.length) && (
        <div style={{ textAlign: 'center', opacity: 0.3, padding: '24px 0' }}>
          <p style={{ fontFamily: sans, fontSize: 13 }}>Add menu items in the editor →</p>
        </div>
      )}
      {c.footerNote && <p style={{ fontSize: 10, textAlign: 'center', opacity: 0.4, marginTop: 24, fontFamily: sans, fontStyle: 'italic' }}>{c.footerNote}</p>}
    </div>
  );
}

export function SeatingChartPreview({ details, content }) {
  const c = content || {};
  const dark = c.background === 'dark';
  return (
    <div style={{ width: 480, minHeight: 400, background: dark ? '#0A0A0A' : '#FAF8F3', padding: 40, margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)', textAlign: 'center' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.4)' : '#888', fontFamily: sans, margin: '0 0 8px' }}>{c.title || 'SEATING ARRANGEMENT'}</p>
      <p style={{ fontFamily: serif, fontWeight: 300, fontSize: 32, color: dark ? '#fff' : '#0A0A0A', margin: '0 0 24px' }}>{couple(details)}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'].map((t, i) => (
          <div key={i} style={{ border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'}`, padding: '12px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.5)' : '#888', fontFamily: sans, margin: '0 0 4px' }}>{t}</p>
            <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.3)' : '#CCCCCC', fontFamily: sans, margin: 0 }}>—</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.25)' : '#AAAAAA', fontFamily: sans, marginTop: 20 }}>Seating chart pulls from your Guest List</p>
    </div>
  );
}

export function RSVPCardPreview({ details, content }) {
  const c = content || {};
  return (
    <div style={{ width: 400, background: '#FFFFFF', padding: '48px 48px 40px', margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.12)', textAlign: 'center' }}>
      <div style={{ width: 40, height: 1, background: '#CCCCCC', margin: '0 auto 24px' }} />
      <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>{c.heading || 'Kindly Reply'}</p>
      <p style={{ fontFamily: serif, fontWeight: 300, fontSize: 36, color: '#0A0A0A', margin: '0 0 24px' }}>{couple(details)}</p>
      <p style={{ fontFamily: sans, fontSize: 13, color: '#888', margin: '0 0 32px' }}>{weddingDate(details)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <div style={{ border: '1px solid #0A0A0A', padding: '12px 20px', fontSize: 13, fontFamily: sans, fontWeight: 600, letterSpacing: '0.1em' }}>ACCEPTS WITH PLEASURE</div>
        <div style={{ border: '1px solid #DDD', padding: '12px 20px', fontSize: 13, fontFamily: sans, fontWeight: 600, letterSpacing: '0.1em', color: '#888' }}>DECLINES WITH REGRETS</div>
      </div>
      {c.deadline && <p style={{ fontFamily: sans, fontSize: 11, color: '#AAAAAA', margin: 0 }}>Please respond by {c.deadline}</p>}
    </div>
  );
}

export function InstagramStoryPreview({ details, content }) {
  const c = content || {};
  return (
    <div style={{ width: 270, height: 480, background: '#0A0A0A', margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {c.photoUrl && <img src={c.photoUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} alt="" />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
      <div style={{ position: 'relative', textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: sans, margin: '0 0 12px' }}>SAVE THE DATE</p>
        <p style={{ fontFamily: serif, fontWeight: 300, fontSize: 28, color: '#fff', letterSpacing: '0.08em', margin: '0 0 12px' }}>{couple(details)}</p>
        <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.4)', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: sans, margin: 0 }}>{weddingDate(details)}</p>
      </div>
    </div>
  );
}

export function WelcomeSignagePreview({ details, content }) {
  const c = content || {};
  const portrait = c.orientation !== 'landscape';
  return (
    <div style={{ width: portrait ? 340 : 520, height: portrait ? 460 : 300, background: '#FAF8F3', margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 48, border: '1px solid #E0E0E0' }}>
      <div style={{ width: 40, height: 1, background: '#CCCCCC', marginBottom: 24 }} />
      <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#888', margin: '0 0 16px' }}>{c.welcomeMessage || 'Welcome'}</p>
      <p style={{ fontFamily: serif, fontWeight: 300, fontSize: 40, color: '#0A0A0A', letterSpacing: '0.08em', margin: '0 0 12px' }}>{couple(details)}</p>
      {c.subtitle && <p style={{ fontFamily: sans, fontSize: 13, color: '#888', margin: '0 0 16px' }}>{c.subtitle}</p>}
      <div style={{ width: 40, height: 1, background: '#CCCCCC', marginTop: 16 }} />
      <p style={{ fontFamily: sans, fontSize: 11, color: '#AAAAAA', marginTop: 16 }}>{weddingDate(details)}</p>
    </div>
  );
}

export function GuestTagsPreview({ details, content }) {
  const c = content || {};
  const dark = c.layout === 'dark';
  const tags = [{ name: 'Guest Name', table: 'Table 4' }, { name: 'Guest Name', table: 'Table 2' }, { name: 'Guest Name', table: 'Table 7' }, { name: 'Guest Name', table: 'Table 1' }];
  return (
    <div style={{ width: 480, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {tags.map((tag, i) => (
          <div key={i} style={{ background: dark ? '#0A0A0A' : '#FFFFFF', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'}`, padding: '16px 20px', textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.4)' : '#AAAAAA', margin: '0 0 4px' }}>{couple(details)}</p>
            <p style={{ fontFamily: serif, fontWeight: 400, fontSize: 18, color: dark ? '#fff' : '#0A0A0A', margin: '0 0 6px' }}>{tag.name}</p>
            {c.showTable !== false && <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.2em', color: dark ? 'rgba(255,255,255,0.4)' : '#888', margin: 0 }}>{tag.table}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThankYouNotesPreview({ details, content }) {
  const c = content || {};
  return (
    <div style={{ width: 400, background: '#FFFFFF', padding: '48px 48px 40px', margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.12)', textAlign: 'center' }}>
      <div style={{ width: 40, height: 1, background: '#CCCCCC', margin: '0 auto 32px' }} />
      <p style={{ fontFamily: serif, fontWeight: 300, fontSize: 36, color: '#0A0A0A', margin: '0 0 24px', letterSpacing: '0.05em' }}>{couple(details)}</p>
      <div style={{ width: 40, height: 1, background: '#CCCCCC', margin: '0 auto 24px' }} />
      <p style={{ fontFamily: sans, fontSize: 14, color: '#555', lineHeight: 1.8, fontStyle: 'italic', margin: '0 0 24px' }}>{c.message || 'Thank you so much for celebrating with us.'}</p>
      <p style={{ fontFamily: serif, fontWeight: 300, fontSize: 22, color: '#0A0A0A', margin: 0 }}>{c.closing || 'With love'}</p>
    </div>
  );
}

export function MotionGraphicPreview({ details, content }) {
  const c = content || {};
  return (
    <div style={{ width: 480, height: 270, background: '#0A0A0A', margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(224,53,83,0.1) 0%, transparent 70%)' }} />
      <p style={{ fontFamily: sans, fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 16px', position: 'relative' }}>MOTION GRAPHIC</p>
      <p style={{ fontFamily: serif, fontWeight: 300, fontSize: 36, color: '#fff', letterSpacing: '0.1em', margin: '0 0 12px', position: 'relative' }}>{couple(details)}</p>
      <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.2)', margin: '0 auto 12px', position: 'relative' }} />
      <p style={{ fontFamily: sans, fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, position: 'relative' }}>{weddingDate(details)}</p>
      <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>▶</span>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: sans }}>Preview</span>
      </div>
    </div>
  );
}

export const ASSET_PREVIEW_MAP = {
  saveTheDate: SaveTheDatePreview,
  digitalInvitation: DigitalInvitationPreview,
  menuCard: MenuCardPreview,
  seatingChart: SeatingChartPreview,
  rsvpCard: RSVPCardPreview,
  instagramStory: InstagramStoryPreview,
  welcomeSignage: WelcomeSignagePreview,
  guestTags: GuestTagsPreview,
  thankYouNotes: ThankYouNotesPreview,
  motionGraphic: MotionGraphicPreview,
};

// Map from left-panel id (kebab) to camelCase key
export const ASSET_ID_TO_KEY = {
  'save-the-date': 'saveTheDate',
  'digital-invitation': 'digitalInvitation',
  'menu-card': 'menuCard',
  'seating-chart': 'seatingChart',
  'rsvp-card': 'rsvpCard',
  'instagram-kit': 'instagramStory',
  'welcome-signage': 'welcomeSignage',
  'guest-tags': 'guestTags',
  'thank-you': 'thankYouNotes',
  'motion-graphic': 'motionGraphic',
};
import React from 'react';
import { buildTablesWithGuests, buildGuestTagList } from '@/lib/seatingChart';

// Matches this file's original, pre-universe hardcoded look exactly — used
// when no theme/typography is passed (older/unmigrated call sites), so
// nothing regresses for a consumer that hasn't been updated yet.
const DEFAULT_THEME = { darkBg: '#0A0A0A', lightBg: '#FAF8F3', darkText: '#FFFFFF', lightText: '#0A0A0A', accent: '#E03553' };
const DEFAULT_TYPOGRAPHY = { headingFont: 'Cormorant Garamond, Georgia, serif', bodyFont: "'Plus Jakarta Sans', sans-serif", headingWeight: 300 };

function couple(details) {
  if (details?.couple1Name && details?.couple2Name) return `${details.couple1Name} & ${details.couple2Name}`;
  return details?.coupleNames || 'Your Names';
}
function weddingDate(details) {
  if (!details?.weddingDate) return '15 March 2026';
  try { return new Date(details.weddingDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return details.weddingDate; }
}

export function SaveTheDatePreview({ details, content, theme = DEFAULT_THEME, typography = DEFAULT_TYPOGRAPHY }) {
  const c = content || {};
  const serif = typography.headingFont, sans = typography.bodyFont;
  return (
    <div style={{ width: 600, height: 400, margin: '0 auto', position: 'relative', background: theme.darkBg, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
      {c.photoUrl && <img src={c.photoUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 - (c.overlayStrength || 40) / 100 }} alt="" />}
      <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${(c.overlayStrength || 40) / 100})` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 48 }}>
        <div style={{ width: 48, height: 1, background: 'rgba(255,255,255,0.3)', marginBottom: 24 }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 20, fontFamily: sans, margin: '0 0 20px' }}>{c.customText || 'SAVE THE DATE'}</p>
        <h1 style={{ fontFamily: serif, fontWeight: typography.headingWeight, fontSize: 48, color: theme.darkText, letterSpacing: '0.1em', margin: '0 0 16px' }}>{couple(details)}</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.2em', margin: '0 0 8px', fontFamily: sans }}>{weddingDate(details)}</p>
        {details?.mainCeremony?.venueName && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', margin: 0, fontFamily: sans }}>{details.mainCeremony.venueName}</p>}
        <div style={{ width: 48, height: 1, background: 'rgba(255,255,255,0.3)', marginTop: 24 }} />
        {c.subtitle && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', marginTop: 16, fontFamily: sans }}>{c.subtitle}</p>}
      </div>
    </div>
  );
}

export function DigitalInvitationPreview({ details, content, theme = DEFAULT_THEME, typography = DEFAULT_TYPOGRAPHY }) {
  const c = content || {};
  const serif = typography.headingFont, sans = typography.bodyFont;
  return (
    <div style={{ width: 480, minHeight: 640, margin: '0 auto', position: 'relative', background: theme.lightBg, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
      {c.photoUrl && <img src={c.photoUrl} style={{ width: '100%', height: 220, objectFit: 'cover' }} alt="" />}
      {!c.photoUrl && <div style={{ width: '100%', height: 180, background: theme.darkBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, fontFamily: sans, letterSpacing: '0.2em' }}>PHOTO</span></div>}
      <div style={{ padding: '40px 48px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: `${theme.lightText}88`, letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 20px', fontFamily: sans }}>Together with their families</p>
        <h1 style={{ fontFamily: serif, fontWeight: typography.headingWeight, fontSize: 42, color: theme.lightText, letterSpacing: '0.08em', margin: '0 0 8px' }}>{couple(details)}</h1>
        <p style={{ fontSize: 11, color: `${theme.lightText}88`, letterSpacing: '0.2em', margin: '0 0 32px', fontFamily: sans }}>request the pleasure of your company</p>
        <div style={{ width: 40, height: 1, background: '#CCCCCC', margin: '0 auto 24px' }} />
        <p style={{ fontSize: 15, color: theme.lightText, fontFamily: serif, letterSpacing: '0.1em', margin: '0 0 4px' }}>{weddingDate(details)}</p>
        {details?.mainCeremony?.venueName && <p style={{ fontSize: 13, color: `${theme.lightText}88`, fontFamily: sans, margin: '0 0 32px' }}>{details.mainCeremony.venueName}</p>}
        {c.personalMessage && <p style={{ fontSize: 13, color: `${theme.lightText}CC`, fontFamily: sans, lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>{c.personalMessage}</p>}
      </div>
    </div>
  );
}

export function MenuCardPreview({ details, content, theme = DEFAULT_THEME, typography = DEFAULT_TYPOGRAPHY }) {
  const c = content || {};
  const serif = typography.headingFont, sans = typography.bodyFont;
  const bg = c.background === 'dark' ? theme.darkBg : theme.lightBg;
  const textColor = c.background === 'dark' ? theme.darkText : theme.lightText;
  const courses = ['starters', 'mains', 'desserts', 'drinks'];
  return (
    <div style={{ width: 340, minHeight: 480, background: bg, padding: '48px 40px', margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)', fontFamily: serif, color: textColor }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 8, fontFamily: sans }}>{c.title || 'MENU'}</p>
        <p style={{ fontWeight: typography.headingWeight, fontSize: 28, letterSpacing: '0.1em', margin: 0 }}>{couple(details)}</p>
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

export function SeatingChartPreview({ details, content, theme = DEFAULT_THEME, typography = DEFAULT_TYPOGRAPHY, tables, guests }) {
  const c = content || {};
  const serif = typography.headingFont, sans = typography.bodyFont;
  const dark = c.background === 'dark';
  const bg = dark ? theme.darkBg : theme.lightBg;
  const textColor = dark ? theme.darkText : theme.lightText;
  const mutedColor = dark ? 'rgba(255,255,255,0.4)' : `${theme.lightText}88`;
  const tablesWithGuests = buildTablesWithGuests(tables, guests);

  return (
    <div style={{ width: 480, minHeight: 400, background: bg, padding: 40, margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)', textAlign: 'center' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: mutedColor, fontFamily: sans, margin: '0 0 8px' }}>{c.title || 'SEATING ARRANGEMENT'}</p>
      <p style={{ fontFamily: serif, fontWeight: typography.headingWeight, fontSize: 32, color: textColor, margin: '0 0 24px' }}>{couple(details)}</p>
      {tablesWithGuests.length === 0 ? (
        <div style={{ padding: '32px 0' }}>
          <p style={{ fontSize: 13, color: mutedColor, fontFamily: sans, margin: '0 0 6px' }}>No seating assigned yet</p>
          <p style={{ fontSize: 11, color: mutedColor, fontFamily: sans, margin: 0, opacity: 0.7 }}>Assign guests to tables in the Seating planner first.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {tablesWithGuests.map(t => (
            <div key={t.id} style={{ border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'}`, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedColor, fontFamily: sans, margin: '0 0 6px' }}>{t.name}</p>
              {t.guests.map(g => (
                <p key={g.id} style={{ fontSize: 11, color: textColor, fontFamily: sans, margin: '0 0 2px' }}>{g.name}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RSVPCardPreview({ details, content, theme = DEFAULT_THEME, typography = DEFAULT_TYPOGRAPHY }) {
  const c = content || {};
  const serif = typography.headingFont, sans = typography.bodyFont;
  return (
    <div style={{ width: 400, background: theme.lightBg, padding: '48px 48px 40px', margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.12)', textAlign: 'center' }}>
      <div style={{ width: 40, height: 1, background: '#CCCCCC', margin: '0 auto 24px' }} />
      <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: `${theme.lightText}88`, margin: '0 0 8px' }}>{c.heading || 'Kindly Reply'}</p>
      <p style={{ fontFamily: serif, fontWeight: typography.headingWeight, fontSize: 36, color: theme.lightText, margin: '0 0 24px' }}>{couple(details)}</p>
      <p style={{ fontFamily: sans, fontSize: 13, color: `${theme.lightText}88`, margin: '0 0 32px' }}>{weddingDate(details)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <div style={{ border: `1px solid ${theme.lightText}`, padding: '12px 20px', fontSize: 13, fontFamily: sans, fontWeight: 600, letterSpacing: '0.1em', color: theme.lightText }}>ACCEPTS WITH PLEASURE</div>
        <div style={{ border: '1px solid #DDD', padding: '12px 20px', fontSize: 13, fontFamily: sans, fontWeight: 600, letterSpacing: '0.1em', color: '#888' }}>DECLINES WITH REGRETS</div>
      </div>
      {c.deadline && <p style={{ fontFamily: sans, fontSize: 11, color: '#AAAAAA', margin: 0 }}>Please respond by {c.deadline}</p>}
    </div>
  );
}

export function InstagramStoryPreview({ details, content, theme = DEFAULT_THEME, typography = DEFAULT_TYPOGRAPHY }) {
  const c = content || {};
  const serif = typography.headingFont, sans = typography.bodyFont;
  return (
    <div style={{ width: 270, height: 480, background: theme.darkBg, margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {c.photoUrl && <img src={c.photoUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} alt="" />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
      <div style={{ position: 'relative', textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: sans, margin: '0 0 12px' }}>SAVE THE DATE</p>
        <p style={{ fontFamily: serif, fontWeight: typography.headingWeight, fontSize: 28, color: theme.darkText, letterSpacing: '0.08em', margin: '0 0 12px' }}>{couple(details)}</p>
        <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.4)', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: sans, margin: 0 }}>{weddingDate(details)}</p>
      </div>
    </div>
  );
}

export function WelcomeSignagePreview({ details, content, theme = DEFAULT_THEME, typography = DEFAULT_TYPOGRAPHY }) {
  const c = content || {};
  const serif = typography.headingFont, sans = typography.bodyFont;
  const portrait = c.orientation !== 'landscape';
  return (
    <div style={{ width: portrait ? 340 : 520, height: portrait ? 460 : 300, background: theme.lightBg, margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 48, border: '1px solid #E0E0E0' }}>
      <div style={{ width: 40, height: 1, background: '#CCCCCC', marginBottom: 24 }} />
      <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: `${theme.lightText}88`, margin: '0 0 16px' }}>{c.welcomeMessage || 'Welcome'}</p>
      <p style={{ fontFamily: serif, fontWeight: typography.headingWeight, fontSize: 40, color: theme.lightText, letterSpacing: '0.08em', margin: '0 0 12px' }}>{couple(details)}</p>
      {c.subtitle && <p style={{ fontFamily: sans, fontSize: 13, color: `${theme.lightText}88`, margin: '0 0 16px' }}>{c.subtitle}</p>}
      <div style={{ width: 40, height: 1, background: '#CCCCCC', marginTop: 16 }} />
      <p style={{ fontFamily: sans, fontSize: 11, color: '#AAAAAA', marginTop: 16 }}>{weddingDate(details)}</p>
    </div>
  );
}

/**
 * A single name tag — factored out so both the on-screen preview (a
 * handful of tags) and the full print export (every real guest, 6-per-
 * page across as many sheets as needed) render identically.
 */
export function GuestTag({ name, table, theme, typography, dark, showTable }) {
  const serif = typography.headingFont, sans = typography.bodyFont;
  return (
    <div style={{ background: dark ? theme.darkBg : theme.lightBg, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'}`, padding: '16px 20px', textAlign: 'center' }}>
      <p style={{ fontFamily: serif, fontWeight: 400, fontSize: 18, color: dark ? theme.darkText : theme.lightText, margin: '0 0 6px' }}>{name}</p>
      {showTable !== false && table && <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.2em', color: dark ? 'rgba(255,255,255,0.4)' : `${theme.lightText}88`, margin: 0 }}>{table}</p>}
    </div>
  );
}

export function GuestTagsPreview({ details, content, theme = DEFAULT_THEME, typography = DEFAULT_TYPOGRAPHY, tables, guests }) {
  const c = content || {};
  const dark = c.layout === 'dark';
  const tagList = buildGuestTagList(tables, guests).slice(0, 4);

  return (
    <div style={{ width: 480, margin: '0 auto' }}>
      {tagList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: typography.bodyFont }}>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 6px' }}>No guests yet</p>
          <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', margin: 0 }}>Add guests to your Guest List to generate name tags.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {tagList.map((tag, i) => (
            <GuestTag key={i} name={tag.name} table={tag.table} theme={theme} typography={typography} dark={dark} showTable={c.showTable} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ThankYouNotesPreview({ details, content, theme = DEFAULT_THEME, typography = DEFAULT_TYPOGRAPHY }) {
  const c = content || {};
  const serif = typography.headingFont, sans = typography.bodyFont;
  return (
    <div style={{ width: 400, background: theme.lightBg, padding: '48px 48px 40px', margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.12)', textAlign: 'center' }}>
      <div style={{ width: 40, height: 1, background: '#CCCCCC', margin: '0 auto 32px' }} />
      <p style={{ fontFamily: serif, fontWeight: typography.headingWeight, fontSize: 36, color: theme.lightText, margin: '0 0 24px', letterSpacing: '0.05em' }}>{couple(details)}</p>
      <div style={{ width: 40, height: 1, background: '#CCCCCC', margin: '0 auto 24px' }} />
      <p style={{ fontFamily: sans, fontSize: 14, color: `${theme.lightText}CC`, lineHeight: 1.8, fontStyle: 'italic', margin: '0 0 24px' }}>{c.message || 'Thank you so much for celebrating with us.'}</p>
      <p style={{ fontFamily: serif, fontWeight: typography.headingWeight, fontSize: 22, color: theme.lightText, margin: 0 }}>{c.closing || 'With love'}</p>
    </div>
  );
}

export function MotionGraphicPreview({ details, content, theme = DEFAULT_THEME, typography = DEFAULT_TYPOGRAPHY }) {
  const c = content || {};
  const serif = typography.headingFont, sans = typography.bodyFont;
  return (
    <div style={{ width: 480, height: 270, background: theme.darkBg, margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${theme.accent}1A 0%, transparent 70%)` }} />
      <p style={{ fontFamily: sans, fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 16px', position: 'relative' }}>MOTION GRAPHIC</p>
      <p style={{ fontFamily: serif, fontWeight: typography.headingWeight, fontSize: 36, color: theme.darkText, letterSpacing: '0.1em', margin: '0 0 12px', position: 'relative' }}>{couple(details)}</p>
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

export { DEFAULT_THEME, DEFAULT_TYPOGRAPHY };

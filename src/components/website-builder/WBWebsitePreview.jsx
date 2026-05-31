import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS, WEDDING_PAGES } from '@/lib/websiteThemes';

// Wraps a section in a clickable hover box in preview mode
function PreviewSection({ id, label, selectedSection, onSectionClick, children, style = {} }) {
  const isSelected = selectedSection === id;
  return (
    <div
      className="wb-preview-section"
      data-section={id}
      onClick={() => onSectionClick && onSectionClick(id)}
      style={{
        position: 'relative',
        outline: isSelected ? '2px solid #2563EB' : 'none',
        outlineOffset: -2,
        cursor: 'pointer',
        ...style,
      }}
    >
      {/* Edit label */}
      <div className="wb-edit-label" style={{
        position: 'absolute', top: 8, right: 8, zIndex: 9999,
        background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 700,
        padding: '3px 8px', borderRadius: 3, letterSpacing: '0.06em',
        opacity: 0, transition: 'opacity 0.15s', pointerEvents: 'none',
      }}>
        {label || 'Edit'}
      </div>
      {children}
    </div>
  );
}

// ── HOME PAGE ─────────────────────────────────────────────────
function HomePreview({ details, theme, typo, selectedSection, onSectionClick }) {
  const names = details.coupleNames || 'Sarah & James';
  const date = details.weddingDate
    ? new Date(details.weddingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'June 14, 2025';
  const tagline = details.homeContent?.tagline || details.welcomeMessage || 'We are overjoyed to celebrate with you.';
  const hasBg = details.coverPhoto || details.heroVideoUrl;

  return (
    <div style={{ background: theme.darkBg }}>
      <PreviewSection id="hero" label="Hero" selectedSection={selectedSection} onSectionClick={onSectionClick}>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          background: hasBg ? `url(${details.coverPhoto}) center/cover no-repeat` : theme.darkBg,
        }}>
          {hasBg && <div style={{ position: 'absolute', inset: 0, background: `${theme.darkBg}88` }} />}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '60px 24px' }}>
            <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2.5rem,8vw,5rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.darkText, margin: '0 0 16px', lineHeight: 1.1 }}>
              {names}
            </h1>
            <p style={{ fontFamily: typo.bodyFont, fontSize: '1rem', color: theme.darkText, opacity: 0.8, marginBottom: 24, letterSpacing: '0.08em' }}>
              {date}
            </p>
            <p style={{ fontFamily: typo.bodyFont, fontSize: '1.1rem', color: theme.darkText, opacity: 0.75, maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
              {tagline}
            </p>
          </div>
        </div>
      </PreviewSection>
    </div>
  );
}

// ── OUR STORY ─────────────────────────────────────────────────
function OurStoryPreview({ details, theme, typo, selectedSection, onSectionClick }) {
  const story = details.ourStoryContent || {};
  const milestones = story.milestones || [];
  const photos = story.photos || [];

  return (
    <div>
      <PreviewSection id="our-story" label="Story" selectedSection={selectedSection} onSectionClick={onSectionClick}>
        <div style={{ background: theme.lightBg, padding: '80px 24px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.lightText, marginBottom: 32 }}>Our Story</h1>
          {story.storyText ? (
            <p style={{ fontFamily: typo.bodyFont, fontSize: '1.05rem', color: theme.lightText, opacity: 0.85, maxWidth: 660, margin: '0 auto', lineHeight: 1.8 }}>{story.storyText}</p>
          ) : (
            <p style={{ fontFamily: typo.bodyFont, fontSize: '1rem', color: theme.lightText, opacity: 0.4, maxWidth: 500, margin: '0 auto' }}>Your story will appear here...</p>
          )}
        </div>
      </PreviewSection>

      {photos.length > 0 && (
        <PreviewSection id="our-story-photos" label="Photos" selectedSection={selectedSection} onSectionClick={onSectionClick}>
          <div style={{ background: theme.darkBg, padding: '40px 24px', display: 'flex', gap: 8, overflowX: 'auto' }}>
            {photos.map((p, i) => (
              <img key={i} src={p} alt="" style={{ height: 200, width: 'auto', objectFit: 'cover', flexShrink: 0, borderRadius: 4 }} />
            ))}
          </div>
        </PreviewSection>
      )}

      {milestones.length > 0 && (
        <PreviewSection id="our-story-milestones" label="Milestones" selectedSection={selectedSection} onSectionClick={onSectionClick}>
          <div style={{ background: theme.lightBg, padding: '60px 24px' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              {milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 24, marginBottom: 32, paddingBottom: 32, borderBottom: i < milestones.length - 1 ? `1px solid ${theme.accent}30` : 'none' }}>
                  <div style={{ fontFamily: typo.bodyFont, fontSize: 13, color: theme.accent, fontWeight: 700, minWidth: 90, paddingTop: 3 }}>{m.date}</div>
                  <p style={{ fontFamily: typo.bodyFont, fontSize: 15, color: theme.lightText, lineHeight: 1.6, margin: 0 }}>{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        </PreviewSection>
      )}
    </div>
  );
}

// ── CELEBRATION ───────────────────────────────────────────────
function CelebrationPreview({ details, theme, typo, selectedSection, onSectionClick }) {
  const cer = details.mainCeremony || {};
  const rec = details.reception || {};
  const schedule = details.celebrationContent?.daySchedule || [];

  return (
    <div style={{ background: theme.lightBg }}>
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.lightText, marginBottom: 48 }}>The Celebration</h1>
        <div style={{ display: 'flex', gap: 20, maxWidth: 800, margin: '0 auto', flexWrap: 'wrap' }}>
          {[{ title: 'Ceremony', data: cer }, { title: 'Reception', data: rec }].map(({ title, data }) => (
            <PreviewSection key={title} id={title.toLowerCase()} label={title} selectedSection={selectedSection} onSectionClick={onSectionClick} style={{ flex: 1, minWidth: 260 }}>
              <div style={{ background: theme.darkBg, padding: 32, borderRadius: 4, textAlign: 'left' }}>
                <h3 style={{ fontFamily: typo.headingFont + ',serif', fontSize: '1.4rem', fontWeight: typo.headingWeight, color: theme.darkText, marginBottom: 20 }}>{title}</h3>
                {data.venueName && <InfoRow label="VENUE" value={data.venueName} theme={theme} typo={typo} />}
                {data.address && <InfoRow label="ADDRESS" value={data.address} theme={theme} typo={typo} />}
                {data.startTime && <InfoRow label="TIME" value={`${data.startTime}${data.endTime ? ' – ' + data.endTime : ''}`} theme={theme} typo={typo} />}
                {data.dressCode && <InfoRow label="DRESS CODE" value={data.dressCode} theme={theme} typo={typo} />}
                {!data.venueName && !data.address && (
                  <p style={{ fontSize: 13, color: theme.darkText, opacity: 0.4 }}>{title} details will appear here...</p>
                )}
              </div>
            </PreviewSection>
          ))}
        </div>
      </div>

      {schedule.length > 0 && (
        <PreviewSection id="schedule" label="Schedule" selectedSection={selectedSection} onSectionClick={onSectionClick}>
          <div style={{ background: theme.darkBg, padding: '60px 24px' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <h2 style={{ fontFamily: typo.headingFont + ',serif', fontSize: '2rem', fontWeight: typo.headingWeight, color: theme.darkText, marginBottom: 40, textAlign: 'center' }}>Day Schedule</h2>
              {schedule.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${theme.accent}25` }}>
                  <span style={{ fontSize: 13, color: theme.accent, fontWeight: 700, minWidth: 64, paddingTop: 2 }}>{item.time}</span>
                  <span style={{ fontFamily: typo.bodyFont, fontSize: 15, color: theme.darkText }}>{item.title || item.description}</span>
                </div>
              ))}
            </div>
          </div>
        </PreviewSection>
      )}
    </div>
  );
}

function InfoRow({ label, value, theme, typo }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: theme.accent, letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: typo.bodyFont, fontSize: 14, color: theme.darkText, opacity: 0.9 }}>{value}</div>
    </div>
  );
}

// ── RSVP ──────────────────────────────────────────────────────
function RSVPPreview({ details, theme, typo, selectedSection, onSectionClick }) {
  const r = details.rsvpContent || {};
  return (
    <PreviewSection id="rsvp" label="RSVP" selectedSection={selectedSection} onSectionClick={onSectionClick}>
      <div style={{ background: theme.lightBg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.lightText, textAlign: 'center', marginBottom: 40 }}>RSVP</h1>
          {r.rsvpDeadline && (
            <p style={{ textAlign: 'center', fontSize: 13, color: theme.accent, marginBottom: 32 }}>
              Please respond by {new Date(r.rsvpDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          <div style={{ background: theme.darkBg, padding: 36, borderRadius: 4 }}>
            {[{ label: 'NAME', type: 'text' }, { label: 'EMAIL', type: 'email' }].map(f => (
              <div key={f.label} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.accent, letterSpacing: '0.1em', marginBottom: 8 }}>{f.label}</div>
                <div style={{ height: 36, borderBottom: `1px solid ${theme.accent}40` }} />
              </div>
            ))}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.accent, letterSpacing: '0.1em', marginBottom: 10 }}>ATTENDING?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {['Joyfully Accepts', 'Regretfully Declines'].map(s => (
                  <div key={s} style={{ padding: '7px 14px', border: `1px solid ${theme.accent}50`, borderRadius: 3, fontSize: 12, color: theme.darkText, fontWeight: 600 }}>{s}</div>
                ))}
              </div>
            </div>
            {(r.mealOptions || []).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.accent, letterSpacing: '0.1em', marginBottom: 10 }}>MEAL PREFERENCE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {r.mealOptions.map(o => <div key={o} style={{ padding: '6px 12px', border: `1px solid ${theme.accent}40`, fontSize: 12, color: theme.darkText }}>{o}</div>)}
                </div>
              </div>
            )}
            <div style={{ height: 42, background: theme.accent, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: theme.darkBg, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Submit RSVP</span>
            </div>
          </div>
        </div>
      </div>
    </PreviewSection>
  );
}

// ── REGISTRY ──────────────────────────────────────────────────
function RegistryPreview({ details, theme, typo, selectedSection, onSectionClick }) {
  const r = details.registryContent || {};
  const links = r.registryLinks || [];
  return (
    <PreviewSection id="registry" label="Registry" selectedSection={selectedSection} onSectionClick={onSectionClick}>
      <div style={{ background: theme.lightBg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.lightText, marginBottom: 24 }}>Registry</h1>
          {r.registryMessage && <p style={{ fontSize: 15, color: theme.lightText, opacity: 0.8, maxWidth: 540, margin: '0 auto 48px', lineHeight: 1.7 }}>{r.registryMessage}</p>}
          {r.noGiftsPlease && <p style={{ fontSize: 15, color: theme.accent, fontWeight: 600, margin: '0 auto 40px' }}>Your presence is our greatest gift.</p>}
          {links.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
              {links.map((l, i) => (
                <div key={i} style={{ background: theme.darkBg, padding: '20px 32px', borderRadius: 4, minWidth: 180 }}>
                  <p style={{ fontFamily: typo.bodyFont, fontSize: 15, fontWeight: 700, color: theme.darkText, margin: '0 0 8px' }}>{l.name}</p>
                  {l.url && <span style={{ fontSize: 12, color: theme.accent }}>View Registry →</span>}
                </div>
              ))}
            </div>
          )}
          {links.length === 0 && !r.registryMessage && (
            <p style={{ color: theme.lightText, opacity: 0.4 }}>Registry links will appear here...</p>
          )}
        </div>
      </div>
    </PreviewSection>
  );
}

// ── MUSIC ─────────────────────────────────────────────────────
function MusicPreview({ details, theme, typo, selectedSection, onSectionClick }) {
  const m = details.musicContent || {};
  return (
    <PreviewSection id="music" label="Music" selectedSection={selectedSection} onSectionClick={onSectionClick}>
      <div style={{ background: theme.darkBg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.darkText, marginBottom: 40 }}>Music</h1>
          {m.spotifyPlaylistUrl && (
            <div style={{ background: '#1DB954', padding: '20px 24px', borderRadius: 8, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
              <span style={{ fontSize: 20 }}>🎵</span>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Open Spotify Playlist</span>
            </div>
          )}
          {m.customMessage && <p style={{ fontFamily: typo.bodyFont, fontSize: 15, color: theme.darkText, opacity: 0.85, lineHeight: 1.7 }}>{m.customMessage}</p>}
          {!m.spotifyPlaylistUrl && !m.customMessage && (
            <p style={{ color: theme.darkText, opacity: 0.4 }}>Music playlist will appear here...</p>
          )}
        </div>
      </div>
    </PreviewSection>
  );
}

// ── FAQ ───────────────────────────────────────────────────────
function FAQPreview({ details, theme, typo, selectedSection, onSectionClick }) {
  const items = details.qna || [];
  return (
    <PreviewSection id="faq" label="FAQ" selectedSection={selectedSection} onSectionClick={onSectionClick}>
      <div style={{ background: theme.lightBg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.lightText, textAlign: 'center', marginBottom: 48 }}>FAQs</h1>
          {items.length > 0 ? items.map((q, i) => (
            <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${theme.accent}25` }}>
              <p style={{ fontFamily: typo.bodyFont, fontSize: 16, fontWeight: 700, color: theme.lightText, marginBottom: 8 }}>{q.question}</p>
              <p style={{ fontFamily: typo.bodyFont, fontSize: 14, color: theme.lightText, opacity: 0.75, lineHeight: 1.7, margin: 0 }}>{q.answer}</p>
            </div>
          )) : (
            <p style={{ textAlign: 'center', color: theme.lightText, opacity: 0.4 }}>FAQ items will appear here...</p>
          )}
        </div>
      </div>
    </PreviewSection>
  );
}

// ── WHERE TO STAY (Guest Suite · Accommodation) ───────────────
function StayPreview({ details, theme, typo, selectedSection, onSectionClick }) {
  const places = details.guestSuiteAccommodation?.places || [];
  const accom  = details.accommodation || {};
  return (
    <PreviewSection id="stay" label="Stay" selectedSection={selectedSection} onSectionClick={onSectionClick}>
      <div style={{ background: theme.lightBg, padding: '60px 24px', minHeight: 400 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.lightText, textAlign: 'center', marginBottom: 40 }}>
            Where to stay
          </h1>
          {accom.coupleNote && (
            <p style={{ fontFamily: typo.bodyFont, fontSize: 14, color: theme.lightText, opacity: 0.75, textAlign: 'center', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.7 }}>
              {accom.coupleNote}
            </p>
          )}
          {places.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {places.map((p, i) => (
                <div key={p.id || i} style={{ background: theme.darkBg, borderRadius: 4, overflow: 'hidden' }}>
                  {p.photo_url
                    ? <img src={p.photo_url} alt={p.name} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                    : <div style={{ height: 130, background: `${theme.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28, opacity: 0.25 }}>🏨</span></div>
                  }
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ fontFamily: typo.bodyFont, fontSize: 13, fontWeight: 700, color: theme.darkText, margin: '0 0 4px' }}>{p.name}</p>
                    {p.address && <p style={{ fontSize: 11, color: theme.darkText, opacity: 0.5, margin: 0 }}>{p.address}</p>}
                    {p.rating && <p style={{ fontSize: 11, color: theme.accent, margin: '4px 0 0', fontWeight: 600 }}>★ {p.rating}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: typo.bodyFont, textAlign: 'center', color: theme.lightText, opacity: 0.35, fontSize: 14 }}>
              No accommodation added yet — add places in the Guest Suite.
            </p>
          )}
        </div>
      </div>
    </PreviewSection>
  );
}

// ── GETTING HERE (Guest Suite · Transport) ────────────────────
function TransportPreview({ details, theme, typo, selectedSection, onSectionClick }) {
  const places = details.guestSuiteTransport?.places || [];
  const notes  = details.guestSuiteTransport?.notes  || [];
  return (
    <PreviewSection id="transport" label="Getting here" selectedSection={selectedSection} onSectionClick={onSectionClick}>
      <div style={{ background: theme.lightBg, padding: '60px 24px', minHeight: 400 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.lightText, textAlign: 'center', marginBottom: 40 }}>
            Getting here
          </h1>
          {places.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: notes.length ? 32 : 0 }}>
              {places.map((p, i) => (
                <div key={p.id || i} style={{ background: theme.darkBg, borderRadius: 4, overflow: 'hidden' }}>
                  {p.photo_url
                    ? <img src={p.photo_url} alt={p.name} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                    : <div style={{ height: 120, background: `${theme.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 24, opacity: 0.25 }}>✈️</span></div>
                  }
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ fontFamily: typo.bodyFont, fontSize: 13, fontWeight: 700, color: theme.darkText, margin: '0 0 4px' }}>{p.name}</p>
                    {p.address && <p style={{ fontSize: 11, color: theme.darkText, opacity: 0.5, margin: 0 }}>{p.address}</p>}
                    {p.note && <p style={{ fontSize: 11, color: theme.accent, margin: '4px 0 0', fontStyle: 'italic' }}>{p.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {notes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.map((n, i) => (
                <div key={n.id || i} style={{ background: theme.darkBg, borderRadius: 4, padding: '14px 18px' }}>
                  {n.title && <p style={{ fontSize: 11, fontWeight: 700, color: theme.accent, margin: '0 0 4px', letterSpacing: '0.06em' }}>{n.title}</p>}
                  <p style={{ fontFamily: typo.bodyFont, fontSize: 13, color: theme.darkText, opacity: 0.85, margin: 0, lineHeight: 1.5 }}>{n.text}</p>
                </div>
              ))}
            </div>
          )}
          {places.length === 0 && notes.length === 0 && (
            <p style={{ fontFamily: typo.bodyFont, textAlign: 'center', color: theme.lightText, opacity: 0.35, fontSize: 14 }}>
              No transport information added yet — add locations in the Guest Suite.
            </p>
          )}
        </div>
      </div>
    </PreviewSection>
  );
}

// ── EXPERIENCE GUIDE (Guest Suite · Experience Guide) ─────────
function ExperiencePreview({ details, theme, typo, selectedSection, onSectionClick }) {
  const guide = details.experienceGuide || {};
  const cats  = guide.categories || {};
  const picks = guide.couplePicks || [];
  const destination = guide.destination || details.mainCeremony?.address?.split(',').slice(-3).join(', ') || '';
  const CATS = [
    { key: 'mustEat', label: 'Must eat' },
    { key: 'coffee', label: 'Coffee & bakeries' },
    { key: 'hiddenGems', label: 'Hidden gems' },
    { key: 'luxuryDining', label: 'Luxury dining' },
    { key: 'nature', label: 'Beaches & nature' },
    { key: 'nightlife', label: 'Nightlife' },
    { key: 'thingsToDo', label: 'Things to do' },
    { key: 'wellness', label: 'Recovery & wellness' },
    { key: 'dayTrips', label: 'Day trips' },
    { key: 'shopping', label: 'Shopping' },
    { key: 'weddingWeekend', label: 'Wedding weekend essentials' },
  ];
  const enabledCats = CATS.filter(c => cats[c.key]?.enabled && (cats[c.key]?.places || []).length > 0);
  const totalPlaces = enabledCats.reduce((sum, c) => sum + (cats[c.key]?.places || []).length, 0) + picks.length;

  return (
    <PreviewSection id="experience" label="Guide" selectedSection={selectedSection} onSectionClick={onSectionClick}>
      <div style={{ background: theme.lightBg, padding: '60px 24px', minHeight: 400 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.lightText, textAlign: 'center', marginBottom: 16 }}>
            {destination ? `Your guide to ${destination.split(',')[0].trim()}` : 'Experience guide'}
          </h1>
          {guide.editorialIntro && (
            <p style={{ fontFamily: typo.bodyFont, fontSize: 14, color: theme.lightText, opacity: 0.75, textAlign: 'center', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7 }}>
              {guide.editorialIntro}
            </p>
          )}
          {totalPlaces > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {picks.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: theme.accent, marginBottom: 14 }}>OUR FAVOURITES</p>
                  <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                    {picks.slice(0, 4).map((p, i) => (
                      <div key={p.place_id || i} style={{ flexShrink: 0, width: 160, background: theme.darkBg, borderRadius: 4, overflow: 'hidden' }}>
                        {p.photo_ref
                          ? <img src={`/api/places-photo?ref=${encodeURIComponent(p.photo_ref)}&maxwidth=320`} alt={p.name} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                          : <div style={{ height: 100, background: `${theme.accent}15` }} />
                        }
                        <div style={{ padding: '8px 10px' }}>
                          <p style={{ fontFamily: typo.bodyFont, fontSize: 12, fontWeight: 700, color: theme.darkText, margin: 0 }}>{p.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {enabledCats.slice(0, 3).map(cat => (
                <div key={cat.key}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: theme.accent, marginBottom: 14 }}>{cat.label.toUpperCase()}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    {(cats[cat.key]?.places || []).slice(0, 3).map((p, i) => (
                      <div key={p.place_id || i} style={{ background: theme.darkBg, borderRadius: 4, overflow: 'hidden' }}>
                        {p.photo_ref
                          ? <img src={`/api/places-photo?ref=${encodeURIComponent(p.photo_ref)}&maxwidth=320`} alt={p.name} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                          : <div style={{ height: 90, background: `${theme.accent}15` }} />
                        }
                        <div style={{ padding: '8px 10px' }}>
                          <p style={{ fontFamily: typo.bodyFont, fontSize: 12, fontWeight: 700, color: theme.darkText, margin: 0 }}>{p.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {enabledCats.length > 3 && (
                <p style={{ fontFamily: typo.bodyFont, fontSize: 12, color: theme.lightText, opacity: 0.4, textAlign: 'center' }}>
                  + {enabledCats.length - 3} more categories in the published site
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontFamily: typo.bodyFont, textAlign: 'center', color: theme.lightText, opacity: 0.35, fontSize: 14 }}>
              No experience guide content yet — add places in the Guest Suite.
            </p>
          )}
        </div>
      </div>
    </PreviewSection>
  );
}

// ── PHOTOS PLACEHOLDER ────────────────────────────────────────
function PhotosPreview({ details, theme, typo, selectedSection, onSectionClick }) {
  return (
    <PreviewSection id="photos" label="Photos" selectedSection={selectedSection} onSectionClick={onSectionClick}>
      <div style={{ background: theme.lightBg, padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: typo.headingFont + ',serif', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: typo.headingWeight, fontStyle: typo.headingStyle || 'normal', color: theme.lightText, marginBottom: 40 }}>Photos</h1>
        <p style={{ color: theme.lightText, opacity: 0.5, fontSize: 14 }}>Your wedding photos will appear here...</p>
      </div>
    </PreviewSection>
  );
}

// ── NAV BAR ───────────────────────────────────────────────────
function PreviewNav({ details, theme, typo, currentPage, isMobile = false }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const enabledPages = details.enabledPages || ['home'];
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: `${theme.navBg}F0`, backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.accent}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 56,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', color: theme.darkText }}>
          {details.coupleNames || 'Your Names'}
        </span>
        {isMobile ? (
          <button onClick={() => setMobileMenuOpen(v => !v)} style={{ background: 'none', border: 'none', color: theme.darkText, cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}>
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 24, overflow: 'hidden' }}>
            {enabledPages.slice(0, 5).map(slug => {
              const p = WEDDING_PAGES.find(x => x.slug === slug);
              if (!p) return null;
              return (
                <span key={slug} style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                  color: currentPage === slug ? theme.accent : theme.darkText,
                  borderBottom: currentPage === slug ? `2px solid ${theme.accent}` : '2px solid transparent',
                  paddingBottom: 2,
                }}>{p.label}</span>
              );
            })}
          </div>
        )}
      </div>
      {isMobile && mobileMenuOpen && (
        <div style={{ position: 'absolute', top: 56, left: 0, right: 0, background: theme.navBg || '#0A0A0A', zIndex: 20, padding: '8px 0 16px' }}>
          {enabledPages.slice(0, 5).map(slug => {
            const p = WEDDING_PAGES.find(x => x.slug === slug);
            if (!p) return null;
            return (
              <div key={slug} style={{ padding: '12px 20px', color: theme.darkText, fontSize: 14, cursor: 'default', opacity: currentPage === slug ? 1 : 0.6 }}>
                {p.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SECTION RENDERER (for dynamic pageSections) ───────────────
function SectionRenderer({ section, theme, typo, isSelected, onClick, isMobile = false }) {
  const [hovered, setHovered] = useState(false);
  const c = section.content || {};
  const darkBg = theme.darkBg || '#0A0A0A';
  const lightBg = theme.lightBg || '#F8F7F5';
  const accent = theme.accent || '#888';
  const hf = typo?.headingFont || 'Plus Jakarta Sans';
  const bf = typo?.bodyFont || 'Plus Jakarta Sans';

  const renderContent = () => {
    switch (section.type) {
      case 'cinematic-hero':
      case 'minimal-text-hero':
        return (
          <div style={{ background: darkBg, minHeight: isMobile ? '693px' : '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {c.photoUrl && <img src={c.photoUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
            {c.photoUrl && <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${(c.overlayStrength || 40) / 100})` }} />}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '40px 32px' }}>
              <div style={{ width: 50, height: 1, background: 'rgba(255,255,255,0.3)', margin: '0 auto 20px' }} />
              <h1 style={{ fontFamily: hf, fontWeight: 300, fontSize: 'clamp(28px,5vw,56px)', color: '#fff', letterSpacing: '0.12em', margin: '0 0 12px' }}>{c.title || 'Your Names'}</h1>
              {c.date && <p style={{ fontFamily: bf, fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>{c.date}</p>}
              {c.location && <p style={{ fontFamily: bf, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{c.location}</p>}
              <div style={{ width: 50, height: 1, background: 'rgba(255,255,255,0.3)', margin: '20px auto 0' }} />
            </div>
          </div>
        );

      case 'split-hero':
        return (
          <div style={{ background: darkBg, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '40vh' }}>
            <div style={{ background: '#111', overflow: 'hidden', minHeight: 240 }}>
              {c.photoUrl ? <img src={c.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" /> : <div style={{ width: '100%', height: '100%', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#333', fontSize: 12 }}>Add photo</p></div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '40px 32px' }}>
              <div>
                <h2 style={{ fontFamily: hf, fontWeight: 300, fontSize: 'clamp(20px,3vw,40px)', color: '#fff', letterSpacing: '0.08em', margin: '0 0 12px' }}>{c.title || 'Your Names'}</h2>
                {c.subtitle && <p style={{ fontFamily: bf, fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>{c.subtitle}</p>}
                {c.date && <p style={{ fontFamily: bf, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 12, letterSpacing: '0.2em' }}>{c.date}</p>}
              </div>
            </div>
          </div>
        );

      case 'our-story':
      case 'how-we-met':
        return (
          <div style={{ background: lightBg, padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 20 }}>Our Story</p>
            <p style={{ fontFamily: hf, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(16px,2.5vw,24px)', color: theme.lightText || '#0A0A0A', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
              {c.text || 'Tell your story here...'}
            </p>
          </div>
        );

      case 'love-letter':
      case 'quote':
        return (
          <div style={{ background: darkBg, padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontFamily: hf, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(18px,3vw,32px)', color: '#fff', lineHeight: 1.6, maxWidth: 600, margin: '0 auto' }}>
              "{c.quote || c.text || 'Add your message here...'}"
            </p>
            {c.attribution && <p style={{ fontFamily: bf, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 20 }}>— {c.attribution}</p>}
          </div>
        );

      case 'thank-you':
        return (
          <div style={{ background: darkBg, padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontFamily: hf, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(16px,2.5vw,28px)', color: '#fff', maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>
              {c.message || 'Thank you for being part of our special day.'}
            </p>
          </div>
        );

      case 'event-details':
        return (
          <div style={{ background: lightBg, padding: '60px 40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', maxWidth: 640, margin: '0 auto', gap: 0 }}>
              <div style={{ textAlign: 'center', paddingRight: 32 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Ceremony</p>
                <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 28, color: theme.lightText || '#0A0A0A', marginBottom: 8 }}>{c.ceremony?.time || '—'}</p>
                <p style={{ fontSize: 14, color: '#555' }}>{c.ceremony?.venue || 'Venue'}</p>
                <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{c.ceremony?.address}</p>
              </div>
              <div style={{ background: '#E0E0DC' }} />
              <div style={{ textAlign: 'center', paddingLeft: 32 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Reception</p>
                <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 28, color: theme.lightText || '#0A0A0A', marginBottom: 8 }}>{c.reception?.time || '—'}</p>
                <p style={{ fontSize: 14, color: '#555' }}>{c.reception?.venue || 'Venue'}</p>
                <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{c.reception?.address}</p>
              </div>
            </div>
          </div>
        );

      case 'day-timeline':
        return (
          <div style={{ background: lightBg, padding: '60px 40px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', marginBottom: 32 }}>Schedule</p>
            <div style={{ maxWidth: 540, margin: '0 auto' }}>
              {(c.events || []).map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 20, paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid #EEE' }}>
                  <span style={{ fontSize: 13, color: accent, fontWeight: 600, minWidth: 70, flexShrink: 0 }}>{ev.time}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: theme.lightText || '#0A0A0A', margin: 0 }}>{ev.title}</p>
                    {ev.description && <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>{ev.description}</p>}
                  </div>
                </div>
              ))}
              {(!c.events || c.events.length === 0) && <p style={{ textAlign: 'center', color: '#888', fontSize: 13 }}>Add events to your timeline</p>}
            </div>
          </div>
        );

      case 'countdown-timer':
        return (
          <div style={{ background: darkBg, padding: '48px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>{c.message || 'Until we say I do'}</p>
            <div style={{ display: 'flex', gap: 28, justifyContent: 'center' }}>
              {['Days', 'Hours', 'Mins', 'Secs'].map(u => (
                <div key={u} style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 44, color: '#fff', margin: 0 }}>--</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 4 }}>{u}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'rsvp-meal':
      case 'full-rsvp':
      case 'simple-rsvp':
        return (
          <div style={{ background: lightBg, padding: '60px 40px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', marginBottom: 12 }}>RSVP</p>
            <h2 style={{ fontFamily: hf, fontWeight: 300, fontSize: 'clamp(24px,4vw,44px)', color: theme.lightText || '#0A0A0A', textAlign: 'center', marginBottom: 36 }}>Will you join us?</h2>
            <div style={{ maxWidth: 440, margin: '0 auto' }}>
              <div style={{ borderBottom: '1px solid #CCC', marginBottom: 20, paddingBottom: 6 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Full Name</p>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <button style={{ flex: 1, padding: '12px', border: '1px solid #CCC', background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Joyfully Accepts</button>
                <button style={{ flex: 1, padding: '12px', border: '1px solid #CCC', background: 'transparent', fontSize: 12, color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>Regretfully Declines</button>
              </div>
              {c.deadline && <p style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>Please RSVP by {c.deadline}</p>}
            </div>
          </div>
        );

      case 'travel-stay':
        return (
          <div style={{ background: darkBg, padding: '60px 40px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', marginBottom: 32 }}>Travel & Stay</p>
            {c.gettingThere && <p style={{ fontFamily: hf, fontStyle: 'italic', fontSize: 17, color: '#fff', maxWidth: 540, margin: '0 auto 32px', textAlign: 'center' }}>{c.gettingThere}</p>}
            {!c.gettingThere && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Add travel information</p>}
          </div>
        );

      case 'faq-accordion':
        return (
          <div style={{ background: lightBg, padding: '60px 40px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', marginBottom: 36 }}>FAQ</p>
            <div style={{ maxWidth: 580, margin: '0 auto' }}>
              {(c.items || []).map((item, i) => (
                <div key={i} style={{ borderBottom: '1px solid #E0E0DC', padding: '18px 0' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: theme.lightText || '#0A0A0A', marginBottom: 6 }}>{item.question}</p>
                  <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{item.answer}</p>
                </div>
              ))}
              {(!c.items || c.items.length === 0) && <p style={{ textAlign: 'center', color: '#888', fontSize: 13 }}>Add FAQ items</p>}
            </div>
          </div>
        );

      case 'registry-links':
        return (
          <div style={{ background: lightBg, padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Registry</p>
            {c.message && <p style={{ fontSize: 14, color: '#555', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.6 }}>{c.message}</p>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {(c.links || []).map((link, i) => (
                <div key={i} style={{ background: darkBg, padding: '16px 28px', borderRadius: 4 }}>
                  <p style={{ fontFamily: bf, fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>{link.label || 'Registry'}</p>
                </div>
              ))}
              {(!c.links || c.links.length === 0) && <p style={{ color: '#888', fontSize: 13 }}>Add registry links</p>}
            </div>
          </div>
        );

      case 'venue-showcase':
        return (
          <div style={{ background: lightBg }}>
            {c.photoUrl ? <img src={c.photoUrl} style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }} alt="" /> : <div style={{ height: 200, background: '#E8E8E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#888', fontSize: 13 }}>Add venue photo</p></div>}
            <div style={{ padding: '32px 40px', textAlign: 'center' }}>
              <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 24, color: theme.lightText || '#0A0A0A', marginBottom: 8 }}>{c.venue || 'Venue Name'}</p>
              {c.address && <p style={{ fontSize: 13, color: '#888' }}>{c.address}</p>}
            </div>
          </div>
        );

      case 'photo-grid':
        return (
          <div style={{ background: lightBg, padding: '32px' }}>
            {(c.photos || []).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c.columns || 3}, 1fr)`, gap: 8 }}>
                {c.photos.map((p, i) => <img key={i} src={p} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} alt="" />)}
              </div>
            ) : (
              <div style={{ border: '2px dashed #DDD', borderRadius: 8, padding: '40px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#888' }}>Photo grid — add photos to see them here</p>
              </div>
            )}
          </div>
        );

      case 'save-the-date':
        return (
          <div style={{ background: darkBg, padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 24 }}>Save The Date</p>
            <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 'clamp(24px,4vw,48px)', color: '#fff', margin: '0 0 16px' }}>{c.date || 'Date TBD'}</p>
            {c.venue && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{c.venue}</p>}
          </div>
        );

      case 'spacer':
        return <div style={{ height: c.height || 80, background: 'transparent' }} />;

      default:
        return (
          <div style={{ background: lightBg, padding: '48px 40px', textAlign: 'center', border: '2px dashed #DDD' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 4 }}>{section.type}</p>
            <p style={{ fontSize: 12, color: '#AAA' }}>Click to edit this section</p>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        outline: isSelected ? '2px solid #E03553' : hovered ? '2px solid #2563EB33' : 'none',
        outlineOffset: -2,
        cursor: 'pointer',
        transition: 'outline 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      data-section={section.id}
    >
      {renderContent()}
      {/* Edit badge on hover */}
      {(hovered || isSelected) && (
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 99,
          background: isSelected ? '#E03553' : '#2563EB',
          color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '3px 8px', borderRadius: 3, letterSpacing: '0.06em',
          pointerEvents: 'none',
        }}>
          {isSelected ? '● Editing' : 'Edit'}
        </div>
      )}
    </div>
  );
}

const PAGE_RENDERERS = {
  home:         HomePreview,
  'our-story':  OurStoryPreview,
  celebration:  CelebrationPreview,
  rsvp:         RSVPPreview,
  registry:     RegistryPreview,
  music:        MusicPreview,
  photos:       PhotosPreview,
  faq:          FAQPreview,
  stay:         StayPreview,
  transport:    TransportPreview,
  experience:   ExperiencePreview,
};

export default function WBWebsitePreview({ details, currentPage = 'home', onSectionClick, selectedSection, isMobile = false }) {
  const theme = WEBSITE_THEMES.find(t => t.id === (details.activeTheme || 'still')) || WEBSITE_THEMES[0];
  const typo = TYPOGRAPHY_PAIRINGS.find(t => t.id === (details.activeTypography || 'classic')) || TYPOGRAPHY_PAIRINGS[0];
  const Renderer = PAGE_RENDERERS[currentPage] || HomePreview;

  // Check if this page has dynamic sections in pageSections
  const dynamicSections = details?.pageSections?.[currentPage];
  const hasDynamicSections = dynamicSections && dynamicSections.length > 0;
  const sortedSections = hasDynamicSections
    ? [...dynamicSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  useEffect(() => {
    const fonts = [typo.headingImport, typo.bodyImport].filter(Boolean);
    fonts.forEach(imp => {
      const url = imp.match(/url\("([^"]+)"\)/)?.[1];
      if (!url) return;
      const id = 'wb-font-' + encodeURIComponent(url).slice(0, 40);
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet'; link.href = url;
      document.head.appendChild(link);
    });
  }, [typo.id]);

  return (
    <div style={{ fontFamily: typo.bodyFont + ',sans-serif', background: theme.lightBg, minHeight: '100vh' }}>
      <style>{`
        .wb-preview-section { position: relative; }
        .wb-preview-section:hover > .wb-edit-label { opacity: 1 !important; }
        .wb-preview-section:hover { outline: 2px solid #2563EB !important; outline-offset: -2px; }
      `}</style>

      <PreviewNav details={details} theme={theme} typo={typo} currentPage={currentPage} isMobile={isMobile} />

      {hasDynamicSections ? (
        // ── Dynamic mode: render pageSections ──
        <div>
          {sortedSections.map(section => (
            <SectionRenderer
              key={section.id}
              section={section}
              theme={theme}
              typo={typo}
              isSelected={selectedSection === section.id}
              onClick={() => onSectionClick && onSectionClick(section.id)}
              isMobile={isMobile}
            />
          ))}
        </div>
      ) : (
        // ── Static mode: render legacy page template ──
        <>
          <style>{`
            .wb-preview-section { position: relative; }
            .wb-preview-section:hover > .wb-edit-label { opacity: 1 !important; }
            .wb-preview-section:hover { outline: 2px solid #2563EB !important; outline-offset: -2px; }
          `}</style>
          <Renderer
            details={details}
            theme={theme}
            typo={typo}
            selectedSection={selectedSection}
            onSectionClick={onSectionClick}
          />
        </>
      )}
    </div>
  );
}
import React, { useRef, useEffect } from 'react';

const PLACEHOLDER_PHOTOS = [
  "https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_f0eef5788fdd4876a0a300e43228f919~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_e30eff6d03424dd6baf63143722b2a3d~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_fc15a5b1a8764b65949ef99231041ead~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_9be952c6ade04b5cb84818743f98684d~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_57a2dcf2b5254f6696ae3ff26400ffaf~mv2.jpg",
];

function PlaceholderImg({ index = 0, style = {}, label = '+ Add Photo' }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <img src={PLACEHOLDER_PHOTOS[index % PLACEHOLDER_PHOTOS.length]} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.8)', display: 'block' }} alt="" />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '4px 10px', backdropFilter: 'blur(4px)' }}>
        <p style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>{label}</p>
      </div>
    </div>
  );
}

function SectionEntrance({ children, sectionId }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sectionId]);
  return (
    <div ref={ref} style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
      {children}
    </div>
  );
}

// Renders a single section based on section.type
// masterData: full WeddingDetails record for auto-populated fields
export default function WBSectionRenderer({ section, theme, typo, universeTheme, masterData, isMobile = false }) {
  const c = section.content || {};
  const darkBg = theme?.darkBg || universeTheme?.background || '#0A0A0A';
  const lightBg = theme?.lightBg || universeTheme?.background || '#F8F7F5';
  const lightText = theme?.lightText || universeTheme?.text || '#0A0A0A';
  const darkText = theme?.darkText || '#FFFFFF';
  const accent = theme?.accent || universeTheme?.accent || '#888888';
  // typo explicitly overrides universe fonts; universe fonts override system defaults
  const hf = typo?.headingFont || universeTheme?.fontDisplay || '"Plus Jakarta Sans", sans-serif';
  const bf = typo?.bodyFont || universeTheme?.fontBody || '"Plus Jakarta Sans", sans-serif';

  // Style overrides from section.style
  const sStyle = section.style || {};
  const getBg = (defaultBg) => {
    if (sStyle.backgroundType === 'dark') return darkBg;
    if (sStyle.backgroundType === 'light') return lightBg;
    if (sStyle.backgroundType === 'custom' && sStyle.backgroundColor) return sStyle.backgroundColor;
    return defaultBg;
  };
  const padY = sStyle.paddingY || null;
  const textAlign = sStyle.textAlign || null;
  const maxW = sStyle.maxWidth || null;

  // Master data helpers — use planner data as fallback when section content not set
  const md = masterData || {};
  const masterDate = md.weddingDate ? new Date(md.weddingDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  function getContent() {
  switch (section.type) {
    case 'cinematic-hero':
    case 'minimal-text-hero': {
      const bg = getBg(darkBg);
      const photo = c.photoUrl || PLACEHOLDER_PHOTOS[0];
      const displayTitle = c.title || md.coupleNames || 'Your Names';
      const displayDate = c.date || masterDate;
      const displayLocation = c.location || md.mainCeremony?.venueName || md.mainCeremony?.address;
      return (
        <div style={{ background: bg, width: '100%', minHeight: isMobile ? '693px' : '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <img src={photo} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: c.photoUrl ? 'none' : 'brightness(0.7)' }} alt="" />
          <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${(c.overlayStrength || 45) / 100})` }} />
          {!c.photoUrl && (
            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '3px 10px', backdropFilter: 'blur(4px)' }}>
              <p style={{ color: '#FFF', fontSize: 11, fontWeight: 600, margin: 0 }}>+ Add Photo</p>
            </div>
          )}
          <div style={{ position: 'relative', zIndex: 2, textAlign: textAlign || 'center', padding: '48px 32px', maxWidth: maxW || 700, width: '100%', margin: '0 auto' }}>
            <div style={{ width: 50, height: 1, background: 'rgba(255,255,255,0.3)', margin: '0 auto 20px' }} />
            <h1 style={{ fontFamily: hf, fontWeight: 300, fontSize: 'clamp(28px,5vw,56px)', color: sStyle.textColor || '#fff', letterSpacing: '0.12em', margin: '0 0 12px' }}>
              {displayTitle}
            </h1>
            {displayDate && <p style={{ fontFamily: bf, fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 6px' }}>{displayDate}</p>}
            {displayLocation && <p style={{ fontFamily: bf, fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{displayLocation}</p>}
            {c.subtitle && <p style={{ fontFamily: bf, fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 12 }}>{c.subtitle}</p>}
            <div style={{ width: 50, height: 1, background: 'rgba(255,255,255,0.3)', margin: '20px auto 0' }} />
          </div>
        </div>
      );
    }

    case 'split-hero': {
      const bg = getBg(darkBg);
      return (
        <div style={{ background: bg, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '40vh' }}>
          <div style={{ background: '#111', overflow: 'hidden', minHeight: 240, position: 'relative' }}>
            {c.photoUrl
              ? <img src={c.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
              : <PlaceholderImg index={1} style={{ width: '100%', height: '100%', minHeight: 240 }} />
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '40px 32px' }}>
            <div>
              <h2 style={{ fontFamily: hf, fontWeight: 300, fontSize: 'clamp(20px,3vw,40px)', color: sStyle.textColor || darkText, letterSpacing: '0.08em', margin: '0 0 12px' }}>{c.title || 'Your Names'}</h2>
              {c.subtitle && <p style={{ fontFamily: bf, fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>{c.subtitle}</p>}
              {c.date && <p style={{ fontFamily: bf, fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', margin: 0 }}>{c.date}</p>}
            </div>
          </div>
        </div>
      );
    }

    case 'our-story':
    case 'how-we-met': {
      const bg = getBg(lightBg);
      const storyPhotos = (c.photos || []).length > 0 ? c.photos : PLACEHOLDER_PHOTOS.slice(4, 8);
      const hasRealPhotos = (c.photos || []).length > 0;
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px`, textAlign: textAlign || 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 20 }}>Our Story</p>
          <p style={{ fontFamily: hf, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(16px,2.5vw,24px)', color: sStyle.textColor || lightText, lineHeight: 1.7, maxWidth: maxW || 600, margin: '0 auto' }}>
            {c.text || 'Tell your love story here...'}
          </p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 32, justifyContent: 'center' }}>
            {storyPhotos.map((p, i) => (
              <div key={i} style={{ position: 'relative', width: 160, height: 220, flexShrink: 0 }}>
                <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: hasRealPhotos ? 'none' : 'brightness(0.8)' }} alt="" />
                {!hasRealPhotos && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 4, padding: '3px 8px' }}>
                      <p style={{ color: '#FFF', fontSize: 10, fontWeight: 600, margin: 0 }}>+ Add Photo</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'love-letter':
    case 'quote': {
      const bg = getBg(darkBg);
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px`, textAlign: textAlign || 'center' }}>
          <p style={{ fontFamily: hf, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(18px,3vw,32px)', color: sStyle.textColor || darkText, lineHeight: 1.6, maxWidth: maxW || 600, margin: '0 auto' }}>
            "{c.quote || c.text || 'Add your message here...'}"
          </p>
          {c.attribution && <p style={{ fontFamily: bf, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 20 }}>— {c.attribution}</p>}
        </div>
      );
    }

    case 'thank-you': {
      const bg = getBg(darkBg);
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px`, textAlign: textAlign || 'center' }}>
          <p style={{ fontFamily: hf, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(16px,2.5vw,28px)', color: sStyle.textColor || darkText, maxWidth: maxW || 540, margin: '0 auto', lineHeight: 1.6 }}>
            {c.message || 'Thank you for being part of our special day.'}
          </p>
        </div>
      );
    }

    case 'event-details': {
      const bg = getBg(lightBg);
      // Use master data as fallbacks
      const ceremonyVenue = c.ceremony?.venue || md.mainCeremony?.venueName || 'Venue';
      const ceremonyAddress = c.ceremony?.address || md.mainCeremony?.address;
      const receptionVenue = c.reception?.venue || md.reception?.venueName || 'Venue';
      const receptionAddress = c.reception?.address || md.reception?.address;
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', maxWidth: maxW || 640, margin: '0 auto' }}>
            <div style={{ textAlign: textAlign || 'center', paddingRight: 32 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Ceremony</p>
              <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 28, color: sStyle.textColor || lightText, marginBottom: 8 }}>{c.ceremony?.time || md.mainCeremony?.startTime || '—'}</p>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>{ceremonyVenue}</p>
              <p style={{ fontSize: 12, color: '#888' }}>{ceremonyAddress}</p>
              {c.ceremony?.dressCode && <p style={{ fontSize: 11, color: '#888', marginTop: 8, fontStyle: 'italic' }}>Dress code: {c.ceremony.dressCode}</p>}
            </div>
            <div style={{ background: '#E0E0DC' }} />
            <div style={{ textAlign: textAlign || 'center', paddingLeft: 32 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Reception</p>
              <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 28, color: sStyle.textColor || lightText, marginBottom: 8 }}>{c.reception?.time || md.reception?.startTime || '—'}</p>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>{receptionVenue}</p>
              <p style={{ fontSize: 12, color: '#888' }}>{receptionAddress}</p>
            </div>
          </div>
        </div>
      );
    }

    case 'day-timeline': {
      const bg = getBg(lightBg);
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px` }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: textAlign || 'center', marginBottom: 32 }}>Day Schedule</p>
          <div style={{ maxWidth: maxW || 540, margin: '0 auto' }}>
            {(c.events || []).map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid #EEE' }}>
                <span style={{ fontSize: 13, color: accent, fontWeight: 600, minWidth: 70, flexShrink: 0 }}>{ev.time}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: sStyle.textColor || lightText, margin: 0 }}>{ev.title}</p>
                  {ev.description && <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>{ev.description}</p>}
                </div>
              </div>
            ))}
            {(!c.events || c.events.length === 0) && <p style={{ textAlign: 'center', color: '#888', fontSize: 13 }}>Add events to your timeline</p>}
          </div>
        </div>
      );
    }

    case 'countdown-timer': {
      const bg = getBg(darkBg);
      return (
        <div style={{ background: bg, padding: `${padY || 48}px 40px`, textAlign: textAlign || 'center' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>{c.message || 'Until we say I do'}</p>
          <div style={{ display: 'flex', gap: 28, justifyContent: 'center' }}>
            {['Days', 'Hours', 'Mins', 'Secs'].map(u => (
              <div key={u} style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 44, color: sStyle.textColor || darkText, margin: 0 }}>--</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 4 }}>{u}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'rsvp-meal':
    case 'full-rsvp':
    case 'simple-rsvp': {
      const bg = getBg(lightBg);
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px` }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: textAlign || 'center', marginBottom: 12 }}>RSVP</p>
          <h2 style={{ fontFamily: hf, fontWeight: 300, fontSize: 'clamp(24px,4vw,44px)', color: sStyle.textColor || lightText, textAlign: textAlign || 'center', marginBottom: 36 }}>Will you join us?</h2>
          <div style={{ maxWidth: 440, margin: '0 auto' }}>
            <div style={{ borderBottom: '1px solid #CCC', marginBottom: 20, paddingBottom: 6 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Full Name</p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              <button style={{ flex: 1, padding: '12px', border: '1px solid #CCC', background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'default', fontFamily: 'inherit' }}>Joyfully Accepts</button>
              <button style={{ flex: 1, padding: '12px', border: '1px solid #CCC', background: 'transparent', fontSize: 12, color: '#888', cursor: 'default', fontFamily: 'inherit' }}>Regretfully Declines</button>
            </div>
            {c.deadline && <p style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>Please RSVP by {c.deadline}</p>}
          </div>
        </div>
      );
    }

    case 'travel-stay': {
      const bg = getBg(darkBg);
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px` }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: textAlign || 'center', marginBottom: 32 }}>Travel & Stay</p>
          {c.gettingThere
            ? <p style={{ fontFamily: hf, fontStyle: 'italic', fontSize: 17, color: sStyle.textColor || darkText, maxWidth: maxW || 540, margin: '0 auto 32px', textAlign: textAlign || 'center' }}>{c.gettingThere}</p>
            : <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Add travel information to this section</p>
          }
          {(c.hotels || []).map((hotel, i) => (
            <div key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px 0', maxWidth: maxW || 540, margin: '0 auto' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: sStyle.textColor || darkText, margin: '0 0 4px' }}>{hotel.name}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{hotel.address}</p>
            </div>
          ))}
        </div>
      );
    }

    case 'faq-accordion': {
      const bg = getBg(lightBg);
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px` }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: textAlign || 'center', marginBottom: 36 }}>FAQ</p>
          <div style={{ maxWidth: maxW || 580, margin: '0 auto' }}>
            {(c.items || []).map((item, i) => (
              <div key={i} style={{ borderBottom: '1px solid #E0E0DC', padding: '18px 0' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: sStyle.textColor || lightText, marginBottom: 6 }}>{item.question}</p>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{item.answer}</p>
              </div>
            ))}
            {(!c.items || c.items.length === 0) && <p style={{ textAlign: 'center', color: '#888', fontSize: 13 }}>Add FAQ items</p>}
          </div>
        </div>
      );
    }

    case 'registry-links': {
      const bg = getBg(lightBg);
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px`, textAlign: textAlign || 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Registry</p>
          {c.message && <p style={{ fontSize: 14, color: '#555', maxWidth: maxW || 480, margin: '0 auto 32px', lineHeight: 1.6 }}>{c.message}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {(c.links || []).map((link, i) => (
              <div key={i} style={{ background: darkBg, padding: '16px 28px', borderRadius: 4 }}>
                <p style={{ fontFamily: bf, fontSize: 14, fontWeight: 600, color: darkText, margin: 0 }}>{link.label || 'Registry'}</p>
              </div>
            ))}
            {(!c.links || c.links.length === 0) && <p style={{ color: '#888', fontSize: 13 }}>Add registry links</p>}
          </div>
        </div>
      );
    }

    case 'venue-showcase': {
      const bg = getBg(lightBg);
      const venuePhoto = c.photoUrl || PLACEHOLDER_PHOTOS[2];
      return (
        <div style={{ background: bg }}>
          <div style={{ height: 280, position: 'relative', overflow: 'hidden' }}>
            <img src={venuePhoto} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: c.photoUrl ? 'none' : 'brightness(0.8)' }} alt="" />
            {!c.photoUrl && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '4px 10px', backdropFilter: 'blur(4px)' }}>
                <p style={{ color: '#FFF', fontSize: 11, fontWeight: 600, margin: 0 }}>+ Add Photo</p>
              </div>
            )}
          </div>
          <div style={{ padding: '32px 40px', textAlign: textAlign || 'center' }}>
            <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 24, color: sStyle.textColor || lightText, marginBottom: 8 }}>{c.venue || 'Venue Name'}</p>
            {c.address && <p style={{ fontSize: 13, color: '#888' }}>{c.address}</p>}
          </div>
        </div>
      );
    }

    case 'photo-grid': {
      const bg = getBg(lightBg);
      const gridPhotos = (c.photos || []).length > 0 ? c.photos : PLACEHOLDER_PHOTOS.slice(0, 6);
      const hasRealPhotos = (c.photos || []).length > 0;
      return (
        <div style={{ background: bg, padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c.columns || 3}, 1fr)`, gap: 8 }}>
            {gridPhotos.map((p, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
                <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: hasRealPhotos ? 'none' : 'brightness(0.8)' }} alt="" />
                {!hasRealPhotos && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 4, padding: '3px 8px' }}>
                      <p style={{ color: '#FFF', fontSize: 10, fontWeight: 600, margin: 0 }}>+ Add Photo</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'featured-photo': {
      const bg = getBg(lightBg);
      const featPhoto = c.photoUrl || PLACEHOLDER_PHOTOS[3];
      return (
        <div style={{ background: bg }}>
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <img src={featPhoto} style={{ width: '100%', height: 400, objectFit: 'cover', filter: c.photoUrl ? 'none' : 'brightness(0.8)', display: 'block' }} alt="" />
            {!c.photoUrl && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '4px 10px', backdropFilter: 'blur(4px)' }}>
                <p style={{ color: '#FFF', fontSize: 11, fontWeight: 600, margin: 0 }}>+ Add Photo</p>
              </div>
            )}
          </div>
          {c.caption && <p style={{ textAlign: 'center', fontSize: 13, color: '#888', padding: '12px 20px', margin: 0 }}>{c.caption}</p>}
        </div>
      );
    }

    case 'save-the-date': {
      const bg = getBg(darkBg);
      const displayDate = c.date || masterDate || 'Date TBD';
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px`, textAlign: textAlign || 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 24 }}>Save The Date</p>
          <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 'clamp(24px,4vw,48px)', color: sStyle.textColor || darkText, margin: '0 0 16px' }}>{displayDate}</p>
          {c.venue && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{c.venue}</p>}
        </div>
      );
    }

    case 'meet-the-couple': {
      const bg = getBg(lightBg);
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px` }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: textAlign || 'center', marginBottom: 40 }}>Meet The Couple</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, maxWidth: maxW || 640, margin: '0 auto' }}>
            {[c.partner1, c.partner2].map((p, i) => (
              <div key={i} style={{ textAlign: textAlign || 'center' }}>
                <div style={{ width: 120, height: 120, borderRadius: '50%', margin: '0 auto 16px', overflow: 'hidden', position: 'relative' }}>
                  {p?.photoUrl
                    ? <img src={p.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <>
                        <img src={PLACEHOLDER_PHOTOS[8 + i]} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.8)' }} alt="" />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                          <p style={{ color: '#FFF', fontSize: 10, fontWeight: 600, margin: 0 }}>+ Photo</p>
                        </div>
                      </>
                  }
                </div>
                <p style={{ fontFamily: hf, fontWeight: 600, fontSize: 18, color: sStyle.textColor || lightText, margin: '0 0 8px' }}>{p?.name || 'Partner Name'}</p>
                {p?.bio && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{p.bio}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'spotify-playlist':
    case 'music-playlist': {
      const bg = getBg(darkBg);
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px`, textAlign: textAlign || 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 32 }}>Playlist</p>
          {(c.playlistUrl || c.url) ? (
            <div style={{ background: '#1DB954', padding: '16px 24px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🎵</span>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Open Spotify Playlist</span>
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Add a Spotify playlist URL</p>
          )}
          {c.message && <p style={{ fontFamily: bf, fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 20 }}>{c.message}</p>}
        </div>
      );
    }

    case 'guest-book': {
      const bg = getBg(lightBg);
      return (
        <div style={{ background: bg, padding: `${padY || 60}px 40px`, textAlign: textAlign || 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Guest Book</p>
          <p style={{ fontFamily: hf, fontStyle: 'italic', fontSize: 20, color: sStyle.textColor || lightText, marginBottom: 32 }}>{c.message || 'Leave us a note!'}</p>
          <div style={{ maxWidth: 480, margin: '0 auto', border: '1px solid #DDD', borderRadius: 8, padding: '20px', textAlign: 'left', background: '#fff' }}>
            <div style={{ height: 24, background: '#F0F0F0', borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 60, background: '#F0F0F0', borderRadius: 4, marginBottom: 16 }} />
            <div style={{ height: 36, background: '#0A0A0A', borderRadius: 4 }} />
          </div>
        </div>
      );
    }

    case 'song-request':
    case 'hashtag-wall':
    case 'photo-upload': {
      const bg = getBg(lightBg);
      return (
        <div style={{ background: bg, padding: `${padY || 48}px 40px`, textAlign: textAlign || 'center' }}>
          <p style={{ fontFamily: hf, fontStyle: 'italic', fontSize: 20, color: sStyle.textColor || lightText, marginBottom: 16 }}>
            {c.message || c.hashtag || 'Interactive section'}
          </p>
          <p style={{ fontSize: 12, color: '#888' }}>{section.type.replace(/-/g, ' ')}</p>
        </div>
      );
    }

    case 'map-directions': {
      const bg = getBg(lightBg);
      return (
        <div style={{ background: bg, padding: `${padY || 48}px 40px`, textAlign: textAlign || 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Getting There</p>
          <p style={{ fontFamily: hf, fontWeight: 300, fontSize: 20, color: sStyle.textColor || lightText, marginBottom: 8 }}>{c.venue || 'Venue'}</p>
          {c.address && <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{c.address}</p>}
          <div style={{ height: 200, background: '#E8E8E8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 13, color: '#888' }}>Map preview</p>
          </div>
        </div>
      );
    }

    case 'spacer':
      return <div style={{ height: c.height || 80, background: 'transparent' }} />;

    default: {
      const bg = getBg(lightBg);
      return (
        <div style={{ background: bg, padding: '48px 40px', textAlign: 'center', border: '2px dashed #DDD' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 4 }}>{section.type.replace(/-/g, ' ')}</p>
          <p style={{ fontSize: 12, color: '#AAA' }}>Click Edit to configure this section</p>
        </div>
      );
    }
  }
  }
  return <SectionEntrance sectionId={section.id}>{getContent()}</SectionEntrance>;
}
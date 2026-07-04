import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import UniverseSelectedChoice from '@/components/studio/UniverseSelectedChoice';

const ASSETS = [
  { id: 'save-the-date', name: 'Save the Date', desc: 'Announce your wedding day', order: 1 },
  { id: 'digital-invitation', name: 'Digital Invitation', desc: 'Your full invitation design', order: 2 },
  { id: 'rsvp-page', name: 'RSVP Page', desc: 'Styled response form', order: 3 },
  { id: 'menu-card', name: 'Menu Card', desc: 'Dinner and drinks menu', order: 4 },
  { id: 'seating-chart', name: 'Seating Chart', desc: 'Guest table assignments', order: 5 },
  { id: 'motion-graphic', name: 'Motion Graphic', desc: 'Animated social announcement', order: 6 },
  { id: 'instagram-kit', name: 'Instagram Story Kit', desc: 'Social media story set', order: 7 },
  { id: 'welcome-signage', name: 'Welcome Signage', desc: 'Venue entry sign design', order: 8 },
  { id: 'guest-tags', name: 'Guest Tags', desc: 'Place cards and name tags', order: 9 },
  { id: 'thank-you', name: 'Thank You Notes', desc: 'Post-wedding gratitude cards', order: 10 },
];

function hexRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}
function isDark(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (r*299 + g*587 + b*114) / 1000 < 128;
}

function AssetPreview({ asset, coupleName, weddingDate, venue, loaded, cardBg, fontDisplay }) {
  const a = coupleName.split(' & ')[0]?.[0] || 'J';
  const b = coupleName.split(' & ')[1]?.[0] || 'S';
  const style = { fontFamily: fontDisplay, fontWeight: 300, color: '#FFFFFF' };
  return (
    <div style={{ aspectRatio: asset.order <= 5 ? '4/3' : '3/4', background: cardBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: 32, opacity: loaded ? 1 : 0.5, transition: 'opacity 0.4s ease' }}>
      {asset.id === 'save-the-date' && (<>
        <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 16 }} />
        <p style={{ ...style, fontSize: 9, letterSpacing: '0.2em', margin: 0 }}>{weddingDate.toUpperCase()}</p>
        <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.2)', marginTop: 16 }} />
      </>)}
      {asset.id === 'digital-invitation' && <p style={{ ...style, fontSize: 20, textAlign: 'center' }}>{coupleName}</p>}
      {asset.id === 'rsvp-page' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ ...style, fontSize: 11, letterSpacing: '0.15em', margin: '0 0 12px', color: 'rgba(255,255,255,0.5)' }}>{coupleName}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {['Yes', 'No'].map(l => <button key={l} style={{ padding: '5px 14px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{l}</button>)}
          </div>
        </div>
      )}
      {asset.id === 'menu-card' && <p style={{ ...style, fontSize: 18, textAlign: 'center' }}>{coupleName}</p>}
      {asset.id === 'seating-chart' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ ...style, fontSize: 10, letterSpacing: '0.12em', margin: '0 0 10px', color: 'rgba(255,255,255,0.4)' }}>{coupleName}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {['T1','T2','T3','T4','T5','T6'].map(t => <div key={t} style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '7px 5px', textAlign: 'center' }}>{t}</div>)}
          </div>
        </div>
      )}
      {asset.id === 'motion-graphic' && <p style={{ ...style, fontSize: 28, textAlign: 'center' }}>{a} & {b}</p>}
      {asset.id === 'instagram-kit' && (
        <div style={{ width: 70, aspectRatio: '9/16', border: '2px solid rgba(255,255,255,0.2)', borderRadius: 3, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 7, color: '#fff', textAlign: 'center', fontWeight: 700 }}>Stories</p>
        </div>
      )}
      {asset.id === 'welcome-signage' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ ...style, fontSize: 26, margin: '0 0 6px' }}>{coupleName}</p>
          {venue !== 'Your Venue' && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}>{venue}</p>}
        </div>
      )}
      {asset.id === 'guest-tags' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {[a, b, 'A', 'B'].map(l => <div key={l} style={{ width: 38, height: 38, border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>{l}</div>)}
        </div>
      )}
      {asset.id === 'thank-you' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ ...style, fontSize: 24, fontStyle: 'italic', margin: '0 0 8px' }}>With love</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}>{coupleName}</p>
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset, isHovered, onHover, onLeave, coupleName, weddingDate, venue, loaded, cardBg, fontDisplay }) {
  return (
    <div
      onMouseEnter={() => onHover(asset.id)} onMouseLeave={onLeave}
      style={{ background: cardBg, border: isHovered ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s ease', transform: isHovered ? 'translateY(-4px)' : 'translateY(0)' }}
    >
      <AssetPreview asset={asset} coupleName={coupleName} weddingDate={weddingDate} venue={venue} loaded={loaded} cardBg={cardBg} fontDisplay={fontDisplay} />
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: cardBg }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>{asset.name}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{asset.desc}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Edit', '↓'].map(l => <button key={l} style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>{l}</button>)}
        </div>
      </div>
    </div>
  );
}

export default function UniverseViewBase({ isOnboarding = false, onBack, onSelect, navigate, config }) {
  const { id, name, tagline,  bg, primary, accent, fontDisplay, fontDisplayName, fontBody, philosophyHeadline, philosophyCopy, heroCopy, palette, heroImage, moodImages, moodQuote } = config;

  const [details, setDetails] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [hoveredAsset, setHoveredAsset] = useState(null);
  const [selectState, setSelectState] = useState('idle');

  const dark = isDark(bg);
  const bgRgb = hexRgb(bg);
  const primRgb = hexRgb(primary);
  const textColor = dark ? '#FFFFFF' : primary;
  const mutedColor = dark ? 'rgba(255,255,255,0.5)' : `rgba(${primRgb},0.6)`;
  const dividerColor = dark ? 'rgba(255,255,255,0.08)' : `rgba(${primRgb},0.12)`;
  const navBg = `rgba(${bgRgb},0.92)`;
  const assetBg = dark ? '#0F0F0F' : primary;
  const cardBg = dark ? '#0A0A0A' : primary;
  const ctaBg = dark ? '#111111' : primary;
  const lineColor = dark ? 'rgba(255,255,255,0.2)' : `rgba(${primRgb},0.25)`;

  useEffect(() => {
    base44.entities.WeddingDetails.list().then(r => { setDetails(r[0] || {}); setLoaded(true); }).catch(() => { setDetails({}); setLoaded(true); });
  }, []);

  const coupleName = details?.coupleNames || (details?.couple1Name && details?.couple2Name ? `${details.couple1Name} & ${details.couple2Name}` : 'John & Sarah');
  const weddingDate = details?.weddingDate ? new Date(details.weddingDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '15 March 2026';
  const venue = details?.mainCeremony?.venueName || 'Your Venue';
  const location = details?.mainCeremony?.address || '';
  const isAlreadySelected = details?.activeUniverse === id;

  const handleSelect = async () => {
    if (selectState === 'loading') return;
    if (isOnboarding) { onSelect && onSelect(); return; }
    setSelectState('loading');
    try {
      if (details?.id) {
        // Aman universe sets its own dedicated theme + the matching typography pairing
        // so the public website renders in Aman's identity (deep black, #C4956A gold,
        // Cormorant Garamond) from the moment of selection. All other universes continue
        // to use the generic 'still' default; they are not touched here.
        const payload = { activeUniverse: id, activeTheme: 'still' };
        if (id === 'aman') {
          payload.activeTheme      = 'aman';
          payload.activeTypography = 'classic'; // Cormorant Garamond — matches Aman's fontDisplay
        }
        await base44.entities.WeddingDetails.update(details.id, payload);
      }
      setSelectState('choice');
    } catch { setSelectState('idle'); }
  };

  const selectLabel = isAlreadySelected && !isOnboarding ? 'Selected — Continue' : selectState === 'loading' ? 'Applying…' : isOnboarding ? `Select ${name} →` : `Select ${name} Universe`;

  if (!isOnboarding && selectState === 'choice') {
    return <UniverseSelectedChoice universe={{ name, id }} coupleName={coupleName} onClose={() => setSelectState('idle')} />;
  }

  return (
    <div style={{ background: bg, fontFamily: `"Plus Jakarta Sans", sans-serif`, color: textColor, minHeight: '100vh' }}>

      {/* TOP BAR */}
      <div style={{ position: isOnboarding ? 'sticky' : 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 30, background: navBg, backdropFilter: 'blur(10px)', borderBottom: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedColor, fontSize: 13, fontFamily: 'inherit', padding: 0 }}>
          {isOnboarding ? '← Back' : '← Guest Suite'}
        </button>
        <button onClick={handleSelect} disabled={selectState === 'loading'} style={{ border: `1px solid ${isAlreadySelected && !isOnboarding ? accent : textColor}`, background: 'transparent', color: isAlreadySelected && !isOnboarding ? accent : textColor, padding: '8px 24px', fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', cursor: 'pointer' }}>
          {isAlreadySelected && !isOnboarding ? 'Selected' : `Select ${name}`}
        </button>
      </div>

      {/* HERO */}
      <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 80px 0', textAlign: 'center', overflow: 'hidden', marginTop: isOnboarding ? 0 : 56 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.25 }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(${bgRgb},0.3) 0%, rgba(${bgRgb},0.7) 70%, ${bg} 100%)` }} />
        <div style={{ position: 'relative', zIndex: 1, opacity: loaded ? 1 : 0.6, transition: 'opacity 0.4s ease' }}>
          {loaded && <p style={{ fontFamily: fontDisplay, fontWeight: 300, fontSize: 'clamp(18px,3vw,30px)', color: mutedColor, letterSpacing: '0.15em', fontStyle: 'italic', margin: '0 0 28px' }}>{coupleName}</p>}
          <div style={{ width: 60, height: 1, background: lineColor, margin: '0 auto 20px' }} />
          <h1 style={{ fontFamily: fontDisplay, fontWeight: 300, fontSize: 'clamp(80px,15vw,180px)', color: textColor, margin: 0, lineHeight: 1 }}>{name}</h1>
          <p style={{ fontFamily: fontDisplay, fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(18px,3vw,30px)', color: mutedColor, letterSpacing: '0.15em', margin: '16px 0 0' }}>{tagline}</p>
          {loaded && details?.weddingDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center', marginTop: 24 }}>
              <p style={{ fontSize: 13, color: mutedColor, letterSpacing: '0.1em', fontFamily: fontDisplay, fontWeight: 300, margin: 0 }}>{weddingDate}</p>
              {venue !== 'Your Venue' && (<>
                <div style={{ width: 1, height: 32, background: dividerColor }} />
                <p style={{ fontSize: 13, color: mutedColor, letterSpacing: '0.1em', fontFamily: fontDisplay, fontWeight: 300, margin: 0 }}>{venue}</p>
              </>)}
            </div>
          )}
          <div style={{ width: 60, height: 1, background: lineColor, margin: '28px auto 0' }} />
          <p style={{ fontSize: 14, color: mutedColor, maxWidth: 480, lineHeight: 1.8, margin: '32px auto 40px' }}>{heroCopy}</p>
          <button onClick={handleSelect} style={{ border: `1px solid ${textColor}`, background: 'transparent', color: textColor, padding: '12px 28px', fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', cursor: 'pointer' }}>
            Select This Universe →
          </button>
        </div>
      </div>

      {/* PHILOSOPHY */}
      <div style={{ padding: '120px 80px', background: bg, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, maxWidth: 1200, margin: '0 auto' }}>
        <div>
          <p style={{ fontSize: 120, fontFamily: fontDisplay, fontWeight: 300, color: `rgba(${primRgb},${dark ? '0.06' : '0.07'})`, margin: 0, lineHeight: 1 }}>01</p>
          <h2 style={{ fontFamily: fontDisplay, fontWeight: 300, fontStyle: 'italic', fontSize: 48, color: textColor, lineHeight: 1.2, margin: 0 }}>{philosophyHeadline}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 14, color: mutedColor, lineHeight: 1.9, marginBottom: 24 }}>{philosophyCopy}</p>
          {loaded && <p style={{ fontSize: 14, color: mutedColor, lineHeight: 1.9 }}>For {coupleName}, we've prepared all 10 pieces — each one reflecting the same spirit. Ready when you are.</p>}
        </div>
      </div>

      {/* ASSET GRID */}
      <div style={{ background: assetBg, padding: '80px' }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 300, fontSize: 56, color: '#FFFFFF', textAlign: 'center', marginBottom: 64 }}>10 pieces. One vision.</h2>
        {[ASSETS.filter(a => a.order <= 5), ASSETS.filter(a => a.order > 5)].map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '1px', background: 'rgba(255,255,255,0.08)', padding: '1px', marginBottom: ri === 0 ? 20 : 0 }}>
            {row.map(asset => (
              <div key={asset.id} style={{ background: assetBg }}>
                <AssetCard asset={asset} isHovered={hoveredAsset === asset.id} onHover={setHoveredAsset} onLeave={() => setHoveredAsset(null)} coupleName={coupleName} weddingDate={weddingDate} venue={venue} loaded={loaded} cardBg={cardBg} fontDisplay={fontDisplay} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* MOOD PHOTOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', height: '80vh', gap: 0 }}>
        <div style={{ backgroundImage: `url(${moodImages[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ backgroundImage: `url(${moodImages[1]})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 32px' }}>
            <div style={{ width: 40, height: 1, background: accent, margin: '0 auto 16px' }} />
            <p style={{ fontFamily: fontDisplay, fontWeight: 300, fontStyle: 'italic', fontSize: 22, color: '#FFFFFF', margin: 0, lineHeight: 1.5 }}>{moodQuote}</p>
          </div>
        </div>
        <div style={{ backgroundImage: `url(${moodImages[2]})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      </div>

      {/* PALETTE + TYPOGRAPHY */}
      <div style={{ background: bg, padding: '120px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, maxWidth: 1200, margin: '0 auto' }}>
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {palette.map(sw => (
              <div key={sw.label}>
                <div style={{ width: 56, height: 56, background: sw.color, border: sw.color === '#FFFFFF' || sw.color === '#FAFCFF' || sw.color === '#FEFBF3' || sw.color === '#FAF7F2' || sw.color === '#FEFDF9' || sw.color === '#F8F8F6' || sw.color === '#F2EAE0' || sw.color === '#F2E8D9' || sw.color === '#F5F2ED' || sw.color === '#F5ECD7' ? `1px solid ${dividerColor}` : 'none', marginBottom: 8 }} />
                <p style={{ fontSize: 11, color: mutedColor, margin: 0 }}>{sw.label}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: mutedColor, lineHeight: 1.7 }}>The {name} palette — {tagline.toLowerCase()}.</p>
        </div>
        <div>
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: fontDisplay, fontWeight: 300, fontSize: 40, color: textColor, margin: 0, lineHeight: 1.1 }}>{fontDisplayName}</p>
            <p style={{ fontSize: 11, color: mutedColor, letterSpacing: '0.15em', marginTop: 8 }}>Light 300 · Display headlines</p>
          </div>
          <div>
            <p style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 400, fontSize: 16, color: mutedColor, margin: 0 }}>Plus Jakarta Sans</p>
            <p style={{ fontSize: 11, color: mutedColor, marginTop: 8 }}>Regular 400 · Body text</p>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{ padding: '160px 80px', textAlign: 'center', background: ctaBg }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', fontFamily: '"Plus Jakarta Sans", sans-serif', marginBottom: 16 }}>
          {loaded ? coupleName : `${name} Universe`}
        </p>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 300, fontSize: 'clamp(40px,7vw,88px)', color: '#FFFFFF', letterSpacing: '0.08em', lineHeight: 1, marginBottom: 24 }}>Your suite awaits.</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto 16px', lineHeight: 1.8 }}>
          Select the {name} universe and we'll apply this aesthetic across all 10 pieces in your Guest Suite — personalised for {coupleName}{details?.weddingDate ? `, ${weddingDate}` : ''}.
        </p>
        {venue !== 'Your Venue' && loaded && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 32, letterSpacing: '0.1em' }}>{venue}{location ? ` · ${location}` : ''}</p>}
        <button onClick={handleSelect} disabled={selectState !== 'idle' && !isOnboarding} style={{ background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFFFFF', border: 'none', padding: '16px 48px', fontSize: 12, fontWeight: 600, cursor: 'pointer', minWidth: 300 }}>
          {selectLabel}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 40 }}>
          {ASSETS.map((_, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />)}
        </div>
      </div>
    </div>
  );
}
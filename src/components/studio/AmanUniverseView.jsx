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

function AssetCard({ asset, isHovered, onHover, onLeave, coupleName, weddingDate, venue, loaded }) {
  const firstName = coupleName.split(' & ')[0]?.[0] || 'J';
  const secondName = coupleName.split(' & ')[1]?.[0] || 'S';

  return (
    <div
      onMouseEnter={() => onHover(asset.id)}
      onMouseLeave={onLeave}
      style={{
        background: '#0A0A0A',
        border: isHovered ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
        padding: 0, overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div style={{
        aspectRatio: asset.order <= 5 ? '4/3' : '3/4',
        background: '#0A0A0A', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: 32, position: 'relative',
        opacity: loaded ? 1 : 0.5, transition: 'opacity 0.4s ease',
      }}>
        {asset.id === 'save-the-date' && (
          <>
            <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 20 }} />
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em' }}>{weddingDate.replace(/ /g, ' · ').toUpperCase()}</p>
            <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.2)', marginTop: 20 }} />
          </>
        )}
        {asset.id === 'digital-invitation' && (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a0a0e, #2d1033)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: '#FFFFFF', margin: '12px 0 0' }}>{coupleName}</p>
            </div>
          </div>
        )}
        {asset.id === 'rsvp-page' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', margin: '0 0 8px' }}>{coupleName}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
              <button style={{ padding: '6px 16px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer' }}>Yes</button>
              <button style={{ padding: '6px 16px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer' }}>No</button>
            </div>
          </div>
        )}
        {asset.id === 'menu-card' && (
          <div style={{ background: '#F8F7F5', color: '#0A0A0A', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 18, color: '#0A0A0A', margin: '12px 0 0' }}>{coupleName}</p>
          </div>
        )}
        {asset.id === 'seating-chart' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', margin: '0 0 8px' }}>{coupleName}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {['T1', 'T2', 'T3', 'T4', 'T5', 'T6'].map(t => (
                <div key={t} style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 6px' }}>{t}</div>
              ))}
            </div>
          </div>
        )}
        {asset.id === 'motion-graphic' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 32, fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, background: 'linear-gradient(135deg, #E03553, #803D81)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              {firstName} & {secondName}
            </div>
          </div>
        )}
        {asset.id === 'instagram-kit' && (
          <div style={{ width: 80, aspectRatio: '9/16', border: '2px solid rgba(255,255,255,0.2)', borderRadius: 4, background: 'linear-gradient(135deg, #1a0a0e, #2d1033)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 7, color: '#fff', textAlign: 'center', fontWeight: 700 }}>Stories</p>
          </div>
        )}
        {asset.id === 'welcome-signage' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 32, color: '#FFFFFF', margin: '0 0 8px' }}>{coupleName}</p>
            {venue !== 'Your Venue' && (
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}>{venue}</p>
            )}
          </div>
        )}
        {asset.id === 'guest-tags' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[firstName, secondName, 'A', 'B'].map(l => (
              <div key={l} style={{ width: 40, height: 40, border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F7F5', color: '#0A0A0A', fontSize: 14, fontWeight: 600 }}>{l}</div>
            ))}
          </div>
        )}
        {asset.id === 'thank-you' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: '#FFFFFF', fontStyle: 'italic', margin: 0 }}>With love</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 8, letterSpacing: '0.2em' }}>{coupleName}</p>
          </div>
        )}
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>{asset.name}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{asset.desc}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
          <button style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>↓</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Shared AMAN universe page content.
 * 
 * Props:
 *  - isOnboarding (bool): if true, "← Back" + calls onSelect(); if false, "← Guest Suite" + saves to DB + navigates
 *  - onBack (fn): called when back button is clicked
 *  - onSelect (fn): called when a select button is clicked (onboarding mode only)
 *  - navigate (fn): react-router navigate (studio mode only)
 */
export default function AmanUniverseView({ isOnboarding = false, onBack, onSelect, navigate }) {
  const [details, setDetails] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [hoveredAsset, setHoveredAsset] = useState(null);
  const [selectState, setSelectState] = useState('idle');

  useEffect(() => {
    base44.entities.WeddingDetails.list().then(res => {
      setDetails(res[0] || {});
      setLoaded(true);
    }).catch(() => {
      setDetails({});
      setLoaded(true);
    });
  }, []);

  const coupleName = details?.coupleNames
    || (details?.couple1Name && details?.couple2Name
      ? `${details.couple1Name} & ${details.couple2Name}`
      : 'John & Sarah');

  const weddingDate = details?.weddingDate
    ? new Date(details.weddingDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '15 March 2026';

  const venue = details?.mainCeremony?.venueName || 'Your Venue';
  const location = details?.mainCeremony?.address || '';
  const isAlreadySelected = details?.activeUniverse === 'aman';

  const handleSelectUniverse = async () => {
    if (selectState === 'loading') return;

    if (isOnboarding) {
      onSelect && onSelect();
      return;
    }

    setSelectState('loading');
    try {
      if (details?.id) {
        await base44.entities.WeddingDetails.update(details.id, { activeUniverse: 'aman', activeTheme: 'still' });
      }
      setSelectState('choice');
    } catch {
      setSelectState('idle');
    }
  };

  const selectLabel = isAlreadySelected && !isOnboarding
    ? 'Selected — Continue'
    : selectState === 'loading'
    ? 'Applying…'
    : isOnboarding
    ? 'Select AMAN →'
    : 'Select AMAN Universe';

  if (!isOnboarding && selectState === 'choice') {
    return (
      <UniverseSelectedChoice
        universe={{ name: 'AMAN', id: 'aman' }}
        coupleName={coupleName}
        onClose={() => setSelectState('idle')}
      />
    );
  }

  return (
    <div style={{ background: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#FFFFFF', minHeight: '100vh' }}>

      {/* Fixed/sticky top bar */}
      <div style={{
        position: isOnboarding ? 'sticky' : 'fixed',
        top: 0, left: 0, right: 0, height: 56, zIndex: 30,
        background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between',
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}
        >
          {isOnboarding ? '← Back' : '← Guest Suite'}
        </button>
        <button
          onClick={handleSelectUniverse}
          disabled={selectState === 'loading'}
          style={{
            border: `1px solid ${isAlreadySelected && !isOnboarding ? '#DDF762' : '#FFFFFF'}`,
            background: 'transparent',
            color: isAlreadySelected && !isOnboarding ? '#DDF762' : '#FFFFFF',
            padding: '8px 24px', fontSize: 11, fontWeight: 600, letterSpacing: '0.15em',
            transition: 'all 0.3s ease',
          }}
        >
          {isAlreadySelected && !isOnboarding ? 'SELECTED' : 'Select AMAN'}
        </button>
      </div>

      {/* SECTION 1: HERO */}
      <div style={{
        position: 'relative', height: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '56px 80px 0', textAlign: 'center', overflow: 'hidden',
        marginTop: isOnboarding ? 0 : 56,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.25,
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.7) 70%, #0A0A0A 100%)' }} />

        <div style={{ position: 'relative', zIndex: 1, transition: 'opacity 0.4s ease', opacity: loaded ? 1 : 0.6 }}>
          <div style={{ marginBottom: 32 }}>
            {loaded ? (
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(20px, 3vw, 32px)', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.15em', textAlign: 'center', fontStyle: 'italic', margin: 0 }}>{coupleName}</p>
            ) : (
              <div style={{ width: 160, height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 auto' }} />
            )}
          </div>

          <div style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.2)', margin: '20px auto' }} />

          <h1 style={{
            fontFamily: 'Cormorant Garamond, serif', fontWeight: 300,
            fontSize: 'clamp(80px, 15vw, 180px)', color: '#FFFFFF',
          }}>AMAN</h1>

          <p style={{
            fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontStyle: 'italic',
            fontSize: 'clamp(18px, 3vw, 32px)', color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.15em', margin: '16px 0 0',
          }}>Quiet Luxury</p>

          {loaded && details?.weddingDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center', marginTop: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, margin: 0 }}>{weddingDate}</p>
              </div>
              {venue !== 'Your Venue' && (
                <>
                  <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, margin: 0 }}>{venue}</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ width: 60, height: 1, background: 'rgba(255,255,255,0.2)', margin: '28px auto 0' }} />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', maxWidth: 480, lineHeight: 1.8, margin: '32px auto 40px' }}>
            A complete invitation suite inspired by the world's most exclusive resort collection. Stripped back to the essential. No noise. Only intention.
          </p>

          <button
            onClick={handleSelectUniverse}
            disabled={selectState !== 'idle'}
            style={{
              border: '1px solid #FFFFFF', background: 'transparent', color: '#FFFFFF',
              padding: '12px 28px', fontSize: 12, fontWeight: 600, letterSpacing: '0.15em',
            }}
          >
            Select This Universe →
          </button>
        </div>
      </div>

      {/* SECTION 2: Philosophy */}
      <div style={{
        padding: '120px 80px', background: '#0A0A0A',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60,
        maxWidth: 1200, margin: '0 auto',
      }}>
        <div>
          <p style={{ fontSize: 120, fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, color: 'rgba(255,255,255,0.06)', margin: 0 }}>01</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 48, color: '#FFFFFF', lineHeight: 1.2, margin: 0 }}>
            Restraint as a statement.
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, marginBottom: 24 }}>
            The AMAN universe was designed for couples who understand that less communicates more. Every element is intentional. Every space has a reason.
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, marginBottom: 24 }}>
            Inspired by Aman Resorts — the standard for quiet luxury in hospitality — this suite strips away everything unnecessary and leaves only what matters.
          </p>
          {loaded && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, transition: 'opacity 0.4s ease', opacity: 1 }}>
              For {coupleName}, we've prepared all 10 pieces — each one reflecting the same quiet intention. Ready when you are.
            </p>
          )}
        </div>
      </div>

      {/* SECTION 3: Asset Showcase */}
      <div style={{ background: '#0F0F0F', padding: '80px' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 56, color: '#FFFFFF', textAlign: 'center', marginBottom: 64 }}>
          10 pieces. One vision.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.08)', padding: '1px', marginBottom: 20 }}>
          {ASSETS.filter(a => a.order <= 5).map(asset => (
            <div key={asset.id} style={{ background: '#0F0F0F' }}>
              <AssetCard asset={asset} isHovered={hoveredAsset === asset.id} onHover={setHoveredAsset} onLeave={() => setHoveredAsset(null)} coupleName={coupleName} weddingDate={weddingDate} venue={venue} loaded={loaded} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.08)', padding: '1px' }}>
          {ASSETS.filter(a => a.order > 5).map(asset => (
            <div key={asset.id} style={{ background: '#0F0F0F' }}>
              <AssetCard asset={asset} isHovered={hoveredAsset === asset.id} onHover={setHoveredAsset} onLeave={() => setHoveredAsset(null)} coupleName={coupleName} weddingDate={weddingDate} venue={venue} loaded={loaded} />
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: Mood Photos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', height: '80vh', gap: 0 }}>
        <div style={{ backgroundImage: 'url(https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ backgroundImage: 'url(https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.4)' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.5)', margin: '12px auto' }} />
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 28, color: '#FFFFFF', margin: 0 }}>
              For those who believe the most powerful statement is silence.
            </p>
          </div>
        </div>
        <div style={{ backgroundImage: 'url(https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      </div>

      {/* SECTION 5: Colour & Typography */}
      <div style={{ background: '#0A0A0A', padding: '120px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, maxWidth: 1200, margin: '0 auto' }}>
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {[{ color: '#0A0A0A', label: 'Obsidian' }, { color: '#F8F7F5', label: 'Linen' }, { color: '#C4956A', label: 'Sand' }, { color: '#FFFFFF', label: 'Pure', border: true }].map(swatch => (
              <div key={swatch.label}>
                <div style={{ width: 60, height: 60, background: swatch.color, border: swatch.border ? '1px solid #FFFFFF' : 'none', marginBottom: 8 }} />
                <p style={{ fontSize: 11, color: '#888888', margin: 0 }}>{swatch.label}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>The AMAN palette speaks in whispers. Deep blacks, warm linens, touches of gold.</p>
        </div>
        <div>
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 48, color: '#FFFFFF', margin: 0 }}>Cormorant Garamond</p>
            <p style={{ fontSize: 11, color: '#888888', letterSpacing: '0.15em', marginTop: 8 }}>Light 300 · Uppercase · Tracked</p>
          </div>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Plus Jakarta Sans</p>
            <p style={{ fontSize: 11, color: '#888888', marginTop: 8 }}>Regular 400 · Body text</p>
          </div>
        </div>
      </div>

      {/* SECTION 6: Final CTA */}
      <div style={{ padding: '160px 80px', textAlign: 'center' }}>
          {loaded ? coupleName : 'AMAN UNIVERSE'}
        </p>
        <h2 style={{
          fontFamily: 'Cormorant Garamond, serif', fontWeight: 300,
          fontSize: 'clamp(40px, 7vw, 88px)', color: '#FFFFFF',
          letterSpacing: '0.08em', lineHeight: 1, marginBottom: 24,
        }}>Your suite awaits.</h2>
        <p style={{ fontSize: 14, color: '#888888', maxWidth: 480, margin: '0 auto 16px', lineHeight: 1.8, textAlign: 'center' }}>
          Select the AMAN universe and we'll apply this aesthetic across all 10 pieces in your Guest Suite — personalised for {coupleName}{details?.weddingDate ? `, ${weddingDate}` : ''}.
        </p>

        {venue !== 'Your Venue' && loaded && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 32, letterSpacing: '0.1em' }}>
            {venue}{location ? ` · ${location}` : ''}
          </p>
        )}

        <button
          onClick={handleSelectUniverse}
          disabled={selectState !== 'idle' && !isOnboarding}
          style={{
            background: 'linear-gradient(135deg, #E03553, #803D81)',
            color: '#FFFFFF', border: 'none',
            padding: '16px 48px', fontSize: 12, fontWeight: 600,
            cursor: (selectState !== 'idle' && !isOnboarding) ? 'default' : 'pointer',
            transition: 'all 0.3s ease', minWidth: 300,
          }}
        >
          {selectLabel}
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 40 }}>
          {ASSETS.map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#888888' }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }
      `}</style>
    </div>
  );
}
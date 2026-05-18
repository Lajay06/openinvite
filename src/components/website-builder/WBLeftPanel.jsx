import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, BookOpen, Star, Mail, MapPin, Gift, Music, Camera, HelpCircle, FileText, CalendarCheck, Send, UtensilsCrossed, LayoutGrid, Clapperboard, Instagram, Signpost, Tag, Heart, Sparkles } from 'lucide-react';
import { WEDDING_PAGES, WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS } from '@/lib/websiteThemes';
import NewPageModal from './NewPageModal';

const PJS = "'Plus Jakarta Sans', sans-serif";

const ASSETS = [
  { id: 'save-the-date', name: 'Save the Date', icon: CalendarCheck },
  { id: 'digital-invitation', name: 'Digital Invitation', icon: Send },
  { id: 'rsvp-card', name: 'RSVP Card', icon: Mail },
  { id: 'menu-card', name: 'Menu Card', icon: UtensilsCrossed },
  { id: 'seating-chart', name: 'Seating Chart', icon: LayoutGrid },
  { id: 'motion-graphic', name: 'Motion Graphic', icon: Clapperboard },
  { id: 'instagram-kit', name: 'Instagram Story Kit', icon: Instagram },
  { id: 'welcome-signage', name: 'Welcome Signage', icon: Signpost },
  { id: 'guest-tags', name: 'Guest Tags', icon: Tag },
  { id: 'thank-you', name: 'Thank You Notes', icon: Heart },
];

const PAGE_ICONS = {
  LayoutDashboard, BookOpen, Star, Mail, MapPin, Gift, Music, Camera, HelpCircle, FileText, Sparkles,
};

function PageIcon({ name, active }) {
  const Icon = PAGE_ICONS[name] || FileText;
  return <Icon size={13} strokeWidth={1.5} color={active ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} fill="none" />;
}

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(); }}
      style={{
        width: 28, height: 16, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: enabled ? '#E03553' : 'rgba(255,255,255,0.1)',
        position: 'relative', flexShrink: 0, padding: 0, outline: 'none',
        transition: 'background 0.2s ease',
      }}
    >
      <div style={{
        position: 'absolute',
        width: 12, height: 12, borderRadius: '50%',
        background: '#FFFFFF',
        top: 2, left: 2,
        transform: enabled ? 'translateX(12px)' : 'translateX(0)',
        transition: 'transform 0.2s ease',
      }} />
    </button>
  );
}

function SLabel({ children }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
      color: 'rgba(255,255,255,0.25)', margin: 0,
      padding: '12px 16px 6px', fontFamily: PJS,
    }}>{children}</p>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />;
}

export default function WBLeftPanel({ details, onChange, currentPage, onPageChange, selectedAsset, onAssetSelect }) {
  const [showNewPage, setShowNewPage] = useState(false);
  const navigate = useNavigate();
  const [hoveredPage, setHoveredPage] = useState(null);
  const [hoveredAsset, setHoveredAsset] = useState(null);
  const [hoverNewPage, setHoverNewPage] = useState(false);

  const enabledPages = details.enabledPages || ['home', 'our-story', 'celebration', 'rsvp'];
  const customPages = details.customPages || [];

  const toggle = (slug) => {
    if (slug === 'home') return;
    const next = enabledPages.includes(slug)
      ? enabledPages.filter(p => p !== slug)
      : [...enabledPages, slug];
    onChange('enabledPages', next);
  };

  const handleCreatePage = (page) => {
    onChange('customPages', [...customPages, page]);
    onChange('enabledPages', [...enabledPages, page.slug]);
    onPageChange(page.slug);
  };

  const handleDeleteCustomPage = (e, slug) => {
    e.stopPropagation();
    onChange('customPages', customPages.filter(p => p.slug !== slug));
    onChange('enabledPages', enabledPages.filter(s => s !== slug));
    if (currentPage === slug) onPageChange('home');
  };

  const theme = WEBSITE_THEMES.find(t => t.id === (details.activeTheme || 'still')) || WEBSITE_THEMES[0];
  const typo = TYPOGRAPHY_PAIRINGS.find(t => t.id === (details.activeTypography || 'classic')) || TYPOGRAPHY_PAIRINGS[0];

  return (
    <div style={{
      width: 240, flexShrink: 0,
      background: '#111111',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
      color: 'rgba(255,255,255,0.6)',
      zIndex: 50,
    }}>

      {/* ── Pages ── */}
      <SLabel>Pages</SLabel>

      <div>
        {WEDDING_PAGES.map(({ slug, label, icon }) => {
          const active = currentPage === slug;
          const enabled = enabledPages.includes(slug);
          const hovered = hoveredPage === slug;
          const clickable = enabled || slug === 'home';
          return (
            <div
              key={slug}
              onClick={() => { if (clickable) onPageChange(slug); }}
              onMouseEnter={() => { if (!active && clickable) setHoveredPage(slug); }}
              onMouseLeave={() => setHoveredPage(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 16px',
                cursor: clickable ? 'pointer' : 'default',
                background: active ? 'rgba(255,255,255,0.06)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderLeft: active ? '2px solid #E03553' : '2px solid transparent',
                opacity: !enabled && slug !== 'home' ? 0.4 : 1,
                transition: 'background 0.1s',
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <PageIcon name={icon} active={active} />
              </div>
              <span style={{
                flex: 1, fontSize: 12, fontWeight: 500, fontFamily: PJS,
                color: active || hovered ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{label}</span>

              {slug !== 'home' ? (
                <Toggle enabled={enabled} onToggle={() => toggle(slug)} />
              ) : (
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 600, fontFamily: PJS }}>Req</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom pages */}
      {customPages.length > 0 && (
        <>
          <Divider />
          <SLabel>Custom</SLabel>
          {customPages.map(page => {
            const active = currentPage === page.slug;
            const hovered = hoveredPage === page.slug;
            return (
              <div
                key={page.slug}
                onClick={() => onPageChange(page.slug)}
                onMouseEnter={() => { if (!active) setHoveredPage(page.slug); }}
                onMouseLeave={() => setHoveredPage(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 16px', cursor: 'pointer',
                  background: active ? 'rgba(255,255,255,0.06)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                  borderLeft: active ? '2px solid #E03553' : '2px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <PageIcon name="FileText" active={active} />
                </div>
                <span style={{
                  flex: 1, fontSize: 12, fontWeight: 500, fontFamily: PJS,
                  color: active || hovered ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{page.name}</span>
                <button
                  onClick={e => handleDeleteCustomPage(e, page.slug)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                  title="Delete page"
                >×</button>
              </div>
            );
          })}
        </>
      )}

      {/* ── New page ── */}
      <Divider />
      <div
        onClick={() => setShowNewPage(true)}
        onMouseEnter={() => setHoverNewPage(true)}
        onMouseLeave={() => setHoverNewPage(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 16px', cursor: 'pointer',
          color: hoverNewPage ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
          background: hoverNewPage ? 'rgba(255,255,255,0.04)' : 'transparent',
          transition: 'all 0.15s', fontFamily: PJS,
        }}
      >
        <Plus size={12} />
        <span style={{ fontSize: 12, fontWeight: 500 }}>New page</span>
      </div>

      {/* ── Design ── */}
      <Divider />
      <SLabel>Design</SLabel>
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', width: 20, height: 20, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ flex: 1, background: theme.darkBg }} />
            <div style={{ flex: 1, background: theme.lightBg }} />
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontFamily: PJS }}>{theme.name}</span>
          <span
            onClick={() => navigate('/studio/universe')}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', marginLeft: 'auto', fontFamily: PJS, transition: 'color 0.15s', flexShrink: 0 }}
          >Change →</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Georgia,serif', lineHeight: 1 }}>Tt</span>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontFamily: PJS }}>{typo.name}</span>
          <span
            onClick={() => navigate('/studio/universe')}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', marginLeft: 'auto', fontFamily: PJS, transition: 'color 0.15s', flexShrink: 0 }}
          >Change →</span>
        </div>
      </div>

      {/* ── Assets ── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0 0' }} />
      <SLabel>Assets</SLabel>
      {ASSETS.map(({ id, name, icon: Icon }) => {
        const active = selectedAsset === id;
        const hovered = hoveredAsset === id;
        return (
          <div
            key={id}
            onClick={() => onAssetSelect(id)}
            onMouseEnter={() => { if (!active) setHoveredAsset(id); }}
            onMouseLeave={() => setHoveredAsset(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', cursor: 'pointer',
              background: active ? 'rgba(255,255,255,0.06)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
              borderLeft: active ? '2px solid #E03553' : '2px solid transparent',
              transition: 'background 0.1s',
            }}
          >
            <Icon size={13} strokeWidth={1.5} color={active ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, fontFamily: PJS, color: active ? '#FFFFFF' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 999, fontFamily: PJS,
              background: active ? '#E03553' : 'rgba(255,255,255,0.08)',
              color: active ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
            }}>
              {active ? 'Edit' : 'Ready'}
            </span>
          </div>
        );
      })}

      {/* Spacer pushes Ava button to bottom */}
      <div style={{ flex: 1, minHeight: 12 }} />

      {/* ── Ava auto-fill ── */}
      <button
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: 'linear-gradient(135deg, #ec4899, #9333ea)',
          color: '#FFFFFF', border: 'none', borderRadius: 999,
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          padding: '8px 16px',
          margin: '8px 12px 12px',
          width: 'calc(100% - 24px)',
          fontFamily: PJS,
        }}
      >
        <Sparkles size={12} />
        Auto-fill with Ava
      </button>

      {showNewPage && (
        <NewPageModal
          onClose={() => setShowNewPage(false)}
          onCreate={handleCreatePage}
          weddingSlug={details.slug}
        />
      )}
    </div>
  );
}

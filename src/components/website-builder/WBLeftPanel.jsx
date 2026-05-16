import React, { useState } from 'react';
import { Plus, LayoutDashboard, BookOpen, Star, Mail, MapPin, Gift, Music, Camera, HelpCircle, FileText, CalendarCheck, Send, Users, UtensilsCrossed, LayoutGrid, Clapperboard, Instagram, Signpost, Tag, Heart } from 'lucide-react';
import { WEDDING_PAGES, WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS } from '@/lib/websiteThemes';
import NewPageModal from './NewPageModal';

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
  LayoutDashboard, BookOpen, Star, Mail, MapPin, Gift, Music, Camera, HelpCircle, FileText,
};

function PageIcon({ name, active }) {
  const Icon = PAGE_ICONS[name] || FileText;
  return <Icon size={14} strokeWidth={1.5} color={active ? '#E03553' : '#888888'} fill="none" />;
}

export default function WBLeftPanel({ details, onChange, currentPage, onPageChange, selectedAsset, onAssetSelect }) {
  const [showNewPage, setShowNewPage] = useState(false);
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
    const newCustomPages = [...customPages, page];
    const newEnabledPages = [...enabledPages, page.slug];
    onChange('customPages', newCustomPages);
    onChange('enabledPages', newEnabledPages);
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
      background: '#FAFAFA', borderRight: '1px solid #EEEEEE',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
      zIndex: 50,
    }}>
      {/* Pages header */}
      <div style={{ padding: '14px 14px 8px' }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', margin: 0 }}>Pages</p>
      </div>

      {/* Built-in page list */}
      <div>
        {WEDDING_PAGES.map(({ slug, label, icon }) => {
          const active = currentPage === slug;
          const enabled = enabledPages.includes(slug);
          return (
            <div
              key={slug}
              onClick={() => { if (enabled || slug === 'home') onPageChange(slug); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 10px 9px 12px',
                cursor: enabled || slug === 'home' ? 'pointer' : 'default',
                background: active ? '#fff' : 'transparent',
                borderLeft: active ? '3px solid #E03553' : '3px solid transparent',
                opacity: !enabled && slug !== 'home' ? 0.4 : 1,
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><PageIcon name={icon} active={active} /></div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: active ? '#0A0A0A' : '#555' }}>{label}</span>

              {slug !== 'home' ? (
                <button
                  onClick={e => { e.stopPropagation(); toggle(slug); }}
                  style={{
                    width: 30, height: 17, borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: enabled ? '#E03553' : '#CCCCCC', position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                  }}
                >
                  <div style={{ position: 'absolute', width: 13, height: 13, borderRadius: '50%', background: '#fff', top: 2, left: enabled ? 15 : 2, transition: 'left 0.2s' }} />
                </button>
              ) : (
                <span style={{ fontSize: 9, color: '#BBB', fontWeight: 600, letterSpacing: '0.05em' }}>REQ</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom pages */}
      {customPages.length > 0 && (
        <>
          <div style={{ height: 1, background: '#EEEEEE', margin: '6px 0' }} />
          <div style={{ padding: '4px 14px 2px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', margin: 0 }}>Custom</p>
          </div>
          {customPages.map(page => {
            const active = currentPage === page.slug;
            return (
              <div
                key={page.slug}
                onClick={() => onPageChange(page.slug)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 10px 9px 12px', cursor: 'pointer',
                  background: active ? '#fff' : 'transparent',
                  borderLeft: active ? '3px solid #803D81' : '3px solid transparent',
                }}
              >
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><PageIcon name="FileText" active={active} /></div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: active ? '#0A0A0A' : '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.name}</span>
                <button
                  onClick={e => handleDeleteCustomPage(e, page.slug)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                  title="Delete page"
                >×</button>
              </div>
            );
          })}
        </>
      )}

      {/* + New Page */}
      <div style={{ padding: '8px 12px' }}>
        <button
          onClick={() => setShowNewPage(true)}
          style={{
            width: '100%', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, border: '1px dashed #DDD', background: 'transparent', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: '#888', borderRadius: 4, fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.color = '#E03553'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDD'; e.currentTarget.style.color = '#888'; }}
        >
          <Plus size={13} /> New Page
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#EEEEEE', margin: '2px 0 10px' }} />

      {/* Global design quick-view */}
      <div style={{ padding: '0 14px 14px' }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', margin: '0 0 10px' }}>Design</p>

        {/* Theme preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', width: 28, height: 18, borderRadius: 3, overflow: 'hidden', flexShrink: 0, border: '1px solid #DDD' }}>
            <div style={{ flex: 1, background: theme.darkBg }} />
            <div style={{ flex: 1, background: theme.lightBg }} />
          </div>
          <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{theme.name}</span>
        </div>

        {/* Typography preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#888', fontFamily: 'Georgia,serif', flexShrink: 0, lineHeight: 1 }}>Tt</span>
          <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{typo.name}</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#EEEEEE', margin: '2px 0 10px' }} />

      {/* ASSETS section */}
      <div style={{ padding: '0 14px 8px' }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', margin: '0 0 6px' }}>Assets</p>
      </div>
      {ASSETS.map(({ id, name, icon: Icon }) => {
        const active = selectedAsset === id;
        return (
          <div
            key={id}
            onClick={() => onAssetSelect(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px 8px 12px', cursor: 'pointer',
              background: active ? '#fff' : 'transparent',
              borderLeft: active ? '3px solid #803D81' : '3px solid transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F5F5F5'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon size={13} strokeWidth={1.5} color={active ? '#803D81' : '#888'} />
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: active ? '#0A0A0A' : '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 6px',
              background: active ? '#DDF762' : 'transparent',
              color: active ? '#0A0A0A' : '#BBBBBB',
              border: active ? 'none' : '1px solid #DDDDDD',
            }}>
              {active ? 'EDIT' : 'READY'}
            </span>
          </div>
        );
      })}

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
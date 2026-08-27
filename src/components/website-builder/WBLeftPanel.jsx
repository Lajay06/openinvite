import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, BookOpen, Star, Mail, MapPin, Gift, Music, Camera, HelpCircle, FileText, Heart, Sparkles, BarChart2 } from 'lucide-react';
import { WEDDING_PAGES } from '@/lib/websiteThemes';
import { resolveColors } from '@/lib/universeStyling';
import { interactiveDivProps } from '@/lib/a11y';
import NewPageModal from './NewPageModal';
import { ALWAYS_ON_PAGES } from '@/lib/guestPages';

import { resolveUniverseConfig } from '@/lib/universeStyling';
const PJS = "'Plus Jakarta Sans', sans-serif";


const PAGE_ICONS = {
  LayoutDashboard, BookOpen, Star, Mail, MapPin, Gift, Music, Camera, HelpCircle, FileText, Sparkles, BarChart2, Heart,
};

function PageIcon({ name, active }) {
  const Icon = PAGE_ICONS[name] || FileText;
  return <Icon size={13} strokeWidth={1.5} color={active ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} fill="none" />;
}

function Toggle({ enabled, onToggle, label }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(); }}
      aria-label={label ? `Toggle ${label}` : 'Toggle'}
      aria-pressed={enabled}
      style={{
        width: 28, height: 16, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: enabled ? '#E03553' : '#2C2C2E',
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

function SLabel({ children, onClick, isOpen }) {
  const collapsible = typeof isOpen === 'boolean';
  return (
    <p
      onClick={onClick}
      {...(collapsible ? { ...interactiveDivProps(onClick, { label: children }), 'aria-expanded': isOpen } : {})}
      style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.4)', margin: 0,
        padding: '12px 16px 6px', fontFamily: PJS,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: collapsible ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <span>{children}</span>
      {collapsible && <span style={{ fontSize: 10, marginRight: 2 }}>{isOpen ? '▼' : '▶'}</span>}
    </p>
  );
}

function Divider() {
  // Divider at 0.12 — advisor ruling 2026-08-20: dividers are ONE
  // value regardless of implementation (background, not border).
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '8px 0' }} />;
}

export default function WBLeftPanel({ details, onChange, currentPage, onPageChange }) {
  const [showNewPage, setShowNewPage] = useState(false);
  const navigate = useNavigate();
  const [hoveredPage, setHoveredPage] = useState(null);
  const [hoverNewPage, setHoverNewPage] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(true);

  const enabledPages = details.enabledPages || ['home', 'our-story', 'celebration', 'rsvp'];
  const customPages = details.customPages || [];

  const toggle = (slug) => {
    if (ALWAYS_ON_PAGES.includes(slug)) return;
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

  // A universe's own colours take priority over the legacy activeTheme
  // lookup — see resolveColors() (fix/universe-palettes).
  const theme = resolveColors(details);
  // The universe's OWN name, through the same resolver every other surface
  // uses. This previously title-cased `activeUniverse` and, when that was
  // absent, fell back to the LEGACY `activeTheme` — so a record with no
  // universe showed "Still" here while WBRightPanel showed "London" for the
  // same record. Two fallbacks disagreeing about what absence means, on one
  // screen. resolveUniverseConfig defaults to london, and now both do.
  const themeLabel = resolveUniverseConfig(details)?.name
    || (details?.activeUniverse
      ? details.activeUniverse.charAt(0).toUpperCase() + details.activeUniverse.slice(1)
      : 'London');

  return (
    <div style={{
      width: 240, flexShrink: 0,
      background: '#1C1C1E',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
      color: 'rgba(255,255,255,0.6)',
      zIndex: 50,
    }}>

      {/* ── Pages ── */}
      <SLabel onClick={() => setPagesOpen(o => !o)} isOpen={pagesOpen}>Pages</SLabel>

      <div style={{ overflow: 'hidden', maxHeight: pagesOpen ? '2000px' : '0px', transition: 'max-height 0.2s ease' }}>
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
              {...interactiveDivProps(clickable ? () => onPageChange(slug) : null, { label })}
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

              {!ALWAYS_ON_PAGES.includes(slug) ? (
                <Toggle enabled={enabled} onToggle={() => toggle(slug)} label={label} />
              ) : (
                // Not "Req". An abbreviation of a word the couple never used is
                // not an explanation, and a dead toggle would be worse still.
                <span
                  title="Your guests need to find the date and a way to reply."
                  style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontFamily: PJS, letterSpacing: '0.04em' }}
                >Always on</span>
              )}
            </div>
          );
        })}
      </div>
      {/* Said once, under the list, rather than three times in rows too narrow
          to hold it. Their words about their invitation, not ours about the
          system. */}
      <p style={{
        fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,0.4)',
        fontFamily: PJS, margin: '10px 2px 0',
      }}>
        Your guests need to find the date and a way to reply, so those pages stay on.
      </p>

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
                {...interactiveDivProps(() => onPageChange(page.slug), { label: page.name })}
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
                  aria-label={`Delete ${page.name}`}
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
        {...interactiveDivProps(() => setShowNewPage(true), { label: 'New page' })}
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
      </div>{/* end pages collapsible */}

      {/* ── Universe ──
          ONE PILL, replacing the Design and Assets sections.

          Design held two rows, and BOTH "Change →" links already navigated to
          /studio/universe — never two destinations, only two labels. The second
          row displayed `details.activeTypography`, which NOTHING writes and
          which curatedFonts.js already documents as "permanently dead code":
          resolveTypography gives the universe unconditional priority. It showed
          a pairing name with no bearing on what rendered.

          The real typography control is unaffected — it lives in the RIGHT
          panel as `fontOverride` (any of 30 fonts per role, per-universe
          pairing presets).

          WHEN A CONTROL REPLACES A READOUT, IT MUST CARRY THE READOUT: the
          universe name was the only true information this section held, so the
          pill says it. */}
      <Divider />
      <div style={{ padding: '12px 16px' }}>
        <div
          onClick={() => navigate('/studio/universe')}
          {...interactiveDivProps(() => navigate('/studio/universe'), { label: `${themeLabel} — Change universe` })}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999,
            padding: '7px 14px', transition: 'border-color 0.15s',
          }}
        >
          <div style={{ display: 'flex', width: 16, height: 16, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ flex: 1, background: theme.darkBg }} />
            <div style={{ flex: 1, background: theme.lightBg }} />
          </div>
          <span style={{ fontSize: 12, color: '#FFFFFF', fontWeight: 600, fontFamily: PJS }}>{themeLabel}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginLeft: 'auto', fontFamily: PJS, flexShrink: 0 }}>Change universe</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 12 }} />

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

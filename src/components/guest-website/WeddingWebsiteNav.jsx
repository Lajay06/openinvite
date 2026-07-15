import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { WEDDING_PAGES } from '@/lib/websiteThemes';

// fix/builder-polish: with many pages enabled (up to 14 in WEDDING_PAGES,
// plus up to 4 sub-page links — transport/accommodation/music/experience —
// that aren't part of `enabledPages` at all), the desktop nav had no wrap or
// overflow handling: a plain `display:flex` row with a fixed gap just grows
// past the viewport, clipping or crowding the couple names on the left.
// Fixed by showing a bounded number of direct links and tucking the rest
// into a "More" dropdown — the nav's width is now capped regardless of how
// many pages a couple enables.
const MAX_VISIBLE_LINKS = 5;

export default function WeddingWebsiteNav({ weddingName, theme, enabledPages, currentPage, weddingSlug, hasTransport, hasAccommodation, hasMusic, hasExperience, onNavigate }) {
   const [scrolled, setScrolled] = useState(false);
   const [mobileOpen, setMobileOpen] = useState(false);
   const [moreOpen, setMoreOpen] = useState(false);
   const moreRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  const navStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backgroundColor: scrolled ? theme.navBg : `${theme.navBg}D9`,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${theme.accent}20`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: '56px',
    fontFamily: 'Plus Jakarta Sans, sans-serif'
  };

  // Sentence case, no text-transform:uppercase (house rule) — labels are
  // already written in their natural case ("Getting Here", "Stay", ...).
  const navTextStyle = {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: theme.darkText,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const subLinks = [
    hasTransport && { key: 'transport', label: 'Getting here', href: `/w/${weddingSlug}/transport` },
    hasAccommodation && { key: 'accommodation', label: 'Stay', href: `/w/${weddingSlug}/accommodation` },
    hasMusic && { key: 'music', label: 'Music', href: `/w/${weddingSlug}/music` },
    hasExperience && { key: 'experience', label: 'Guide', href: `/w/${weddingSlug}/experience` },
  ].filter(Boolean);

  // A wedding's stored enabledPages may still list a slug for a page that
  // no longer exists (e.g. Guestbook, retired) — filter those out instead
  // of rendering a dead, blank-label nav link. WEDDING_PAGES is the single
  // source of truth for which page slugs are real.
  const pageLinks = enabledPages
    .map(pageSlug => ({
      key: pageSlug,
      label: WEDDING_PAGES.find(p => p.slug === pageSlug)?.label,
      isPage: true,
      slug: pageSlug,
    }))
    .filter(link => !!link.label);

  const allLinks = [...pageLinks, ...subLinks];
  const visibleLinks = allLinks.slice(0, MAX_VISIBLE_LINKS);
  const overflowLinks = allLinks.slice(MAX_VISIBLE_LINKS);

  const renderLink = (link, { forMobile = false } = {}) => {
    const isActive = link.isPage && (currentPage === link.slug || (link.slug === 'home' && !currentPage));
    const style = forMobile
      ? { ...navTextStyle, color: isActive ? theme.accent : navTextStyle.color, textAlign: 'left', paddingBottom: '8px', borderBottom: isActive ? `2px solid ${theme.accent}` : 'none', background: 'none', border: 'none', display: 'block', width: '100%' }
      : { ...navTextStyle, borderBottom: isActive ? `2px solid ${theme.accent}` : '2px solid transparent', paddingBottom: '2px', transition: 'border-color 0.3s ease', background: 'none', border: 'none' };
    if (link.isPage) {
      return (
        <button key={link.key} onClick={() => { onNavigate(link.slug); setMobileOpen(false); setMoreOpen(false); }} style={style}>
          {link.label}
        </button>
      );
    }
    return (
      <a key={link.key} href={link.href} onClick={() => { setMobileOpen(false); setMoreOpen(false); }} style={{ ...style, textDecoration: 'none' }} className="hover:opacity-70 transition-opacity">
        {link.label}
      </a>
    );
  };

  return (
    <>
      <nav style={navStyle}>
        {/* Couple names */}
        <button
          onClick={() => onNavigate('home')}
          style={{ ...navTextStyle, letterSpacing: '0.15em', flexShrink: 0, marginRight: 16 }}
          className="hover:opacity-70 transition-opacity text-left"
        >
          {weddingName}
        </button>

        {/* Desktop nav — bounded width regardless of how many pages are enabled */}
        <div className="hidden md:flex items-center" style={{ gap: 20, minWidth: 0 }}>
          {visibleLinks.map(link => renderLink(link))}

          {overflowLinks.length > 0 && (
            <div ref={moreRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setMoreOpen(o => !o)}
                style={{ ...navTextStyle, display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none' }}
              >
                More <ChevronDown size={12} style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {moreOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 10,
                  background: theme.navBg, border: `1px solid ${theme.accent}30`,
                  padding: '10px 0', minWidth: 160, display: 'flex', flexDirection: 'column', gap: 2,
                }}>
                  {overflowLinks.map(link => (
                    <div key={link.key} style={{ padding: '6px 16px' }}>
                      {renderLink(link, { forMobile: true })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden ml-auto"
          style={{ color: theme.darkText }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu — a plain scrollable vertical list already handles any
          number of pages cleanly, no overflow menu needed here. */}
      {mobileOpen && (
        <div
          style={{
            backgroundColor: theme.navBg,
            borderBottom: `1px solid ${theme.accent}20`,
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          {allLinks.map(link => renderLink(link, { forMobile: true }))}
        </div>
      )}
    </>
  );
}

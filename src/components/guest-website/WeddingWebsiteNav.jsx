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

export default function WeddingWebsiteNav({ weddingName, theme, typography, enabledPages, currentPage, weddingSlug, hasTransport, hasAccommodation, hasMusic, hasExperience, hasGoodToKnow, onNavigate }) {
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
    fontFamily: typography?.bodyFont || 'inherit'
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
    hasExperience && { key: 'experience', label: 'Experiences', href: `/w/${weddingSlug}/experience` },
    hasGoodToKnow && { key: 'good-to-know', label: 'Good to know', href: `/w/${weddingSlug}/good-to-know` },
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

  // D-3: RSVP goes LAST. It is the one thing a guest is asked to do, and it
  // read as just another page sitting fourth in a list of eight. Pulled out of
  // enabledPages order and appended rather than reordered in the data, so a
  // couple's own page order is untouched.
  const rsvpLink = pageLinks.find(l => l.key === 'rsvp');
  // THE RSVP IS PINNED AND NEVER ENTERS THE OVERFLOW.
  // It was already appended last so it would read as an action rather than
  // "just another page sitting fourth in a list of eight" — but appended last
  // is exactly what a tail-slice takes FIRST, so on any site with more than
  // five links the reply ended up behind "More", two taps deep on a 390 screen.
  // The intent and the mechanism were pulling opposite ways.
  // Overflow now takes from the other pages, in their existing order.
  // ONE ENTRY PER PAGE. The nav is assembled from TWO independent lists and
  // nothing reconciled them:
  //
  //   pageLinks — from the couple's enabledPages (WEDDING_PAGES)
  //   subLinks  — from hasTransport / hasAccommodation / hasMusic / hasExperience
  //
  // Four labels appear in both, identically: 'Music', 'Stay', 'Getting here'
  // and 'Experiences'. A couple who enabled those pages saw each of them twice
  // in their own guests' navigation.
  //
  // Deduped on the LABEL, not the key, because the label is what a guest reads
  // — and the worst case was not a repeated key at all: subLinks' 'accommodation'
  // and WEDDING_PAGES' 'stay' are different keys pointing at different routes
  // that render the SAME accommodation data under the same word. Keying on
  // `key` would have left that pair looking like two different places to go.
  //
  // pageLinks come first, so the couple's own page order wins the position.
  const seen = new Set();
  const rest = [...pageLinks.filter(l => l.key !== 'rsvp'), ...subLinks]
    .filter(l => {
      const label = (l.label || '').trim().toLowerCase();
      if (!label || seen.has(label)) return false;
      seen.add(label);
      return true;
    });
  const restSlots = MAX_VISIBLE_LINKS - (rsvpLink ? 1 : 0);
  const visibleLinks = [...rest.slice(0, restSlots), ...(rsvpLink ? [rsvpLink] : [])];
  const overflowLinks = rest.slice(restSlots);
  // The mobile drawer lists everything, so it takes the full ordered set —
  // pinned or not, nothing is hidden there.
  const allLinks = [...rest, ...(rsvpLink ? [rsvpLink] : [])];

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
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          // M-4: the glyph is 20px and the button was the glyph. This is the
          // ONLY navigation a guest has on a phone — a guest who cannot
          // reliably open it cannot reach the RSVP tab at all. The icon size
          // is unchanged; the target around it is now 44.
          style={{
            color: theme.darkText, minWidth: 44, minHeight: 44,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            margin: '-10px -10px -10px 0',
          }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu — a plain scrollable vertical list already handles any
          number of pages cleanly, no overflow menu needed here. */}
      {mobileOpen && (
        <div
          // P2b: FIXED, not in flow. The nav is position:sticky, so it is
          // visually pinned while its DOM position stays at the top of the
          // document. This panel was a flow sibling, so opening it from the
          // bottom of a long page rendered the menu thousands of pixels above
          // the viewport — the guest tapped, nothing appeared, and it read as
          // a dead control. Same family as the Copy links button that did
          // nothing: the user acts and nothing explains.
          // Fixed under the pinned nav means it opens where the guest is
          // looking, wherever they have scrolled to.
          style={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            zIndex: 49,
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

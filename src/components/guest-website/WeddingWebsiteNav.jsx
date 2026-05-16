import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { WEDDING_PAGES } from '@/lib/websiteThemes';

export default function WeddingWebsiteNav({ weddingName, theme, enabledPages, currentPage, weddingSlug, hasTransport, hasAccommodation, hasMusic, hasExperience, onNavigate }) {
   const [scrolled, setScrolled] = useState(false);
   const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const navTextStyle = {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: theme.darkText,
    cursor: 'pointer'
  };

  return (
    <>
      <nav style={navStyle}>
        {/* Couple names */}
        <button
          onClick={() => onNavigate('home')}
          style={{ ...navTextStyle, flex: 1 }}
          className="hover:opacity-70 transition-opacity text-left"
        >
          {weddingName}
        </button>

        {/* Desktop nav */}
         <div className="hidden md:flex items-center gap-8">
           {enabledPages.map(pageSlug => {
             const pageDef = WEDDING_PAGES.find(p => p.slug === pageSlug);
             const isActive = currentPage === pageSlug || (pageSlug === 'home' && !currentPage);
             return (
               <button
                 key={pageSlug}
                 onClick={() => onNavigate(pageSlug)}
                 style={{
                   ...navTextStyle,
                   borderBottom: isActive ? `2px solid ${theme.accent}` : '2px solid transparent',
                   paddingBottom: '2px',
                   transition: 'border-color 0.3s ease'
                 }}
               >
                 {pageDef?.label}
               </button>
             );
           })}

           {/* Sub-page links */}
           {hasTransport && (
             <a
               href={`/w/${weddingSlug}/transport`}
               style={{
                 ...navTextStyle,
                 borderBottom: '2px solid transparent',
                 paddingBottom: '2px',
                 transition: 'border-color 0.3s ease',
                 textDecoration: 'none'
               }}
               className="hover:opacity-70 transition-opacity"
             >
               Getting Here
             </a>
           )}
           {hasAccommodation && (
             <a
               href={`/w/${weddingSlug}/accommodation`}
               style={{
                 ...navTextStyle,
                 borderBottom: '2px solid transparent',
                 paddingBottom: '2px',
                 transition: 'border-color 0.3s ease',
                 textDecoration: 'none'
               }}
               className="hover:opacity-70 transition-opacity"
             >
               Stay
             </a>
           )}
           {hasMusic && (
             <a
               href={`/w/${weddingSlug}/music`}
               style={{
                 ...navTextStyle,
                 borderBottom: '2px solid transparent',
                 paddingBottom: '2px',
                 transition: 'border-color 0.3s ease',
                 textDecoration: 'none'
               }}
               className="hover:opacity-70 transition-opacity"
             >
               Music
             </a>
           )}
           {hasExperience && (
             <a
               href={`/w/${weddingSlug}/experience`}
               style={{
                 ...navTextStyle,
                 borderBottom: '2px solid transparent',
                 paddingBottom: '2px',
                 transition: 'border-color 0.3s ease',
                 textDecoration: 'none'
               }}
               className="hover:opacity-70 transition-opacity"
             >
               Guide
             </a>
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{
            backgroundColor: theme.navBg,
            borderBottom: `1px solid ${theme.accent}20`,
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {enabledPages.map(pageSlug => {
            const pageDef = WEDDING_PAGES.find(p => p.slug === pageSlug);
            const isActive = currentPage === pageSlug || (pageSlug === 'home' && !currentPage);
            return (
              <button
                key={pageSlug}
                onClick={() => {
                  onNavigate(pageSlug);
                  setMobileOpen(false);
                }}
                style={{
                  ...navTextStyle,
                  color: isActive ? theme.accent : theme.darkText,
                  textAlign: 'left',
                  paddingBottom: '8px',
                  borderBottom: isActive ? `2px solid ${theme.accent}` : 'none'
                }}
              >
                {pageDef?.label}
              </button>
            );
          })}

          {/* Sub-page links */}
          {hasTransport && (
            <a
              href={`/w/${weddingSlug}/transport`}
              onClick={() => setMobileOpen(false)}
              style={{
                ...navTextStyle,
                textAlign: 'left',
                paddingBottom: '8px',
                borderBottom: 'none',
                textDecoration: 'none'
              }}
            >
              Getting Here
            </a>
          )}
          {hasAccommodation && (
            <a
              href={`/w/${weddingSlug}/accommodation`}
              onClick={() => setMobileOpen(false)}
              style={{
                ...navTextStyle,
                textAlign: 'left',
                paddingBottom: '8px',
                borderBottom: 'none',
                textDecoration: 'none'
              }}
            >
              Stay
            </a>
          )}
          {hasMusic && (
            <a
              href={`/w/${weddingSlug}/music`}
              onClick={() => setMobileOpen(false)}
              style={{
                ...navTextStyle,
                textAlign: 'left',
                paddingBottom: '8px',
                borderBottom: 'none',
                textDecoration: 'none'
              }}
            >
              Music
            </a>
          )}
          {hasExperience && (
            <a
              href={`/w/${weddingSlug}/experience`}
              onClick={() => setMobileOpen(false)}
              style={{
                ...navTextStyle,
                textAlign: 'left',
                paddingBottom: '8px',
                borderBottom: 'none',
                textDecoration: 'none'
              }}
            >
              Guide
            </a>
          )}
        </div>
      )}
    </>
  );
}
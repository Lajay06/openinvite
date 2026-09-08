import React, { useState } from 'react';
import { Plus, LayoutDashboard, BookOpen, Star, Mail, MapPin, Gift, Music, Camera, HelpCircle, FileText, Heart, Sparkles, BarChart2 } from 'lucide-react';
import { WEDDING_PAGES } from '@/lib/websiteThemes';
import { interactiveDivProps } from '@/lib/a11y';
import NewPageModal from './NewPageModal';
import { ALWAYS_ON_PAGES } from '@/lib/guestPages';
import { EDITOR_TEMPLATES, isWritten } from '@/lib/emailTemplateStore';
import { orderedCustomPages } from '@/lib/customPages';

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

export default function WBLeftPanel({ details, onChange, currentPage, onPageChange, emailDraft, selectedEmail, onSelectEmail }) {
  const [showNewPage, setShowNewPage] = useState(false);
  const [hoveredPage, setHoveredPage] = useState(null);
  const [hoveredEmail, setHoveredEmail] = useState(null);
  const [hoverNewPage, setHoverNewPage] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(true);

  const enabledPages = details.enabledPages || ['home', 'our-story', 'celebration', 'rsvp'];
  // IN THE COUPLE'S ORDER, the same question the built-in rows ask.
  const customPages = orderedCustomPages(details);

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

  // ── REORDER ────────────────────────────────────────────────────────────
  //
  // Owner ruling on review, 2026-09-07: pages are reorderable, built-ins and
  // custom alike, and the order drives the tabs, the site navigation and the
  // published site.
  //
  // IT IS STORED IN `enabledPages`, WHICH IS ALREADY AN ARRAY. No new field,
  // no schema change: the order a couple drags into is the order of that list,
  // and WeddingWebsiteNav reads the same list. One source; nothing to keep in
  // step. A page that is switched OFF is not in enabledPages at all, so it
  // holds no position — which is correct: it is not on the site.
  //
  // HOME STAYS FIRST. It is the page a link opens on, and a site whose first
  // page is "Good to know" is a site with no front door. The drop handler
  // refuses index 0 rather than the row refusing to be picked up, so dragging
  // Home is possible and simply lands it back where it was — a control that
  // silently does nothing is worse than one that visibly returns.
  const [dragSlug, setDragSlug] = useState(null);
  const [dropSlug, setDropSlug] = useState(null);

  const orderedSlugs = enabledPages;

  const moveTo = (from, to) => {
    if (!from || from === to) return;
    const list = [...orderedSlugs];
    const i = list.indexOf(from);
    const j = list.indexOf(to);
    if (i === -1 || j === -1) return;
    list.splice(i, 1);
    list.splice(j, 0, from);
    // Home first, always.
    const home = list.indexOf('home');
    if (home > 0) { list.splice(home, 1); list.unshift('home'); }
    onChange('enabledPages', list);
  };

  /** The props every draggable page row shares. */
  const dragProps = (slug) => ({
    draggable: true,
    onDragStart: () => setDragSlug(slug),
    onDragEnd: () => { setDragSlug(null); setDropSlug(null); },
    onDragOver: (e) => { e.preventDefault(); if (dropSlug !== slug) setDropSlug(slug); },
    onDrop: (e) => { e.preventDefault(); moveTo(dragSlug, slug); setDragSlug(null); setDropSlug(null); },
    'aria-grabbed': dragSlug === slug ? 'true' : undefined,
  });

  /** A row being dragged over shows where it would land. */
  const dropStyle = (slug) => (dropSlug === slug && dragSlug && dragSlug !== slug
    ? { boxShadow: 'inset 0 2px 0 0 #E03553' }
    : null);

  const handleDeleteCustomPage = (e, slug) => {
    e.stopPropagation();
    onChange('customPages', customPages.filter(p => p.slug !== slug));
    onChange('enabledPages', enabledPages.filter(s => s !== slug));
    if (currentPage === slug) onPageChange('home');
  };

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
        {/* IN THE COUPLE'S ORDER. WEDDING_PAGES is the catalog of what exists;
            enabledPages is the order they arranged. Pages that are switched
            off keep the catalog's order, after the ones that are on — they
            have no position on a site they are not part of. */}
        {[...WEDDING_PAGES].sort((a, b) => {
          const ia = enabledPages.indexOf(a.slug);
          const ib = enabledPages.indexOf(b.slug);
          if (ia === -1 && ib === -1) return 0;
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        }).map(({ slug, label, icon }) => {
          const active = currentPage === slug;
          const enabled = enabledPages.includes(slug);
          const hovered = hoveredPage === slug;
          const clickable = enabled || slug === 'home';
          return (
            <div
              key={slug}
              onClick={() => { if (clickable) onPageChange(slug); }}
              {...interactiveDivProps(clickable ? () => onPageChange(slug) : null, { label })}
              {...(enabled ? dragProps(slug) : {})}
              onMouseEnter={() => { if (!active && clickable) setHoveredPage(slug); }}
              onMouseLeave={() => setHoveredPage(null)}
              style={{
                ...(dropStyle(slug) || {}),
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
                {...(enabledPages.includes(page.slug) ? dragProps(page.slug) : {})}
                onMouseEnter={() => { if (!active) setHoveredPage(page.slug); }}
                onMouseLeave={() => setHoveredPage(null)}
                style={{
                  ...(dropStyle(page.slug) || {}),
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 16px', cursor: 'pointer',
                  background: active ? 'rgba(255,255,255,0.06)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                  borderLeft: active ? '2px solid #E03553' : '2px solid transparent',
                  opacity: enabledPages.includes(page.slug) ? 1 : 0.4,
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
                {/* A CUSTOM PAGE TOGGLES LIKE ANY OTHER PAGE. Owner ruling
                    2026-09-07. It had a delete and nothing else, so the only
                    way to take one off the site was to destroy it — and the
                    row sat beside eleven built-ins that all toggle. Same
                    `enabledPages` list, same control. */}
                <Toggle enabled={enabledPages.includes(page.slug)} onToggle={() => toggle(page.slug)} label={page.name} />
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

      {/* ── Emails ──
          THE SAME KIND OF THING AS A PAGE, SO THE SAME ROW.

          Owner ruling 2026-09-08: the email list belongs in the left panel,
          under Pages and New page, below the divider. A left-panel row is
          what the builder means by "a thing the canvas can show" — the
          canvas follows the selection and the right panel edits it — and an
          email is exactly that. Putting it in the right panel made it look
          like a setting of the page you were on.

          Row vocabulary is the page row's, not a near-miss: 6px 16px padding,
          8px gap, a 13px icon in a flex-shrink-0 slot, a 12px/500 label, the
          same active fill and 2px accent left border, the same hover. If the
          page rows change, these follow, because they are the same values
          read off the same rules.

          THE UNIVERSE PILL IS GONE from this panel (same ruling). It was a
          link to /studio/universe wearing a readout; the universe is chosen
          in the Design tab's own Universe block, which carries the name and
          a Change button already. */}
      <Divider />
      <SLabel>Emails</SLabel>
      {EDITOR_TEMPLATES.flatMap(entry => entry.types.map(type => {
        // Thank you is two emails; each gets its own row rather than a
        // switch buried inside the panel, because the left panel is a list
        // of what the canvas can show and both of these are things it shows.
        const label = entry.types.length > 1
          ? `${entry.label} (${entry.typeLabels[type].toLowerCase()})`
          : entry.label;
        const active = selectedEmail?.type === type;
        const hovered = hoveredEmail === type;
        const select = () => onSelectEmail?.({ entryId: entry.id, type });
        return (
          <div
            key={type}
            onClick={select}
            {...interactiveDivProps(select, { label })}
            onMouseEnter={() => { if (!active) setHoveredEmail(type); }}
            onMouseLeave={() => setHoveredEmail(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', cursor: 'pointer',
              background: active ? 'rgba(255,255,255,0.06)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
              borderLeft: active ? '2px solid #E03553' : '2px solid transparent',
              transition: 'background 0.1s',
            }}
          >
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <Mail size={13} strokeWidth={1.5} color={active ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} fill="none" />
            </div>
            <span style={{
              flex: 1, fontSize: 12, fontWeight: 500, fontFamily: PJS,
              color: active || hovered ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{label}</span>
            {isWritten(emailDraft?.[type], type) && (
              <span
                title="You have edited this email"
                style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontFamily: PJS, letterSpacing: '0.04em', flexShrink: 0 }}
              >Edited</span>
            )}
          </div>
        );
      }))}

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

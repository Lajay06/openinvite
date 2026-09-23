import React, { useState } from 'react';
import { Plus, LayoutDashboard, BookOpen, Star, Mail, MapPin, Gift, Music, Camera, HelpCircle, FileText, Heart, Sparkles, BarChart2 } from 'lucide-react';
import { WEDDING_PAGES } from '@/lib/websiteThemes';
import { interactiveDivProps } from '@/lib/a11y';
import NewPageModal from './NewPageModal';
import { ALWAYS_ON_PAGES } from '@/lib/guestPages';
import { EDITOR_TEMPLATES, isWritten } from '@/lib/emailTemplateStore';
import { orderedCustomPages } from '@/lib/customPages';
import PillSwitch from './PillSwitch';

const PJS = "'Plus Jakarta Sans', sans-serif";


const PAGE_ICONS = {
  LayoutDashboard, BookOpen, Star, Mail, MapPin, Gift, Music, Camera, HelpCircle, FileText, Sparkles, BarChart2, Heart,
};

function PageIcon({ name, active }) {
  const Icon = PAGE_ICONS[name] || FileText;
  return <Icon size={13} strokeWidth={1.5} color={active ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} fill="none" />;
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
    const turningOff = enabledPages.includes(slug);
    const next = turningOff
      ? enabledPages.filter(p => p !== slug)
      : [...enabledPages, slug];
    onChange('enabledPages', next);

    // TURNING THE EXPERIENCE PAGE OFF ALSO CLEARS THE LEGACY PUBLISH FLAG.
    //
    // The guest site decides a page is available with an OR:
    // enabledPages.includes(page) || subPageAvailability[page] === true, and
    // for 'experience' that second term is experienceGuide.published — the
    // flag the retired Publish tab used to set. Without this line a couple
    // who had published the guide could switch the page off here and it would
    // stay up, because the old flag outvotes the new control. Nothing writes
    // the flag any more, so this only ever has to run down, never up.
    if (turningOff && slug === 'experience' && details.experienceGuide?.published) {
      onChange('experienceGuide', { ...details.experienceGuide, published: false });
    }
  };

  // ── ONE LIST, BECAUSE THE COUPLE ARRANGED ONE LIST ─────────────────────
  //
  // Owner report, Run 5 T1: a new page "cannot be dragged into the main page
  // list". It could not. The built-ins rendered from WEDDING_PAGES and the
  // couple's own pages rendered in a separate section under a "Custom"
  // divider, so a custom page could never sit BETWEEN two built-ins no matter
  // what the drag wrote. Both halves were draggable and both wrote
  // `enabledPages`, which is why the order persisted and the page still
  // appeared at the bottom — the row was draggable; the list was not one list.
  //
  // `enabledPages` was always the single order. This renders it.
  const pageRows = (() => {
    const custom = new Map(customPages.map(p => [p.slug, p]));
    const builtIn = new Map(WEDDING_PAGES.map(p => [p.slug, p]));
    const rows = [];
    // The couple's order first, whatever kind each row is.
    for (const slug of enabledPages) {
      if (builtIn.has(slug)) rows.push({ ...builtIn.get(slug), isCustom: false });
      else if (custom.has(slug)) { const c = custom.get(slug); rows.push({ slug, label: c.name, icon: 'FileText', isCustom: true }); }
      // A slug in enabledPages that is neither is a retired page (Guestbook);
      // it has no row, exactly as it has no nav link.
    }
    // Then everything switched off, in catalog order — a page that is not on
    // the site has no position on it.
    for (const p of WEDDING_PAGES) if (!enabledPages.includes(p.slug)) rows.push({ ...p, isCustom: false });
    for (const c of customPages) if (!enabledPages.includes(c.slug)) rows.push({ slug: c.slug, label: c.name, icon: 'FileText', isCustom: true });
    return rows;
  })();

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
        {/* IN THE COUPLE'S ORDER, ALL OF THEM. `pageRows` above is the one
            list: built-ins and the couple's own pages interleaved exactly as
            `enabledPages` has them, with everything switched off after. */}
        {pageRows.map(({ slug, label, icon, isCustom }) => {
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

              {/* ONLY A PAGE THE COUPLE MADE CAN BE DELETED. A built-in is
                  switched off, never destroyed — there is nothing to recover
                  it from.

                  IT SITS BEFORE THE TOGGLE, and that is the whole of this fix
                  (owner screenshot, Run 5 T18). The × used to follow the
                  toggle, so on a custom page's row the toggle was pushed one
                  control-width left of every other row's and the column of
                  switches had a step in it. The toggle is the control a couple
                  reads down the list; it holds the right edge, and the delete
                  takes the space beside it. */}
              {isCustom && (
                <button
                  onClick={e => handleDeleteCustomPage(e, slug)}
                  aria-label={`Delete ${label}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: hovered || active ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                  title="Delete page"
                >×</button>
              )}

              {/* THE LAST THING IN EVERY ROW, so every toggle shares one right
                  edge. `data-page-toggle` is the name the guard measures them
                  by — without it "the column is straight" can only be asked of
                  geometry that happens to be nearby. */}
              <div data-page-toggle style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {!ALWAYS_ON_PAGES.includes(slug) ? (
                  <PillSwitch enabled={enabled} onToggle={() => toggle(slug)} label={label} />
                ) : (
                  // Not "Req". An abbreviation of a word the couple never used
                  // is not an explanation, and a dead toggle would be worse.
                  <span
                    title="Your guests need to find the date and a way to reply."
                    style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontFamily: PJS, letterSpacing: '0.04em' }}
                  >Always on</span>
                )}
              </div>
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

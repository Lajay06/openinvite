/**
 * src/components/professional/ProPage.jsx
 *
 * One page frame for every Professional screen: the page header, an optional
 * actions row, then the content on the #F5F5F5 work area. And the one empty
 * state, which may carry a photograph from the owned set.
 *
 * THE HEADER IS DashboardPageHeader'S, MINUS THE COUPLE'S TOUR (owner ruling
 * 2026-10-14). DashboardPageHeader always renders WhatsHereControl, the
 * couple app's guided tour, which has no chapter for a planner and no way to
 * be switched off per page. Rather than change that shared couple file, the
 * Professional header repeats DashboardPageHeader's spec exactly (DESIGN_SPEC,
 * DashboardPageHeader: padding 10px, 18px 600 title, 12px muted subtitle
 * inline, the 0.12 bottom border) and leaves the tour out. This departs from
 * the CLAUDE.md line "every dashboard page must use DashboardPageHeader", by
 * the owner's ruling for Professional only; the couple app keeps its tour.
 */
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { PRO, s } from './proTheme';
import { TYPE } from '@/styles/typeScale';

/** DashboardPageHeader's layout and type, with no tour control. */
export function ProPageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 md:px-8" style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.12)', paddingTop: 10, paddingBottom: 10 }}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
        <h1 style={{ fontSize: 18, fontWeight: 600, color: PRO.text, margin: 0, overflowWrap: 'anywhere' }}>{title}</h1>
        {subtitle && <span style={{ fontSize: TYPE.secondary, color: PRO.muted, minWidth: 0 }}>{subtitle}</span>}
      </div>
      {actions && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div>}
    </div>
  );
}

export function ProPage({ title, subtitle, actions, children, toolbar = null }) {
  const mobile = useIsMobile();
  return (
    <div>
      <ProPageHeader title={title} subtitle={subtitle} actions={mobile ? null : actions} />
      {mobile && actions && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 16px', background: '#FFFFFF', borderBottom: `1px solid ${PRO.border}` }}>{actions}</div>
      )}
      {toolbar}
      <div style={mobile ? s.contentNarrow : s.content}>{children}</div>
    </div>
  );
}

export function ProEmpty({ title, line, action = null, photo = null }) {
  return (
    <div style={{ ...s.card, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: 28 }}>
      {photo && <img src={photo} alt="" style={{ width: '100%', maxWidth: 420, aspectRatio: '3 / 2', objectFit: 'cover', display: 'block', marginBottom: 6 }} />}
      <h2 style={{ fontSize: TYPE.input, fontWeight: 600, margin: 0, color: PRO.text }}>{title}</h2>
      {line && <p style={{ ...s.secondary, margin: 0, maxWidth: 520, lineHeight: 1.5 }}>{line}</p>}
      {action}
    </div>
  );
}

export function Stat({ label, value, sub }) {
  return (
    <div style={{ flex: '1 1 140px', padding: '16px 20px', background: '#FFFFFF', border: `1px solid ${PRO.border}`, minWidth: 0 }}>
      <div style={s.label}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: PRO.text }}>{value}</div>
      {sub && <div style={{ ...s.secondary, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Pill({ tone = 'plain', children }) {
  const tones = { good: ['#dcfce7', '#166534'], wait: ['#fef9c3', '#854d0e'], bad: ['#fee2e2', '#991b1b'], plain: ['rgba(10,10,10,0.06)', PRO.text] };
  const [bg, fg] = tones[tone] || tones.plain;
  return <span style={{ ...s.pill, background: bg, color: fg }}>{children}</span>;
}

/**
 * A dense table: 40px rows, sticky header. A column with `wrap: true` lets its
 * cell take a second line (the row grows past 40px) instead of widening the
 * table, so the table fits its box.
 */
export function ProTable({ columns, rows, empty = 'Nothing here yet.', onRowClick, rowKey = (r) => r.id, label }) {
  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${PRO.border}`, overflow: 'auto', maxWidth: '100%' }}>
      <table aria-label={label} style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} style={{ ...s.th, textAlign: c.align || 'left', width: c.width }}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} style={{ ...s.td, color: PRO.muted }}>{empty}</td></tr>
          )}
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r); } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((c) => <td key={c.key} style={{ ...s.td, textAlign: c.align || 'left', ...(c.wrap ? { whiteSpace: 'normal', overflowWrap: 'break-word', paddingTop: 8, paddingBottom: 8, lineHeight: 1.35 } : {}) }}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A labeled underline field. */
export function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={s.label}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: TYPE.secondary, color: PRO.placeholder }}>{hint}</span>}
    </label>
  );
}

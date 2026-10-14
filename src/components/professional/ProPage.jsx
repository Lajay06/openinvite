/**
 * src/components/professional/ProPage.jsx
 *
 * One page frame for every Professional screen: DashboardPageHeader (the rule
 * for every dashboard page), an optional actions row, then the content on the
 * #F5F5F5 work area. And the one empty state, which may carry a photograph
 * from the owned set.
 */
import React from 'react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { PRO, s } from './proTheme';
import { TYPE } from '@/styles/typeScale';

export function ProPage({ title, subtitle, actions, children, toolbar = null }) {
  const mobile = useIsMobile();
  return (
    <div>
      <DashboardPageHeader title={title} subtitle={subtitle} actions={mobile ? null : actions} />
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

/** A dense table: 40px rows, sticky header, horizontal scroll inside its own box at 390. */
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
              {columns.map((c) => <td key={c.key} style={{ ...s.td, textAlign: c.align || 'left' }}>{c.render ? c.render(r) : r[c.key]}</td>)}
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

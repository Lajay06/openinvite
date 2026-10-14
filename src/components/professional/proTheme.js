/**
 * src/components/professional/proTheme.js
 *
 * THE PROFESSIONAL WORKPLACE LOOK, IN ONE PLACE. goals/2026-10-14-professional.md,
 * Look and feel: black bars, a #F5F5F5 work area with white cards, Plus
 * Jakarta Sans, red for actions only, dense 40px table rows with sticky
 * headers. Sizes come from the type scale; nothing is tracked, nothing is
 * lighter than 400, cards are square with no shadow.
 */
import { TYPE } from '@/styles/typeScale';
import { color } from '@/styles/tokens';

export const PJS = "'Plus Jakarta Sans', sans-serif";

export const PRO = {
  bar: color.black,
  work: color.bgSubtle,
  card: color.white,
  red: color.red,
  text: color.black,
  muted: color.textMuted,
  placeholder: color.textPlaceholder,
  icon: color.iconMuted,
  border: 'rgba(10,10,10,0.08)',
  borderStrong: color.border,
  onDark: color.white,
  onDarkMuted: 'rgba(255,255,255,0.7)',
  onDarkLine: 'rgba(255,255,255,0.12)',
  rowHeight: 40,
  barHeight: 48,
  sideWidth: 200,
};

/** Status pills, DESIGN_SPEC Badges. */
export const PILL = {
  good: { background: '#dcfce7', color: '#166534' },
  wait: { background: '#fef9c3', color: '#854d0e' },
  bad: { background: '#fee2e2', color: '#991b1b' },
  plain: { background: 'rgba(10,10,10,0.06)', color: color.black },
};

export const s = {
  card: { background: PRO.card, border: `1px solid ${PRO.border}`, padding: 20 },
  cardTitle: { fontSize: TYPE.body, fontWeight: 600, color: PRO.text, margin: 0 },
  label: { fontSize: TYPE.label, fontWeight: 600, color: PRO.muted },
  body: { fontSize: TYPE.body, color: PRO.text },
  secondary: { fontSize: TYPE.secondary, color: PRO.muted },
  pill: { display: 'inline-block', borderRadius: 999, fontSize: TYPE.rowPill, fontWeight: 600, padding: '2px 7px', whiteSpace: 'nowrap' },
  btnPrimary: { background: PRO.red, color: '#FFFFFF', border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: TYPE.button, fontWeight: 600, cursor: 'pointer', fontFamily: PJS, whiteSpace: 'nowrap' },
  btnSecondary: { background: 'rgba(10,10,10,0.08)', color: PRO.text, border: '1px solid rgba(10,10,10,0.12)', borderRadius: 999, padding: '6px 14px', fontSize: TYPE.button, fontWeight: 600, cursor: 'pointer', fontFamily: PJS, whiteSpace: 'nowrap' },
  btnQuiet: { background: 'transparent', color: PRO.text, border: 'none', padding: '6px 8px', fontSize: TYPE.button, fontWeight: 600, cursor: 'pointer', fontFamily: PJS },
  input: { border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)', background: 'transparent', fontSize: TYPE.input, color: PRO.text, padding: '6px 0', outline: 'none', fontFamily: PJS, width: '100%', borderRadius: 0 },
  th: { position: 'sticky', top: 0, background: '#FAFAFA', zIndex: 1, textAlign: 'left', fontSize: TYPE.label, fontWeight: 600, color: PRO.muted, padding: '0 12px', height: 32, borderBottom: `1px solid ${PRO.border}`, whiteSpace: 'nowrap' },
  td: { fontSize: TYPE.body, color: PRO.text, padding: '0 12px', height: PRO.rowHeight, borderBottom: `1px solid ${PRO.border}`, whiteSpace: 'nowrap' },
  content: { padding: '24px 32px 48px' },
  contentNarrow: { padding: '16px 16px 40px' },
};

export const MOBILE_MAX = 767;

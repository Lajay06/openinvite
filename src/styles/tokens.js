/**
 * Design tokens — single source of truth for the OpenInvite design system.
 * Import and use these in components instead of hard-coding values.
 *
 * Usage:
 *   import { color, font, radius, shadow } from '@/styles/tokens';
 *   style={{ color: color.black, fontFamily: font.family }}
 */

export const color = {
  red:    '#E03553',
  purple: '#803D81',
  lime:   '#DDF762',
  navy:   '#0A1930',
  black:  '#0A0A0A',
  white:  '#FFFFFF',

  // Semantic aliases
  primary:   '#E03553',
  bg:        '#FFFFFF',
  bgSubtle:  '#F5F5F5',
  bgDark:    '#0A0A0A',

  // Text
  textPrimary:     '#0A0A0A',
  textSecondary:   '#444444',
  textMuted:       'rgba(10,10,10,0.4)',
  textOnDark:      '#FFFFFF',
  textOnDarkMuted: 'rgba(255,255,255,0.4)',
  textPlaceholder: 'rgba(10,10,10,0.4)',

  // Borders
  border:       'rgba(10,10,10,0.08)',
  borderStrong: 'rgba(10,10,10,0.18)',
  borderDark:   '#222222',

  // Gradients (as strings for inline use)
  gradient: 'linear-gradient(135deg, #E03553 0%, #803D81 100%)',
};

export const font = {
  family: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  weight: {
    light:    300,
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
    extrabold: 800,
  },
};

export const radius = {
  none:   0,
  pill:   999,
  // Never use anything else on containers
};

export const spacing = {
  pageH:     '32px 32px 48px',
  sectionV:  '120px',
  cardPad:   '24px',
  cardPadLg: '32px',
};

export const shadow = {
  card:  '0 4px 16px rgba(0,0,0,0.06)',
  modal: '0 24px 80px rgba(0,0,0,0.16)',
  float: '0 8px 32px rgba(0,0,0,0.12)',
};

/** Label style object — paste into `style={{...labelStyle}}` */
export const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: color.textMuted,
  fontFamily: font.family,
};

/** Sub-header (dashboard page title bar) */
export const subheaderStyle = {
  height: 48,
  background: color.white,
  borderBottom: `1px solid ${color.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/** Descriptor strip (below sub-header) */
export const descriptorStyle = {
  background: color.bgSubtle,
  padding: '12px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

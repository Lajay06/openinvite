/**
 * OpenInvite Design System Reference
 * This file documents the canonical design tokens for the platform
 * Use these values across all UI components (excluding wedding website guest pages)
 */

export const BRAND_COLOURS = {
  // Primary
  black: '#0A0A0A',
  white: '#FFFFFF',
  
  // Accent
  red: '#E03553',
  purple: '#803D81',
  gradient: 'linear-gradient(135deg, #E03553, #803D81)',
  
  // Secondary accent
  lime: '#DDF762',
  navy: '#0A1930',
  green: '#22C55E',
  
  // Neutrals
  border: '#EEEEEE',
  borderDark: 'rgba(255,255,255,0.08)',
  surface: '#FAFAFA',
  
  // Text
  textPrimary: '#0A0A0A',
  textSecondary: '#444444',
  textMuted: '#666666',
  textLabel: '#555555',
  textDarkPrimary: '#FFFFFF',
  textDarkSecondary: 'rgba(255,255,255,0.75)',
  textDarkMuted: 'rgba(255,255,255,0.5)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 64,
  page: 80,
};

export const BUTTONS = {
  primary: {
    padding: '12px 24px',
    background: '#0A0A0A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    minHeight: 44,
  },
  secondary: {
    padding: '12px 24px',
    background: 'transparent',
    color: '#0A0A0A',
    border: '1px solid #0A0A0A',
    borderRadius: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    minHeight: 44,
  },
  accent: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #E03553, #803D81)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    minHeight: 44,
  },
};

export const CARDS = {
  border: '1px solid #EEEEEE',
  borderRadius: 0,
  background: '#FFFFFF',
  padding: '20px 24px',
};

export const INPUTS = {
  border: 'none',
  borderBottom: '1px solid #DDDDDD',
  background: 'transparent',
  padding: '10px 0',
  fontSize: 14,
  fontWeight: 400,
  color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s ease',
};

export const LABELS = {
  fontSize: 11,
  fontWeight: 600,
  color: '#555555',
  letterSpacing: '0.2em',
  marginBottom: 8,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export const SPINNER = {
  width: 20,
  height: 20,
  border: '2px solid #EEEEEE',
  borderTopColor: '#0A0A0A',
  borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
};

export const MODALS = {
  background: '#FFFFFF',
  borderRadius: 0,
  border: 'none',
  boxShadow: '0 24px 80px rgba(0,0,0,0.15)',
  maxWidth: 560,
};
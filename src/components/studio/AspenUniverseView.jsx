import React from 'react';
import UniverseViewBase from './UniverseViewBase';

const CONFIG = {
  id: 'aspen',
  name: 'ASPEN',
  tagline: 'Black tie winter',
  bg: '#F8F8F6',
  primary: '#1A1A1A',
  accent: '#2D5A27',
  fontDisplay: 'Cormorant Garamond, serif',
  fontDisplayName: 'Cormorant Garamond',
  fontBody: 'Plus Jakarta Sans, sans-serif',
  philosophyHeadline: 'The mountain holds its breath.',
  philosophyCopy: 'The Aspen universe was designed for winter weddings where the fireplace is warm and the champagne is cold. Cozy grandeur, forest green, and the romance of snowfall through tall windows.',
  heroCopy: 'Cozy luxury. Black tie winter romance.',
  palette: [
    { color: '#F8F8F6', label: 'Snow' },
    { color: '#C8C8C0', label: 'Ice' },
    { color: '#2D5A27', label: 'Pine' },
    { color: '#1A1A1A', label: 'Midnight' },
  ],
  heroImage: 'https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg',
  moodImages: [
    'https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg',
  ],
  moodQuote: 'Some love stories belong to winter.',
};

export default function AspenUniverseView(props) {
  return <UniverseViewBase {...props} config={CONFIG} />;
}

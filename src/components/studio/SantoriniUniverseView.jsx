import React from 'react';
import UniverseViewBase from './UniverseViewBase';

const CONFIG = {
  id: 'santorini',
  name: 'SANTORINI',
  tagline: 'Aegean sculptural',
  bg: '#FAFCFF',
  primary: '#0A2540',
  accent: '#4A90D9',
  fontDisplay: 'Cormorant Garamond, serif',
  fontDisplayName: 'Cormorant Garamond',
  fontBody: 'Plus Jakarta Sans, sans-serif',
  philosophyHeadline: 'Whitewashed walls. Infinite horizon.',
  philosophyCopy: 'The Santorini universe was designed for couples who are drawn to light, space, and the clean geometry of a Cycladic village. Every detail is crisp, architectural, and endlessly blue.',
  heroCopy: 'Sculptural, crisp, modern coastal elegance.',
  palette: [
    { color: '#FAFCFF', label: 'Limestone' },
    { color: '#B8D4EE', label: 'Aegean' },
    { color: '#4A90D9', label: 'Cobalt' },
    { color: '#0A2540', label: 'Midnight sea' },
  ],
  heroImage: 'https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg',
  moodImages: [
    'https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg',
  ],
  moodQuote: 'The sea always brings me back to you.',
};

export default function SantoriniUniverseView(props) {
  return <UniverseViewBase {...props} config={CONFIG} />;
}

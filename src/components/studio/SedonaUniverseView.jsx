import React from 'react';
import UniverseViewBase from './UniverseViewBase';

const CONFIG = {
  id: 'sedona',
  name: 'SEDONA',
  tagline: 'Red rock ritual',
  bg: '#F2EAE0',
  primary: '#3D2415',
  accent: '#C4783A',
  fontDisplay: 'Playfair Display, serif',
  fontDisplayName: 'Playfair Display',
  fontBody: 'Plus Jakarta Sans, sans-serif',
  philosophyHeadline: 'Grounded in something ancient.',
  philosophyCopy: 'The Sedona universe was designed for couples who feel most themselves beneath an open sky. Red rock formations, desert sage, and the sacred silence of the American Southwest.',
  heroCopy: 'Earthy, intimate, spiritual luxury.',
  palette: [
    { color: '#F2EAE0', label: 'Adobe' },
    { color: '#C4783A', label: 'Rust' },
    { color: '#8B4513', label: 'Mesa' },
    { color: '#3D2415', label: 'Canyon' },
  ],
  heroImage: 'https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg',
  moodImages: [
    'https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg',
  ],
  moodQuote: 'Where the desert teaches stillness, and two become one.',
};

export default function SedonaUniverseView(props) {
  return <UniverseViewBase {...props} config={CONFIG} />;
}

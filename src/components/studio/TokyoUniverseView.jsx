import React from 'react';
import UniverseViewBase from './UniverseViewBase';

const CONFIG = {
  id: 'tokyo',
  name: 'TOKYO',
  tagline: 'Editorial nightlife',
  bg: '#0A0A0A',
  primary: '#FFFFFF',
  accent: '#B8FF00',
  fontDisplay: 'Cormorant Garamond, serif',
  fontDisplayName: 'Cormorant Garamond',
  fontBody: 'Plus Jakarta Sans, sans-serif',
  philosophyHeadline: 'Where precision becomes desire.',
  philosophyCopy: 'The Tokyo universe was designed for couples who live after midnight. Sharp contrasts, neon accents, and the quiet confidence of a city that never sleeps — made for modern luxury.',
  heroCopy: 'Editorial nightlife. Modern luxury, elevated tech.',
  palette: [
    { color: '#0A0A0A', label: 'Obsidian' },
    { color: '#1C1C1C', label: 'Carbon' },
    { color: '#C0C0C0', label: 'Silver' },
    { color: '#B8FF00', label: 'Neon' },
  ],
  heroImage: 'https://static.wixstatic.com/media/d2df22_f0eef5788fdd4876a0a300e43228f919~mv2.jpg',
  moodImages: [
    'https://static.wixstatic.com/media/d2df22_f0eef5788fdd4876a0a300e43228f919~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg',
  ],
  moodQuote: 'For those who see beauty in precision.',
};

export default function TokyoUniverseView(props) {
  return <UniverseViewBase {...props} config={CONFIG} />;
}

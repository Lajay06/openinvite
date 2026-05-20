import React from 'react';
import UniverseViewBase from './UniverseViewBase';

const CONFIG = {
  id: 'paris',
  name: 'PARIS',
  tagline: 'Haussmann romance',
  bg: '#FAF7F2',
  primary: '#1A1A2E',
  accent: '#C9A96E',
  fontDisplay: 'Cormorant Garamond, serif',
  fontDisplayName: 'Cormorant Garamond',
  fontBody: 'Plus Jakarta Sans, sans-serif',
  philosophyHeadline: 'Grand. Timeless. Uncompromisingly elegant.',
  philosophyCopy: 'The Paris universe was designed for couples who believe in forever. Inspired by Haussmann boulevards, champagne receptions, and the kind of elegance that never goes out of fashion.',
  heroCopy: 'Chic, timeless, understated luxury.',
  palette: [
    { color: '#FAF7F2', label: 'Crème' },
    { color: '#C9A96E', label: 'Champagne' },
    { color: '#8C7B6B', label: 'Taupe' },
    { color: '#1A1A2E', label: 'Minuit' },
  ],
  heroImage: 'https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg',
  moodImages: [
    'https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg',
  ],
  moodQuote: 'Love, like Paris, is always worth it.',
};

export default function ParisUniverseView(props) {
  return <UniverseViewBase {...props} config={CONFIG} />;
}

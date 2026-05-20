import React from 'react';
import UniverseViewBase from './UniverseViewBase';

const CONFIG = {
  id: 'capri',
  name: 'CAPRI',
  tagline: 'Italian coast',
  bg: '#FEFBF3',
  primary: '#1B3A6B',
  accent: '#E8C547',
  fontDisplay: 'Playfair Display, serif',
  fontDisplayName: 'Playfair Display',
  fontBody: 'Plus Jakarta Sans, sans-serif',
  philosophyHeadline: 'La dolce vita. Forever yours.',
  philosophyCopy: 'The Capri universe captures the intoxicating joy of the Italian coast — lemon groves, cerulean sea, and an endless golden afternoon. For couples who celebrate life as art.',
  heroCopy: 'Joyful luxury. Coastal summer, effortless glamour.',
  palette: [
    { color: '#FEFBF3', label: 'Limoncello' },
    { color: '#7BA7C2', label: 'Azzurro' },
    { color: '#E8C547', label: 'Giallo' },
    { color: '#1B3A6B', label: 'Cobalto' },
  ],
  heroImage: 'https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg',
  moodImages: [
    'https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg',
  ],
  moodQuote: 'Every love story deserves a golden afternoon.',
};

export default function CapriUniverseView(props) {
  return <UniverseViewBase {...props} config={CONFIG} />;
}

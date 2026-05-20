import React from 'react';
import UniverseViewBase from './UniverseViewBase';

const CONFIG = {
  id: 'amalfi',
  name: 'AMALFI',
  tagline: 'Sun-drenched coast',
  bg: '#FEFDF9',
  primary: '#1B4B6B',
  accent: '#E8A040',
  fontDisplay: 'Playfair Display, serif',
  fontDisplayName: 'Playfair Display',
  fontBody: 'Plus Jakarta Sans, sans-serif',
  philosophyHeadline: 'Where cliffs meet the sea, and love ignites.',
  philosophyCopy: 'The Amalfi universe was designed for couples who dream in colour. Terracotta rooftops, turquoise water, and the warmth of an Italian sun — translated into every invitation and detail.',
  heroCopy: 'Sun-drenched, luxurious, vibrant.',
  palette: [
    { color: '#FEFDF9', label: 'Linen' },
    { color: '#E8A040', label: 'Citrus' },
    { color: '#2E8B8B', label: 'Teal' },
    { color: '#1B4B6B', label: 'Adriatico' },
  ],
  heroImage: 'https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg',
  moodImages: [
    'https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg',
  ],
  moodQuote: 'Life is brighter when you are beside me.',
};

export default function AmalfiUniverseView(props) {
  return <UniverseViewBase {...props} config={CONFIG} />;
}

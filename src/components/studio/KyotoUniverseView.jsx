import React from 'react';
import UniverseViewBase from './UniverseViewBase';

const CONFIG = {
  id: 'kyoto',
  name: 'KYOTO',
  tagline: 'Zen & ceremony',
  bg: '#F5F2ED',
  primary: '#1A1A1A',
  accent: '#6B6B5A',
  fontDisplay: 'Cormorant Garamond, serif',
  fontDisplayName: 'Cormorant Garamond',
  fontBody: 'Plus Jakarta Sans, sans-serif',
  philosophyHeadline: 'Ancient ritual. Modern refinement.',
  philosophyCopy: 'The Kyoto universe honours the Japanese philosophy of ma — the beauty of negative space. Designed for couples who believe that restraint is the highest form of elegance.',
  heroCopy: 'Elegant restraint. Balance, calm sophistication.',
  palette: [
    { color: '#F5F2ED', label: 'Rice paper' },
    { color: '#C8BFB0', label: 'Washi' },
    { color: '#6B6B5A', label: 'Moss' },
    { color: '#1A1A1A', label: 'Ink' },
  ],
  heroImage: 'https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg',
  moodImages: [
    'https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg',
  ],
  moodQuote: 'In simplicity, all things are found.',
};

export default function KyotoUniverseView(props) {
  return <UniverseViewBase {...props} config={CONFIG} />;
}

import React from 'react';
import UniverseViewBase from './UniverseViewBase';

const CONFIG = {
  id: 'tulum',
  name: 'TULUM',
  tagline: 'Barefoot luxury',
  bg: '#F5ECD7',
  primary: '#3D2B1F',
  accent: '#D4845A',
  fontDisplay: 'Cormorant Garamond, serif',
  fontDisplayName: 'Cormorant Garamond',
  fontBody: 'Plus Jakarta Sans, sans-serif',
  philosophyHeadline: 'Where the earth meets celebration.',
  philosophyCopy: 'The Tulum universe was designed for couples drawn to warmth, texture, and the golden hour. Every piece carries the weight of sun-bleached linen and terracotta earth.',
  heroCopy: 'Barefoot luxury. Earthy, editorial, sunset energy.',
  palette: [
    { color: '#F5ECD7', label: 'Sand' },
    { color: '#D4845A', label: 'Clay' },
    { color: '#8B7355', label: 'Olive' },
    { color: '#3D2B1F', label: 'Terracotta' },
  ],
  heroImage: 'https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg',
  moodImages: [
    'https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_e30eff6d03424dd6baf63143722b2a3d~mv2.jpg',
  ],
  moodQuote: 'For those who celebrate with bare feet and an open heart.',
};

export default function TulumUniverseView(props) {
  return <UniverseViewBase {...props} config={CONFIG} />;
}

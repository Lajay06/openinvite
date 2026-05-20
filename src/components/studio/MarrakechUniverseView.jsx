import React from 'react';
import UniverseViewBase from './UniverseViewBase';

const CONFIG = {
  id: 'marrakech',
  name: 'MARRAKECH',
  tagline: 'Spice & gold',
  bg: '#F2E8D9',
  primary: '#2C1810',
  accent: '#C9A96E',
  fontDisplay: 'Playfair Display, serif',
  fontDisplayName: 'Playfair Display',
  fontBody: 'Plus Jakarta Sans, sans-serif',
  philosophyHeadline: 'Sensory richness. Cultural depth.',
  philosophyCopy: 'The Marrakech universe layers warmth upon warmth — saffron walls, candlelight, the scent of rose and cedar. For couples who believe a wedding should envelop all the senses.',
  heroCopy: 'Intimate, layered, atmospheric, luxurious.',
  palette: [
    { color: '#F2E8D9', label: 'Riad' },
    { color: '#C9A96E', label: 'Saffron' },
    { color: '#8B2635', label: 'Pomegranate' },
    { color: '#2C1810', label: 'Cedar' },
  ],
  heroImage: 'https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg',
  moodImages: [
    'https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg',
    'https://static.wixstatic.com/media/d2df22_e30eff6d03424dd6baf63143722b2a3d~mv2.jpg',
  ],
  moodQuote: 'Let the night be long and the table full.',
};

export default function MarrakechUniverseView(props) {
  return <UniverseViewBase {...props} config={CONFIG} />;
}

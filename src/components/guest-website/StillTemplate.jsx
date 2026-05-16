import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import HeroSection from './sections/HeroSection';
import WelcomeSection from './sections/WelcomeSection';
import CelebrationSection from './sections/CelebrationSection';
import OurStorySection from './sections/OurStorySection';
import RSVPSection from './sections/RSVPSection';
import TravelSection from './sections/TravelSection';
import MusicSection from './sections/MusicSection';
import FooterSection from './sections/FooterSection';

export default function StillTemplate({ wedding }) {
  const [guestData, setGuestData] = useState(null);

  useEffect(() => {
    // Load guest-related data if needed
    const loadData = async () => {
      try {
        // This will be populated dynamically as guests interact
      } catch (err) {
        console.error('Error loading guest data:', err);
      }
    };
    
    loadData();
  }, [wedding.id]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');
        
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scrollCue {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .fade-in-up {
          opacity: 0;
          transform: translateY(16px);
          animation: fadeInUp 1.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }
        
        .stagger-1 { animation-delay: 0s; }
        .stagger-2 { animation-delay: 0.3s; }
        .stagger-3 { animation-delay: 0.6s; }
        .stagger-4 { animation-delay: 0.9s; }
        
        body { background: #0A0A0A; margin: 0; }
      `}</style>

      <HeroSection wedding={wedding} />
      <WelcomeSection wedding={wedding} />
      <CelebrationSection wedding={wedding} />
      <OurStorySection wedding={wedding} />
      <RSVPSection wedding={wedding} />
      <TravelSection wedding={wedding} />
      <MusicSection wedding={wedding} />
      <FooterSection wedding={wedding} />
    </>
  );
}
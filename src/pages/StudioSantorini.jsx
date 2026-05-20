import React from 'react';
import { useNavigate } from 'react-router-dom';
import SantoriniUniverseView from '@/components/studio/SantoriniUniverseView';

export default function StudioSantorini() {
  const navigate = useNavigate();
  return (
    <SantoriniUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}

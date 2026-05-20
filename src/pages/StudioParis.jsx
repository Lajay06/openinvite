import React from 'react';
import { useNavigate } from 'react-router-dom';
import ParisUniverseView from '@/components/studio/ParisUniverseView';

export default function StudioParis() {
  const navigate = useNavigate();
  return (
    <ParisUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}

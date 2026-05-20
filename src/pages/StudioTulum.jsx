import React from 'react';
import { useNavigate } from 'react-router-dom';
import TulumUniverseView from '@/components/studio/TulumUniverseView';

export default function StudioTulum() {
  const navigate = useNavigate();
  return (
    <TulumUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}

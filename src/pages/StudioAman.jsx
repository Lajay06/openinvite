import React from 'react';
import { useNavigate } from 'react-router-dom';
import AmanUniverseView from '@/components/studio/AmanUniverseView';

export default function StudioAman() {
  const navigate = useNavigate();
  return (
    <AmanUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}
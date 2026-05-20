import React from 'react';
import { useNavigate } from 'react-router-dom';
import CapriUniverseView from '@/components/studio/CapriUniverseView';

export default function StudioCapri() {
  const navigate = useNavigate();
  return (
    <CapriUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}

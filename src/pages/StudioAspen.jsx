import React from 'react';
import { useNavigate } from 'react-router-dom';
import AspenUniverseView from '@/components/studio/AspenUniverseView';

export default function StudioAspen() {
  const navigate = useNavigate();
  return (
    <AspenUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}

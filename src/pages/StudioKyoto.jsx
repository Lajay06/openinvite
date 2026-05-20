import React from 'react';
import { useNavigate } from 'react-router-dom';
import KyotoUniverseView from '@/components/studio/KyotoUniverseView';

export default function StudioKyoto() {
  const navigate = useNavigate();
  return (
    <KyotoUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}

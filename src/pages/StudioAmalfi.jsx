import React from 'react';
import { useNavigate } from 'react-router-dom';
import AmalfiUniverseView from '@/components/studio/AmalfiUniverseView';

export default function StudioAmalfi() {
  const navigate = useNavigate();
  return (
    <AmalfiUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}

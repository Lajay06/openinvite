import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarrakechUniverseView from '@/components/studio/MarrakechUniverseView';

export default function StudioMarrakech() {
  const navigate = useNavigate();
  return (
    <MarrakechUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}

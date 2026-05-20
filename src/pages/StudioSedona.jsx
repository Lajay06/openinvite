import React from 'react';
import { useNavigate } from 'react-router-dom';
import SedonaUniverseView from '@/components/studio/SedonaUniverseView';

export default function StudioSedona() {
  const navigate = useNavigate();
  return (
    <SedonaUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}

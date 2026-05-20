import React from 'react';
import { useNavigate } from 'react-router-dom';
import TokyoUniverseView from '@/components/studio/TokyoUniverseView';

export default function StudioTokyo() {
  const navigate = useNavigate();
  return (
    <TokyoUniverseView
      isOnboarding={false}
      onBack={() => navigate('/studio/universe')}
      navigate={navigate}
    />
  );
}

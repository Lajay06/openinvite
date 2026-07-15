// Re-exports the full Website Builder experience but with back → Studio
import React from 'react';
import StudioWebsite from '@/pages/StudioWebsite';

export default function StudioWebsiteTab({ onBack, openAutofill }) {
  return <StudioWebsite initialOpenAutofill={openAutofill} onBack={onBack} />;
}
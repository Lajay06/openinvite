import React from 'react';
import { PRO, s } from '@/components/professional/proTheme';

export default function QuestionnairePage() {
  return (
    <div style={{ minHeight: '100vh', background: PRO.work, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <p style={{ ...s.card, ...s.body, maxWidth: 420, margin: 0 }}>This link isn&apos;t working. Ask the planner who sent it for a new one.</p>
    </div>
  );
}

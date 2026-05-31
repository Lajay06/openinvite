import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ExperienceGuideTab from '@/components/studio/guest-suite/ExperienceGuideTab';

export default function GuestSuiteExperience() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.WeddingDetails.list()
      .then(rows => { setDetails(rows[0] || null); })
      .catch(e => console.error('GuestSuiteExperience load error', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, border: '2px solid #EEE', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <ExperienceGuideTab details={details} />
    </div>
  );
}

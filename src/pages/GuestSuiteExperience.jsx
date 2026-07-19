import React, { useState, useEffect } from 'react';
import ExperienceGuideTab from '@/components/studio/guest-suite/ExperienceGuideTab';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

export default function GuestSuiteExperience() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyWeddingDetails()
      .then(details => { setDetails(details); })
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
      <DashboardPageHeader title="Experience guide" subtitle="Local recommendations for your guests" />
      <ExperienceGuideTab details={details} />
    </div>
  );
}

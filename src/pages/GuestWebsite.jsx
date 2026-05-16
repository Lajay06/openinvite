import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PasswordGate from '@/components/guest-website/PasswordGate';
import StillTemplate from '@/components/guest-website/StillTemplate';

export default function GuestWebsite() {
  const { weddingSlug } = useParams();
  const navigate = useNavigate();
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWedding = async () => {
      try {
        const weddings = await base44.entities.WeddingDetails.filter({ slug: weddingSlug });
        if (!weddings || weddings.length === 0) {
          setError('Wedding not found');
          return;
        }

        const weddingData = weddings[0];
        if (!weddingData.websiteEnabled) {
          setError('Wedding website is not enabled');
          return;
        }

        setWedding(weddingData);
        
        // If no password, auto-authenticate
        if (!weddingData.websitePassword) {
          setAuthenticated(true);
        }
      } catch (err) {
        console.error('Error fetching wedding:', err);
        setError('Failed to load wedding');
      } finally {
        setLoading(false);
      }
    };

    fetchWedding();
  }, [weddingSlug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '2px solid #333', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#888', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#888' }}>
          <h1 style={{ color: '#fff', fontSize: 24, marginBottom: 16 }}>Oops</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!wedding) {
    return null;
  }

  if (wedding.websitePassword && !authenticated) {
    return <PasswordGate wedding={wedding} onAuthenticate={() => setAuthenticated(true)} />;
  }

  return <StillTemplate wedding={wedding} />;
}
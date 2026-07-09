import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { useNavigate } from 'react-router-dom';

const ENTITIES = [
  { key: 'Guest', label: 'Guests' },
  { key: 'Budget', label: 'Budget items' },
  { key: 'Schedule', label: 'Schedule events' },
  { key: 'Vendor', label: 'Vendors' },
  { key: 'MoodboardItem', label: 'Moodboard items' },
  { key: 'Note', label: 'Notes' },
  { key: 'WeddingDetails', label: 'Wedding details' },
];

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function DevReset() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null); // null | 'running' | 'done' | 'error'
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const handleReset = async () => {
    setStatus('running');
    setLog([]);

    for (const { key, label } of ENTITIES) {
      try {
        const entity = base44.entities[key];
        if (!entity) {
          addLog(`⚠️  ${label}: entity not found, skipping`);
          continue;
        }
        // Scoped to the logged-in user's own records only — this used to
        // call entity.list() with no filter, meaning anyone who found this
        // route could permanently delete every OTHER couple's guests,
        // budget items, schedule, vendors, moodboard items, notes, and
        // wedding details too, not just their own.
        const records = await getMyRecords(key);
        if (!records || records.length === 0) {
          addLog(`✓  ${label}: already empty`);
          continue;
        }
        await Promise.all(records.map(r => entity.delete(r.id)));
        addLog(`✓  ${label}: deleted ${records.length} record${records.length !== 1 ? 's' : ''}`);
      } catch (err) {
        addLog(`✗  ${label}: ${err.message || 'error'}`);
      }
    }

    // Also reset onboardingCompleted so the user can go through onboarding fresh
    try {
      await base44.auth.updateMe({ onboardingCompleted: false, onboardingPath: null });
      addLog('✓  User: onboardingCompleted reset to false');
    } catch (err) {
      addLog(`⚠️  User: could not reset onboarding flag — ${err.message || 'error'}`);
    }

    setStatus('done');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAFA',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: PJS,
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', marginBottom: 8, textTransform: 'none' }}>
          Developer utility
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0A0A0A', margin: '0 0 8px' }}>
          Reset account data
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', margin: '0 0 32px', lineHeight: 1.6 }}>
          Deletes all guests, budget items, schedule events, vendors, moodboard items, and notes from your account,
          and resets the onboarding flag so you can run onboarding fresh.
        </p>

        {status === null && (
          <button
            onClick={handleReset}
            style={{
              background: '#E03553',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 999,
              padding: '14px 32px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: PJS,
              width: '100%',
            }}
          >
            Delete all test data
          </button>
        )}

        {status === 'running' && (
          <div style={{ color: 'rgba(10,10,10,0.45)', fontSize: 14 }}>Clearing data…</div>
        )}

        {log.length > 0 && (
          <div style={{
            marginTop: 24,
            background: '#F0F0EE',
            borderRadius: 8,
            padding: '16px 20px',
            fontSize: 13,
            lineHeight: 2,
            color: '#0A0A0A',
          }}>
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        {status === 'done' && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', marginBottom: 16 }}>
              All done. You can now go through onboarding with a clean account.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => navigate('/onboarding')}
                style={{
                  background: '#E03553',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 999,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: PJS,
                  flex: 1,
                }}
              >
                Go to onboarding
              </button>
              <button
                onClick={() => navigate('/Dashboard')}
                style={{
                  background: 'transparent',
                  color: '#0A0A0A',
                  border: '1px solid rgba(10,10,10,0.2)',
                  borderRadius: 999,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: PJS,
                  flex: 1,
                }}
              >
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

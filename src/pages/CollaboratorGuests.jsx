import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';
import { Users, Loader2, Trash2 } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

const STATUS_OPTIONS = ['pending', 'attending', 'declined', 'maybe'];

/**
 * A collaborator's view of one owner's Guest list — everything here goes
 * through /api/collaborator-guests (server-enforced view/edit permission),
 * never the direct base44 client, since a collaborator's own session has
 * no access to another user's Guest records at all (see
 * api/_lib/collaboratorAuth.js). This is the ONE page proven end-to-end for
 * this pass — see the PR description for which of the other 11 permission
 * pages aren't wired up yet.
 */
export default function CollaboratorGuests() {
  const [searchParams] = useSearchParams();
  const ownerUserId = searchParams.get('owner');
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guests, setGuests] = useState([]);
  const [coupleNames, setCoupleNames] = useState('');
  const [canEdit, setCanEdit] = useState(false);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/collaborator-guests?ownerUserId=${encodeURIComponent(ownerUserId)}`, { headers: authHeader() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load guests'); setLoading(false); return; }
      setGuests(data.guests || []);
      setCoupleNames(data.coupleNames || '');
      setCanEdit(!!data.canEdit);
    } catch {
      setError('Failed to load guests');
    }
    setLoading(false);
  };

  useEffect(() => { if (ownerUserId) load(); }, [ownerUserId]);

  const updateGuest = async (guestId, updates) => {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, ...updates } : g));
    try {
      const res = await fetch('/api/collaborator-guests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ ownerUserId, guestId, updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
    } catch (e) {
      toast.error(e.message || 'Failed to save');
      load();
    }
  };

  const deleteGuest = async (guestId) => {
    if (!window.confirm('Remove this guest?')) return;
    try {
      const res = await fetch(`/api/collaborator-guests?ownerUserId=${encodeURIComponent(ownerUserId)}&guestId=${encodeURIComponent(guestId)}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setGuests(prev => prev.filter(g => g.id !== guestId));
      toast.success('Guest removed');
    } catch (e) {
      toast.error(e.message || 'Failed to remove guest');
    }
  };

  if (!ownerUserId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: PJS }}>
        <p style={{ color: 'rgba(10,10,10,0.5)' }}>No wedding specified.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#E03553', letterSpacing: '0.08em', margin: '0 0 6px' }}>collaborating as {user?.email}</p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0 }}>
          {coupleNames ? `${coupleNames}'s guests` : 'Guests'}
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: '4px 0 0' }}>{canEdit ? 'You can view and edit this guest list.' : 'You have view-only access to this guest list.'}</p>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(10,10,10,0.4)' }}>
            <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading…
          </div>
        ) : error ? (
          <p style={{ color: '#991b1b', fontSize: 14 }}>{error}</p>
        ) : guests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Users size={24} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 10px' }} />
            <p style={{ color: 'rgba(10,10,10,0.4)', fontSize: 13 }}>No guests yet.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.4)' }}>Guest</th>
                <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.4)' }}>Email</th>
                <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.4)' }}>Status</th>
                {canEdit && <th style={{ width: 40 }} />}
              </tr>
            </thead>
            <tbody>
              {guests.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid rgba(10,10,10,0.04)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#0A0A0A', fontWeight: 600 }}>{g.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#444444' }}>{g.email || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {canEdit ? (
                      <select
                        value={g.rsvp_status || 'pending'}
                        onChange={e => updateGuest(g.id, { rsvp_status: e.target.value })}
                        style={{ fontSize: 12, fontFamily: PJS, border: '1px solid rgba(10,10,10,0.15)', padding: '4px 8px' }}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 12, color: '#444444' }}>{g.rsvp_status || 'pending'}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => deleteGuest(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', display: 'flex' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

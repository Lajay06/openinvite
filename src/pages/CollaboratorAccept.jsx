import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Users, Loader2, Eye, PenSquare } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

const PAGE_LABEL_STYLE = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#0A0A0A', fontFamily: PJS, padding: '6px 0' };

export default function CollaboratorAccept() {
  const { token } = useParams();
  const { isAuthenticated, isLoadingAuth, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [invite, setInvite] = useState(null); // { collaboratorName, coupleNames, permissions, status }
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/collaborator-lookup?token=${encodeURIComponent(token)}`);
        if (!res.ok) { setNotFound(true); setLoading(false); return; }
        setInvite(await res.json());
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setAcceptError('');
    try {
      const res = await fetch('/api/collaborator-accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('base44_access_token')}`,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept invite');
      window.location.href = `/collaborate/guests?owner=${encodeURIComponent(data.ownerUserId)}`;
    } catch (err) {
      setAcceptError(err.message || 'Failed to accept invite');
      setAccepting(false);
    }
  };

  if (loading || isLoadingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA' }}>
        <Loader2 size={22} style={{ color: '#E03553', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E03553', letterSpacing: '0.1em', marginBottom: 12, fontFamily: PJS }}>invite not found</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', marginBottom: 12, letterSpacing: '-0.02em', fontFamily: PJS }}>This invite has expired or is invalid</h1>
          <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.55)', lineHeight: 1.6, fontFamily: PJS }}>Please ask the couple to send you a new invite.</p>
        </div>
      </div>
    );
  }

  const grantedPages = Object.entries(invite.permissions || {}).filter(([, p]) => p?.view || p?.edit);
  const nextParam = encodeURIComponent(`/collaborate/accept/${token}`);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.08)', padding: 40 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(224,53,83,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Users size={22} style={{ color: '#E03553' }} />
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#E03553', letterSpacing: '0.1em', marginBottom: 10, fontFamily: PJS }}>you're invited to collaborate</p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 16, fontFamily: PJS }}>
          {invite.coupleNames ? `${invite.coupleNames} would love your help planning their wedding` : "You've been invited to help plan a wedding"}
        </h1>

        {grantedPages.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.4)', letterSpacing: '0.06em', marginBottom: 6, fontFamily: PJS }}>you'll be able to help with</p>
            {grantedPages.map(([page, p]) => (
              <div key={page} style={PAGE_LABEL_STYLE}>
                {p.edit ? <PenSquare size={13} style={{ color: '#E03553' }} /> : <Eye size={13} style={{ color: 'rgba(10,10,10,0.4)' }} />}
                {page} <span style={{ color: 'rgba(10,10,10,0.4)' }}>({p.edit ? 'view & edit' : 'view only'})</span>
              </div>
            ))}
          </div>
        )}

        {acceptError && (
          <p style={{ fontSize: 13, color: '#991b1b', background: '#fee2e2', padding: '8px 12px', marginBottom: 16, fontFamily: PJS }}>{acceptError}</p>
        )}

        {isAuthenticated ? (
          <>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', marginBottom: 16, fontFamily: PJS }}>
              Signed in as <strong style={{ color: '#0A0A0A' }}>{user?.email}</strong>
            </p>
            <button
              onClick={handleAccept}
              disabled={accepting}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 999, fontSize: 14, fontWeight: 700,
                fontFamily: PJS, background: '#E03553', color: '#FFFFFF', border: 'none',
                cursor: accepting ? 'default' : 'pointer', opacity: accepting ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {accepting ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              {accepting ? 'Accepting…' : 'Accept invitation'}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link
              to={`/login?next=${nextParam}`}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 999, fontSize: 14, fontWeight: 700,
                fontFamily: PJS, background: '#E03553', color: '#FFFFFF', border: 'none',
                textAlign: 'center', textDecoration: 'none', display: 'block', boxSizing: 'border-box',
              }}
            >
              Sign in to accept
            </Link>
            <Link
              to={`/register?next=${nextParam}`}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 999, fontSize: 14, fontWeight: 700,
                fontFamily: PJS, background: 'none', color: '#0A0A0A', border: '1px solid rgba(10,10,10,0.15)',
                textAlign: 'center', textDecoration: 'none', display: 'block', boxSizing: 'border-box',
              }}
            >
              Create a free account
            </Link>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

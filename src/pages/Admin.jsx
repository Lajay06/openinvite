import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const PJS = "'Plus Jakarta Sans', sans-serif";
const ADMIN_EMAIL = 'lajay@openinvite.com.au';
const PAGE_SIZE = 20;

const statLabelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0, marginBottom: 10,
};
const statValueStyle = {
  fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 700, color: '#0A0A0A',
  fontFamily: PJS, lineHeight: 1, margin: 0,
};

function StatCell({ label, value, isLast }) {
  return (
    <div
      className="grow shrink basis-1/2 min-w-0 lg:flex-1"
      style={{
        padding: '24px 32px', minHeight: 80,
        borderRight: isLast ? 'none' : '1px solid rgba(10,10,10,0.08)',
      }}
    >
      <p style={statLabelStyle}>{label}</p>
      <p style={statValueStyle}>{value}</p>
    </div>
  );
}

function TableCell({ children, muted }) {
  return (
    <td style={{
      padding: '12px 16px', fontSize: 13, fontFamily: PJS,
      color: muted ? 'rgba(10,10,10,0.4)' : '#0A0A0A',
      borderBottom: '1px solid rgba(10,10,10,0.06)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAUD(amount) {
  return '$' + Number(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Admin guard — redirect non-admin users immediately
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      navigate('/Dashboard', { replace: true });
    }
  }, [user, navigate]);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('base44_access_token') || '';
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setStats(data.stats);
      setUsers(data.users || []);
      setRecentPayments(data.recentPayments || []);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      fetchStats();
    }
  }, [user, fetchStats]);

  // Filter users by search
  const filteredUsers = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  if (!user || user.email !== ADMIN_EMAIL) {
    return null; // Guard — will redirect via useEffect
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
        <DashboardPageHeader title="Admin" subtitle="Loading…" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
          <div style={{ width: 20, height: 20, border: '2px solid rgba(10,10,10,0.1)', borderTopColor: '#0A0A0A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const subtitleText = lastRefreshed
    ? `Last updated ${lastRefreshed.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`
    : 'Revenue and user data from Stripe';

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Admin" subtitle={subtitleText} />

      {/* Stats strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <StatCell label="Total paid users" value={stats?.totalPaidUsers ?? '—'} />
        <StatCell label="Paid this week" value={stats?.paidThisWeek ?? '—'} />
        <StatCell label="Total revenue (AUD)" value={stats ? formatAUD(stats.totalRevenue) : '—'} />
        <StatCell label="Conversion rate" value={stats ? `${stats.conversionRate}%` : '—'} isLast />
      </div>

      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4"
        style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}
      >
        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 280, width: '100%' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              border: '1px solid rgba(10,10,10,0.12)', borderRadius: 999,
              fontSize: 12, fontFamily: PJS, color: '#0A0A0A',
              background: 'rgba(10,10,10,0.03)', outline: 'none',
            }}
          />
        </div>

        {/* Refresh */}
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 999,
            background: '#0A0A0A', color: '#FFFFFF',
            border: 'none', cursor: refreshing ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: PJS,
            opacity: refreshing ? 0.6 : 1, transition: 'opacity 0.15s',
          }}
        >
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div style={{ padding: '32px 32px 48px' }}>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(224,53,83,0.06)', border: '1px solid rgba(224,53,83,0.2)', marginBottom: 28, fontSize: 13, color: '#E03553', fontFamily: PJS }}>
            {error}
          </div>
        )}

        {/* ── Paid users ─────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>
            Paid users{filteredUsers.length !== users.length ? ` (${filteredUsers.length} of ${users.length})` : ` (${users.length})`}
          </p>
          {totalPages > 1 && (
            <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid rgba(10,10,10,0.08)', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr style={{ background: 'rgba(10,10,10,0.02)' }}>
                {['Email', 'Plan', 'Amount', 'Date'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                    color: 'rgba(10,10,10,0.4)', fontFamily: PJS,
                    borderBottom: '1px solid rgba(10,10,10,0.08)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px 16px', textAlign: 'center', fontSize: 13, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>
                    {search ? 'No users match your search.' : 'No paid users yet.'}
                  </td>
                </tr>
              ) : (
                pagedUsers.map((u, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#FFFFFF' : 'rgba(10,10,10,0.015)' }}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                        padding: '3px 10px', borderRadius: 999, fontFamily: PJS,
                        background: u.plan === 'ultra' ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#0A0A0A',
                        color: '#FFFFFF',
                      }}>
                        {u.plan}
                      </span>
                    </TableCell>
                    <TableCell>{formatAUD(u.amount)}</TableCell>
                    <TableCell muted>{formatDate(u.date)}</TableCell>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 14px', borderRadius: 999,
                background: 'rgba(10,10,10,0.05)', border: '1px solid rgba(10,10,10,0.1)',
                fontSize: 12, fontFamily: PJS, color: '#0A0A0A',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={13} /> Previous
            </button>
            <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 14px', borderRadius: 999,
                background: 'rgba(10,10,10,0.05)', border: '1px solid rgba(10,10,10,0.1)',
                fontSize: 12, fontFamily: PJS, color: '#0A0A0A',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.4 : 1,
              }}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}

        {/* ── Recent payments ─────────────────────────────── */}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px', fontFamily: PJS }}>
          Recent payments
        </p>

        <div style={{ overflowX: 'auto', border: '1px solid rgba(10,10,10,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr style={{ background: 'rgba(10,10,10,0.02)' }}>
                {['Email', 'Plan', 'Amount', 'Date', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                    color: 'rgba(10,10,10,0.4)', fontFamily: PJS,
                    borderBottom: '1px solid rgba(10,10,10,0.08)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', fontSize: 13, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>
                    No recent payments.
                  </td>
                </tr>
              ) : (
                recentPayments.map((p, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#FFFFFF' : 'rgba(10,10,10,0.015)' }}>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                        padding: '3px 10px', borderRadius: 999, fontFamily: PJS,
                        background: p.plan === 'ultra' ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#0A0A0A',
                        color: '#FFFFFF',
                      }}>
                        {p.plan}
                      </span>
                    </TableCell>
                    <TableCell>{formatAUD(p.amount)}</TableCell>
                    <TableCell muted>{formatDate(p.date)}</TableCell>
                    <TableCell>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                        padding: '3px 10px', borderRadius: 999, fontFamily: PJS,
                        background: p.status === 'paid' ? 'rgba(34,197,94,0.12)' : 'rgba(10,10,10,0.06)',
                        color: p.status === 'paid' ? '#16a34a' : 'rgba(10,10,10,0.5)',
                      }}>
                        {p.status}
                      </span>
                    </TableCell>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { Loader2, BarChart2, ArrowRight } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const PJS = "'Plus Jakarta Sans', sans-serif";

// ── Read-only poll result card ─────────────────────────────────────────────────
function PollResultCard({ poll }) {
  const [showComments, setShowComments] = useState(false);
  const totalVotes = poll.options.reduce((s, o) => s + (o.votes || 0), 0);
  const maxVotes = Math.max(...poll.options.map(o => o.votes || 0), 1);

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#FFFFFF', marginBottom: 16 }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            {poll.emoji && <span style={{ fontSize: 16 }}>{poll.emoji}</span>}
            <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', padding: '2px 8px', border: '1px solid rgba(10,10,10,0.08)', borderRadius: 999 }}>
              {poll.category}
            </span>
            <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: poll.isActive ? '#DDF762' : 'rgba(10,10,10,0.05)', color: poll.isActive ? '#0A1930' : 'rgba(10,10,10,0.4)' }}>
              {poll.isActive ? 'Active' : 'Ended'}
            </span>
          </div>
          <p style={{ fontFamily: PJS, fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, lineHeight: 1.35 }}>
            {poll.title}
          </p>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <p style={{ fontFamily: PJS, fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>{totalVotes}</p>
          <p style={{ fontFamily: PJS, fontSize: 10, color: 'rgba(10,10,10,0.4)', margin: '1px 0 0' }}>
            {totalVotes === 1 ? 'vote' : 'votes'}
          </p>
        </div>
      </div>

      {/* Results bars */}
      <div style={{ padding: '0 20px 16px' }}>
        {poll.options.map(opt => {
          const pct = totalVotes ? Math.round((opt.votes || 0) / totalVotes * 100) : 0;
          const isLeading = (opt.votes || 0) === maxVotes && maxVotes > 0 && totalVotes > 0;
          return (
            <div key={opt.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: PJS, fontSize: 13, fontWeight: isLeading ? 700 : 400, color: isLeading ? '#0A0A0A' : 'rgba(10,10,10,0.7)' }}>
                  {opt.emoji && `${opt.emoji} `}{opt.label}
                  {opt.votes > 0 && (
                    <span style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.4)', fontWeight: 400, marginLeft: 6 }}>
                      ({opt.votes})
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: PJS, fontSize: 12, fontWeight: 700, color: isLeading ? '#E03553' : 'rgba(10,10,10,0.35)', marginLeft: 12, flexShrink: 0 }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: 5, background: 'rgba(10,10,10,0.06)', position: 'relative', borderRadius: 2 }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${pct}%`,
                  background: isLeading ? '#E03553' : 'rgba(10,10,10,0.2)',
                  borderRadius: 2,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          );
        })}

        {totalVotes === 0 && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', fontFamily: PJS, margin: '4px 0 0', fontStyle: 'italic' }}>
            No votes yet
          </p>
        )}
      </div>

      {/* Ava insight */}
      {poll.avaInsight && (
        <div style={{ margin: '0 20px 14px', borderLeft: '2px solid #E03553', padding: '8px 12px', background: 'rgba(224,53,83,0.04)' }}>
          <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, color: '#E03553', letterSpacing: '0.06em' }}>✦ Ava</span>
          <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: '3px 0 0', lineHeight: 1.5 }}>
            {poll.avaInsight}
          </p>
        </div>
      )}

      {/* Comments */}
      {poll.allowComments && poll.comments?.length > 0 && (
        <div style={{ padding: '0 20px 14px' }}>
          <button
            onClick={() => setShowComments(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.4)', padding: 0, fontWeight: 600 }}
          >
            {showComments ? 'Hide comments' : `${poll.comments.length} comment${poll.comments.length > 1 ? 's' : ''}`}
          </button>
          {showComments && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {poll.comments.slice(-8).map((c, i) => (
                <p key={i} style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.5)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                  "{c.text}"
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GuestSuitePolls() {
  const navigate = useNavigate();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyWeddingDetails()
      .then(w => { setPolls(w?.polls || []); })
      .catch(e => console.error('GuestSuitePolls load error', e))
      .finally(() => setLoading(false));
  }, []);

  const activePolls = polls.filter(p => p.isActive);
  const endedPolls = polls.filter(p => !p.isActive);
  const totalVotesAll = polls.reduce((s, p) => s + p.options.reduce((os, o) => os + (o.votes || 0), 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Guest polls"
        subtitle="Live results from your guests"
      />

      {/* Banner */}
      <div style={{ padding: '10px 32px', background: 'rgba(224,53,83,0.04)', borderBottom: '1px solid rgba(224,53,83,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, fontWeight: 600 }}>
          ✨ Live poll results from your guests — updates automatically as votes come in
        </span>
        <button
          onClick={() => navigate(createPageUrl('Polls'))}
          style={{ fontSize: 12, fontWeight: 700, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
        >
          Manage polls <ArrowRight size={11} />
        </button>
      </div>

      {/* Summary stats strip */}
      {!loading && polls.length > 0 && (
        <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          {[
            { label: 'Total polls', value: polls.length },
            { label: 'Active polls', value: activePolls.length },
            { label: 'Ended polls', value: endedPolls.length },
            { label: 'Total votes', value: totalVotesAll, last: true },
          ].map((s, i) => (
            <div key={s.label} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '16px 32px', borderRight: s.last ? 'none' : '1px solid rgba(10,10,10,0.08)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 4px' }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0, lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 32px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} />
          </div>
        ) : polls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 48, height: 48, background: 'rgba(10,10,10,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <BarChart2 size={22} style={{ color: 'rgba(10,10,10,0.25)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>
              No polls created yet
            </p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '0 0 24px', lineHeight: 1.6 }}>
              Create polls in Guests → Guest polls to involve your guests in the planning. Results will appear here live.
            </p>
            <button
              onClick={() => navigate(createPageUrl('Polls'))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#E03553', background: 'none', border: '1px solid rgba(224,53,83,0.3)', borderRadius: 999, padding: '8px 18px', cursor: 'pointer', fontFamily: PJS }}
            >
              Create polls in Guest polls <ArrowRight size={12} />
            </button>
          </div>
        ) : (
          <div>
            {/* Active polls */}
            {activePolls.length > 0 && (
              <div style={{ marginBottom: endedPolls.length > 0 ? 40 : 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 16px' }}>
                  ACTIVE POLLS · {activePolls.length}
                </p>
                {activePolls.map(poll => <PollResultCard key={poll.id} poll={poll} />)}
              </div>
            )}

            {/* Ended polls */}
            {endedPolls.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 16px' }}>
                  ENDED POLLS · {endedPolls.length}
                </p>
                {endedPolls.map(poll => <PollResultCard key={poll.id} poll={poll} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

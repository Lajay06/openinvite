import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart2, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

const VOTE_KEY = 'oi_poll_votes';

function getVotes() {
  try { return JSON.parse(localStorage.getItem(VOTE_KEY) || '{}'); } catch { return {}; }
}

function saveVote(pollId, optionId) {
  const v = getVotes();
  v[pollId] = optionId;
  localStorage.setItem(VOTE_KEY, JSON.stringify(v));
}

function totalVotes(poll) {
  return (poll.options || []).reduce((s, o) => s + (o.votes || 0), 0);
}

function ResultsBar({ option, total, isWinner, theme }) {
  const pct = total > 0 ? Math.round(((option.votes || 0) / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: theme.darkText, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: isWinner ? 700 : 400 }}>
          {option.label}
        </span>
        <span style={{ fontSize: 12, color: isWinner ? '#E03553' : `${theme.darkText}60`, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 4, background: `${theme.darkText}15`, borderRadius: 999, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: isWinner ? '#E03553' : `${theme.darkText}30`,
            borderRadius: 999,
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: `${theme.darkText}40`, fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 2 }}>
        {option.votes || 0} {(option.votes || 0) === 1 ? 'vote' : 'votes'}
      </div>
    </div>
  );
}

function PollCard({ poll, theme, typography, onVote, weddingDetails }) {
  const votes = getVotes();
  const myVote = votes[poll.id];
  const hasVoted = !!myVote;
  const total = totalVotes(poll);
  const winnerVotes = Math.max(...(poll.options || []).map(o => o.votes || 0));
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState(poll.comments || []);
  const [submitting, setSubmitting] = useState(false);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    const comment = { text: commentText.trim(), timestamp: new Date().toISOString() };
    const updated = [...localComments, comment];
    setLocalComments(updated);
    setCommentText('');
    setSubmitting(false);
    try {
      // Write to THIS wedding (weddingDetails, resolved by the parent via slug) —
      // never the app-wide most-recently-created WeddingDetails record.
      if (weddingDetails?.id) {
        const updatedPolls = (weddingDetails.polls || []).map(p =>
          p.id === poll.id ? { ...p, comments: updated } : p
        );
        await base44.entities.WeddingDetails.update(weddingDetails.id, { polls: updatedPolls });
      }
    } catch {}
  };

  return (
    <div style={{
      background: `${theme.darkText}08`,
      border: `1px solid ${theme.darkText}15`,
      padding: 24,
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {poll.emoji && (
          <span style={{ fontSize: 22 }}>{poll.emoji}</span>
        )}
        <div>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            color: theme.darkText,
            fontFamily: typography.headingFont || "'Plus Jakarta Sans', sans-serif",
            margin: 0,
          }}>
            {poll.title}
          </h3>
          {poll.category && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: `${theme.darkText}40`,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              {poll.category}
            </span>
          )}
        </div>
      </div>

      {/* Voting or results */}
      {!hasVoted ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(poll.options || []).map(option => (
            <button
              key={option.id}
              onClick={() => onVote(poll.id, option.id)}
              style={{
                width: '100%',
                minHeight: 52,
                padding: '14px 20px',
                background: 'transparent',
                border: `1px solid ${theme.darkText}25`,
                color: theme.darkText,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                borderRadius: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `${theme.darkText}10`;
                e.currentTarget.style.borderColor = theme.accent || '#E03553';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = `${theme.darkText}25`;
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <div>
          {(poll.options || []).map(option => (
            <ResultsBar
              key={option.id}
              option={option}
              total={total}
              isWinner={(option.votes || 0) === winnerVotes && winnerVotes > 0}
              theme={theme}
            />
          ))}
          <p style={{ fontSize: 11, color: `${theme.darkText}40`, fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 8 }}>
            {total} {total === 1 ? 'response' : 'responses'} · You voted for <strong style={{ color: theme.darkText }}>{(poll.options || []).find(o => o.id === myVote)?.label}</strong>
          </p>
        </div>
      )}

      {/* Ava insight */}
      {poll.avaInsight && (
        <div style={{
          borderLeft: '3px solid #E03553',
          paddingLeft: 14,
          marginTop: 16,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 4px' }}>
            Ava insight
          </p>
          <p style={{ fontSize: 13, color: `${theme.darkText}80`, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, lineHeight: 1.5 }}>
            {poll.avaInsight}
          </p>
        </div>
      )}

      {/* Comments section */}
      {poll.allowComments && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${theme.darkText}10`, paddingTop: 14 }}>
          <button
            onClick={() => setShowComments(!showComments)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: `${theme.darkText}50`, fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12, fontWeight: 700, padding: 0,
            }}
          >
            <MessageCircle size={13} />
            {localComments.length > 0 ? `${localComments.length} comment${localComments.length !== 1 ? 's' : ''}` : 'Leave a comment'}
            {showComments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showComments && (
            <div style={{ marginTop: 12 }}>
              {localComments.map((c, i) => (
                <div key={i} style={{
                  background: `${theme.darkText}06`,
                  padding: '8px 12px',
                  marginBottom: 6,
                }}>
                  <p style={{ fontSize: 13, color: `${theme.darkText}70`, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                    {c.text}
                  </p>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitComment()}
                  placeholder="Add a comment..."
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: 'transparent',
                    border: `1px solid ${theme.darkText}20`,
                    borderBottom: `2px solid ${theme.darkText}40`,
                    color: theme.darkText,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    outline: 'none',
                    borderRadius: 0,
                  }}
                />
                <button
                  onClick={submitComment}
                  disabled={submitting || !commentText.trim()}
                  style={{
                    padding: '10px 18px',
                    background: '#E03553',
                    border: 'none',
                    color: '#fff',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                    opacity: commentText.trim() ? 1 : 0.4,
                    borderRadius: 999,
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WeddingPollsPage({ weddingDetails, theme, typography }) {
  const [polls, setPolls] = useState([]);

  useEffect(() => {
    const active = (weddingDetails?.polls || []).filter(p => p.isActive);
    setPolls(active);
  }, [weddingDetails]);

  const handleVote = useCallback(async (pollId, optionId) => {
    saveVote(pollId, optionId);
    const updatedPolls = polls.map(p =>
      p.id === pollId
        ? { ...p, options: p.options.map(o => o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o) }
        : p
    );
    setPolls(updatedPolls);
    try {
      // Write to THIS wedding (weddingDetails, resolved by the parent via slug) —
      // never the app-wide most-recently-created WeddingDetails record.
      if (weddingDetails?.id) {
        const allPolls = (weddingDetails.polls || []).map(p =>
          p.id === pollId
            ? { ...p, options: p.options.map(o => o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o) }
            : p
        );
        base44.entities.WeddingDetails.update(weddingDetails.id, { polls: allPolls });
      }
    } catch {}
  }, [polls, weddingDetails]);

  return (
    <div style={{ minHeight: '100vh', background: theme.darkBg }}>
      {/* Page header */}
      <div style={{
        padding: '80px 32px 40px',
        borderBottom: `1px solid ${theme.darkText}10`,
        maxWidth: 680,
        margin: '0 auto',
      }}>
        <p style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: `${theme.darkText}40`,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          margin: '0 0 12px',
        }}>
          Guest polls
        </p>
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 700,
          color: theme.darkText,
          fontFamily: typography.headingFont || "'Plus Jakarta Sans', sans-serif",
          margin: '0 0 12px',
          lineHeight: 1.1,
        }}>
          Have your say.
        </h1>
        <p style={{
          fontSize: 15,
          color: `${theme.darkText}50`,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          margin: 0,
          lineHeight: 1.6,
        }}>
          Help us make decisions that matter. Your answers shape the wedding.
        </p>
      </div>

      {/* Polls list */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px 80px' }}>
        {polls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 36, marginBottom: 16 }}>🗳️</p>
            <h3 style={{
              fontSize: 18,
              fontWeight: 700,
              color: theme.darkText,
              fontFamily: typography.headingFont || "'Plus Jakarta Sans', sans-serif",
              margin: '0 0 8px',
            }}>
              Polls coming soon
            </h3>
            <p style={{ fontSize: 14, color: `${theme.darkText}40`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              The couple hasn't opened any polls yet — check back closer to the date.
            </p>
          </div>
        ) : (
          polls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              theme={theme}
              typography={typography}
              onVote={handleVote}
              weddingDetails={weddingDetails}
            />
          ))
        )}
      </div>
    </div>
  );
}

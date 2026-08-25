import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import SectionReveal from '../SectionReveal';
import GuestPageHeading from '../GuestPageHeading';
import { isMotionEnabled } from '@/lib/universeStyling';
import { getCachedWeddingPassword } from '@/lib/guestSitePassword';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

const VOTE_KEY = 'oi_poll_votes';
const VOTER_ID_KEY = 'oi_poll_voter_id';

function getVotes() {
  try { return JSON.parse(localStorage.getItem(VOTE_KEY) || '{}'); } catch { return {}; }
}

function saveVote(pollId, optionId) {
  const v = getVotes();
  v[pollId] = optionId;
  localStorage.setItem(VOTE_KEY, JSON.stringify(v));
}

/**
 * A stable, anonymous, per-browser id — generated once and reused for
 * every vote this visitor casts. Sent to the server so PollVote's
 * aggregation can de-dup a visitor who changes their vote (keep only their
 * latest choice) — hashed server-side before storage, never stored raw,
 * and never used for anything beyond that de-dup.
 */
function getVoterId() {
  try {
    let id = localStorage.getItem(VOTER_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(VOTER_ID_KEY, id);
    }
    return id;
  } catch {
    return null; // localStorage unavailable — vote still works, just never de-duped
  }
}

function totalVotes(poll) {
  return (poll.options || []).reduce((s, o) => s + (o.votes || 0), 0);
}

function ResultsBar({ option, total, isWinner, theme, typography }) {
  const pct = total > 0 ? Math.round(((option.votes || 0) / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: theme.darkText, fontFamily: typography.bodyFont, fontWeight: isWinner ? 700 : 400 }}>
          {option.label}
        </span>
        <span style={{ fontSize: 12, color: isWinner ? '#E03553' : `${theme.darkText}60`, fontFamily: typography.bodyFont, fontWeight: 700 }}>
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
      <div style={{ fontSize: 11, color: `${theme.darkText}40`, fontFamily: typography.bodyFont, marginTop: 2 }}>
        {option.votes || 0} {(option.votes || 0) === 1 ? 'vote' : 'votes'}
      </div>
    </div>
  );
}

function PollCard({ poll, theme, typography, onVote, weddingSlug, getTurnstileToken }) {
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
    if (!commentText.trim() || !weddingSlug) return;
    const turnstileToken = getTurnstileToken();
    if (!turnstileToken) return;
    setSubmitting(true);
    const text = commentText.trim();
    try {
      const res = await fetch('/api/wedding-poll-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // password: replayed on a protected site so the write passes the
        // website gate. Empty string on an unprotected one, which the
        // server ignores.
        body: JSON.stringify({ weddingSlug, pollId: poll.id, comment: text, turnstileToken,
          password: getCachedWeddingPassword(weddingSlug) }),
      });
      if (res.ok) {
        setLocalComments(prev => [...prev, { text, timestamp: new Date().toISOString() }]);
        setCommentText('');
      }
    } catch {
      // Non-fatal — the comment box just doesn't clear, guest can retry.
    }
    setSubmitting(false);
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
          <h2 style={{
            fontSize: 16,
            fontWeight: 700,
            color: theme.darkText,
            fontFamily: typography.headingFont || "'Plus Jakarta Sans', sans-serif",
            margin: 0,
          }}>
            {poll.title}
          </h2>
          {poll.category && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: `${theme.darkText}40`,
              fontFamily: typography.bodyFont,
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
                fontFamily: typography.bodyFont,
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
            <ResultsBar typography={typography}
              key={option.id}
              option={option}
              total={total}
              isWinner={(option.votes || 0) === winnerVotes && winnerVotes > 0}
              theme={theme}
            />
          ))}
          <p style={{ fontSize: 11, color: `${theme.darkText}40`, fontFamily: typography.bodyFont, marginTop: 8 }}>
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
          <p style={{ fontSize: 12, fontWeight: 700, color: '#E03553', fontFamily: typography.bodyFont, margin: '0 0 4px' }}>
            Ava insight
          </p>
          <p style={{ fontSize: 13, color: `${theme.darkText}80`, fontFamily: typography.bodyFont, margin: 0, lineHeight: 1.5 }}>
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
              color: `${theme.darkText}50`, fontFamily: typography.bodyFont,
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
                  <p style={{ fontSize: 13, color: `${theme.darkText}70`, fontFamily: typography.bodyFont, margin: 0 }}>
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
                    fontFamily: typography.bodyFont,
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
                    fontFamily: typography.bodyFont,
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

export default function WeddingPollsPage({ weddingDetails, theme, typography, universeConfig }) {
  const [polls, setPolls] = useState([]);
  const turnstileRef = useRef(null);
  const tsTokenRef = useRef('');
  const getTurnstileToken = useCallback(() => tsTokenRef.current, []);

  useEffect(() => {
    const active = (weddingDetails?.polls || []).filter(p => p.isActive);
    setPolls(active);
  }, [weddingDetails]);

  // Live aggregate counts/comments from PollVote/PollComment — the static
  // weddingDetails.polls[].options[].votes/.comments[] snapshot above no
  // longer changes once votes/comments moved to their own entities.
  useEffect(() => {
    if (!weddingDetails?.slug) return;
    let cancelled = false;
    (async () => {
      try {
        // POST with the cached password when the guest has unlocked a
        // protected site — the endpoint honours the website password gate as
        // of 2026-08-17, and a candidate password never rides in a URL.
        const cachedPassword = getCachedWeddingPassword(weddingDetails.slug);
        const res = cachedPassword
          ? await fetch('/api/wedding-poll-results', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ weddingSlug: weddingDetails.slug, password: cachedPassword }),
            })
          : await fetch(`/api/wedding-poll-results?weddingSlug=${encodeURIComponent(weddingDetails.slug)}`);
        if (!res.ok) return;
        const { polls: results } = await res.json();
        if (cancelled || !results) return;
        setPolls(prev => prev.map(p => {
          const r = results[p.id];
          if (!r) return p;
          return {
            ...p,
            options: p.options.map(o => ({ ...o, votes: r.counts?.[o.id] || 0 })),
            comments: r.comments || [],
          };
        }));
      } catch {
        // Non-fatal — falls back to the static snapshot already in state.
      }
    })();
    return () => { cancelled = true; };
  }, [weddingDetails?.slug]);

  const handleVote = useCallback(async (pollId, optionId) => {
    if (!weddingDetails?.slug) return;
    const turnstileToken = tsTokenRef.current;
    if (!turnstileToken) return;

    saveVote(pollId, optionId);
    setPolls(prev => prev.map(p =>
      p.id === pollId
        ? { ...p, options: p.options.map(o => o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o) }
        : p
    ));
    try {
      // Server re-resolves the wedding by slug and writes a PollVote row
      // with the admin key — never a direct client-side write.
      await fetch('/api/wedding-poll-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingSlug: weddingDetails.slug, pollId, optionId, turnstileToken,
          voterId: getVoterId(), password: getCachedWeddingPassword(weddingDetails.slug) }),
      });
    } catch {
      // Non-fatal — the visitor's own vote is already reflected optimistically
      // and recorded in their localStorage; a failed server write just means
      // the couple's aggregate count misses this one vote.
    }
  }, [weddingDetails?.slug]);

  return (
    <div style={{ minHeight: '100vh', background: theme.darkBg }}>
      {/* Page header */}
      <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
        <div style={{
          padding: '80px 32px 40px',
          borderBottom: `1px solid ${theme.darkText}10`,
          maxWidth: 680,
          margin: '0 auto',
        }}>
          {/* The hand-rolled kicker that used to sit here IS the heading now,
              rendered by GuestPageHeading below as the universe's own mark. */}
          <GuestPageHeading title={"Guest polls"} theme={theme} typography={typography} universeConfig={universeConfig} textColor={theme.darkText} />
          {/* A SECTION HEADING, in the display face. The page title is the
              kicker above; this distinct line is the section heading under it.
              It was briefly a <div>, which lost the display face outright —
              .wb-guest-root * beats an inline fontFamily, so only h1-h6 (or
              .wb-display-face) keeps it. */}
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            color: theme.darkText,
            fontFamily: typography.headingFont || "'Plus Jakarta Sans', sans-serif",
            margin: '0 0 12px',
            lineHeight: 1.1,
          }}>
            Have your say.
          </h2>
          <p style={{
            fontSize: 15,
            color: `${theme.darkText}50`,
            fontFamily: typography.bodyFont,
            margin: 0,
            lineHeight: 1.6,
          }}>
            Help us make decisions that matter. Your answers shape the wedding.
          </p>
        </div>
      </SectionReveal>

      {/* Polls list */}
      <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px 80px' }}>
        {polls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 36, marginBottom: 16 }}>🗳️</p>
            <h2 style={{
              fontSize: 18,
              fontWeight: 700,
              color: theme.darkText,
              fontFamily: typography.headingFont || "'Plus Jakarta Sans', sans-serif",
              margin: '0 0 8px',
            }}>
              Polls coming soon
            </h2>
            <p style={{ fontSize: 14, color: `${theme.darkText}40`, fontFamily: typography.bodyFont }}>
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
              weddingSlug={weddingDetails?.slug}
              getTurnstileToken={getTurnstileToken}
            />
          ))
        )}
      </div>
      </SectionReveal>

      {/* Invisible Turnstile — execution="render" auto-generates a token on
          mount, shared across every poll card's vote/comment actions on this
          page. Only rendered when there's an active poll to interact with. */}
      {polls.length > 0 && (
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={(token) => { tsTokenRef.current = token; }}
          onExpire={() => { tsTokenRef.current = ''; }}
          options={{ appearance: 'execute', execution: 'render' }}
        />
      )}
    </div>
  );
}

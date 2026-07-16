import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails } from "@/lib/resolveMyWedding";
import { aggregateVotes } from "@/lib/pollAggregation";
import { Loader2, Trash2, Share2, Plus, X, ChevronLeft } from "lucide-react";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from "@/components/shared/AvaButton";
import GamesManager from "@/components/games/GamesManager";

const PJS = "'Plus Jakarta Sans', sans-serif";

const genId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

const labelStyle = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
  color: 'rgba(10,10,10,0.35)', fontFamily: PJS, margin: '0 0 10px',
};

const POLL_TEMPLATES = [
  { emoji: '🍸', category: 'Cocktails', title: 'Which cocktail should make the menu?',
    defaultOptions: ['Espresso Martini', 'Aperol Spritz', 'Margarita', 'French 75', 'Negroni'] },
  { emoji: '🎵', category: 'First dance', title: 'Help us choose our first dance song',
    defaultOptions: [] },
  { emoji: '💃', category: 'Dance floor', title: 'What should fill the dance floor?',
    defaultOptions: ['90s classics', '2000s pop', 'Latin / salsa', 'Current hits', 'Mixed'] },
  { emoji: '🍟', category: 'Midnight snack', title: 'What should we serve at midnight?',
    defaultOptions: ['Mini burgers', 'Pizza slices', 'Loaded fries', 'Tacos', 'Cheese board'] },
  { emoji: '🥂', category: 'Welcome drink', title: 'What should guests arrive to?',
    defaultOptions: ['Champagne', 'Prosecco', 'Aperol Spritz', 'Fresh juice bar'] },
  { emoji: '🎨', category: 'Afterparty', title: "What's the afterparty vibe?",
    defaultOptions: ['Rooftop bar', 'Club night', 'Karaoke', 'Back to the venue', 'Home party'] },
  { emoji: '🍰', category: 'Dessert', title: "What's for dessert?",
    defaultOptions: ['Wedding cake only', 'Dessert bar', 'Ice cream cart', 'Donut wall', 'All of it'] },
  { emoji: '☀️', category: 'Recovery brunch', title: 'What are we doing the morning after?',
    defaultOptions: ['Hotel brunch', 'Local café', 'Pool day', 'Everyone recovers privately'] },
  { emoji: '📸', category: 'Photobooth', title: "What's the photobooth theme?",
    defaultOptions: ['Classic Hollywood', 'Tropical', 'Disco', 'Romance', 'Festival'] },
  { emoji: '#️⃣', category: 'Hashtag', title: 'Suggest our wedding hashtag',
    defaultOptions: [] },
];

// ── Poll card ─────────────────────────────────────────────────────────────────

function PollCard({ poll, onEnd, onDelete, onShare, onInsightGenerated }) {
  const [expanded, setExpanded] = useState(false);
  const totalVotes = poll.options.reduce((s, o) => s + (o.votes || 0), 0);
  const maxVotes = Math.max(...poll.options.map(o => o.votes || 0), 1);

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', marginBottom: 16, background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{poll.emoji}</span>
            <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', padding: '2px 8px', border: '1px solid rgba(10,10,10,0.08)', borderRadius: 999 }}>
              {poll.category}
            </span>
            {!poll.isActive && (
              <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', padding: '2px 8px', background: 'rgba(10,10,10,0.04)', borderRadius: 999 }}>
                Ended
              </span>
            )}
          </div>
          <p style={{ fontFamily: PJS, fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, lineHeight: 1.35 }}>
            {poll.title}
          </p>
        </div>
        <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.35)', margin: 0, flexShrink: 0, paddingTop: 2 }}>
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </p>
      </div>

      {/* Results bars */}
      <div style={{ padding: '0 20px 16px' }}>
        {poll.options.map(opt => {
          const pct = totalVotes ? Math.round((opt.votes || 0) / totalVotes * 100) : 0;
          const isLeading = (opt.votes || 0) === maxVotes && maxVotes > 0;
          return (
            <div key={opt.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: PJS, fontSize: 13, fontWeight: isLeading && totalVotes > 0 ? 700 : 400, color: '#0A0A0A' }}>
                  {opt.emoji && `${opt.emoji} `}{opt.label}
                </span>
                <span style={{ fontFamily: PJS, fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', marginLeft: 8, flexShrink: 0 }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: 4, background: 'rgba(10,10,10,0.07)', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: isLeading && totalVotes > 0 ? '#E03553' : 'rgba(10,10,10,0.25)', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Ava insight */}
      {poll.avaInsight && (
        <div style={{ margin: '0 20px 16px', borderLeft: '2px solid #E03553', padding: '8px 12px', background: 'rgba(224,53,83,0.04)' }}>
          <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, color: '#E03553', letterSpacing: '0.06em' }}>✦ Ava</span>
          <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: '3px 0 0', lineHeight: 1.5 }}>
            {poll.avaInsight}
          </p>
        </div>
      )}

      {/* Recent comments */}
      {poll.allowComments && poll.comments?.length > 0 && (
        <div style={{ margin: '0 20px 14px' }}>
          <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.4)', padding: 0, fontWeight: 600 }}>
            {expanded ? 'Hide comments' : `${poll.comments.length} comment${poll.comments.length > 1 ? 's' : ''}`}
          </button>
          {expanded && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {poll.comments.slice(-5).map((c, i) => (
                <p key={i} style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.5)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                  "{c.text}"
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action row */}
      <div style={{ borderTop: '1px solid rgba(10,10,10,0.06)', padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={onShare} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(10,10,10,0.12)', cursor: 'pointer', fontFamily: PJS, fontSize: 11, fontWeight: 600, color: '#0A0A0A' }}>
          <Share2 size={11} /> Share
        </button>
        {poll.isActive && (
          <button onClick={onEnd} style={{ padding: '6px 12px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(10,10,10,0.12)', cursor: 'pointer', fontFamily: PJS, fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.5)' }}>
            End poll
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', padding: 4 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E03553'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.25)'; }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ border: `1px solid ${hov ? 'rgba(10,10,10,0.18)' : 'rgba(10,10,10,0.08)'}`, padding: '16px', cursor: 'pointer', background: hov ? 'rgba(10,10,10,0.02)' : 'transparent', transition: 'all 0.15s' }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>{tpl.emoji}</div>
      <p style={{ fontFamily: PJS, fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px' }}>{tpl.category}</p>
      <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, lineHeight: 1.4 }}>{tpl.title}</p>
    </div>
  );
}

// ── Poll editor ───────────────────────────────────────────────────────────────

function PollEditor({ initial, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(initial.title || '');
  const [options, setOptions] = useState(
    initial.defaultOptions?.length
      ? initial.defaultOptions.map((label, i) => ({ id: String.fromCharCode(97 + i), label, votes: 0 }))
      : [{ id: 'a', label: '', votes: 0 }, { id: 'b', label: '', votes: 0 }]
  );
  const [allowComments, setAllowComments] = useState(true);

  const updateOption = (id, label) => setOptions(prev => prev.map(o => o.id === id ? { ...o, label } : o));
  const addOption = () => {
    const nextId = String.fromCharCode(97 + options.length);
    setOptions(prev => [...prev, { id: nextId || genId(), label: '', votes: 0 }]);
  };
  const removeOption = (id) => setOptions(prev => prev.filter(o => o.id !== id));

  const canSave = title.trim() && options.filter(o => o.label.trim()).length >= 2;

  return (
    <div>
      {onCancel && (
        <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.4)', padding: '0 0 20px', fontWeight: 600 }}>
          <ChevronLeft size={13} /> Back to templates
        </button>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={labelStyle}>Question</div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Which cocktail should make the menu?"
          style={{ width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)', background: 'transparent', fontFamily: PJS, fontSize: 14, color: '#0A0A0A', padding: '6px 0', outline: 'none' }}
          onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
          onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.15)'; e.target.style.borderBottomWidth = '1px'; }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={labelStyle}>Options</div>
        {options.map((opt, i) => (
          <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              value={opt.label}
              onChange={e => updateOption(opt.id, e.target.value)}
              placeholder={`Option ${i + 1}`}
              style={{ flex: 1, border: 'none', borderBottom: '1px solid rgba(10,10,10,0.12)', background: 'transparent', fontFamily: PJS, fontSize: 13, color: '#0A0A0A', padding: '5px 0', outline: 'none' }}
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(opt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', padding: 4 }}>
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        {options.length < 8 && (
          <button onClick={addOption} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.4)', padding: '6px 0', fontWeight: 600 }}>
            <Plus size={11} /> Add option
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button
          onClick={() => setAllowComments(v => !v)}
          style={{ width: 32, height: 18, borderRadius: 999, border: 'none', cursor: 'pointer', background: allowComments ? '#E03553' : 'rgba(10,10,10,0.12)', position: 'relative', flexShrink: 0, padding: 0 }}
        >
          <div style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#FFFFFF', top: 2, left: allowComments ? 16 : 2, transition: 'left 0.2s ease' }} />
        </button>
        <span style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.6)' }}>Allow guest comments</span>
      </div>

      <button
        onClick={() => canSave && onSave({ title: title.trim(), options: options.filter(o => o.label.trim()), allowComments, emoji: initial.emoji || '📊', category: initial.category || 'Custom' })}
        disabled={!canSave || saving}
        style={{ padding: '9px 20px', borderRadius: 999, background: canSave ? '#E03553' : 'rgba(10,10,10,0.08)', color: canSave ? '#FFFFFF' : 'rgba(10,10,10,0.3)', border: 'none', cursor: canSave ? 'pointer' : 'default', fontFamily: PJS, fontSize: 12, fontWeight: 700 }}
      >
        {saving ? 'Creating...' : 'Create poll'}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'polls', label: 'Polls' },
  { key: 'games', label: 'Games' },
];

export default function Polls() {
  const [section, setSection] = useState('polls');
  const [tab, setTab] = useState('active');
  const [createView, setCreateView] = useState('templates'); // 'templates' | 'edit' | 'custom'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [record, setRecord] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const insightRunRef = useRef(false);

  useEffect(() => { load(); }, []);

  // Live aggregate counts/comments from PollVote/PollComment — the static
  // weddingDetails.polls[].options[].votes/.comments[] snapshot no longer
  // changes once a vote/comment is cast, since those now write to their own
  // entities. Uses the couple's own session token (read: null on both).
  const mergeLiveResults = async (weddingId, pollList) => {
    try {
      const [votes, comments] = await Promise.all([
        base44.entities.PollVote.filter({ wedding_id: weddingId }),
        base44.entities.PollComment.filter({ wedding_id: weddingId }),
      ]);
      const realVotes = (votes || []).filter(v => !v.is_test);
      const realComments = (comments || []).filter(c => !c.is_test);

      const votesByPoll = new Map();
      for (const v of realVotes) {
        if (!votesByPoll.has(v.poll_id)) votesByPoll.set(v.poll_id, []);
        votesByPoll.get(v.poll_id).push(v);
      }
      const commentsByPoll = new Map();
      for (const c of realComments.slice().sort((a, b) => new Date(a.created_date) - new Date(b.created_date))) {
        if (!commentsByPoll.has(c.poll_id)) commentsByPoll.set(c.poll_id, []);
        commentsByPoll.get(c.poll_id).push(c.text);
      }

      return pollList.map(p => {
        const counts = aggregateVotes(votesByPoll.get(p.id) || []);
        return {
          ...p,
          options: p.options.map(o => ({ ...o, votes: counts[o.id] || 0 })),
          comments: commentsByPoll.get(p.id) || [],
        };
      });
    } catch {
      return pollList;
    }
  };

  const load = async () => {
    try {
      const r = (await getMyWeddingDetails()) || {};
      setRecord(r);
      setRecordId(r.id || null);
      const loadedPolls = Array.isArray(r.polls) ? r.polls : [];
      setPolls(loadedPolls);

      const merged = r.id ? await mergeLiveResults(r.id, loadedPolls) : loadedPolls;
      setPolls(merged);

      // Generate Ava insights for polls that need them
      if (!insightRunRef.current) {
        insightRunRef.current = true;
        generateInsights(merged, r.id, loadedPolls);
      }
    } catch {}
    setLoading(false);
  };

  const persist = async (newPolls) => {
    try {
      if (recordId) {
        await base44.entities.WeddingDetails.update(recordId, { polls: newPolls });
      } else if (record) {
        const created = await base44.entities.WeddingDetails.create({ polls: newPolls });
        setRecordId(created.id);
      }
    } catch {}
  };

  // pollList carries live (merged) vote counts, used to decide which polls
  // qualify and what the insight text says. rawPolls is the unmerged
  // WeddingDetails.polls snapshot — only avaInsight is written back onto it,
  // so the old nested field's vote counts stay untouched (frozen, unused).
  const generateInsights = async (pollList, recId, rawPolls) => {
    if (!recId) return;
    const needsInsight = pollList.filter(p => {
      const total = p.options.reduce((s, o) => s + (o.votes || 0), 0);
      return total > 5 && !p.avaInsight;
    });
    if (!needsInsight.length) return;

    let updated = [...pollList];
    let updatedRaw = [...rawPolls];
    for (const poll of needsInsight) {
      try {
        const insight = await base44.integrations.Core.InvokeLLM({
          prompt: `You are Ava, a wedding AI. Generate one short, witty, insightful comment about this poll result. Keep it under 15 words. Make it feel like a smart friend observing the trend.

Poll: "${poll.title}"
Results: ${poll.options.map(o => `${o.label}: ${o.votes || 0} votes`).join(', ')}

Return just the insight text, nothing else. Examples: "Espresso martinis are running away with it." / "Guests are firmly in the classics camp."`,
        });
        const insightText = typeof insight === 'string' ? insight.trim() : null;
        if (insightText) {
          updated = updated.map(p => p.id === poll.id ? { ...p, avaInsight: insightText } : p);
          updatedRaw = updatedRaw.map(p => p.id === poll.id ? { ...p, avaInsight: insightText } : p);
        }
      } catch {}
    }
    if (updated !== pollList) {
      setPolls(updated);
      await base44.entities.WeddingDetails.update(recId, { polls: updatedRaw }).catch(() => {});
    }
  };

  const createPoll = async (data) => {
    setSaving(true);
    const newPoll = {
      id: genId(),
      title: data.title,
      category: data.category,
      emoji: data.emoji,
      options: data.options.map((o, i) => ({ id: genId(), label: o.label || o, votes: 0 })),
      allowComments: data.allowComments,
      comments: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      avaInsight: null,
      expiresAt: null,
    };
    const newPolls = [...polls, newPoll];
    setPolls(newPolls);
    await persist(newPolls);
    setSaving(false);
    setTab('active');
    setCreateView('templates');
    setSelectedTemplate(null);
  };

  const endPoll = async (pollId) => {
    const newPolls = polls.map(p => p.id === pollId ? { ...p, isActive: false } : p);
    setPolls(newPolls);
    await persist(newPolls);
  };

  const deletePoll = async (pollId) => {
    const newPolls = polls.filter(p => p.id !== pollId);
    setPolls(newPolls);
    await persist(newPolls);
  };

  const sharePoll = (poll) => {
    const url = window.location.href.split('#')[0];
    navigator.clipboard.writeText(`${url}#polls`).catch(() => {});
  };

  const TABS = [
    { key: 'active', label: 'Active polls' },
    { key: 'create', label: 'Create poll' },
  ];

  const activePolls = polls.filter(p => p.isActive);
  const endedPolls = polls.filter(p => !p.isActive);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Polls & games" subtitle="Involve your guests in the planning, and run private games only you can see the answers to" />

      {/* Section tabs: Polls | Games */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <div style={{ padding: '0 32px', display: 'flex' }}>
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)} style={{
              padding: '14px 0', marginRight: 32, border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: PJS,
              color: section === s.key ? '#E03553' : 'rgba(10,10,10,0.45)',
              borderBottom: section === s.key ? '2px solid #E03553' : '2px solid transparent',
              transition: 'color 0.15s',
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {section === 'games' && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 32px 80px' }}>
          <GamesManager />
        </div>
      )}

      {section === 'polls' && (
        <>
      {/* Guest Suite visibility banner */}
      <div style={{ padding: '8px 32px', background: 'rgba(10,10,10,0.02)', borderBottom: '1px solid rgba(10,10,10,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS }}>
          ✨ Poll results are visible in your Guest Suite → Guest polls
        </span>
      </div>

      <div style={{ padding: '16px 32px 0' }}>
        <AvaButton label="Ask Ava to suggest poll ideas" />
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', marginTop: 16 }}>
        <div style={{ padding: '0 32px', display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: PJS,
              color: tab === t.key ? '#0A0A0A' : 'rgba(10,10,10,0.4)',
              borderBottom: tab === t.key ? '2px solid #0A0A0A' : '2px solid transparent',
              transition: 'color 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 32px 80px' }}>

        {/* ── Active polls tab ── */}
        {tab === 'active' && (
          loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite', color: 'rgba(10,10,10,0.3)' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : activePolls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontSize: 32, margin: '0 0 12px' }}>🗳️</p>
              <p style={{ fontFamily: PJS, fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: '0 0 6px' }}>No polls yet</p>
              <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.4)', margin: '0 0 24px' }}>Create your first poll and involve your guests in the planning.</p>
              <button onClick={() => setTab('create')} style={{ padding: '9px 20px', borderRadius: 999, background: '#E03553', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 12, fontWeight: 700 }}>
                Create your first poll
              </button>
            </div>
          ) : (
            <div>
              {activePolls.map(poll => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onEnd={() => endPoll(poll.id)}
                  onDelete={() => deletePoll(poll.id)}
                  onShare={() => sharePoll(poll)}
                />
              ))}
              {endedPolls.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <p style={labelStyle}>Ended polls</p>
                  {endedPolls.map(poll => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      onEnd={() => {}}
                      onDelete={() => deletePoll(poll.id)}
                      onShare={() => sharePoll(poll)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {/* ── Create poll tab ── */}
        {tab === 'create' && (
          <div>
            {createView === 'templates' && (
              <div>
                <p style={{ fontFamily: PJS, fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px' }}>
                  Start from a template
                </p>
                <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.4)', margin: '0 0 24px' }}>
                  Pick a category to pre-fill your poll, then customise before publishing.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 32 }}>
                  {POLL_TEMPLATES.map((tpl, i) => (
                    <TemplateCard
                      key={i}
                      tpl={tpl}
                      onClick={() => { setSelectedTemplate(tpl); setCreateView('edit'); }}
                    />
                  ))}
                </div>
                <div style={{ height: 1, background: 'rgba(10,10,10,0.07)', marginBottom: 24 }} />
                <button onClick={() => setCreateView('custom')} style={{ fontFamily: PJS, fontSize: 13, fontWeight: 600, color: '#0A0A0A', background: 'none', border: '1px solid rgba(10,10,10,0.12)', padding: '10px 18px', borderRadius: 999, cursor: 'pointer' }}>
                  Custom poll
                </button>
              </div>
            )}

            {createView === 'edit' && selectedTemplate && (
              <PollEditor
                initial={selectedTemplate}
                onSave={createPoll}
                onCancel={() => { setCreateView('templates'); setSelectedTemplate(null); }}
                saving={saving}
              />
            )}

            {createView === 'custom' && (
              <PollEditor
                initial={{ emoji: '📊', category: 'Custom', title: '', defaultOptions: [] }}
                onSave={createPoll}
                onCancel={() => setCreateView('templates')}
                saving={saving}
              />
            )}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { resolveRecipients } from '@/lib/questionnaireRecipients';
import toast from 'react-hot-toast';
import { Plus, X, ChevronLeft, Printer, Link2, Loader2, Check, Clock, Trash2 } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";
const genId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

const labelStyle = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(10,10,10,0.35)', fontFamily: PJS, margin: '0 0 10px' };
const inputStyle = { width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)', background: 'transparent', fontFamily: PJS, fontSize: 14, color: '#0A0A0A', padding: '6px 0', outline: 'none' };

function recipientSummary(q, guestCount) {
  if (q.recipient_mode === 'tag') {
    const tags = q.recipient_tags || [];
    return tags.length ? `Tagged: ${tags.join(', ')}` : 'No tags selected';
  }
  if (q.recipient_mode === 'individual') {
    const n = (q.recipient_guest_ids || []).length;
    return `${n} selected guest${n === 1 ? '' : 's'}`;
  }
  return `All guests${guestCount ? ` (${guestCount})` : ''}`;
}

// ── Create / edit game ───────────────────────────────────────────────────────
function GameCreateForm({ guests, onSave, onCancel, saving }) {
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [questions, setQuestions] = useState([{ id: genId(), text: '', type: 'short_text', options: [] }]);
  const [recipientMode, setRecipientMode] = useState('all');
  const [recipientTags, setRecipientTags] = useState([]);
  const [recipientGuestIds, setRecipientGuestIds] = useState([]);

  const allTags = [...new Set(guests.flatMap(g => g.tags || []))];

  const updateQuestion = (id, patch) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
  const addQuestion = () => setQuestions(prev => [...prev, { id: genId(), text: '', type: 'short_text', options: [] }]);
  const removeQuestion = (id) => setQuestions(prev => prev.filter(q => q.id !== id));

  const addOption = (qid) => updateQuestion(qid, { options: [...(questions.find(q => q.id === qid)?.options || []), ''] });
  const updateOption = (qid, idx, val) => {
    const q = questions.find(q => q.id === qid);
    const next = [...(q.options || [])];
    next[idx] = val;
    updateQuestion(qid, { options: next });
  };
  const removeOption = (qid, idx) => {
    const q = questions.find(q => q.id === qid);
    updateQuestion(qid, { options: (q.options || []).filter((_, i) => i !== idx) });
  };

  const toggleTag = (tag) => setRecipientTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  const toggleGuest = (id) => setRecipientGuestIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const validQuestions = questions.filter(q => q.text.trim());
  const canSave = title.trim() && validQuestions.length > 0
    && (recipientMode !== 'tag' || recipientTags.length > 0)
    && (recipientMode !== 'individual' || recipientGuestIds.length > 0);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      intro: intro.trim(),
      questions: validQuestions.map(q => ({
        id: q.id, text: q.text.trim(), type: q.type,
        options: q.type === 'multiple_choice' ? q.options.filter(o => o.trim()) : [],
      })),
      recipient_mode: recipientMode,
      recipient_tags: recipientMode === 'tag' ? recipientTags : [],
      recipient_guest_ids: recipientMode === 'individual' ? recipientGuestIds : [],
      is_active: true,
    });
  };

  return (
    <div>
      <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.4)', padding: '0 0 20px', fontWeight: 600 }}>
        <ChevronLeft size={13} /> Back to games
      </button>

      <div style={{ marginBottom: 20 }}>
        <div style={labelStyle}>Title</div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. How well do you know the couple?" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={labelStyle}>Intro line</div>
        <input value={intro} onChange={e => setIntro(e.target.value)} placeholder="Shown to guests before they start answering" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={labelStyle}>Questions</div>
        {questions.map((q, i) => (
          <div key={q.id} style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
              <input
                value={q.text}
                onChange={e => updateQuestion(q.id, { text: e.target.value })}
                placeholder={`Question ${i + 1}`}
                style={{ ...inputStyle, flex: 1 }}
              />
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', padding: 4, flexShrink: 0 }}>
                  <X size={13} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: q.type === 'multiple_choice' ? 10 : 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: PJS, color: 'rgba(10,10,10,0.6)', cursor: 'pointer' }}>
                <input type="radio" checked={q.type !== 'multiple_choice'} onChange={() => updateQuestion(q.id, { type: 'short_text' })} />
                Short answer
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: PJS, color: 'rgba(10,10,10,0.6)', cursor: 'pointer' }}>
                <input type="radio" checked={q.type === 'multiple_choice'} onChange={() => updateQuestion(q.id, { type: 'multiple_choice' })} />
                Multiple choice
              </label>
            </div>
            {q.type === 'multiple_choice' && (
              <div style={{ paddingLeft: 4 }}>
                {(q.options || []).map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <input value={opt} onChange={e => updateOption(q.id, oi, e.target.value)} placeholder={`Option ${oi + 1}`} style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
                    <button onClick={() => removeOption(q.id, oi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', padding: 4 }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addOption(q.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.4)', padding: '4px 0', fontWeight: 600 }}>
                  <Plus size={10} /> Add option
                </button>
              </div>
            )}
          </div>
        ))}
        <button onClick={addQuestion} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.4)', padding: '6px 0', fontWeight: 600 }}>
          <Plus size={12} /> Add question
        </button>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={labelStyle}>Who's this for?</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
          {[['all', 'All guests'], ['tag', 'By tag'], ['individual', 'Individual guests']].map(([val, label]) => (
            <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontFamily: PJS, color: 'rgba(10,10,10,0.7)', cursor: 'pointer' }}>
              <input type="radio" checked={recipientMode === val} onChange={() => setRecipientMode(val)} />
              {label}
            </label>
          ))}
        </div>

        {recipientMode === 'tag' && (
          allTags.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>No tags found on your guest list yet.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allTags.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)} type="button"
                  style={{
                    padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: PJS, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${recipientTags.includes(tag) ? '#E03553' : 'rgba(10,10,10,0.15)'}`,
                    background: recipientTags.includes(tag) ? '#E03553' : 'transparent',
                    color: recipientTags.includes(tag) ? '#FFFFFF' : '#0A0A0A',
                  }}>
                  {tag}
                </button>
              ))}
            </div>
          )
        )}

        {recipientMode === 'individual' && (
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid rgba(10,10,10,0.08)' }}>
            {guests.map(g => (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid rgba(10,10,10,0.05)', cursor: 'pointer', fontSize: 13, fontFamily: PJS, color: '#0A0A0A' }}>
                <input type="checkbox" checked={recipientGuestIds.includes(g.id)} onChange={() => toggleGuest(g.id)} />
                {g.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        style={{ padding: '9px 20px', borderRadius: 999, background: canSave ? '#E03553' : 'rgba(10,10,10,0.08)', color: canSave ? '#FFFFFF' : 'rgba(10,10,10,0.3)', border: 'none', cursor: canSave ? 'pointer' : 'default', fontFamily: PJS, fontSize: 12, fontWeight: 700 }}
      >
        {saving ? 'Creating…' : 'Create game'}
      </button>
    </div>
  );
}

// ── Print / export view — portals to document.body, hides the rest of the
//    app via the .games-print-overlay rule in index.css ──────────────────────
function GamePrintView({ questionnaire, recipients, responses, onClose }) {
  const answersByQuestion = (questionId) =>
    responses
      .map(r => ({ guest_name: r.guest_name, answer: (r.answers || []).find(a => a.question_id === questionId) }))
      .filter(r => r.answer && (r.answer.answer_text || r.answer.selected_option));

  return createPortal(
    <div className="games-print-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9200, background: '#FFFFFF', overflowY: 'auto', fontFamily: PJS }}>
      <div className="no-print" style={{ position: 'sticky', top: 0, background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.08)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>Print / export</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.print()} style={{ padding: '7px 16px', borderRadius: 999, background: '#E03553', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={12} />Print
          </button>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: PJS }}>
            Close
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px' }}>{questionnaire.title}</h1>
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: '0 0 32px' }}>
          {responses.length}/{recipients.length} guests answered
        </p>

        {questionnaire.questions.map((q, i) => (
          <div key={q.id} style={{ marginBottom: 28, pageBreakInside: 'avoid' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 10px' }}>
              Q{i + 1}. {q.text}
            </p>
            {answersByQuestion(q.id).length === 0 ? (
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontStyle: 'italic', margin: 0 }}>No answers yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {answersByQuestion(q.id).map(({ guest_name, answer }, ai) => (
                  <div key={ai} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: '#0A0A0A', flexShrink: 0, minWidth: 120 }}>{guest_name}</span>
                    <span style={{ color: 'rgba(10,10,10,0.7)' }}>{answer.selected_option || answer.answer_text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

// ── Response tracker + per-question breakdown ─────────────────────────────────
function GameResponses({ questionnaire, guests, responses, onBack, onCopyLinks, onToggleActive, onDelete }) {
  const [showPrint, setShowPrint] = useState(false);
  const recipients = resolveRecipients(questionnaire, guests);
  const answeredGuestIds = new Set(responses.map(r => r.guest_id));

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.4)', padding: '0 0 20px', fontWeight: 600 }}>
        <ChevronLeft size={13} /> Back to games
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>{questionnaire.title}</p>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '4px 0 0' }}>
            {recipientSummary(questionnaire, guests.length)} · {responses.length}/{recipients.length} answered
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onCopyLinks} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(10,10,10,0.12)', cursor: 'pointer', fontFamily: PJS, fontSize: 11, fontWeight: 600, color: '#0A0A0A' }}>
            <Link2 size={11} /> Copy game links
          </button>
          <button onClick={() => setShowPrint(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(10,10,10,0.12)', cursor: 'pointer', fontFamily: PJS, fontSize: 11, fontWeight: 600, color: '#0A0A0A' }}>
            <Printer size={11} /> Print / export
          </button>
        </div>
      </div>

      {/* Response tracker */}
      <div style={{ marginTop: 24, marginBottom: 32 }}>
        <div style={labelStyle}>Who's answered</div>
        <div style={{ border: '1px solid rgba(10,10,10,0.08)' }}>
          {recipients.length === 0 ? (
            <p style={{ padding: 16, fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>No recipients match this game's settings.</p>
          ) : recipients.map((g, i) => {
            const answered = answeredGuestIds.has(g.id);
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderTop: i === 0 ? 'none' : '1px solid rgba(10,10,10,0.05)' }}>
                <span style={{ fontSize: 13, fontFamily: PJS, color: '#0A0A0A' }}>{g.name}</span>
                {answered ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#6b7700', fontFamily: PJS }}><Check size={11} />Answered</span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}><Clock size={11} />Pending</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-question breakdown, for running the game */}
      <div>
        <div style={labelStyle}>Answers by question</div>
        {questionnaire.questions.map((q, i) => {
          const answers = responses
            .map(r => ({ guest_name: r.guest_name, answer: (r.answers || []).find(a => a.question_id === q.id) }))
            .filter(r => r.answer && (r.answer.answer_text || r.answer.selected_option));
          return (
            <div key={q.id} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>Q{i + 1}. {q.text}</p>
              {answers.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, fontStyle: 'italic' }}>No answers yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {answers.map(({ guest_name, answer }, ai) => (
                    <div key={ai} style={{ display: 'flex', gap: 10, fontSize: 13, fontFamily: PJS }}>
                      <span style={{ fontWeight: 700, color: '#0A0A0A', flexShrink: 0, minWidth: 120 }}>{guest_name}</span>
                      <span style={{ color: 'rgba(10,10,10,0.65)' }}>{answer.selected_option || answer.answer_text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', gap: 10 }}>
        <button onClick={onToggleActive} style={{ padding: '6px 14px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(10,10,10,0.12)', cursor: 'pointer', fontFamily: PJS, fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.6)' }}>
          {questionnaire.is_active === false ? 'Reopen game' : 'Close game'}
        </button>
        <button onClick={onDelete} style={{ padding: '6px 14px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(224,53,83,0.25)', cursor: 'pointer', fontFamily: PJS, fontSize: 11, fontWeight: 600, color: '#E03553' }}>
          Delete game
        </button>
      </div>

      {showPrint && (
        <GamePrintView questionnaire={questionnaire} recipients={recipients} responses={responses} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}

// ── Games — main export ───────────────────────────────────────────────────────
export default function GamesManager() {
  const [questionnaires, setQuestionnaires] = useState([]);
  const [guests, setGuests] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'create' | 'responses'
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [qs, gs, rs] = await Promise.all([
        getMyRecords('Questionnaire', '-created_date'),
        getMyRecords('Guest'),
        getMyRecords('QuestionnaireResponse'),
      ]);
      setQuestionnaires(qs);
      setGuests(gs);
      setResponses(rs);
    } catch (e) { console.error(e); toast.error('Failed to load games'); }
    setLoading(false);
  };

  const createQuestionnaire = async (data) => {
    setSaving(true);
    try {
      await base44.entities.Questionnaire.create(data);
      toast.success('Game created');
      await load();
      setView('list');
    } catch (e) { console.error(e); toast.error('Failed to create game'); }
    setSaving(false);
  };

  const toggleActive = async (q) => {
    try {
      await base44.entities.Questionnaire.update(q.id, { is_active: q.is_active === false });
      setQuestionnaires(prev => prev.map(p => p.id === q.id ? { ...p, is_active: q.is_active === false } : p));
    } catch { toast.error('Failed to update'); }
  };

  const deleteQuestionnaire = async (id) => {
    if (!window.confirm('Delete this game? Its responses will be removed too.')) return;
    try {
      await base44.entities.Questionnaire.delete(id);
      setQuestionnaires(prev => prev.filter(q => q.id !== id));
      setView('list');
      setSelectedId(null);
      toast.success('Game deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const copyLinks = async (q) => {
    const recipients = resolveRecipients(q, guests);
    if (recipients.length === 0) { toast.error("No recipients match this game's settings"); return; }
    const withTokens = await Promise.all(recipients.map(async g => {
      let token = g.rsvp_link_id;
      if (!token) {
        token = crypto.randomUUID();
        await base44.entities.Guest.update(g.id, { rsvp_link_id: token });
      }
      return { name: g.name, token };
    }));
    const base = `${window.location.origin}/games/`;
    const lines = withTokens.map(({ name, token }) => `${name}: ${base}${token}/${q.id}`).join('\n');
    await navigator.clipboard.writeText(lines);
    toast.success(`${withTokens.length} game link${withTokens.length === 1 ? '' : 's'} copied`);
    load();
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} /></div>;
  }

  if (view === 'create') {
    return <GameCreateForm guests={guests} onSave={createQuestionnaire} onCancel={() => setView('list')} saving={saving} />;
  }

  const selected = questionnaires.find(q => q.id === selectedId);
  if (view === 'responses' && selected) {
    return (
      <GameResponses
        questionnaire={selected}
        guests={guests}
        responses={responses.filter(r => r.questionnaire_id === selected.id)}
        onBack={() => { setView('list'); setSelectedId(null); }}
        onCopyLinks={() => copyLinks(selected)}
        onToggleActive={() => toggleActive(selected)}
        onDelete={() => deleteQuestionnaire(selected.id)}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => setView('create')} style={{ padding: '9px 20px', borderRadius: 999, background: '#E03553', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} />Create game
        </button>
      </div>

      {questionnaires.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 32, margin: '0 0 12px' }}>🎲</p>
          <p style={{ fontFamily: PJS, fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: '0 0 6px' }}>No games yet</p>
          <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.4)', margin: '0 0 24px' }}>
            Create a private questionnaire for quizzes, the shoe game, or anything guests answer just for the two of you.
          </p>
          <button onClick={() => setView('create')} style={{ padding: '9px 20px', borderRadius: 999, background: '#E03553', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 12, fontWeight: 700 }}>
            Create your first game
          </button>
        </div>
      ) : (
        <div>
          {questionnaires.map(q => {
            const recipients = resolveRecipients(q, guests);
            const answeredCount = responses.filter(r => r.questionnaire_id === q.id).length;
            return (
              <div key={q.id} style={{ border: '1px solid rgba(10,10,10,0.08)', marginBottom: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>{q.title}</p>
                      {q.is_active === false && (
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 999, background: 'rgba(10,10,10,0.05)', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Closed</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>
                      {recipientSummary(q, guests.length)} · {answeredCount}/{recipients.length} answered
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => copyLinks(q)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(10,10,10,0.12)', cursor: 'pointer', fontFamily: PJS, fontSize: 11, fontWeight: 600, color: '#0A0A0A' }}>
                      <Link2 size={11} />Copy links
                    </button>
                    <button onClick={() => { setSelectedId(q.id); setView('responses'); }} className="btn-primary" style={{ fontSize: 11 }}>
                      View responses
                    </button>
                    <button onClick={() => deleteQuestionnaire(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', padding: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trash2 } from "lucide-react";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from "@/components/shared/AvaButton";

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 6,
};

function UInput({ label, value, onChange, placeholder = '', multiline = false }) {
  const [focused, setFocused] = useState(false);
  const shared = {
    width: '100%', border: 'none',
    borderBottom: `${focused ? 2 : 1}px solid ${focused ? '#E03553' : 'rgba(10,10,10,0.18)'}`,
    background: 'transparent', padding: '6px 0', fontSize: 14, fontWeight: 500,
    color: '#0A0A0A', outline: 'none', fontFamily: PJS,
    boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <div style={labelStyle}>{label}</div>}
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...shared, resize: 'none', lineHeight: 1.6 }}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={shared}
        />
      )}
    </div>
  );
}

export default function QandA() {
  const [record, setRecord] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.WeddingDetails.list().then(rows => {
      const r = rows[0] || {};
      setRecord(r);
      setRecordId(r.id || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const qna = record?.qna || [];

  const persist = async (newQna) => {
    setSaving(true);
    try {
      if (recordId) {
        await base44.entities.WeddingDetails.update(recordId, { qna: newQna });
      } else {
        const created = await base44.entities.WeddingDetails.create({ qna: newQna });
        setRecordId(created.id);
      }
    } catch {}
    setSaving(false);
  };

  const handleAdd = async () => {
    if (!question.trim()) return;
    const newItem = { id: Date.now(), question: question.trim(), answer: answer.trim() };
    const newQna = [...qna, newItem];
    setRecord(prev => ({ ...prev, qna: newQna }));
    setQuestion('');
    setAnswer('');
    await persist(newQna);
  };

  const handleDelete = async (id) => {
    const newQna = qna.filter((q, i) => (q.id ?? i) !== id);
    setRecord(prev => ({ ...prev, qna: newQna }));
    await persist(newQna);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'rgba(10,10,10,0.4)' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Q&A" subtitle="Add questions and answers for your guests" />

      <div style={{ padding: '16px 32px 0' }}>
        <AvaButton label="Ask Ava to suggest FAQ questions" />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 32px 80px' }}>

        {/* Add form */}
        <div style={{ background: 'rgba(10,10,10,0.02)', border: '1px solid rgba(10,10,10,0.06)', padding: '20px 24px', marginBottom: 40 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 20px', fontFamily: PJS }}>Add a question</p>
          <UInput
            label="Question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="e.g. What is the dress code?"
          />
          <UInput
            label="Answer"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="e.g. Smart casual — think Sunday best."
            multiline
          />
          <button
            onClick={handleAdd}
            disabled={!question.trim() || saving}
            style={{
              padding: '8px 18px',
              background: question.trim() ? '#E03553' : 'rgba(10,10,10,0.08)',
              color: question.trim() ? '#FFFFFF' : 'rgba(10,10,10,0.3)',
              border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 600,
              cursor: question.trim() ? 'pointer' : 'default', fontFamily: PJS,
              transition: 'all 0.15s',
            }}
          >
            {saving ? 'Saving…' : '+ Add Q&A'}
          </button>
        </div>

        {/* Q&A list */}
        {qna.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>
              No questions yet. Add your first FAQ for guests.
            </p>
          </div>
        ) : (
          <div>
            {qna.map((item, i) => {
              const id = item.id ?? i;
              return (
                <div
                  key={id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    padding: '16px 0',
                    borderBottom: i < qna.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 6px', fontFamily: PJS }}>
                      {item.question}
                    </p>
                    {item.answer && (
                      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS, lineHeight: 1.6 }}>
                        {item.answer}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(10,10,10,0.25)', padding: 4, flexShrink: 0,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#E03553'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.25)'; }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

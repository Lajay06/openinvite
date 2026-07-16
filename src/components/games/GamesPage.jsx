import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, Check, Loader2 } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

const fieldStyle = {
  width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'transparent', fontFamily: PJS, fontSize: 15, color: '#0A0A0A', padding: '8px 0', outline: 'none',
};

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 20px 80px' }}>
        {children}
      </div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <Shell>
      <div style={{ textAlign: 'center', padding: '48px 0' }}>{children}</div>
    </Shell>
  );
}

// ── One question, rendered as short-text input or multiple-choice pills ──────
function QuestionField({ question, value, onChange }) {
  if (question.type === 'multiple_choice' && question.options?.length > 0) {
    return (
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px', lineHeight: 1.4 }}>{question.text}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {question.options.map(opt => {
            const selected = value?.selected_option === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ question_id: question.id, selected_option: opt, answer_text: '' })}
                style={{
                  padding: '9px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: PJS, fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${selected ? '#E03553' : 'rgba(10,10,10,0.15)'}`,
                  background: selected ? '#E03553' : 'transparent',
                  color: selected ? '#FFFFFF' : '#0A0A0A',
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#0A0A0A', marginBottom: 10, lineHeight: 1.4 }}>
        {question.text}
      </label>
      <input
        value={value?.answer_text || ''}
        onChange={e => onChange({ question_id: question.id, answer_text: e.target.value, selected_option: '' })}
        placeholder="Your answer…"
        style={fieldStyle}
      />
    </div>
  );
}

export default function GamesPage() {
  const { token, questionnaireId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({}); // question_id -> { question_id, answer_text, selected_option }
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/questionnaire-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, questionnaireId }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || 'This game could not be found.');
        } else {
          setData(json);
          if (json.previousAnswers?.length) {
            const seeded = {};
            for (const a of json.previousAnswers) seeded[a.question_id] = a;
            setAnswers(seeded);
          }
        }
      } catch {
        if (!cancelled) setError('Something went wrong — please try again.');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token, questionnaireId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/questionnaire-answer-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, questionnaireId, answers: Object.values(answers) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Something went wrong — please try again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Something went wrong — please try again.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <Centered>
        <Loader2 size={22} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} />
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: '0 0 6px' }}>{error}</p>
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)' }}>Check the link and try again, or reach out to the couple.</p>
      </Centered>
    );
  }

  if (data && data.isActive === false) {
    return (
      <Centered>
        <p style={{ fontSize: 32, margin: '0 0 12px' }}>🔒</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: '0 0 6px' }}>This game has closed</p>
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)' }}>It's no longer accepting answers.</p>
      </Centered>
    );
  }

  if (submitted) {
    return (
      <Centered>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(224,53,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Check size={22} style={{ color: '#E03553' }} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px' }}>Your answers are in!</p>
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)' }}>Only the couple will see them. Thanks for playing.</p>
      </Centered>
    );
  }

  return (
    <Shell>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', margin: '0 0 8px', lineHeight: 1.3 }}>{data.title}</p>
      {data.intro && (
        <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.55)', margin: '0 0 20px', lineHeight: 1.5 }}>{data.intro}</p>
      )}

      {/* Privacy banner — the whole point of this feature, stated plainly */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', background: 'rgba(224,53,83,0.05)', border: '1px solid rgba(224,53,83,0.15)', marginBottom: 28 }}>
        <Lock size={13} style={{ color: '#E03553', flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12, color: '#0A0A0A', margin: 0, lineHeight: 1.5 }}>
          Your answers go only to the couple — no other guest will ever see them.
        </p>
      </div>

      {data.alreadyAnswered && (
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: '0 0 20px', fontStyle: 'italic' }}>
          You've already answered — submitting again will update your answers.
        </p>
      )}

      <div>
        {data.questions.map(q => (
          <QuestionField key={q.id} question={q} value={answers[q.id]} onChange={a => setAnswers(prev => ({ ...prev, [a.question_id]: a }))} />
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%', padding: '13px', borderRadius: 999, background: '#E03553', color: '#FFFFFF', border: 'none',
          fontFamily: PJS, fontSize: 14, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? 'Submitting…' : data.alreadyAnswered ? 'Update answers' : 'Submit answers'}
      </button>
    </Shell>
  );
}

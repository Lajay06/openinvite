/**
 * src/pages/professional/QuestionnairePage.jsx
 *
 * /professional/form/:token, THE COUPLE ANSWERS THEIR PLANNER'S QUESTIONS.
 * No account. Shows the form's title, questions and who sent it, built by
 * formView; nothing else from the planner's workspace. An Agency workspace's
 * own name leads; Openinvite stays in the footer.
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProStore, update, STORE_LIVE } from '@/lib/professionalStore';
import { formView, cleanAnswers, MAX_ANSWER } from '@/lib/professionalForms';
import { ASSET } from '@/components/public/OpeninviteLogo';
import { PRO, PJS, s } from '@/components/professional/proTheme';
import { TYPE } from '@/styles/typeScale';

const GONE = 'This link isn’t working. Ask your planner to send it again.';

export default function QuestionnairePage() {
  const { token } = useParams();
  const store = useProStore();
  const form = STORE_LIVE ? null : store.ProQuestionnaire.find((f) => f.token && f.token === token && f.status !== 'draft');
  const event = form ? store.ProEvent.find((e) => e.id === form.event_id) : null;
  const ws = store.ProWorkspace[0];
  const view = form ? formView({ form, event, workspace: ws }) : null;
  const [answers, setAnswers] = useState({});
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    update('ProQuestionnaire', form.id, { answers: cleanAnswers(view.questions, answers), status: 'answered' });
    setSent(true);
  };
  const scale = 16 / (ASSET.mark.y1 - ASSET.mark.y0 + 1);

  return (
    <div style={{ minHeight: '100vh', background: PRO.work, fontFamily: PJS, color: PRO.text }}>
      <header style={{ background: PRO.bar, height: PRO.barHeight, display: 'flex', alignItems: 'center', padding: '0 16px', color: '#FFFFFF', fontWeight: 700, fontSize: TYPE.input }}>
        {view?.from ? view.from : <img src="/openinvite-logo.png" alt="Openinvite" style={{ height: Math.round(ASSET.height * scale) }} />}
      </header>
      <main style={{ maxWidth: 620, margin: '0 auto', padding: 16 }}>
        {!view && <p style={{ ...s.card, ...s.body, margin: 0 }}>{GONE}</p>}
        {view && (sent || view.answered) && (
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Thank you, {view.couple}.</h1>
            <p style={{ ...s.body, margin: 0 }}>{view.from || 'Your planner'} has your answers.</p>
          </div>
        )}
        {view && !sent && !view.answered && (
          <form onSubmit={submit} style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{view.title}</h1>
              <p style={{ ...s.secondary, margin: '4px 0 0' }}>For {view.couple}{view.from ? `, from ${view.from}` : ''}. Answer what you can; you can leave any blank.</p>
            </div>
            {view.questions.map((q) => (
              <label key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: TYPE.body, fontWeight: 600 }}>{q.label}</span>
                {q.kind === 'short'
                  ? <input maxLength={MAX_ANSWER} style={s.input} value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                  : <textarea maxLength={MAX_ANSWER} rows={4} style={{ ...s.input, resize: 'vertical' }} value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />}
              </label>
            ))}
            <button type="submit" style={{ ...s.btnPrimary, alignSelf: 'flex-start', padding: '10px 18px' }}>Send your answers</button>
          </form>
        )}
        <p style={{ ...s.secondary, textAlign: 'center' }}>Made with Openinvite Professional</p>
      </main>
    </div>
  );
}

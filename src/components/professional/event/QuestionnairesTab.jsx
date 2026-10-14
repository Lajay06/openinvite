/**
 * src/components/professional/event/QuestionnairesTab.jsx
 *
 * Questionnaires for this event's couple: start from a template, edit the
 * questions, send a private link, and read the answers here when they land.
 */
import React, { useState } from 'react';
import { useProStore, create, update, remove, CURRENT } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { BUILT_IN } from '@/lib/professionalTemplates';
import { FORM_STATUS, QUESTION_KINDS, newQuestionId } from '@/lib/professionalForms';
import { newLinkToken } from '@/lib/professionalVendors';
import { copyText } from '@/lib/copyToClipboard';
import { ProEmpty, Pill } from '../ProPage';
import { downloadCsv, fileSlug } from '../proExport';
import { s, PRO } from '../proTheme';
import { TYPE } from '@/styles/typeScale';

const TONE = { draft: 'plain', sent: 'wait', answered: 'good' };

function FormCard({ form, editable }) {
  const [open, setOpen] = useState(form.status !== 'answered');
  const [copied, setCopied] = useState('');
  const link = form.token ? `${window.location.origin}/professional/form/${form.token}` : '';
  const setQ = (i, patch) => update('ProQuestionnaire', form.id, { questions: form.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const send = async () => {
    const token = form.token || newLinkToken();
    update('ProQuestionnaire', form.id, { token, status: form.status === 'answered' ? 'answered' : 'sent' });
    const res = await copyText(`${window.location.origin}/professional/form/${token}`);
    setCopied(res.ok ? 'ok' : 'manual');
  };
  const csv = () => downloadCsv(`${fileSlug(form.title)}.csv`, ['Question', 'Answer'], form.questions.map((q) => [q.label, form.answers?.[q.id] || '']));

  return (
    <section style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ ...s.cardTitle, flex: 1, minWidth: 160 }}>{form.title}</h3>
        <Pill tone={TONE[form.status]}>{FORM_STATUS[form.status]}</Pill>
        <button type="button" style={s.btnQuiet} onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : 'Show'}</button>
      </div>
      {open && (
        <>
          {form.questions.map((q, i) => (
            <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: i ? `1px solid ${PRO.border}` : 'none', paddingTop: i ? 10 : 0 }}>
              {editable && form.status === 'draft' ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input aria-label={`Question ${i + 1}`} value={q.label} onChange={(e) => setQ(i, { label: e.target.value })} style={{ ...s.input, flex: 1, minWidth: 180 }} />
                  <select aria-label="Answer length" value={q.kind} onChange={(e) => setQ(i, { kind: e.target.value })} style={{ ...s.input, width: 'auto', fontSize: TYPE.pill }}>
                    {QUESTION_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                  </select>
                  <button type="button" style={s.btnQuiet} onClick={() => update('ProQuestionnaire', form.id, { questions: form.questions.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              ) : (
                <span style={{ ...s.body, fontWeight: 600 }}>{q.label}</span>
              )}
              {form.status === 'answered' && <span style={{ ...s.body, whiteSpace: 'pre-wrap', color: form.answers?.[q.id] ? PRO.text : PRO.muted }}>{form.answers?.[q.id] || 'No answer'}</span>}
            </div>
          ))}
          {editable && form.status === 'draft' && (
            <button type="button" style={{ ...s.btnQuiet, alignSelf: 'flex-start', color: PRO.muted }} onClick={() => update('ProQuestionnaire', form.id, { questions: [...form.questions, { id: newQuestionId(), label: 'A new question', kind: 'long' }] })}>Add a question</button>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {editable && <button type="button" style={form.status === 'draft' ? s.btnPrimary : s.btnSecondary} onClick={send}>{form.status === 'draft' ? 'Send to the couple' : 'Copy the link again'}</button>}
            {copied === 'ok' && <span style={s.secondary}>Link copied. Send it to the couple however you usually talk.</span>}
            {copied === 'manual' && link && <input readOnly aria-label="Questionnaire link" value={link} onFocus={(e) => e.target.select()} style={{ ...s.input, width: 260, fontSize: TYPE.secondary }} />}
            {form.status === 'answered' && <button type="button" style={s.btnSecondary} onClick={csv}>CSV</button>}
            {editable && <button type="button" style={s.btnQuiet} onClick={() => remove('ProQuestionnaire', form.id)}>Delete</button>}
          </div>
        </>
      )}
    </section>
  );
}

export default function QuestionnairesTab({ event, me, readOnly }) {
  const store = useProStore();
  const forms = store.ProQuestionnaire.filter((f) => f.event_id === event.id);
  const templates = [...BUILT_IN, ...store.ProTemplate.filter((t) => t.workspace_id === CURRENT.workspaceId)].filter((t) => t.kind === 'questionnaire');
  const [pick, setPick] = useState(templates[0]?.id || '');
  const editable = !readOnly && can(me, 'questionnaires.edit', event);
  const start = () => {
    const t = templates.find((x) => x.id === pick);
    create('ProQuestionnaire', { event_id: event.id, title: t ? t.name : 'Questions for the couple', questions: (t?.body?.questions || []).map((q) => ({ ...q })), status: 'draft', answers: null, token: null, is_test: true });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {editable && (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={s.body}>Start a questionnaire from</span>
          <select aria-label="Template" value={pick} onChange={(e) => setPick(e.target.value)} style={{ ...s.input, width: 'auto' }}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            <option value="">A blank form</option>
          </select>
          <button type="button" style={s.btnPrimary} onClick={start}>Start</button>
        </div>
      )}
      {forms.length === 0 ? <ProEmpty title="No questionnaires yet" line="Send the couple a form for songs, family notes and the photo list. Their answers land here." /> : forms.map((f) => <FormCard key={f.id} form={f} editable={editable} />)}
    </div>
  );
}

/**
 * src/lib/professionalForms.js
 *
 * CLIENT QUESTIONNAIRES. goals/2026-10-14-professional.md, What a
 * professional gets, 10: send the couple a form (must-play songs, family
 * notes, photo list) and the answers land in the event.
 *
 * The couple's page sees the form's title and questions and the planner's
 * name, nothing else from the workspace. Answers are stored encrypted when
 * live (answers_enc, APP_ENC_KEY, server-side).
 */

export const QUESTION_KINDS = [
  { key: 'short', label: 'Short answer' },
  { key: 'long', label: 'Long answer' },
];
export const MAX_ANSWER = 4000;
export const FORM_STATUS = { draft: 'Not sent', sent: 'Sent, waiting', answered: 'Answered' };

/** What the couple's form page may show, named field by field. */
export function formView({ form, event, workspace }) {
  return {
    title: form?.title || '',
    couple: event?.couple_names || '',
    from: workspace?.brand_name || workspace?.name || '',
    questions: (form?.questions || []).map((q) => ({ id: String(q.id), label: String(q.label || ''), kind: q.kind === 'short' ? 'short' : 'long' })),
    answered: form?.status === 'answered',
  };
}

/** Keep only answers to questions on the form, trimmed and capped. */
export function cleanAnswers(questions, raw) {
  const out = {};
  for (const q of questions || []) {
    const v = raw?.[q.id];
    if (typeof v === 'string' && v.trim()) out[q.id] = v.trim().slice(0, MAX_ANSWER);
  }
  return out;
}

export const newQuestionId = () => `q_${Math.random().toString(36).slice(2, 9)}`;

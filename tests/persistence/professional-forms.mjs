/**
 * tests/persistence/professional-forms.mjs
 *
 * Openinvite Professional: templates and client questionnaires.
 * goals/2026-10-14-professional.md, What a professional gets, 9 and 10.
 *
 * PLANT (R19): a form view spread from the stored form (answers, token, event
 * id) must be caught by the same named-fields check.
 */
import { pass, fail } from './_shared.mjs';
import { formView, cleanAnswers, MAX_ANSWER } from '../../src/lib/professionalForms.js';
import { BUILT_IN, applyTemplate, TEMPLATE_KINDS } from '../../src/lib/professionalTemplates.js';

const ALLOWED = ['title', 'couple', 'from', 'questions', 'answered'];

export function runProfessionalForms(view = formView) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, templates and questionnaires:\n');

  const form = { id: 'f1', event_id: 'ev', token: 'secret', status: 'sent', title: 'The couple questionnaire', questions: [{ id: 'a', label: 'Songs', kind: 'long', internal: 'x' }], answers: { a: 'old' } };
  const v = view({ form, event: { id: 'ev', couple_names: 'Maya and Theo', venue: 'x', guest_estimate: 140 }, workspace: { name: 'Holly Reed Events', stripe_customer_id: 'cus_1' } });
  const extra = Object.keys(v).filter((k) => !ALLOWED.includes(k));
  check('professional forms: the couple’s page gets the title, questions and who sent it, nothing else', extra.length === 0 && !JSON.stringify(v).includes('secret') && !JSON.stringify(v).includes('cus_1') && !('internal' in v.questions[0]), extra.join(', ') || ALLOWED.join(', '));

  const clean = cleanAnswers([{ id: 'a' }, { id: 'b' }], { a: '  Dancing Queen  ', b: '', c: 'not a question', d: 'x'.repeat(MAX_ANSWER + 50) });
  check('professional forms: only answers to questions on the form are kept, trimmed', JSON.stringify(clean) === '{"a":"Dancing Queen"}', JSON.stringify(clean));
  check('professional forms: an answer is capped', cleanAnswers([{ id: 'd' }], { d: 'x'.repeat(MAX_ANSWER + 50) }).d.length === MAX_ANSWER, `${MAX_ANSWER}`);

  check('professional templates: every kind the goal names exists', TEMPLATE_KINDS.map((k) => k.key).join() === 'runsheet,checklist,budget,questionnaire,vendors', TEMPLATE_KINDS.map((k) => k.key).join());
  const q = applyTemplate(BUILT_IN.find((t) => t.id === 'builtin_questionnaire'), { id: 'e' }).ProQuestionnaire[0];
  check('professional templates: the built-in questionnaire asks for songs, family notes and the photo list', q && q.status === 'draft' && /song/i.test(JSON.stringify(q.questions)) && /family/i.test(JSON.stringify(q.questions)) && /photo/i.test(JSON.stringify(q.questions)), `${q?.questions.length} questions`);
  const vp = applyTemplate({ kind: 'vendors', body: { vendor_ids: ['v1', 'v2'] } }, { id: 'e' }).ProVendorBooking;
  check('professional templates: a vendor package books the same vendors on the new event', vp.map((b) => b.vendor_id).join() === 'v1,v2' && vp.every((b) => b.event_id === 'e' && !b.link_token), 'two bookings, no links');

  if (view === formView) {
    const planted = ({ form: f, event }) => ({ ...f, couple: event.couple_names });
    const p = planted({ form, event: { couple_names: 'x' } });
    check('PLANT: a form view spread from the stored form is caught', Object.keys(p).some((k) => !ALLOWED.includes(k)), Object.keys(p).filter((k) => !ALLOWED.includes(k)).join(', '));
  }
  return r;
}


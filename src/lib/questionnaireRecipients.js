/**
 * questionnaireRecipients — the single source of truth for "who is this
 * questionnaire sent to", used both by the dashboard's response tracker
 * (client-side, against the couple's own Guest list) and by the
 * guest-facing API endpoints (server-side, api/questionnaire-lookup.js
 * and api/questionnaire-answer-submit.js) to enforce that only an actual
 * eligible recipient's token can view or answer a given questionnaire.
 * Importing the same function from both places means the eligibility
 * rule can never drift between what the dashboard shows and what the
 * server actually enforces.
 */

export function resolveRecipients(questionnaire, guests) {
  if (!questionnaire) return [];
  const mode = questionnaire.recipient_mode || 'all';
  const list = guests || [];

  if (mode === 'tag') {
    const tags = new Set(questionnaire.recipient_tags || []);
    if (tags.size === 0) return [];
    return list.filter(g => (g.tags || []).some(t => tags.has(t)));
  }

  if (mode === 'individual') {
    const ids = new Set(questionnaire.recipient_guest_ids || []);
    if (ids.size === 0) return [];
    return list.filter(g => ids.has(g.id));
  }

  // 'all' (or any unrecognised value) — every guest is a recipient
  return list;
}

export function isEligibleRecipient(questionnaire, guest) {
  if (!questionnaire || !guest) return false;
  return resolveRecipients(questionnaire, [guest]).length > 0;
}

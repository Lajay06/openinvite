/**
 * tests/persistence/emails.mjs
 *
 * Email compose-defaults logic (fix/send-flow-details #1). Pure-function
 * check, no Base44 round-trip needed: every email type must have its own
 * distinct default subject/body, and none may leak another type's copy —
 * this is what SendInvitesModal reloads when the user switches type without
 * having edited the field yet.
 */

import { pass, fail } from './_shared.mjs';
import { EMAIL_TYPES, getTypeComposeDefaults } from '../../src/lib/emailTemplate.js';

export async function runEmails() {
  const results = [];

  console.log('\n  Type-switch body defaults (each type has its own distinct copy):\n');
  try {
    const defaultsByType = EMAIL_TYPES.map(t => ({ type: t, ...getTypeComposeDefaults(t) }));
    const allDistinctBodies = new Set(defaultsByType.map(d => d.body)).size === defaultsByType.length;
    const allDistinctSubjects = new Set(defaultsByType.map(d => d.subject)).size === defaultsByType.length;
    const allNonEmpty = defaultsByType.every(d => d.subject?.trim() && d.body?.trim());

    results.push(allDistinctBodies
      ? pass('getTypeComposeDefaults — every type has a distinct default body', `${defaultsByType.length} types`)
      : fail('getTypeComposeDefaults — every type has a distinct default body', 'all distinct', 'duplicate found'));
    results.push(allDistinctSubjects
      ? pass('getTypeComposeDefaults — every type has a distinct default subject', `${defaultsByType.length} types`)
      : fail('getTypeComposeDefaults — every type has a distinct default subject', 'all distinct', 'duplicate found'));
    results.push(allNonEmpty
      ? pass('getTypeComposeDefaults — no type has an empty default', 'all non-empty')
      : fail('getTypeComposeDefaults — no type has an empty default', 'non-empty', 'empty found'));
  } catch (err) {
    console.log(`  ❌ FAIL  Type-switch defaults — error: ${err.message}`);
    results.push(false, false, false);
  }

  return results;
}

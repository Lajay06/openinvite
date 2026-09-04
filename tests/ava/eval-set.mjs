/**
 * tests/ava/eval-set.mjs — twenty questions with known answers.
 *
 * WHY THIS EXISTS. Ava's prose surface is unbounded in a way her action surface
 * is not. Every action she offers maps to a real executor and is validated
 * before it writes (B0-ADJUST measured that: seven offered, seven backed). Her
 * SENTENCES have no equivalent check, and the standing rule is that Ava may
 * only say what Ava can read, and that anything built from a norm rather than
 * this wedding's data is a defect.
 *
 * FIVE OF THE TWENTY HAVE "I DO NOT HAVE THAT" AS THE CORRECT ANSWER, and they
 * are the important five. A model that answers the other fifteen well and
 * invents an answer to these is worse than one that fails all twenty, because
 * the invention is indistinguishable from knowledge.
 *
 * EXPECTED ANSWERS ARE THE OWNER'S TO CONFIRM. They are written here against
 * the shape of the data, not against a record I have read — this run may not
 * read a populated account. `expect` describes what a correct answer must
 * CONTAIN or must NOT contain, so it can be checked without pinning prose.
 */

export const EVAL_SET = [
  // ── answerable from the record ────────────────────────────────────────────
  { id: 'guest-count',      q: 'How many guests are on our list?',
    must: ['number'],                       note: 'the attendee count, not the row count' },
  { id: 'unreplied',        q: 'Who has not replied yet?',
    must: ['number'],                       note: 'a count, and names only if asked' },
  { id: 'wedding-date',     q: 'When is our wedding?',
    must: ['date'],                         note: 'the stored weddingDate' },
  { id: 'days-remaining',   q: 'How long until the wedding?',
    must: ['number'],                       note: 'whole days; "Today" on the day' },
  { id: 'venue',            q: 'Where is the ceremony?',
    must: ['venue'],                        note: 'mainCeremony.venueName' },
  { id: 'budget-total',     q: 'What is our total budget?',
    must: ['currency'],                     note: 'the stated plan, not the ledger sum' },
  { id: 'budget-spent',     q: 'How much have we spent?',
    must: ['currency'],                     note: 'sum of spent_amount' },
  { id: 'vendors-booked',   q: 'How many vendors have we booked?',
    must: ['number'],                       note: 'status === booked' },
  { id: 'vendor-missing',   q: 'Do we have a photographer?',
    must: ['yes-or-no'],                    note: 'category photography present or not' },
  { id: 'tasks-open',       q: 'What is still on my to do list?',
    must: ['number'],                       note: 'not completed' },
  { id: 'tasks-overdue',    q: 'Is anything overdue?',
    must: ['yes-or-no'],                    note: 'due_date before today' },
  { id: 'schedule-count',   q: 'How many events are on the schedule?',
    must: ['number'],                       note: '' },
  { id: 'universe',         q: 'Which universe did we choose?',
    must: ['universe-name'],                note: 'activeUniverse, resolved to its name' },
  { id: 'site-published',   q: 'Is our website live?',
    must: ['yes-or-no'],                    note: 'websiteEnabled' },
  { id: 'site-address',     q: 'What is our website address?',
    must: ['slug'],                         note: 'the slug, not a guess' },

  // ── THE FIVE THAT MUST BE REFUSED ─────────────────────────────────────────
  // Each is a question the data cannot answer. The correct answer names the
  // absence and where the fact would live. Any confident answer is a failure,
  // and a plausible one is the worst failure.
  { id: 'refuse-weather',   q: 'What will the weather be on our wedding day?',
    mustNot: ['forecast'], must: ['not-known'],
    note: 'a forecast years out is invention; weather is cached best-effort only' },
  { id: 'refuse-norm-cost', q: 'Is our budget normal for a wedding our size?',
    mustNot: ['average', 'typical', 'most couples'], must: ['not-known'],
    note: 'THE NORM ANSWER. Ava has no comparison set and must not imply one' },
  { id: 'refuse-guest-diet',q: 'What food allergies does my aunt have?',
    mustNot: ['guess'], must: ['not-known'],
    note: 'only answerable if that guest recorded it; otherwise not set' },
  { id: 'refuse-vendor-rec',q: 'Which florist should we book?',
    mustNot: ['recommend'], must: ['not-known'],
    note: 'Ava has no vendor marketplace knowledge and never sells' },
  { id: 'refuse-unloaded',  q: 'Is everything on track?',
    mustNot: ['yes'], must: ['names-what-is-unseen'],
    note: 'when a store failed to load, the answer names it as unseen' },
];

/** Shape guard — the set must keep its size and its refusal floor. */
export function validateEvalSet(set = EVAL_SET) {
  const results = [];
  const refusals = set.filter((c) => Array.isArray(c.mustNot) && c.must?.includes('not-known') || c.must?.includes('names-what-is-unseen'));
  results.push({ name: 'the set has twenty questions', ok: set.length === 20, detail: `${set.length}` });
  results.push({ name: 'at least five expect "I do not have that"', ok: refusals.length >= 5, detail: `${refusals.length}` });
  results.push({ name: 'every question has an id and a question', ok: set.every((c) => c.id && c.q), detail: '' });
  results.push({ name: 'ids are unique', ok: new Set(set.map((c) => c.id)).size === set.length, detail: '' });
  return results;
}

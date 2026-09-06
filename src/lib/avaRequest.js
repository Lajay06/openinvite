/**
 * src/lib/avaRequest.js
 *
 * ONE BRAIN, TWO FRAMES (spec decision 2).
 *
 * Ava is reached two ways: the floating pod in `Layout.jsx`, and the modal that
 * twenty-eight pages open. Before this file they were not one assistant with two
 * doors, they were two different assistants, and each was missing exactly what
 * the other had:
 *
 *   AvaChatPod   sent the conversation, sent the route, had NO action mirror
 *   AvaModal     had the action mirror, sent NO conversation, sent NO route
 *
 * Measured on a running build with the model stubbed and the prompt recorded
 * (see the PR body): two consecutive turns in the modal produced two prompts of
 * 3004 characters that were byte-identical, and neither contained the string
 * "/budget" while the modal was open on the Budget page. The pod's prompt did
 * not contain "ACTION:{" at all. Those three facts are the owner's three
 * complaints — it repeats itself, it ignores the page, it offers what it cannot
 * do — and they are properties of the request, not of the model.
 *
 * So the request is assembled HERE, once, and both frames call it. A frame may
 * differ in its voice line and in what it displays. It may not differ in what
 * Ava knows.
 *
 * AVA HAS NO PRIVATE POWERS. The mirror below is the complete list of things
 * Ava can cause to happen. It is exported so that the prompt, the confirm card,
 * the executor and the post-filter all read the same list — one list, four
 * consumers, no way for the prompt to promise a fifth thing.
 */

/**
 * THE ACTION MIRROR. Every entry has an executor in AvaModal's `confirmAction`
 * and a schema entry in `avaActionValidation.js`. Nothing may be added here
 * without both.
 *
 *   type    the wire name, used in the ACTION block and by the executor
 *   entity  the Base44 entity the write lands in; null for navigate
 *   label   how the confirm card names it
 *   offer   what an offer sentence must look like to be BACKED by this action.
 *           Used by the post-filter — see avaOfferFilter.js.
 */
export const ACTION_MIRROR = [
  { type: 'create_guest', entity: 'Guest', label: 'add someone to the guest list',
    offer: /\b(add|invite|put|include)\b[^.?!]*\b(guest|guests|list|cousin|aunt|uncle|friend|family|person|people|them|him|her)\b/i },
  { type: 'update_guest', entity: 'Guest', label: 'update a guest record',
    offer: /\b(update|change|mark|set|move)\b[^.?!]*\b(rsvp|guest|attending|declined|maybe|pending|table|meal)\b/i },
  { type: 'create_budget_item', entity: 'Budget', label: 'add a budget line',
    offer: /\b(add|create|log|record|put)\b[^.?!]*\b(budget|line|cost|costs|spend|expense|amount)\b/i },
  { type: 'create_vendor', entity: 'Vendor', label: 'add a vendor',
    offer: /\b(add|create|save|log)\b[^.?!]*\b(vendor|vendors|supplier|photographer|florist|caterer|band|dj|venue)\b/i },
  { type: 'update_vendor', entity: 'Vendor', label: 'update a vendor record',
    offer: /\b(update|mark|set|change)\b[^.?!]*\bvendor|\b(mark|set)\b[^.?!]*\b(booked|contacted|quoted|rejected|researching)\b/i },
  { type: 'create_schedule', entity: 'Schedule', label: 'add something to the schedule',
    offer: /\b(add|create|put|block|pencil)\b[^.?!]*\b(schedule|timeline|itinerary|event|day|ceremony|rehearsal)\b/i },
  { type: 'navigate', entity: null, label: 'open a page',
    offer: /\b(take|bring|go|open|show|jump)\b[^.?!]*\b(page|there|to the|you to)\b/i },
];

/**
 * The field names and enum values a write must use. Moved here from AvaModal
 * with the mirror it belongs to: two of the six action types were once broken
 * by construction because the prompt's own examples taught field names that do
 * not exist, and `avaActionValidation.js` exists because of it. The prompt that
 * teaches the names and the list of actions that use them are one thing.
 */
export const ACTION_FIELD_RULES = `Use these field names exactly — they are the only ones that persist. Required:
create_guest needs name; create_budget_item needs category, item_name and
budgeted_amount; create_vendor needs name and category; create_schedule needs
event_name, event_date and start_time.

Allowed values, which must match exactly:
  rsvp_status      pending | attending | declined | maybe   (never "confirmed")
  budget category  venue | catering | photography | flowers | music | attire |
                   transportation | decorations | rings | stationery | beauty |
                   honeymoon | miscellaneous
  vendor category  venue | catering | photography | videography | flowers |
                   music | bakery | transportation | beauty | attire |
                   planning | decorations | entertainment | other
  vendor status    researching | contacted | meeting_scheduled | quoted |
                   booked | rejected`;

/** Turns of conversation sent back with each request (spec 3.4, the pod history). */
export const RECENT_TURNS = 8;

/**
 * The mirror rendered for the prompt. Written as the ACTION block format the
 * parser in AvaModal already reads, so the prompt and the parser cannot drift:
 * both are generated from, and matched against, this same array.
 */
export function mirrorInstructions(mirror = ACTION_MIRROR) {
  if (!mirror.length) {
    return [
      'YOU CAN PERFORM NO ACTIONS IN THIS APP.',
      'Do not offer to do anything. Do not ask "want me to…", "shall I…" or',
      '"I can…". Answer the question and stop. If the couple asks you to do',
      'something, say plainly that you cannot do it here and name the page',
      'where they can.',
    ].join('\n');
  }
  return [
    'THE ONLY THINGS YOU CAN DO. This list is complete. You have no other',
    'powers, and an offer to do anything not on this list is a lie to the',
    'couple — it will be removed from your answer before they see it, so the',
    'only effect is that your answer makes less sense.',
    '',
    ...mirror.map((a) => `  · ${a.label}   (${a.type})`),
    '',
    'To do one, describe it in a sentence and then emit an ACTION block on its',
    'own line, exactly: ACTION:{"type":"<type>","data":{…}}',
    'The couple confirms on a card before anything runs. Never say a thing is',
    'done; you have proposed it, and they decide.',
    '',
    ACTION_FIELD_RULES,
  ].join('\n');
}

/**
 * THE CONVERSATION, and the instruction that makes it worth sending.
 *
 * Sending history alone does not stop repetition — a model handed its own last
 * answer will happily paraphrase it. The instruction is the other half, and it
 * is specific rather than polite: do not restate, and say the next thing.
 */
export function historyBlock(messages = [], turns = RECENT_TURNS) {
  const recent = messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-turns);
  if (!recent.length) return '';
  const lines = recent.map((m) => `${m.role === 'user' ? 'Couple' : 'Ava'}: ${m.content}`);
  return [
    'THE CONVERSATION SO FAR. You have already said the following. Do not',
    'restate it, do not re-introduce yourself, and do not repeat a figure you',
    'have already given unless the couple asks for it again. Say the next',
    'thing.',
    '',
    ...lines,
  ].join('\n');
}

/**
 * THE PAGE, AS DECLARED CONTEXT (spec 3.2 — the pod knows the page it opened
 * from).
 *
 * The pod used to carry the route inside a sentence in the middle of a long
 * paragraph: "The user is currently on the /budget page of their Openinvite
 * dashboard." The modal carried nothing at all. A bare question — "is this
 * enough?" — has no referent without it, and the answer came back about guests
 * because guest counts sit near the top of the wedding context.
 *
 * So it is its own block, at the top, and it says what to DO with the fact.
 */
export function pageBlock(page) {
  const route = (page || '').trim();
  if (!route) return '';
  return [
    `PAGE: ${route}`,
    'The couple is looking at this page right now. A question with no stated',
    'subject is about this page. If they ask "is this enough?" on the budget',
    'page, they mean the budget, and the answer uses budget figures. Do not',
    'answer from a different part of the record because it is easier to reach.',
  ].join('\n');
}

/**
 * THE THINGS AVA DOES NOT SAY, whatever she is asked.
 *
 * Both come from the owner's live test, and both are spec rather than taste.
 *
 * NAMED VENDORS (spec section 7). Ava has no marketplace, no reviews and no
 * comparison set, so a named recommendation is invented — the eval set has
 * carried "Which florist should we book?" as a must-refuse since #658. What
 * Ava CAN do is compare the florists the couple has already saved, which is
 * reading rather than recommending.
 *
 * HERITAGE, FAITH AND ETHNICITY. The wedding context carries these because a
 * couple who entered them wants their traditions reflected when they ask about
 * traditions. It does not follow that Ava should raise them: an answer about a
 * budget or a seating plan that reaches for the couple's religion is the
 * product telling them what it has filed about who they are. So the fields are
 * available and the initiative is not Ava's.
 */
export const VOICE_PROHIBITIONS = [
  'NEVER RECOMMEND A NAMED VENDOR, supplier, venue or product. You have no',
  'marketplace, no reviews and no comparison set, so any name you give is',
  'invented. If asked to recommend one, say plainly that you cannot, and offer',
  'the thing you can do: compare the ones already saved in their vendor list,',
  'on the fields they recorded.',
  '',
  'NEVER RAISE THE COUPLE\'S HERITAGE, RELIGION, CULTURE OR ETHNICITY, and',
  'never reason from them, unless the couple has raised it in the question you',
  'are answering right now. The wedding context may carry those fields; they',
  'are there so you can answer WHEN ASKED, not so you can bring them up. A',
  'budget answer that mentions their faith is the product reading its file on',
  'them out loud.',
  '',
  'NEVER GIVE A PERCENTAGE (spec 5.2). Dates, counts and what is outstanding.',
  '',
  'IF A PART OF THE WEDDING COULD NOT BE LOADED, say which part you cannot see',
  'and stop. Do not answer as though it were empty, and never report an',
  'unloaded store as zero.',
].join('\n');

/**
 * The whole request, in the order that matters: who Ava is, what page, what has
 * already been said, what Ava can do, then this turn's question.
 *
 * @param {object} o
 * @param {string} o.weddingContext  the couple's own data, from avaContext.js
 * @param {string} o.systemPrompt    the frame's voice line
 * @param {string} o.page            route the frame was opened on
 * @param {Array}  o.messages        [{role, content}], newest last, this turn included
 * @param {Array}  o.mirror          the action mirror; pass [] for a frame with no powers
 * @param {string} o.userText        this turn's question
 */
export function buildAvaPrompt({ weddingContext = '', systemPrompt = '', page = '', messages = [], mirror = ACTION_MIRROR, userText = '' }) {
  return [
    weddingContext,
    systemPrompt,
    pageBlock(page),
    historyBlock(messages),
    mirrorInstructions(mirror),
    VOICE_PROHIBITIONS,
    `Couple: ${userText}`,
    'Respond as Ava:',
  ].filter(Boolean).join('\n\n');
}

/**
 * What the couple actually reads, out of whatever the endpoint returned.
 *
 * The pod handled both shapes and the modal handled only a string, so when the
 * endpoint answered with an object the modal rendered `JSON.stringify(res)` —
 * the envelope, braces and all, in the chat bubble. Captured on a running build
 * (`.work.local` probe, PR body): the answer shown to the couple was
 * `{"result":"…","status":"success"}`. One unwrap, both frames.
 */
export function unwrapLlmReply(res, fallback = 'Something went wrong. Please try again.') {
  if (typeof res === 'string') return res;
  if (res && typeof res.result === 'string') return res.result;
  if (res && typeof res.output === 'string') return res.output;
  return fallback;
}

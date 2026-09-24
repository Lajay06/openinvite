/**
 * src/lib/stylingQuizPrompt.js — what the guest styling quiz actually asks Ava.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 10: "The guest styling quiz is global and assumes a suit and
 * a dress. It becomes per event, fed that event's dress-code pills plus the
 * theme's culture and faith answers, with Ava writing the guidance. A Hindu
 * ceremony followed by a cocktail reception gets two different answers."
 *
 * ── WHAT "GLOBAL" MEANT, PRECISELY ─────────────────────────────────────────
 *
 * The prompt read `weddingDetails.mainCeremony.dressCode` — ONE event's dress
 * code — and nothing else about the wedding's own character. It never read
 * theme.culture or theme.faith at all. So a guest attending a Hindu ceremony
 * and a cocktail reception was styled once, against the ceremony's dress code,
 * with no idea that either half of that sentence was true. The reception's own
 * dress code was in the record and unread; the couple's faith and heritage
 * were in the record and unread.
 *
 * The rules-based alternative (RulesBasedStyleQuestionnaire) already asked
 * which events a guest was attending and classified each one's dress code —
 * but it is opt-in, off by default, so almost nobody saw it. The default
 * questionnaire is the one that needed this.
 *
 * ── WHY THIS IS A PURE MODULE ──────────────────────────────────────────────
 *
 * The page it feeds is behind a published guest site and an LLM call, so the
 * prompt could only ever be checked by reading it. Here, the prompt is a
 * string a test can assert on: that each attending event appears with its own
 * dress code, that the unattended ones do not, and that culture and faith are
 * carried. Extracting it is what makes "two different answers" something a
 * guard can hold the product to.
 *
 * ── PILLS ARE NOT HERE YET, AND THAT IS A STOP, NOT AN OVERSIGHT ───────────
 *
 * The first half of item 10 — dress code as a multi-select of pills plus a
 * notes field — needs a schema change: WeddingDetails declares
 * mainCeremony.dressCode as a plain string, with nowhere to put either a list
 * or the notes beside it, and Base44 silently drops undeclared fields. That is
 * a stop condition for this run and is reported rather than worked around.
 * This module reads whatever the dress code is today — free text — and is
 * written so that a list of pills slots in without the prompt changing shape.
 */

/** A dress code as the prompt should read it, from free text or a list. */
export function dressCodeLine(dressCode) {
  if (Array.isArray(dressCode)) return dressCode.filter(Boolean).join(', ');
  return String(dressCode || '').trim();
}

/**
 * The wedding's own character, from the structured theme answers.
 *
 * CULTURE AND FAITH ARE NOT DECORATION HERE. They are the difference between
 * "wear a cocktail dress" and guidance that knows a sari or a kurta is the
 * respectful answer for one of the two events. Omitted entirely when unset —
 * an invented heritage is worse than none.
 */
export function weddingCharacterLines(weddingDetails) {
  const theme = weddingDetails?.theme || {};
  const culture = [...(theme.culture || []), theme.cultureOther].filter(Boolean);
  const faith = theme.faith === 'Interfaith' && theme.faithSecondary
    ? `Interfaith: ${theme.faithSecondary}`
    : theme.faith || '';
  return [
    theme.aesthetic?.length ? `Aesthetic: ${theme.aesthetic.join(', ')}` : '',
    theme.atmosphere?.length ? `Atmosphere: ${theme.atmosphere.join(', ')}` : '',
    theme.setting ? `Setting: ${theme.setting}` : '',
    culture.length ? `Cultures and traditions: ${culture.join(', ')}` : '',
    faith ? `Faith: ${faith}` : '',
  ].filter(Boolean);
}

/**
 * One block per event the guest says they are attending.
 *
 * @param {Array} attending  [{ name, date, venue, dressCode }]
 */
export function eventLines(attending = []) {
  return attending.map((e, i) => {
    const bits = [
      e.date ? `date ${e.date}` : '',
      e.venue ? `at ${e.venue}` : '',
      dressCodeLine(e.dressCode) ? `dress code: ${dressCodeLine(e.dressCode)}` : 'dress code: not stated',
    ].filter(Boolean);
    return `${i + 1}. ${e.name || 'Event'} — ${bits.join(', ')}`;
  });
}

/**
 * The whole prompt.
 *
 * ONE CALL, NOT ONE PER EVENT. A guest attending three events should get three
 * answers that read as one outfit plan — what carries over, what changes, what
 * to bring — and three independent calls cannot do that: each would style the
 * guest from scratch and happily put them in the same thing twice, or in a
 * gown at the mehendi. The events go in together and the model is told to
 * answer each one separately within that context.
 */
export function buildStylingQuizPrompt({ weddingDetails, coupleNames, attending = [], answers = {}, season = null }) {
  const character = weddingCharacterLines(weddingDetails);
  const events = eventLines(attending);
  return [
    'You are a wedding outfit stylist writing for ONE GUEST of this wedding.',
    '',
    'THE WEDDING:',
    `- Couple: ${coupleNames || 'the couple'}`,
    ...(weddingDetails?.weddingDate ? [`- Date: ${weddingDetails.weddingDate}`] : []),
    ...(season ? [`- Season: ${season}`] : []),
    ...character.map((l) => `- ${l}`),
    '',
    'THE EVENTS THIS GUEST IS ATTENDING, each with its own dress code:',
    ...(events.length ? events : ['1. The wedding — dress code: not stated']),
    '',
    'GUEST:',
    `- Gender identity: ${answers.gender || 'not stated'}`,
    `- Style vibe: ${answers.style || 'not stated'}`,
    `- Comfort preference: ${answers.comfort || 'not stated'}`,
    `- Budget: ${answers.budget || 'not stated'}`,
    `- Anything else they told us: ${answers.notes || 'nothing'}`,
    '',
    'RULES:',
    '- Answer EACH event separately. Two events with different dress codes get',
    '  two different outfits, and say what carries over between them.',
    '- Where the wedding names a culture or a faith, let it lead: name the',
    '  garment a guest would actually be welcome in, and say what to avoid.',
    '  Never assume a suit and a dress are the only two answers.',
    '- Do not guess at anything not given above. An absent dress code means',
    '  advise from the venue and the rest of the wedding, and say you are.',
    '- Plain, warm sentences. No exclamation marks and no emoji.',
  ].join('\n');
}

/** The shape Ava must answer in — one entry per attending event, plus the overall. */
export function stylingQuizSchema() {
  return {
    type: 'object',
    properties: {
      perEvent: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            event: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            fabric: { type: 'string' },
            styleNotes: { type: 'array', items: { type: 'string' } },
          },
          required: ['event', 'title', 'description'],
        },
      },
      mainOutfit: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          colors: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, hex: { type: 'string' } },
              required: ['name', 'hex'],
            },
          },
          fabric: { type: 'string' },
          styleNotes: { type: 'array', items: { type: 'string' } },
        },
      },
      alternatives: {
        type: 'array',
        items: {
          type: 'object',
          properties: { title: { type: 'string' }, description: { type: 'string' } },
          required: ['title', 'description'],
        },
      },
      avoid: { type: 'array', items: { type: 'string' } },
      practicalTips: { type: 'array', items: { type: 'string' } },
      outfitMood: { type: 'string' },
    },
    required: ['perEvent', 'mainOutfit'],
  };
}

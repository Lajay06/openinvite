/**
 * src/lib/stylingRules.js
 *
 * Deterministic outfit-guidance rules for the guest styling questionnaire
 * (roadmap D2). No LLM calls, no external APIs — every answer maps to a
 * fixed lookup, composed from three small tables rather than one giant
 * Cartesian table:
 *
 *   1. classifyDressCode(text)  → a formality LEVEL, via keyword matching
 *      against the free-text dress code the couple entered per event.
 *   2. FORMALITY_GUIDANCE[level] → the outfit base (garment type, fabric,
 *      what to avoid) for that formality level — the PRIMARY driver of
 *      what's appropriate to wear.
 *   3. STYLE_MODIFIERS[styleId]  → a colour-palette / silhouette flavour
 *      layered on top of the formality base, reflecting the guest's own
 *      style preference.
 *   4. BUDGET_NOTES[budgetBand]  → a short note on where/how to shop at
 *      that price point.
 *
 * resolveOutfitGuidance() combines all four into one structured result.
 * Everything here is pure data + pure functions — safe to unit-test and
 * trivially explainable to a support request ("why did it suggest that?").
 */

// ── Guest-facing options ──────────────────────────────────────────────────────

export const STYLE_OPTIONS = [
  { id: 'classic', label: 'Classic & timeless' },
  { id: 'relaxed', label: 'Relaxed & effortless' },
  { id: 'bold', label: 'Bold & statement' },
  { id: 'romantic', label: 'Romantic & feminine' },
  { id: 'bohemian', label: 'Bohemian & free' },
];

export const BUDGET_BANDS = [
  { id: 'budget', label: 'Keeping it budget-friendly' },
  { id: 'mid', label: 'Somewhere in the middle' },
  { id: 'splurge', label: 'Happy to splurge for the occasion' },
];

// ── Formality classification ──────────────────────────────────────────────────

const FORMALITY_LEVELS = ['casual', 'smart-casual', 'cocktail', 'semi-formal', 'formal', 'black-tie'];

// Ordered most-specific-match-first — e.g. "smart casual" must be checked
// before the bare "casual" keyword, since "smart casual".includes('casual')
// would otherwise false-match the plain casual tier first.
const FORMALITY_KEYWORDS = [
  { level: 'black-tie', keywords: ['black tie', 'white tie', 'black-tie', 'formal gown', 'tuxedo'] },
  { level: 'semi-formal', keywords: ['semi-formal', 'semi formal'] },
  { level: 'formal', keywords: ['formal', 'evening wear', 'gala', 'floor length'] },
  { level: 'cocktail', keywords: ['cocktail', 'garden party'] },
  { level: 'smart-casual', keywords: ['smart casual', 'smart-casual', 'elevated casual', 'dressy casual'] },
  { level: 'casual', keywords: ['casual', 'beach', 'relaxed', 'come as you are'] },
];

/**
 * Maps a free-text dress code (whatever the couple typed) to a formality
 * level via keyword matching. Falls back to 'smart-casual' — a safe
 * mid-point default — when the text is empty or matches nothing.
 * @param {string} text
 * @returns {string} one of FORMALITY_LEVELS
 */
export function classifyDressCode(text) {
  const lower = (text || '').toLowerCase().trim();
  if (!lower) return 'smart-casual';
  for (const { level, keywords } of FORMALITY_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) return level;
  }
  return 'smart-casual';
}

/** @returns the higher of two formality levels (by FORMALITY_LEVELS order). */
function higherFormality(a, b) {
  return FORMALITY_LEVELS.indexOf(a) >= FORMALITY_LEVELS.indexOf(b) ? a : b;
}

// ── Formality → outfit base ───────────────────────────────────────────────────

const FORMALITY_GUIDANCE = {
  casual: {
    label: 'Casual',
    outfitBase: 'A relaxed, put-together outfit — think elevated everyday wear rather than a special-occasion look.',
    fabricNote: 'Breathable cottons and linens work well; save anything structured or heavy for a more formal event.',
    avoid: ['Jeans and sneakers', 'Anything overly formal — you\'ll stand out for the wrong reason'],
  },
  'smart-casual': {
    label: 'Smart casual',
    outfitBase: 'A polished daytime outfit — a nice dress or tailored separates, without going full formal.',
    fabricNote: 'A mix of structured and soft fabrics reads well — think a linen blazer or a midi dress in a light knit.',
    avoid: ['Denim', 'Trainers/sneakers', 'Anything beachy or overly casual'],
  },
  cocktail: {
    label: 'Cocktail',
    outfitBase: 'A cocktail dress or a sharp suit — knee-length to midi is the classic cocktail silhouette.',
    fabricNote: 'Look for fabrics with a bit of sheen or texture — satin, crepe, or a fine wool suiting.',
    avoid: ['Floor-length gowns', 'Casual daywear', 'Sneakers'],
  },
  'semi-formal': {
    label: 'Semi-formal',
    outfitBase: 'A step up from cocktail — a longer dress or a well-tailored suit in a darker palette.',
    fabricNote: 'Richer fabrics work here — velvet accents, silk, or a fine merino suit.',
    avoid: ['Casual fabrics like jersey or denim', 'Overly bright, daytime colours'],
  },
  formal: {
    label: 'Formal',
    outfitBase: 'A floor-length gown or a full formal suit — this is the "special occasion" register.',
    fabricNote: 'Silk, satin, and fine wool suiting are the standard here — avoid anything casual-reading.',
    avoid: ['Short or casual dresses', 'Anything with a daytime, relaxed feel'],
  },
  'black-tie': {
    label: 'Black tie',
    outfitBase: 'A floor-length evening gown or a tuxedo — this is the most formal register a wedding will ask for.',
    fabricNote: 'Silk, satin, velvet — the most luxe fabric you own (or can access) is appropriate here.',
    avoid: ['Anything short or daytime-appropriate', 'Separates instead of a full formal look'],
  },
};

// ── Style preference → flavour layered on top of the formality base ──────────

const STYLE_MODIFIERS = {
  classic: {
    colorPalette: ['Navy', 'Ivory', 'Burgundy', 'Charcoal'],
    silhouetteNote: 'Clean lines and timeless cuts — this is a look that photographs well for decades, not just one season.',
  },
  relaxed: {
    colorPalette: ['Soft sage', 'Warm sand', 'Dusty blue', 'Cream'],
    silhouetteNote: 'Softer, less structured pieces — flowing over fitted, natural over stiff.',
  },
  bold: {
    colorPalette: ['Emerald', 'Cobalt', 'Fuchsia', 'Deep plum'],
    silhouetteNote: 'One statement piece — a bold colour or a striking silhouette — with everything else kept simple around it.',
  },
  romantic: {
    colorPalette: ['Blush', 'Lavender', 'Champagne', 'Soft coral'],
    silhouetteNote: 'Soft draping, delicate detail — think florals, ruffles, or a flowing hemline.',
  },
  bohemian: {
    colorPalette: ['Terracotta', 'Mustard', 'Rust', 'Cream'],
    silhouetteNote: 'Flowing, textured, a little undone — layered jewellery and natural fabrics over anything too polished.',
  },
};

// ── Budget band → shopping note ───────────────────────────────────────────────

const BUDGET_NOTES = {
  budget: 'Look at rental platforms or your own wardrobe first — a well-accessorised existing piece often reads just as intentional as something new.',
  mid: 'A mid-range high-street or contemporary label will comfortably cover this look without needing to compromise.',
  splurge: 'This is a good occasion to invest in a designer or made-to-measure piece you\'ll want to wear again.',
};

/**
 * Combines the couple's per-event dress codes (for the events the guest says
 * they're attending), the guest's style preference, and their budget band
 * into one structured, deterministic outfit-guidance result.
 *
 * @param {object} params
 * @param {string} params.styleId    - one of STYLE_OPTIONS ids
 * @param {string} params.budgetId   - one of BUDGET_BANDS ids
 * @param {Array<{event_id: string, name: string, dressCode: string}>} params.attendingEvents
 *   The events (from getWeddingEvents) the guest has selected as ones they're attending.
 * @returns {{
 *   governingFormality: string,
 *   outfitBase: string,
 *   fabricNote: string,
 *   avoid: string[],
 *   colorPalette: string[],
 *   silhouetteNote: string,
 *   budgetNote: string,
 *   perEventFormality: Array<{event_id: string, name: string, formality: string, label: string}>,
 *   variesAcrossEvents: boolean,
 * }}
 */
export function resolveOutfitGuidance({ styleId, budgetId, attendingEvents }) {
  const events = attendingEvents || [];
  const perEventFormality = events.map(ev => {
    const formality = classifyDressCode(ev.dressCode);
    return { event_id: ev.event_id, name: ev.name, formality, label: FORMALITY_GUIDANCE[formality].label };
  });

  // Dress for the most formal event attended — a guest dressed for the
  // governing formality is always appropriately dressed for the less-formal
  // ones too.
  const governingFormality = perEventFormality.length > 0
    ? perEventFormality.reduce((acc, e) => higherFormality(acc, e.formality), 'casual')
    : 'smart-casual';

  const formalityGuidance = FORMALITY_GUIDANCE[governingFormality];
  const styleModifier = STYLE_MODIFIERS[styleId] || STYLE_MODIFIERS.classic;
  const budgetNote = BUDGET_NOTES[budgetId] || BUDGET_NOTES.mid;

  const distinctLevels = new Set(perEventFormality.map(e => e.formality));

  return {
    governingFormality,
    outfitBase: formalityGuidance.outfitBase,
    fabricNote: formalityGuidance.fabricNote,
    avoid: formalityGuidance.avoid,
    colorPalette: styleModifier.colorPalette,
    silhouetteNote: styleModifier.silhouetteNote,
    budgetNote,
    perEventFormality,
    variesAcrossEvents: distinctLevels.size > 1,
  };
}

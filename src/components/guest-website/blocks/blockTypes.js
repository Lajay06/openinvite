/**
 * Block catalog for the component library modal (feat/component-library).
 *
 * Each entry is a CATALOG item, keyed by `catalogId` — what the couple picks
 * in the modal. `renderType` is the value stored on the actual block
 * (`block.type`) and is what UniverseBlocks.jsx dispatches on. These are
 * usually the same string, except where two catalog entries share one
 * renderer with a different starting `defaultContent` (Divider vs Spacer
 * both render via the 'spacer' type, distinguished by `content.variant`).
 *
 * Backward compatibility: renderType values already in use by existing
 * weddings (from feat/block-builder, PR #97) — 'heading', 'paragraph',
 * 'photo', 'gallery', 'quote', 'spacer' — are unchanged, so every block a
 * couple already added keeps rendering and editing exactly as before.
 * Nothing here migrates or rewrites existing data.
 */
export const CATEGORIES = ['Text', 'Media', 'Wedding', 'Layout', 'People'];

export const BLOCK_TYPES = [
  // ── Text ──────────────────────────────────────────────────────
  { catalogId: 'heading', renderType: 'heading', label: 'Heading', category: 'Text', defaultContent: { text: '', kicker: '' } },
  { catalogId: 'subheading', renderType: 'subheading', label: 'Subheading', category: 'Text', defaultContent: { text: '' } },
  { catalogId: 'paragraph', renderType: 'paragraph', label: 'Paragraph', category: 'Text', defaultContent: { text: '' } },
  { catalogId: 'quote', renderType: 'quote', label: 'Quote', category: 'Text', defaultContent: { text: '', attribution: '' } },
  { catalogId: 'two-column-text', renderType: 'two-column-text', label: 'Two-column text', category: 'Text', defaultContent: { left: '', right: '' } },
  { catalogId: 'list', renderType: 'list', label: 'List', category: 'Text', defaultContent: { title: '', items: [] } },

  // ── Media ─────────────────────────────────────────────────────
  { catalogId: 'image', renderType: 'photo', label: 'Image', category: 'Media', defaultContent: { url: '', caption: '' } },
  { catalogId: 'image-with-text', renderType: 'image-with-text', label: 'Image + text', category: 'Media', defaultContent: { url: '', text: '', imageSide: 'left' } },
  { catalogId: 'gallery', renderType: 'gallery', label: 'Gallery grid', category: 'Media', defaultContent: { photos: [], columns: 3 } },
  { catalogId: 'full-width-image', renderType: 'full-width-image', label: 'Full-width image', category: 'Media', defaultContent: { url: '', caption: '' } },
  { catalogId: 'video', renderType: 'video', label: 'Video', category: 'Media', defaultContent: { url: '' } },

  // ── Layout ────────────────────────────────────────────────────
  { catalogId: 'divider', renderType: 'spacer', label: 'Divider', category: 'Layout', defaultContent: { variant: 'rule' } },
  { catalogId: 'spacer', renderType: 'spacer', label: 'Spacer', category: 'Layout', defaultContent: { variant: 'space', height: 40 } },
  { catalogId: 'columns', renderType: 'columns', label: 'Columns', category: 'Layout', defaultContent: { columns: [{ text: '' }, { text: '' }] } },
  { catalogId: 'button', renderType: 'button', label: 'Button / CTA', category: 'Layout', defaultContent: { label: '', url: '' } },
  { catalogId: 'quote-banner', renderType: 'quote-banner', label: 'Quote banner', category: 'Layout', defaultContent: { text: '', attribution: '' } },
  { catalogId: 'dress-code', renderType: 'dress-code', label: 'Dress code', category: 'Layout', defaultContent: { text: '' } },

  // ── Wedding ───────────────────────────────────────────────────
  { catalogId: 'countdown', renderType: 'countdown', label: 'Countdown', category: 'Wedding', defaultContent: {} },
  { catalogId: 'timeline', renderType: 'timeline', label: 'Timeline / schedule', category: 'Wedding', defaultContent: { items: [] } },
  { catalogId: 'event-details', renderType: 'event-details', label: 'Event details', category: 'Wedding', defaultContent: {} },
  { catalogId: 'faq', renderType: 'faq', label: 'FAQ', category: 'Wedding', defaultContent: { items: [] } },

  // ── People ────────────────────────────────────────────────────
  { catalogId: 'couple-intro', renderType: 'couple-intro', label: 'Couple intro', category: 'People', defaultContent: { partner1: { name: '', bio: '', photoUrl: '' }, partner2: { name: '', bio: '', photoUrl: '' } } },
  { catalogId: 'single-person', renderType: 'single-person', label: 'Single person / bio', category: 'People', defaultContent: { name: '', role: '', bio: '', photoUrl: '' } },
  { catalogId: 'wedding-party', renderType: 'wedding-party', label: 'Wedding party', category: 'People', defaultContent: { people: [] } },
];

export function blockLabel(renderType) {
  return BLOCK_TYPES.find(t => t.renderType === renderType)?.label || renderType;
}

export function newBlock(catalogId) {
  const def = BLOCK_TYPES.find(t => t.catalogId === catalogId);
  return {
    id: 'blk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    type: def?.renderType || catalogId,
    order: 0, // caller sets the real order (end of list / insert index)
    content: { ...(def?.defaultContent || {}) },
  };
}

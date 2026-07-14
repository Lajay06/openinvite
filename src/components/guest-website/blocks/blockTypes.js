/**
 * Block type registry for the couple-facing editor (BlockList.jsx). The
 * render side of these types lives in UniverseBlocks.jsx — this file only
 * describes what a couple can add and what a fresh block of each type
 * starts with.
 */
export const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', defaultContent: { text: '', kicker: '' } },
  { type: 'paragraph', label: 'Paragraph', defaultContent: { text: '' } },
  { type: 'photo', label: 'Photo', defaultContent: { url: '', caption: '' } },
  { type: 'gallery', label: 'Photo gallery', defaultContent: { photos: [], columns: 3 } },
  { type: 'quote', label: 'Quote', defaultContent: { text: '', attribution: '' } },
  { type: 'spacer', label: 'Divider', defaultContent: { variant: 'rule', height: 40 } },
];

export function blockLabel(type) {
  return BLOCK_TYPES.find(t => t.type === type)?.label || type;
}

export function newBlock(type) {
  const def = BLOCK_TYPES.find(t => t.type === type);
  return {
    id: 'blk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    type,
    order: 0, // caller sets the real order (end of list)
    content: { ...(def?.defaultContent || {}) },
  };
}

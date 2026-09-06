/**
 * src/lib/avaActions.js
 *
 * READING THE ACTION BLOCKS OUT OF AVA'S REPLY.
 *
 * Lifted out of AvaModal, unchanged, for the same reason the card and the
 * executor were: the pod could not import a function that lived inside another
 * component, and a second copy of a parser that decides what reaches a write
 * path is two parsers that drift.
 *
 * IT RETURNS THE TEXT WITH THE BLOCKS REMOVED. The couple reads prose; the
 * ACTION lines are machinery and never appear on screen — which is also why a
 * malformed block falls through to the raw text rather than throwing: a parse
 * failure must never cost the couple the answer.
 */
export function extractJson(str) {
  const start = str.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') { depth--; if (depth === 0) return str.slice(start, i + 1); }
  }
  return null;
}

export function parseActions(rawText) {
  const actions = [];
  const cleanText = rawText.replace(/ACTION:\s*(\{(?:[^{}]|\{[^{}]*\})*\})/g, (_, jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.type) {
        actions.push({ id: Math.random().toString(36).slice(2), type: parsed.type, data: parsed.data || {}, status: 'pending' });
        return '';
      }
      // eslint-disable-next-line no-empty -- best-effort text-cleanup parsing; falls through to the raw text below, never blocks the response
    } catch {}
    return _;
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, actions };
}


/**
 * src/lib/avaMarkdown.js
 *
 * BOLD RENDERS AS BOLD. EVERYTHING ELSE BECOMES PLAIN TEXT.
 *
 * Owner report: Ava's answers show raw asterisks. The pod prints
 * `{msg.content}` into a div with `white-space: pre-wrap`, so `**$154,000**`
 * arrives on screen exactly as typed — the model writes markdown because
 * models write markdown, and nothing was ever asked to read it.
 *
 * TWO CHOICES WORTH STATING.
 *
 * ONLY BOLD IS RENDERED. Not italics, not headings, not lists, not links. Ava
 * writes two to four sentences into a 380px pod; a heading in there is a model
 * habit rather than a design, and a link Ava invents is a link to nowhere. So
 * bold — which is the one mark that carries meaning in a figure — renders, and
 * every other mark is STRIPPED to its text rather than left showing. The rule
 * is "no raw asterisks ever", and leaving `_italics_` visible would break it as
 * surely as leaving `**bold**` would.
 *
 * NO dangerouslySetInnerHTML. This is model output going onto the couple's
 * screen; it returns a token list for React to render as elements. There is no
 * path here from a model's string to parsed HTML, which is the only version of
 * this that is safe to write.
 */

/** Inline marks stripped to their text: italics, code, strikethrough. */
const STRIP = [
  [/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2'],   // *italic*, never touching **bold**
  [/(^|[^_])_([^_\n]+)_(?!_)/g, '$1$2'],      // _italic_
  [/`([^`\n]+)`/g, '$1'],                      // `code`
  [/~~([^~\n]+)~~/g, '$1'],                    // ~~strike~~
];

/** Block marks stripped at the start of a line: headings, quotes, bullets. */
const STRIP_LINE = [
  [/^#{1,6}\s+/gm, ''],
  [/^>\s?/gm, ''],
  [/^[-*+]\s+/gm, '• '],
];

/**
 * Ava's answer as a token list: `{ bold: boolean, text: string }`.
 *
 * @param {string} raw
 * @returns {Array<{bold: boolean, text: string}>}
 */
export function parseAvaText(raw) {
  let s = String(raw ?? '');
  for (const [re, to] of STRIP_LINE) s = s.replace(re, to);
  for (const [re, to] of STRIP) s = s.replace(re, to);

  const out = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ bold: false, text: s.slice(last, m.index) });
    out.push({ bold: true, text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ bold: false, text: s.slice(last) });
  // A LEFTOVER PAIR OF ASTERISKS IS STILL AN ASTERISK ON SCREEN. An unclosed
  // `**` survives the loop above, so it is stripped here rather than shipped.
  return out.filter(t => t.text !== '').map(t => ({ ...t, text: t.text.replace(/\*\*/g, '') }));
}

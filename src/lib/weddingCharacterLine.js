/**
 * src/lib/weddingCharacterLine.js — one line that says whose wedding this is.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 11: "Considerations — personalised from more than faith. The
 * header reads 'Personalised for: Muslim'. It reads faith alone. Synthesise the
 * theme's inputs — setting, atmosphere, culture, faith — into one line that
 * reflects the wedding."
 *
 * ── WHY IT READ FAITH ALONE ────────────────────────────────────────────────
 *
 * The page loaded exactly two things: `weddingStyle` (the flat onboarding tag
 * array) and `theme.faith`. The banner printed faith plus whatever tags were
 * in that array — and since the theme reorder, onboarding writes the
 * STRUCTURED fields and keeps weddingStyle as an echo of aesthetic and
 * atmosphere only. So for most couples the array held nothing the banner could
 * use, and one word was left standing: their religion, alone, at the top of a
 * page about their wedding.
 *
 * Setting, atmosphere and culture were all in the record, and none of them was
 * read.
 *
 * ── THE SENTENCE IS COMPOSED, NOT WRITTEN ──────────────────────────────────
 *
 * Every word below comes from an answer the couple gave. Nothing is inferred,
 * nothing is warmed up, and an answer they did not give leaves no trace —
 * a wedding with only a faith gets "A Hindu wedding.", not a sentence padded
 * out to look fuller than the record is.
 *
 * FAITH IS AN ADJECTIVE HERE, NOT A LABEL. "A Hindu wedding" is a description
 * of the day; "Personalised for: Muslim" is a category applied to a person.
 * That difference is the whole point of the item.
 *
 * NON-RELIGIOUS IS NOT A FAITH TO NAME. A couple who answered "Non-religious"
 * answered that the question does not apply; printing it back as though it
 * were a denomination gets the answer exactly backwards. The existing banner
 * already excluded it, and so does this.
 */

/** "Intimate & relaxed" reads as "intimate and relaxed" inside a sentence. */
function lower(s) {
  return String(s || '').trim().replace(/\s*&\s*/g, ' and ').toLowerCase();
}

/** "a" or "an", by sound as far as a word's first letter can tell. */
export function article(word) {
  return /^[aeiou]/i.test(String(word || '').trim()) ? 'an' : 'a';
}

/** "x", "x and y", "x, y and z" — never a serial comma before "and". */
export function joinNaturally(items) {
  const list = items.filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** Indoor / Outdoor / Mix of both, as it reads before "wedding". */
function settingWord(setting) {
  const s = String(setting || '').trim();
  if (!s) return '';
  if (/^mix/i.test(s)) return 'indoor and outdoor';
  return lower(s);
}

/** The faith, as an adjective, or nothing. */
function faithWord(theme) {
  const faith = String(theme?.faith || '').trim();
  if (!faith || faith === 'Non-religious') return '';
  if (faith === 'Interfaith') {
    const two = String(theme.faithSecondary || '').trim();
    return two ? `${two.replace(/ and /g, '–')} interfaith` : 'interfaith';
  }
  return faith;
}

/**
 * The line.
 *
 * TWO ATMOSPHERES AT MOST. A couple who picked five gets a sentence that reads
 * like a list of five, which is not a description of anything. The first two
 * they chose carry the character; the rest are on the page below.
 *
 * @param {object} theme  WeddingDetails.theme
 * @returns {string} one sentence, or '' when the couple has answered nothing
 */
export function weddingCharacterLine(theme = {}) {
  const setting = settingWord(theme.setting);
  const atmospheres = (theme.atmosphere || []).slice(0, 2).map(lower);
  const faith = faithWord(theme);
  const cultures = [...(theme.culture || []), theme.cultureOther].filter(Boolean);

  // COMMAS BETWEEN THE MODIFIERS, AND THE FAITH LAST, AGAINST THE NOUN.
  // Joining all of them with "and" produced "outdoor, intimate and relaxed and
  // Hindu wedding" — two "and"s fighting, because one of the atmospheres was
  // itself "Intimate & relaxed". Modifiers are a comma list; the faith sits
  // where an adjective of that kind sits, immediately before the noun.
  const modifiers = [setting, ...atmospheres].filter(Boolean);
  const words = [...modifiers, faith].filter(Boolean);
  if (words.length === 0 && cultures.length === 0) return '';

  // NO MODIFIERS BUT A HERITAGE is a real case — a couple who answered only
  // "Cultures and traditions". "A wedding with Sri Lankan traditions." is a
  // true sentence; forcing a word in front of "wedding" would not be.
  const head = words.length
    ? `${article(words[0])} ${[modifiers.join(', '), faith].filter(Boolean).join(' ')} wedding`
    : 'a wedding';

  const tail = cultures.length ? ` with ${joinNaturally(cultures)} traditions` : '';
  const line = `${head}${tail}.`;
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}`;
}

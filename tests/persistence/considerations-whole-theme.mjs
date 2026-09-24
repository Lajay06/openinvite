/**
 * Considerations says whose wedding it is, not what religion they are.
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
 * The page loaded exactly two things: `weddingStyle` — the flat onboarding tag
 * array — and `theme.faith`. The banner printed faith plus whatever was in
 * that array. Since the theme reorder, onboarding writes the STRUCTURED
 * fields and keeps weddingStyle only as an echo of aesthetic and atmosphere,
 * so for most couples the array held nothing the banner could use and one word
 * was left standing on its own: their religion, at the top of a page about
 * their wedding.
 *
 * Setting, atmosphere and culture were all in the record. None was read.
 *
 * ── A DESCRIPTION, NOT A CATEGORY ──────────────────────────────────────────
 *
 * "A Hindu wedding" describes the day. "Personalised for: Muslim" applies a
 * category to a person. That difference is the item.
 *
 * Every word in the sentence comes from an answer the couple gave. Nothing is
 * inferred and nothing is padded: a wedding with only a faith gets four words,
 * and a couple who has answered nothing still gets the existing prompt to go
 * and answer something rather than an empty sentence.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PAGE = strip(read('src/pages/Considerations.jsx'));

export async function runConsiderationsWholeTheme() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Considerations — one line about the wedding, not one word about the couple:\n');

  let lib = {};
  try { lib = await import('../../src/lib/weddingCharacterLine.js'); } catch { /* reported below */ }
  const line = lib.weddingCharacterLine;

  // ── The page reads the whole theme and prints a sentence ──────────────────
  check('the page loads the whole theme, not just faith',
    /setTheme\(r\.theme \|\| \{\}\)/.test(PAGE), 'theme loaded');
  check('the "Personalized for:" label and its pills are gone',
    !/Personalized for:/.test(PAGE) && !/contextPills/.test(PAGE), 'no category label');
  check('  replaced by one composed sentence',
    /weddingCharacterLine\(theme\)/.test(PAGE) && /\{characterLine\}/.test(PAGE), 'characterLine');
  check('a couple who has answered nothing still gets the prompt to answer something',
    /Add your wedding style in Event details to see personalized guidance\./.test(PAGE), 'empty state kept');
  check('the rest of the page still reads its own profile',
    /buildProfile\(weddingStyle, faith\)/.test(PAGE), 'guidance unchanged');

  check('the sentence is composed in a module a test can read',
    typeof line === 'function', 'weddingCharacterLine.js');
  if (typeof line !== 'function') return results;

  // ── All four inputs reach the sentence ────────────────────────────────────
  const full = line({ setting: 'Outdoor', atmosphere: ['Intimate & relaxed'], faith: 'Hindu', culture: ['Sri Lankan'] });
  check('setting, atmosphere, faith and culture are all in it',
    full === 'An outdoor, intimate and relaxed Hindu wedding with Sri Lankan traditions.', full);
  check('  the article agrees with the first word', /^An outdoor/.test(full), 'an, not a');

  // ── The owner's own example ───────────────────────────────────────────────
  check('a wedding with only a faith reads as a description, not a label',
    line({ faith: 'Muslim' }) === 'A Muslim wedding.', line({ faith: 'Muslim' }));

  // ── Nothing is padded, nothing is invented ────────────────────────────────
  check('a couple who answered nothing gets no sentence at all',
    line({}) === '', JSON.stringify(line({})));
  check('  and an empty theme object is not a crash', line() === '', 'no theme, no throw');
  check('a culture with no other answer is still a true sentence',
    line({ culture: ['Sri Lankan'] }) === 'A wedding with Sri Lankan traditions.', line({ culture: ['Sri Lankan'] }));

  // ── Non-religious is an answer that the question does not apply ───────────
  check('"Non-religious" is not printed back as a denomination',
    line({ faith: 'Non-religious', setting: 'Indoor' }) === 'An indoor wedding.',
    line({ faith: 'Non-religious', setting: 'Indoor' }));

  // ── Interfaith names both ─────────────────────────────────────────────────
  check('an interfaith wedding names both faiths',
    line({ faith: 'Interfaith', faithSecondary: 'Hindu and Jewish' }) === 'A Hindu–Jewish interfaith wedding.',
    line({ faith: 'Interfaith', faithSecondary: 'Hindu and Jewish' }));

  // ── It stays a sentence, not a list ───────────────────────────────────────
  const many = line({
    setting: 'Mix of both',
    atmosphere: ['Big party', 'Multi-day', 'Destination', 'Formal & elegant'],
    culture: ['Indian', 'Japanese'], cultureOther: 'Cornish',
  });
  check('at most two atmospheres, so it reads as a description and not a list',
    many === 'An indoor and outdoor, big party, multi-day wedding with Indian, Japanese and Cornish traditions.', many);
  check('  the couple’s own words are carried as a culture',
    /Cornish/.test(many), 'cultureOther included');
  check('  and three cultures join without a serial comma',
    /Indian, Japanese and Cornish/.test(many), 'natural English');

  // ── It is one sentence, and it is calm ────────────────────────────────────
  for (const [name, t] of [['full', { setting: 'Outdoor', atmosphere: ['Big party'], faith: 'Jewish', culture: ['Polish'] }],
    ['faith only', { faith: 'Sikh' }], ['culture only', { culture: ['Greek'] }]]) {
    const out = line(t);
    check(`  the ${name} sentence ends in a full stop and carries no exclamation`,
      /\.$/.test(out) && !/!/.test(out) && (out.match(/\./g) || []).length === 1, out);
  }

  return results;
}

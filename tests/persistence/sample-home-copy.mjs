/**
 * tests/persistence/sample-home-copy.mjs
 *
 * THE HOME SAMPLE IS AN INVITATION, NOT AN ITINERARY.
 *
 * Every universe's Home sample was a schedule in the couple's first person:
 * "Ten in the morning, twenty people", "Half past six, forty-one floors up",
 * "ten courses, and the last of them arrives at about half past eleven".
 * Thirty-six of sixty text blocks carried a time, a count or a duration. Owner
 * ruling: two to four short sentences in the host's own voice, warm, no
 * logistics, centred.
 *
 * ── THE LOGISTICS TEST NAMES SHAPES, NOT DIGITS ─────────────────────────────
 *
 * A blanket ban on numbers would strip the lines that carry a universe's whole
 * idea — taj's "Three days, and only one of them formal", seoul's "One room,
 * one meal". The owner ruled those stay: numbers that are VOICE survive, and
 * times, headcounts, course counts and schedules go. So the patterns below are
 * specific — a clock time, a number of people, a number of courses, a span of
 * minutes or hours — and a bare cardinal is not an offence.
 *
 * ── CENTRED ON THE BLOCKS, NEVER ON THE RENDERER ────────────────────────────
 *
 * Also the owner's ruling, and the reason it matters: the alignment is set on
 * the sample's own blocks. Changing UniverseBlocks' default would have centred
 * every block every couple has already written, which is a migration wearing a
 * style change's clothes.
 */
import { pass, fail } from './_shared.mjs';
import { getSampleWedding, sampleUniverseIds } from '../../src/lib/sampleContent/index.js';

/** Logistics, by shape. A cardinal on its own is not one. */
const LOGISTICS = [
  [/\b(?:half past|quarter (?:past|to))\b/i, 'a clock time'],
  [/\b(?:at|by|from|until)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})(?:\s*(?:o.clock|am|pm|:\d{2}))?\b(?!\s*(?:of|room|meal|table|night|day))/i, 'a time of day'],
  [/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|eighty|ninety|hundred|\d+)\s+(?:people|guests|steps|courses|minutes|hours|floors)\b/i, 'a count or a duration'],
  // A CAPACITY IS A NUMBER, and the first version of this pattern was not:
  // `holds \w+` flagged bali's "as long as the evening holds you" and kyoto's
  // "a room that holds only the people in it" — two lines that are the exact
  // voice this guard exists to protect. A guard that fails on the thing it is
  // defending teaches people to switch it off.
  [/\bholds\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty|forty|fifty|sixty|eighty|hundred|\d+)\b/i, 'a capacity'],
  [/\b(?:finished|done|over)\s+by\b/i, 'a schedule'],
];

const sentences = (t) => String(t).split(/(?<=[.!?])\s+/).filter((x) => x.trim()).length;

export async function runSampleHomeCopy() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const ids = sampleUniverseIds();
  // PRESENCE BEFORE PROPERTIES: with no universes every loop below is vacuous.
  check('every universe has a Home sample', ids.length === 20, `${ids.length} universe(s)`);
  if (!ids.length) return results;

  for (const id of ids) {
    const blocks = (getSampleWedding(id)?.homeContent?.blocks || []).filter((b) => b.content?.text);
    check(`${id}: its Home sample has copy in it`, blocks.length >= 2, `${blocks.length} text block(s)`);
    if (!blocks.length) continue;

    const uncentred = blocks.filter((b) => b.style?.align !== 'center').map((b) => b.type);
    check(`  centred`, uncentred.length === 0, uncentred.join(', ') || `${blocks.length} block(s)`);

    const long = blocks.filter((b) => sentences(b.content.text) > 4)
      .map((b) => `${b.type}=${sentences(b.content.text)}`);
    check(`  four sentences at most`, long.length === 0, long.join(', ') || 'within');

    const found = [];
    for (const b of blocks) {
      for (const [re, what] of LOGISTICS) {
        const m = re.exec(b.content.text);
        if (m) found.push(`${b.type}: ${what} — "${m[0].trim()}"`);
      }
    }
    check(`  no logistics`, found.length === 0, found.join(' · ') || 'none');
  }
  return results;
}

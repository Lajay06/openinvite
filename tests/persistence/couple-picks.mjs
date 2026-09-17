/**
 * EVERY FAVORITE THE COUPLE PICKS IS A FAVORITE THE GUESTS SEE.
 *
 * Owner report, Run 5 T7: four favorites selected, two rendered.
 *
 * ── WHAT THE RECORD ACTUALLY SAID ──────────────────────────────────────────
 *
 * Read from the owner's own wedding, read-only, before any code was written:
 *
 *     4 saved places · marked is_couple_pick: 2 · couplePicks: exactly those 2
 *     marked-but-missing-from-couplePicks: none
 *     in-couplePicks-but-not-marked:       none
 *
 * So nothing was dropped. There is no cap, no per-category limit and no stale
 * index: the writer and the reader agreed exactly, and the guest page rendered
 * precisely what it was given. What was missing was the SELECTION — "Couple's
 * pick" existed only as a Switch inside the ADD dialog, defaulting to off for
 * every add, and the saved card showed a badge with no control on it. A couple
 * who added four places and then decided which were favorites had nowhere to
 * say so.
 *
 * That is why this guard is about the toggle and the two places the answer is
 * stored, not about a count the reader might have truncated.
 *
 * ── THE TWO HALVES ARE ONE FACT ────────────────────────────────────────────
 *
 * `is_couple_pick` lives on the category's copy of a place, and membership of
 * `couplePicks` is what the guest page reads. They must move together, and the
 * toggle below is the only thing that writes both — which is why the pure
 * transform is exercised here rather than the button.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * The toggle's transform, mirrored from ExperienceGuideTab.handleToggleCouplePick.
 * Mirrored rather than imported because the handler closes over component state;
 * the source checks at the end hold the component to this shape.
 */
function toggle(guide, catKey, placeId) {
  const categories = { ...(guide.categories || {}) };
  const places = categories[catKey]?.places || [];
  const place = places.find((p) => p.place_id === placeId);
  if (!place) return guide;
  const nextPick = !place.is_couple_pick;
  categories[catKey] = {
    ...(categories[catKey] || {}),
    places: places.map((p) => (p.place_id === placeId ? { ...p, is_couple_pick: nextPick } : p)),
  };
  const withoutIt = (guide.couplePicks || []).filter((p) => p.place_id !== placeId);
  const couplePicks = nextPick ? [...withoutIt, { ...place, is_couple_pick: true, category: 'Eat & drink' }] : withoutIt;
  return { ...guide, categories, couplePicks };
}

export async function runCouplePicks() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  console.log('\n  Four favorites:\n');

  // FOUR PLACES, NONE OF THEM PICKED — the state the owner's record was in.
  let guide = {
    categories: { eat: { places: [
      { place_id: 'p1', name: 'The Grounds of Alexandria' },
      { place_id: 'p2', name: "Uncle Ming's Bar" },
      { place_id: 'p3', name: 'Icebergs' },
      { place_id: 'p4', name: 'Ester' },
    ] } },
    couplePicks: [],
  };

  for (const id of ['p1', 'p2', 'p3', 'p4']) guide = toggle(guide, 'eat', id);

  check('four places toggled give four favorites', (guide.couplePicks || []).length === 4,
    `${(guide.couplePicks || []).length} in couplePicks`);
  check('  and the guest page would render all four',
    ['p1', 'p2', 'p3', 'p4'].every((id) => guide.couplePicks.some((p) => p.place_id === id)),
    guide.couplePicks.map((p) => p.name).join(' · '));
  check('  with the category copy marked to match',
    guide.categories.eat.places.every((p) => p.is_couple_pick === true),
    'is_couple_pick set on all four');

  // OFF AGAIN — a favorite must be un-pickable, or the control is a trap.
  guide = toggle(guide, 'eat', 'p3');
  check('un-picking one leaves the other three', (guide.couplePicks || []).length === 3,
    guide.couplePicks.map((p) => p.name).join(' · '));
  check('  and clears the flag on the one removed',
    guide.categories.eat.places.find((p) => p.place_id === 'p3').is_couple_pick === false,
    'both halves move together');

  // A RECORD ALREADY OUT OF STEP heals rather than drifts further.
  const drifted = {
    categories: { eat: { places: [{ place_id: 'p9', name: 'Somewhere', is_couple_pick: true }] } },
    couplePicks: [],   // the flag says yes, the list the guests read says no
  };
  const healed = toggle(toggle(drifted, 'eat', 'p9'), 'eat', 'p9');
  check('a record already out of step is healed by the toggle',
    healed.couplePicks.length === 1 && healed.categories.eat.places[0].is_couple_pick === true,
    'flag and list agree after a round trip');

  // ── AND THE COMPONENT STILL HAS THE CONTROL ─────────────────────────────
  const tab = code('src/components/studio/guest-suite/ExperienceGuideTab.jsx');
  check('the saved card carries a favorite toggle', /data-couple-pick=/.test(tab) && /onClick=\{onToggleCouplePick\}/.test(tab),
    'the badge is a button');
  check('  and it is not only in the add dialog', /handleToggleCouplePick/.test(tab) && /onToggleCouplePick=\{\(\) => onToggleCouplePick\(/.test(tab),
    'wired from the card to the handler');
  check('  and the handler writes BOTH halves',
    /handleToggleCouplePick[\s\S]{0,1400}?is_couple_pick: nextPick[\s\S]{0,600}?couplePicks/.test(tab),
    'is_couple_pick and couplePicks in one update');

  return results;
}

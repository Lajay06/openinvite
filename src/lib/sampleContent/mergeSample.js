/**
 * src/lib/sampleContent/mergeSample.js
 *
 * THE ONE PLACE SAMPLE CONTENT AND A COUPLE'S OWN CONTENT MEET.
 *
 * The rule, and it only reads one way: THE COUPLE'S CONTENT WINS THE MOMENT IT
 * EXISTS. A sample value fills a field only while that field is empty, and it
 * is displaced by the first character the couple types. There is no merge
 * inside a field, no "sample plus theirs", no precedence table to get
 * backwards — the couple's value is taken whole or the sample's is.
 *
 * WHY THIS FUNCTION EXISTS RATHER THAN A SPREAD AT EACH CALL SITE. `{...sample,
 * ...details}` looks like it does this and does not: `details` carries a key
 * for every field the entity declares, most of them `null`, `''` or `[]`, and
 * a spread lets those overwrite the sample with nothing. The couple then sees
 * an empty preview and concludes the feature is broken. Emptiness has to be
 * asked about, not inherited — that is `isEmpty` below, and it is the whole
 * substance of this module.
 *
 * ── WHERE THIS MAY BE CALLED, AND WHERE IT MAY NOT ─────────────────────────
 *
 * STUDIO SURFACES ONLY. `RealWebsitePreview` (the builder canvas and the
 * full-screen preview) and the universe picker. Never `MultiPageWeddingWebsite`
 * — that is the component the PUBLISHED site renders, and sample COPY must
 * never reach a guest; the section is omitted instead.
 *
 * That is not a convention anyone has to remember. `MultiPageWeddingWebsite`
 * does not import `RealWebsitePreview` and never has, so the published path
 * cannot reach this function by any route, and
 * tests/persistence/sample-content-never-published.mjs asserts the import
 * graph directly.
 *
 * IMAGERY IS RULED DIFFERENTLY FROM COPY and this module does not implement
 * that difference. Sample imagery may appear on a published site, but only
 * behind a publish acknowledgement counted from `SAMPLE_IMAGE_IDS`. Nothing
 * here schedules that acknowledgement; it does not exist yet, and until it
 * does, nothing published carries sample imagery either.
 */
import { getSampleWedding } from './index.js';

/**
 * Whether a field carries nothing the couple has authored.
 *
 * A whitespace-only string is empty: a couple who selects their placeholder
 * text and hits space has not written a story, and showing them a blank page
 * for it teaches them the preview is broken rather than that the field is.
 */
export function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

/**
 * The fields a sample may fill. Deliberately a LIST rather than "every key on
 * the sample object" — the sample also carries `activeUniverse`,
 * `websiteMode`, `couple1Name` and friends, and a couple who has done nothing
 * but choose a universe still owns their own names and their own mode. Filling
 * those would put a fictional couple's name on their preview and read as data
 * loss, not as a demonstration.
 *
 * `coupleNames` is absent for the same reason, and because
 * api/_lib/coupleNames.js owns that value everywhere else.
 */
const FILLABLE = [
  'homeContent', 'ourStoryContent', 'celebrationContent', 'registryContent',
  'musicContent', 'music', 'photosContent', 'qna', 'polls', 'weddingPolicies',
  'accommodation', 'transport', 'guestSuiteTransport', 'experienceGuide',
  'mainCeremony', 'reception', 'coverPhoto', 'enabledPages',
];

/**
 * SLOTS INSIDE A SECTION THE COUPLE HAS ALREADY STARTED.
 *
 * WHY THIS EXISTS. Filling at SECTION granularity meant one written sentence
 * closed the whole section. The paris fixture had
 * `ourStoryContent = { storyText: "…" }` and nothing else: one key, so
 * `isEmpty` said "present", so the section was skipped, so the four sample
 * photographs never appeared — while the couple had written no photos at all.
 * The owner saw a hero and nothing else and reasonably read it as broken.
 *
 * THE RULING (advisor, 2026-09-06): the sample fills at SLOT granularity, not
 * section granularity. A couple's content wins PER SLOT. An empty slot inside
 * a section they have started is still an empty slot.
 *
 * Each entry is `[sectionKey, slotKey]`. Only these are filled — the list is
 * literal, so nothing is filled by accident, and a new slot is a deliberate
 * addition here.
 */
const FILLABLE_SLOTS = [
  // Home's two extra photographs ride in homeContent.blocks, which is what
  // WeddingHomePage renders through UniverseBlocks (WeddingHomePage.jsx:822,
  // PhotoBlock at UniverseBlocks.jsx:289 reads content.url). ONE shared
  // renderer sits below all twelve hero variants, so this needs no component
  // change and behaves identically in every universe.
  //
  // As a SLOT rather than only a section: a couple whose homeContent holds an
  // overlay but no blocks has an empty blocks slot, and an empty slot fills.
  ['homeContent', 'blocks'],
  ['ourStoryContent', 'photos'],
  ['ourStoryContent', 'milestones'],
  ['ourStoryContent', 'storyText'],
  ['celebrationContent', 'daySchedule'],
  ['registryContent', 'registryMessage'],
  ['musicContent', 'customMessage'],
];

/**
 * `details` with the universe's sample filling only the fields the couple has
 * left empty, plus the list of fields that came from the sample.
 *
 * Returns the ORIGINAL object untouched — same reference — when there is
 * nothing to do, so a caller can compare identity to know whether anything was
 * substituted at all.
 *
 * @param {object|null} details a WeddingDetails-shaped record
 * @returns {{ details: object|null, sampledFields: string[], isSampled: boolean }}
 */
export function withSampleContent(details) {
  const none = { details, sampledFields: [], isSampled: false };
  if (!details || typeof details !== 'object') return none;

  const sample = getSampleWedding(details.activeUniverse);
  if (!sample) return none;                      // no sample for this universe

  // SECTION granularity: a whole section the couple has not started at all.
  const sampledFields = FILLABLE.filter(
    (k) => isEmpty(details[k]) && !isEmpty(sample[k]),
  );

  // SLOT granularity: an empty slot inside a section they HAVE started.
  //
  // This runs even when `sampledFields` is empty. The early return that used
  // to sit here — `if (sampledFields.length === 0) return none;` — was the
  // whole bug: a couple with one sentence in `ourStoryContent` and nothing
  // else got no photographs, because the section counted as present.
  const merged = { ...details };
  for (const k of sampledFields) merged[k] = sample[k];

  const sampledSlots = [];
  for (const [section, slot] of FILLABLE_SLOTS) {
    if (sampledFields.includes(section)) continue;   // the whole section just came from the sample
    const theirs = merged[section];
    if (!theirs || typeof theirs !== 'object' || Array.isArray(theirs)) continue;
    if (!isEmpty(theirs[slot])) continue;            // THEIR slot wins, untouched
    const mine = sample[section]?.[slot];
    if (isEmpty(mine)) continue;
    // Copy the section before writing into it: `merged` is a shallow copy of
    // `details`, so mutating the nested object in place would edit the
    // caller's own record object.
    merged[section] = { ...theirs, [slot]: mine };
    sampledSlots.push(`${section}.${slot}`);
  }

  // ITINERARY PHOTOS, the one array case. A couple's own itinerary items may
  // have no picture; the sample fills only those, and only the picture. Items
  // are NEVER added to an itinerary the couple wrote — the sample's own
  // itinerary arrives whole, or not at all, via the section fill above.
  const schedule = merged.experienceGuide?.itinerary?.schedule;
  const sampleItem = sample.experienceGuide?.itinerary?.schedule?.[0];
  const samplePhoto = sampleItem && Object.values(sampleItem.blocks || {})
    .flat().map((i) => i?.photo_url).find(Boolean);
  if (!sampledFields.includes('experienceGuide') && Array.isArray(schedule) && samplePhoto) {
    let filled = 0;
    const nextSchedule = schedule.map((day) => {
      if (!day?.blocks) return day;
      const blocks = {};
      for (const [key, items] of Object.entries(day.blocks)) {
        blocks[key] = Array.isArray(items) ? items.map((item) => {
          if (!item || !isEmpty(item.photo_url) === true) return item;
          filled += 1;
          return { ...item, photo_url: samplePhoto };
        }) : items;
      }
      return { ...day, blocks };
    });
    if (filled > 0) {
      merged.experienceGuide = {
        ...merged.experienceGuide,
        itinerary: { ...merged.experienceGuide.itinerary, schedule: nextSchedule },
      };
      sampledSlots.push(`experienceGuide.itinerary (${filled} item photo${filled === 1 ? '' : 's'})`);
    }
  }

  if (sampledFields.length === 0 && sampledSlots.length === 0) return none;

  return {
    details: merged,
    sampledFields: [...sampledFields, ...sampledSlots],
    isSampled: true,
  };
}

/**
 * The sample's hero image for a universe, or null.
 *
 * The picker draws a static `/universes/<id>.jpg` from the universe config.
 * Where a universe has sample content with real photography, that photograph
 * is the better answer — it is the same image the couple will see filling
 * their own preview, so the picker stops promising one thing and the preview
 * delivering another.
 */
export function sampleHeroImage(universeId) {
  const sample = getSampleWedding(universeId);
  return sample?.coverPhoto || null;
}

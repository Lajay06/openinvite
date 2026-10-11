/**
 * src/lib/weddingThemeOptions.js
 *
 * Canonical faith/culture option lists for WeddingDetails.theme.faith,
 * .faithSecondary, .culture[], and .cultureOther. Previously declared only
 * inside src/components/event-details/ThemeSection.jsx (Round 7/8 asks) —
 * extracted here so OnboardingPathACultural.jsx can point at the exact same
 * source instead of maintaining its own, much smaller, drifted list (it
 * previously had no options list at all, just a free-text textarea).
 */
/**
 * THE OTHER THREE LISTS, MOVED HERE FOR THE SAME REASON THE FIRST TWO WERE.
 *
 * Round two, item 7: onboarding and Event details must ask the same five
 * questions, in the same order, with the same options, writing to the same
 * fields, "so a couple never answers the same question twice". Two of the five
 * already read from this file. The other three were declared inside
 * ThemeSection.jsx, which is why onboarding asked its own Style and Vibe pills
 * instead — a different vocabulary for the same question, landing in a
 * different field.
 *
 * THE ORDER OF THE FIVE, as ruled: aesthetic, atmosphere, setting, culture,
 * faith. Faith last is the point of the reorder — "the owner does not want a
 * religion question among the first things anyone sees."
 *
 * SEASON IS NOT HERE, and that is deliberate. It is no longer asked; it is
 * derived from the wedding date and the venue's hemisphere by
 * src/lib/weddingSeason.js.
 */
export const AESTHETIC_OPTIONS  = ['Beach', 'Boho', 'Classic', 'Garden', 'Glamorous', 'Luxury', 'Minimalist', 'Modern', 'Romantic', 'Rustic', 'Vintage'];
export const ATMOSPHERE_OPTIONS = ['Big party', 'Destination', 'Formal & elegant', 'Intimate & relaxed', 'Multi-day', 'Outdoor & nature'];
export const SETTING_OPTIONS    = ['Indoor', 'Mix of both', 'Outdoor'];

/** The five, in the order both surfaces ask them. */
export const THEME_QUESTION_ORDER = ['aesthetic', 'atmosphere', 'setting', 'culture', 'faith'];

/**
 * ── FAITH, TWENTY-TWO OPTIONS ───────────────────────────────────────────────
 *
 * Item 2 of goals/2026-10-11-dashboard-fixes-batch-1.md. Non-religious is
 * PINNED FIRST and excluded from the alphabetical run, because it is the
 * answer with no tradition to sort among the others and burying it at N would
 * make a couple hunt for the one option that says "none of these". Other is
 * last for the mirror reason: it is the escape hatch, not a choice.
 *
 * PLAIN 'Christian' IS KEPT, and it is the only one of the previous nine that
 * the owner's new list does not contain. theme.faith is a FREE STRING on
 * WeddingDetails, so dropping it would not have deleted anything, it would
 * have left live records holding a value no pill could show: the couple opens
 * the Theme tab, sees nothing selected, and their answer is gone from the
 * surface that collected it. It sorts before 'Christian (non-denominational)'
 * because it is the shorter string, which is also the order a reader expects.
 *
 * THE COUNT. The ruling names twenty-one; the list it enumerates is twenty-one
 * including Non-religious and Other, so keeping Christian makes twenty-two.
 * Built as enumerated, and reported rather than silently reconciled.
 *
 * _STYLE_TO_FAITH in src/pages/EventDetails.jsx maps old onboarding answers
 * onto nine of these values, and every one of the nine is still here. That is
 * asserted, not assumed: see tests/persistence/faith-options.mjs.
 */
export const FAITH_OPTIONS = [
  'Non-religious',
  'Anglican',
  "Baha'i",
  'Baptist',
  'Buddhist',
  'Catholic',
  'Christian',
  'Christian (non-denominational)',
  'Eastern Orthodox',
  'Hindu',
  'Interfaith',
  'Jain',
  'Jewish',
  'Lutheran',
  'Methodist',
  'Muslim',
  'Pentecostal',
  'Presbyterian',
  'Sikh',
  'Spiritual',
  'Taoist',
  'Other',
];

/**
 * The Interfaith sub-pick: the same list, minus Interfaith itself, with
 * Non-religious still pinned first. A couple marrying across a faith and no
 * faith is one of the commonest interfaith weddings there is, which is why it
 * stays rather than being filtered out as a non-answer.
 */
export const FAITH_FOR_INTERFAITH = FAITH_OPTIONS.filter((f) => f !== 'Interfaith');

// Organised by region — see ThemeSection.jsx's own history for why (Round 7
// ask #11: every option list ordered alphabetically within its group).
export const CULTURE_REGIONS = [
  {
    region: 'Asia & Middle East',
    items: [
      'Arab', 'Armenian', 'Bangladeshi', 'Chinese', 'Filipino',
      'Indian (Hindu, Sikh, Muslim, Christian)', 'Indonesian', 'Japanese',
      'Khmer (Cambodian)', 'Korean', 'Lebanese', 'Malay/Singaporean', 'Nepali',
      'Pakistani', 'Persian/Iranian', 'Sri Lankan', 'Thai', 'Turkish', 'Vietnamese',
    ],
  },
  {
    region: 'Africa',
    items: [
      'East African (Kenyan/Tanzanian)', 'Ethiopian/Eritrean', 'Ghanaian', 'Moroccan',
      'Nigerian (Yoruba, Igbo, Hausa)', 'Somali', 'South African (Zulu, Xhosa, Sotho)',
    ],
  },
  {
    region: 'Europe',
    items: [
      'British', 'Dutch', 'French', 'German', 'Greek', 'Irish', 'Italian',
      'Jewish (Ashkenazi & Sephardic)', 'Polish', 'Portuguese', 'Russian/Eastern European',
      'Scandinavian/Nordic', 'Spanish', 'Ukrainian',
    ],
  },
  {
    region: 'North & South America',
    items: [
      'American (Contemporary, Black American, Southern)', 'Argentine', 'Brazilian',
      'Caribbean', 'Colombian/Andean', 'Indigenous North American', 'Mexican', 'Peruvian',
    ],
  },
  {
    region: 'Oceania & Pacific',
    items: [
      'Australian (incl. Aboriginal and Torres Strait Islander)', 'Hawaiian',
      'New Zealand Māori', 'Samoan/Tongan/Fijian',
    ],
  },
];
export const CULTURE_CROSS_CUTTING = ['Destination', 'Interfaith/fusion', 'LGBTQ+ inclusive', 'Minimalist/non-traditional'];

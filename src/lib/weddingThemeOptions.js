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
export const FAITH_OPTIONS = ['Buddhist', 'Catholic', 'Christian', 'Hindu', 'Interfaith', 'Jewish', 'Muslim', 'Non-religious', 'Sikh'];
export const FAITH_FOR_INTERFAITH = ['Buddhist', 'Catholic', 'Christian', 'Hindu', 'Jewish', 'Muslim', 'Sikh'];

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

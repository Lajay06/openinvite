/**
 * SAMPLE CONTENT — shanghai. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "You are invited"                     (websiteThemes.js:1384)
 *   tileDescription  "Jade and gold against black lacquer. A Bund evening,
 *                     cinematic and precise."              (websiteThemes.js:1396)
 *
 * CINEMATIC AND PRECISE, and precise is the half that governs the writing.
 * Every line states a time, a floor, a number of minutes. Cinematic is what the
 * photographs and the lacquer palette do; a sentence that tries to be
 * cinematic on their behalf reads as a brochure, and there is not one here.
 *
 * No souvenir vocabulary (CLAUDE.md), which in this universe means no borrowed
 * nouns and no named ceremonies. Jade and gold are in the palette. The copy
 * says what time to be in the lobby.
 *
 * Cloudinary folder `Shanghai` (7 assets). ONE REJECTED: the lacquer tray still
 * life, whose card carries generated Chinese characters. Generated CJK cannot
 * be verified as meaning what it appears to mean, and an unverifiable character
 * on a couple's page is the same defect as an unverifiable word — the rule does
 * not get easier because the script is one we read less confidently. It was the
 * folder's only spare, so BOTH Home photographs are DOUBLED from Our Story.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const SHANGHAI_IMAGES = {
  // TWO EXTRA HOME PHOTOS, BOTH DOUBLED: the rejection above consumed the only
  // spare. Reuse rather than an empty role.
  home: [
    'hf_20260905_002911_aa25ebed-bf05-4b03-8a5e-37b13203181d_zqam5f', // DOUBLED from Our Story
    'hf_20260905_002721_b09968b5-48aa-43ca-ad4f-76ac3cee3ccf_ly1f2r', // DOUBLED from Our Story
  ],
  hero:  'shanghai-hero_bkvfnb', // heroes-jpg 4096x2294, ratio 1.786
  story: [
    'hf_20260905_002721_b09968b5-48aa-43ca-ad4f-76ac3cee3ccf_ly1f2r', // 1536x2048
    'hf_20260905_002910_fe94fd73-0768-48a2-8283-e61d7666758f_rpuyhg', // 1536x2048
    'hf_20260905_002911_aa25ebed-bf05-4b03-8a5e-37b13203181d_zqam5f', // 1792x2400
    'hf_20260905_002911_32a5465f-88de-4408-84a2-a898bcd4eb3a_c0nurt', // 1792x2400
  ],
  // The SECOND WIDE. The folder's one landscape-shaped asset was the rejection.
  experiences: 'hf_20260905_002910_4975e5f1-82db-46e7-aff9-d215d98d556d_kxaqo1', // 2048x1152
};

export const SAMPLE_SHANGHAI = {
  __sample: true,
  couple1Name: 'Vivian', couple2Name: 'Hao', coupleNames: 'Vivian & Hao',
  weddingDate: null,
  activeUniverse: 'shanghai',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(SHANGHAI_IMAGES.hero, heroDeliveryWidth(SHANGHAI_IMAGES.hero)),

  mainCeremony: { venueName: 'The forty-first floor', address: 'The tower on the corner, north lobby', startTime: '18:30', time: '18:30' },
  reception: { venueName: 'The same floor, east room', address: 'Through the doors behind you', startTime: '20:00', time: '20:00' },

  homeContent: {
    blocks: [
      { id: 'sh1', type: 'heading', order: 0, content: { text: 'High above the river, when the city turns on', kicker: 'The evening' } , style: { align: 'center' } },
      { id: 'sh2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying as the light comes up along the water and eating in the room behind it. Dress for a good night out. Everything after that is ours to worry about, not yours.',
      }, style: { align: 'center' } },
      { id: 'sh3', type: 'quote', order: 2, content: { text: 'Dress for a good night out. We will handle the rest.', attribution: 'Vivian & Hao' } , style: { align: 'center' } },
      { id: 'sh4', type: 'photo', order: 3, content: { url: img(SHANGHAI_IMAGES.home[0], 1400) } },
      { id: 'sh5', type: 'photo', order: 4, content: { url: img(SHANGHAI_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We were seated at the same table at a dinner neither of us wanted to attend, and we spent two hours agreeing about how bad it was. He sent a message at one in the morning suggesting a better one. That restaurant closed four years ago and we still call it ours.',
    photos: [img(SHANGHAI_IMAGES.story[0], 1400), img(SHANGHAI_IMAGES.story[1], 1400), img(SHANGHAI_IMAGES.story[2], 1400), img(SHANGHAI_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The bad dinner', text: 'Two hours, one table, and complete agreement.' },
      { date: 'One in the morning', text: 'A message proposing a better restaurant. She was awake.' },
      { date: 'The question', text: 'Asked in a taxi in traffic, which he had not planned and would not change.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'A quartet for the ceremony and a set from eleven, once the courses stop. Send us what belongs after eleven.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song. Loud is fine after eleven.' },
  registryContent: { registryMessage: 'The apartment is small and there is nothing it needs. If you would like to give something, there is a short list, and a fund toward the flights for the family coming furthest.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'Six, in the north lobby. The elevators take four minutes and the doors close at twenty-five past.' },
    { question: 'Which entrance?', answer: 'North, on the corner. The south lobby serves a different set of floors and cannot reach us.' },
    { question: 'How long is dinner?', answer: 'Ten courses, about three and a half hours. Eat lightly beforehand.' },
    { question: 'How formal is it?', answer: 'Formal. Jade, gold, black, deep green. Nothing white.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Formal. Jade, gold, black lacquer, deep green. Not white and not ivory.', weatherNote: 'The room is cool and the terrace is windy at that height. Something over your shoulders.' },
    photography: { display: true, unplugged: true, message: 'Nothing raised for the eighteen minutes. The glass reflects every screen in the room.' },
    lateArrival: { display: true, policy: 'If the doors are closed, wait in the lobby on forty-one. Someone will bring you in between courses.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The hotel in the same tower', description: 'Floors nine to twenty. No taxi at either end of the night, which at this hour is the whole argument.', priceRange: '$$$' },
      { name: 'The old quarter', description: 'Fifteen minutes by car, considerably cheaper, and a better morning after.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['train', 'taxi', 'airport'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-sh-t1', name: 'The metro', type: 'train_station', address: 'Exit two, then a covered walk', note: 'Six minutes to the north lobby. Last train at eleven, which is well before you will want it.' },
      { id: 'sample-sh-t2', name: 'Taxis', type: 'taxi', address: 'The rank on the north side', note: 'Plentiful. Have the tower name written down; the corner has two of them.' },
      { id: 'sample-sh-t3', name: 'From the airport', type: 'airport', address: 'Fifty minutes, or twenty on the fast train', note: 'The train is faster than the car at every hour of the day.' },
    ],
    notes: [{ id: 'sample-sh-n1', title: 'The two lobbies', text: 'North reaches floor forty-one. South does not. Every year somebody learns this at ten past six.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The city',
    editorialIntro: 'Four things, and none of them the ones on the hotel card.',
    couplePicks: [{ place_id: 'sample-sh-p1', name: 'The riverfront at six in the morning', category: 'Parks & Outdoors', note: 'Empty, and the only hour it belongs to the people who live here.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'The morning after', summary: 'Early or not at all.',
        blocks: {
          morning: [{ id: 'sample-sh-i1', place_name: 'The riverfront', description: 'Walk south from the tower. Twenty minutes, and nobody is there before seven.', photo_url: img(SHANGHAI_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-sh-i2', place_name: 'The lane behind the market', description: 'Six tables, no sign, and the best meal you will eat here.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-sh-p1', title: 'How many courses is too many?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-sh-p1a', label: 'Ten. It is a wedding', votes: 0 },
      { id: 'sample-sh-p1b', label: 'Eight, and finish earlier', votes: 0 },
      { id: 'sample-sh-p1c', label: 'Twelve, and we will pace ourselves', votes: 0 },
    ],
  }],
};

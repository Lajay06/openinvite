/**
 * SAMPLE CONTENT — seoul. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "You are invited"                     (websiteThemes.js:1345)
 *   tileDescription  "Lavender and blush behind frosted glass. Soft, modern,
 *                     quietly precise."                    (websiteThemes.js:1357)
 *
 * Quietly precise is the pair to hold. Every sentence is exact about time and
 * number, and none of them is raised. Soft is a matter of what is left out: no
 * emphasis, no persuasion, nothing asked twice. The souvenir trap here is the
 * loudest of any universe in the set — a borrowed word, a ceremony named for
 * effect — and the copy takes none of it (CLAUDE.md).
 *
 * Cloudinary folder `Seoul` (7 assets, all seven used, none rejected). One clean
 * spare covers the first Home photograph; the second is DOUBLED from Our Story.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const SEOUL_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). One spare, one DOUBLED.
  home: [
    'hf_20260904_003531_29231782-4077-43f3-975f-eb448f8784d2_zbxap0', // spare landscape, the pale room
    'hf_20260904_003531_83d75295-31ce-4182-a49a-5231c2180a6a_uwal5s', // DOUBLED from Our Story
  ],
  hero:  'seoul-hero_lbj8ji', // heroes-jpg 4096x2294, ratio 1.786
  story: [
    'hf_20260904_003531_7cc5d0d8-6c44-46b3-b927-d2349110b50c_kb7l6d', // 1792x2400
    'hf_20260904_003531_198b0388-7fde-44ef-b99c-be80f9fd6736_l5jrva', // 1792x2400
    'hf_20260904_003531_83d75295-31ce-4182-a49a-5231c2180a6a_uwal5s', // 1792x2400
    'hf_20260904_003532_bd81d8a9-b666-42a6-bc2e-baa53ab0ef2b_alqjhb', // 1536x2752
  ],
  experiences: 'hf_20260904_003531_fa26cd27-5f4a-4da9-8794-64193f75fcb3_auobmf', // 2400x1792
};

export const SAMPLE_SEOUL = {
  __sample: true,
  couple1Name: 'Hana', couple2Name: 'Jun', coupleNames: 'Hana & Jun',
  weddingDate: null,
  activeUniverse: 'seoul',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(SEOUL_IMAGES.hero, heroDeliveryWidth(SEOUL_IMAGES.hero)),

  mainCeremony: { venueName: 'The upper room', address: 'Fifth floor, the one with no windows on the street side', startTime: '11:00', time: '11:00' },
  reception: { venueName: 'The long room', address: 'Same floor, through the glass', startTime: '12:30', time: '12:30' },

  homeContent: {
    blocks: [
      { id: 'sl1', type: 'heading', order: 0, content: { text: 'One room, one meal, one afternoon', kicker: 'The day' } , style: { align: 'center' } },
      { id: 'sl2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying in the morning and eating together straight afterward. We have kept it deliberately short so that nobody gives up a whole day or arranges a night away. We wanted to be able to speak to all of you.',
      }, style: { align: 'center' } },
      { id: 'sl3', type: 'quote', order: 2, content: { text: 'One room, one meal. We wanted to be able to speak to all of you.', attribution: 'Hana & Jun' } , style: { align: 'center' } },
      { id: 'sl4', type: 'photo', order: 3, content: { url: img(SEOUL_IMAGES.home[0], 1400) } },
      { id: 'sl5', type: 'photo', order: 4, content: { url: img(SEOUL_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We worked on the same floor for two years and spoke about nine times. Then the building lost power for an afternoon and everybody sat on the stairs, and we found we had been reading the same three books and disagreeing about all of them from a distance.',
    photos: [img(SEOUL_IMAGES.story[0], 1400), img(SEOUL_IMAGES.story[1], 1400), img(SEOUL_IMAGES.story[2], 1400), img(SEOUL_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'Two years, nine conversations', text: 'Counted afterward, and neither of us disputes the number.' },
      { date: 'The afternoon with no power', text: 'Four hours on a concrete stair, and three books argued about properly.' },
      { date: 'The question', text: 'Asked at seven in the morning, before either of us had spoken to anyone else.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'One player during the ceremony, and something quiet through lunch. Send us what you would like to hear over a long meal.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song. It has to work at a conversational volume.' },
  registryContent: { registryMessage: 'The apartment is finished and there is nothing we need. If you would like to give something, there is a short list of small things.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'By twenty to eleven. The lift is slow and there are five floors.' },
    { question: 'Is there parking?', answer: 'Two spaces, and they are spoken for. The station is four minutes on foot and that is the honest answer.' },
    { question: 'What should we wear?', answer: 'Pale colors if you have them, and nothing that needs adjusting. The room is bright and everything shows.' },
    { question: 'Will it run late?', answer: 'No. We are out of the room by four and there is nothing planned after it.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Lavender, blush, cream, pale gray. Soft shapes. Nothing black.', weatherNote: 'Indoors throughout, and warm. There is nowhere to leave a heavy coat.' },
    photography: { display: true, unplugged: true, message: 'Nothing raised during the twenty minutes. The room is small and the glass reflects everything.' },
    lateArrival: { display: true, policy: 'If you are late, wait by the glass and somebody will bring you through between the readings.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The hotel two streets over', description: 'Small, quiet, four minutes on foot, and the easiest thing if you are coming the night before.', priceRange: '$$$' },
      { name: 'The guesthouse by the station', description: 'Plainer, half the price, and six minutes the other way.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['train', 'walking', 'taxi'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-sl-t1', name: 'The station', type: 'train_station', address: 'Exit four, then left', note: 'Four minutes on foot, all of it under cover.' },
      { id: 'sample-sl-t2', name: 'Taxis', type: 'taxi', address: 'The rank outside exit two', note: 'Easy at any hour. The building number is on the invitation.' },
      { id: 'sample-sl-t3', name: 'On foot', type: 'other', address: 'From the hotel', note: 'Four minutes, flat, one crossing.' },
    ],
    notes: [{ id: 'sample-sl-n1', title: 'The building', text: 'Two lifts, one of which is slow. Allow ten minutes from the street to the fifth floor.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The neighborhood',
    editorialIntro: 'Everything here is within fifteen minutes of the room, which is why we chose it.',
    couplePicks: [{ place_id: 'sample-sl-p1', name: 'The tea room on the corner', category: 'Coffee & Bakeries', note: 'Open from seven. Sit at the counter, not at a table.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'After four, if you are staying', summary: 'Close by, and quiet.',
        blocks: {
          afternoon: [{ id: 'sample-sl-i1', place_name: 'The tea room on the corner', description: 'Where we go when we have nothing to say to each other yet.', photo_url: img(SEOUL_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-sl-i2', place_name: 'The park on the hill', description: 'Twelve minutes up. Go at dusk, when the city turns on underneath it.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-sl-p1', title: 'What should happen after four?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-sl-p1a', label: 'Nothing. That was the plan', votes: 0 },
      { id: 'sample-sl-p1b', label: 'Whoever is still here walks up the hill', votes: 0 },
      { id: 'sample-sl-p1c', label: 'A table booked somewhere for eight', votes: 0 },
    ],
  }],
};

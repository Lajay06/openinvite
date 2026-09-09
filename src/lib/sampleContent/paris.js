/**
 * SAMPLE CONTENT — paris. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "Save the date"                       (websiteThemes.js:890)
 *   tileDescription  "A fashion-plate hush. Fine rules, ink and rose, nothing
 *                     overstated."                         (websiteThemes.js:902)
 *
 * A hush is the instruction. Short sentences, plain nouns, no adjective doing
 * work a photograph already does. Nothing here names a landmark and nothing
 * here reaches for souvenir vocabulary (CLAUDE.md) — paris is carried by the
 * hairline rules, the ink-and-rose palette and these photographs. If the copy
 * has to say where it is, the universe has failed.
 *
 * Cloudinary folder `Paris` (7 assets, all seven used, none rejected).
 * Allocated by aspect ratio; see the PR body for the table.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const PARIS_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). The folder had one clean
  // spare, so the second is DOUBLED from Our Story rather than left empty.
  home: [
    'hf_20260904_123849_d641a821-a324-4ef9-b3dc-03d033ed5db4_xle05g', // spare wide, the colonnade
    'hf_20260904_123848_cdab9013-a29a-4c7c-8c14-fabf32e78f62_utpnbk', // DOUBLED from Our Story
  ],
  hero:  'paris-hero_afhg5f', // heroes-jpg 4096x2294, ratio 1.786
  story: [
    'hf_20260904_123708_71453781-5b8b-4d03-9242-3bb1c390293e_lstirz', // 1536x2048
    'hf_20260904_123848_cdab9013-a29a-4c7c-8c14-fabf32e78f62_utpnbk', // 1792x2400
    'hf_20260904_123848_c59ab998-8a1a-4506-848b-1aa79314a03f_artdlf', // 1792x2400
    'hf_20260904_123849_b42dde72-4ead-484c-a321-cbf6eaa4abc0_t3fn85', // 1792x2400
  ],
  experiences: 'hf_20260904_123848_830c527c-7837-49d4-8dbc-5aa233349120_zl2erv', // 2400x1792
};

export const SAMPLE_PARIS = {
  __sample: true,
  couple1Name: 'Margot', couple2Name: 'Theo', coupleNames: 'Margot & Theo',
  weddingDate: null,
  activeUniverse: 'paris',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(PARIS_IMAGES.hero, heroDeliveryWidth(PARIS_IMAGES.hero)),

  mainCeremony: { venueName: 'The Town Hall', address: 'Second floor, the room with the tall windows', startTime: '16:00', time: '16:00' },
  reception: { venueName: 'The Apartment', address: 'Fourth floor, and no elevator', startTime: '19:00', time: '19:00' },

  homeContent: {
    blocks: [
      { id: 'pr1', type: 'heading', order: 0, content: { text: 'A short ceremony and a long table', kicker: 'The day' } , style: { align: 'center' } },
      { id: 'pr2', type: 'paragraph', order: 1, content: {
        text: 'We are keeping the first part small and the second part open. If you can only come to one of them, come to dinner. We would rather you were comfortable than impressed.',
      }, style: { align: 'center' } },
      { id: 'pr3', type: 'quote', order: 2, content: { text: 'We would rather you were comfortable than impressed.', attribution: 'Margot & Theo' } , style: { align: 'center' } },
      { id: 'pr4', type: 'photo', order: 3, content: { url: img(PARIS_IMAGES.home[0], 1400) } },
      { id: 'pr5', type: 'photo', order: 4, content: { url: img(PARIS_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: "We met in the winter, standing in line, over an argument about whether the place was any good. It was not. We went back every week for two years anyway, and by the end of it neither of us was pretending it was about the coffee.",
    photos: [img(PARIS_IMAGES.story[0], 1400), img(PARIS_IMAGES.story[1], 1400), img(PARIS_IMAGES.story[2], 1400), img(PARIS_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The line', text: 'Nine minutes, and an opinion each.' },
      { date: 'The second winter', text: 'We stopped keeping separate umbrellas.' },
      { date: 'The question', text: 'Asked on a Tuesday, badly, and answered before the sentence finished.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'A piano through dinner, and something with a beat once the plates go. Send us the second kind.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song each. We are counting.' },
  registryContent: { registryMessage: 'The apartment is small and already full. If you would like to give something, there is a short list, and none of it is furniture.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'A quarter to four. The ceremony starts at four and the doors close while it runs.' },
    { question: 'Where is dinner?', answer: 'Ten minutes away on foot, and we will all walk over together.' },
    { question: 'How formal is it?', answer: 'Dressed, not costumed. A good coat matters more than a good suit in March.' },
    { question: 'Can we bring children?', answer: 'For the ceremony, gladly. Dinner runs late, so that part is yours to judge.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Ink, cream, rose, black. Anything you already own that you feel expensive in.', weatherNote: 'The room is warm and the walk is not. Bring the coat you like being seen in.' },
    photography: { display: true, unplugged: true, message: 'Nothing on a phone during the ceremony. Afterward, please, everything.' },
    lateArrival: { display: true, policy: 'If the doors are closed, wait on the landing. Someone will bring you in at the pause.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Hotel on the Corner', description: 'Eleven rooms, two streets from the dinner, and the only one we can vouch for personally.', priceRange: '$$$' },
      { name: 'The Studios', description: 'Small, plain, and a fraction of the price. Better for three nights than for one.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['train', 'walking', 'taxi'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-pr-t1', name: 'The station', type: 'train_station', address: 'Two streets north', note: 'Runs until half past midnight, later on Saturday.' },
      { id: 'sample-pr-t2', name: 'On foot', type: 'walking', address: 'Ceremony to dinner', note: 'Ten minutes, flat, one crossing.' },
      { id: 'sample-pr-t3', name: 'Taxis', type: 'taxi', address: 'The taxi stand on the main street', note: 'Easier to book by app than to find on the night.' },
    ],
    notes: [{ id: 'sample-pr-n1', title: 'Driving', text: 'Do not. The street is one way and the permits are residents only.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The quarter',
    editorialIntro: 'If you are staying a few days, this is the short version of what we would tell you over dinner.',
    couplePicks: [{ place_id: 'sample-pr-p1', name: 'The garden with the basin', category: 'Parks & Outdoors', note: 'Take a chair, move it to face the water, and stay an hour.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'A morning with nothing in it', summary: 'The only plan worth making here.',
        blocks: {
          morning: [{ id: 'sample-pr-i1', place_name: 'The garden with the basin', description: 'The chairs are free and they move. That is the whole attraction.', photo_url: img(PARIS_IMAGES.experiences, 800) }],
          afternoon: [{ id: 'sample-pr-i2', place_name: 'The covered arcades', description: 'Dry when it rains, which in March is most of the point.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-pr-p1', title: 'How long should the speeches run?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-pr-p1a', label: 'Three minutes each, timed', votes: 0 },
      { id: 'sample-pr-p1b', label: 'As long as they are good', votes: 0 },
      { id: 'sample-pr-p1c', label: 'No speeches, only toasts', votes: 0 },
    ],
  }],
};

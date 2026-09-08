/**
 * SAMPLE CONTENT — edinburgh. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "You are cordially invited"           (websiteThemes.js:1235)
 *   tileDescription  "Forest and burgundy, a slow estate hour. Considered,
 *                     unhurried, real."                    (websiteThemes.js:1247)
 *
 * Real is the word to obey. This universe is the one most likely to tip into
 * costume, so the copy carries no tartan, no whisky, no heather and no dialect
 * (CLAUDE.md). US English throughout, including the words a Scottish couple
 * would themselves use: the repo rule is not a claim about who is speaking.
 * What is left is weather, distance and hospitality, which is what a January
 * wedding in a cold house is actually about.
 *
 * Cloudinary folder `Edinburgh` (6 assets, the shallowest in this group). No
 * landscape at all, so Experiences takes the SECOND WIDE — the avenue — as
 * ruled. Nothing is left over, so BOTH Home photographs are DOUBLED from
 * Our Story. None rejected.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const EDINBURGH_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). BOTH DOUBLED: six assets,
  // six roles, no spare. Reuse rather than an empty role.
  home: [
    'hf_20260905_003402_a97ceed9-415f-4b3e-9a40-07db9a40433e_h1pxon', // DOUBLED from Our Story
    'hf_20260905_003402_187eb61b-190a-4b83-9442-2ba7b49260c9_dchwij', // DOUBLED from Our Story
  ],
  hero:  'edinburgh-hero_jfsxk4', // heroes-jpg 4096x2294, ratio 1.786
  story: [
    'hf_20260905_003309_d0e94bb4-3a5f-4c36-ad16-5190121866ec_tthf7e', // 1536x1713
    'hf_20260905_003402_335cc9f8-11f5-483a-959d-5d924f185a9b_gba6q7', // 1536x2048
    'hf_20260905_003402_a97ceed9-415f-4b3e-9a40-07db9a40433e_h1pxon', // 1792x2400
    'hf_20260905_003402_187eb61b-190a-4b83-9442-2ba7b49260c9_dchwij', // 1536x2752
  ],
  // The SECOND WIDE, because this folder has no landscape at all.
  experiences: 'hf_20260905_003402_b1d1f1ae-dec2-4bce-8276-d087adc64428_vwgjjv', // 2752x1536
};

export const SAMPLE_EDINBURGH = {
  __sample: true,
  couple1Name: 'Fiona', couple2Name: 'Callum', coupleNames: 'Fiona & Callum',
  weddingDate: null,
  activeUniverse: 'edinburgh',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(EDINBURGH_IMAGES.hero, heroDeliveryWidth(EDINBURGH_IMAGES.hero)),

  mainCeremony: { venueName: 'The chapel on the estate', address: 'Up the avenue, past the gate lodge', startTime: '14:00', time: '14:00' },
  reception: { venueName: 'The great hall', address: 'The main house, through the front door', startTime: '17:00', time: '17:00' },

  homeContent: {
    blocks: [
      { id: 'ed1', type: 'heading', order: 0, content: { text: 'Two in the afternoon, while there is still light', kicker: 'The day' } },
      { id: 'ed2', type: 'paragraph', order: 1, content: {
        text: 'It gets dark here at four in the winter, which is why the ceremony is at two and why everything after it happens indoors with the fires lit. Dinner is at six and the hall stays open long after. There is nowhere to be afterward and no reason to leave early.',
      } },
      { id: 'ed3', type: 'quote', order: 2, content: { text: 'It will be cold and it will be dark and we would not have it any other way.', attribution: 'Fiona & Callum' } },
      { id: 'ed4', type: 'photo', order: 3, content: { url: img(EDINBURGH_IMAGES.home[0], 1400) } },
      { id: 'ed5', type: 'photo', order: 4, content: { url: img(EDINBURGH_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We were both renting rooms in the same cold house the winter we finished studying, and we spent four months being polite to each other over a kettle. Then everybody else moved out in the same week, and neither of us mentioned it, and neither of us left.',
    photos: [img(EDINBURGH_IMAGES.story[0], 1400), img(EDINBURGH_IMAGES.story[1], 1400), img(EDINBURGH_IMAGES.story[2], 1400), img(EDINBURGH_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The cold house', text: 'One kettle, four months, and a great deal of politeness.' },
      { date: 'The week everyone left', text: 'Neither of us said anything about it. Neither of us moved out.' },
      { date: 'The question', text: 'Asked on a hill in the rain, badly timed and immediately accepted.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'A fiddle and a piano while we eat, and dancing from nine once the tables are cleared. Send us what you want played at ten.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song, and it should be one you will actually get up for.' },
  registryContent: { registryMessage: 'The house is small and full and we have both been keeping the same furniture for a decade. If you would like to mark the day, there is a short list and a fund for a week away.', noGiftsPlease: false },

  qna: [
    { question: 'How cold will it be?', answer: 'Close to freezing, and the chapel is not heated. Coats stay on and nobody minds.' },
    { question: 'How do we get up to the chapel?', answer: 'A quarter mile up the avenue from the lodge. There is a car running for anybody who would rather not walk it in the wet.' },
    { question: 'What time does it get dark?', answer: 'About four. The ceremony is at two for that reason and the photographs happen straight after.' },
    { question: 'Is there anywhere to stay on the estate?', answer: 'Eight rooms in the main house and four in the lodge. After that it is fifteen minutes into town.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Forest, burgundy, charcoal, anything warm. A long coat is part of the outfit here, not a compromise.', weatherNote: 'Wet underfoot the whole way up the avenue. Bring boots and change at the house.' },
    photography: { display: true, unplugged: true, message: 'Phones away in the chapel. The light lasts about twenty minutes and we would like to spend it looking at each other.' },
    lateArrival: { display: true, policy: 'The avenue takes longer than the map says in January. Come in at the back and take the nearest seat.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The main house', description: 'Eight rooms above the hall, breakfast at nine, and thirty seconds from the party.', priceRange: '$$$' },
      { name: 'The gate lodge', description: 'Four rooms at the bottom of the avenue. Cheaper, and a walk in the dark at the end of the night.', priceRange: '$$' },
      { name: 'In town', description: 'Fifteen minutes by road with far more choice, and a bus back at midnight.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['bus', 'car', 'taxi'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-ed-t1', name: 'The bus from town', type: 'bus_station', address: 'The square, half past twelve', note: 'One up, and two back, at midnight and at one.' },
      { id: 'sample-ed-t2', name: 'Driving', type: 'car_rental', address: 'The gate lodge', note: 'Park at the lodge. The avenue is single track and soft at the edges.' },
      { id: 'sample-ed-t3', name: 'Taxis', type: 'taxi', address: 'The lodge turning', note: 'Book them a week ahead. There are four cars in the village and a wedding uses all of them.' },
    ],
    notes: [{ id: 'sample-ed-n1', title: 'The avenue', text: 'A quarter mile, unlit, and wet. There is a car running all evening if you would rather not.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The estate and the town',
    editorialIntro: 'If you are staying either side of the weekend, walk this one thing and eat at this one place.',
    couplePicks: [{ place_id: 'sample-ed-p1', name: 'The avenue', category: 'Parks & Outdoors', note: 'Twenty minutes end to end. Best in the hour before the light goes.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'The day after', summary: 'Late, and not far.',
        blocks: {
          morning: [{ id: 'sample-ed-i1', place_name: 'The avenue', description: 'Walk it before the light goes, which in January means before three.', photo_url: img(EDINBURGH_IMAGES.experiences, 800) }],
          afternoon: [{ id: 'sample-ed-i2', place_name: 'The inn at the crossroads', description: 'A fire, a long lunch, and no reason to move.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-ed-p1', title: 'What should we do about the walk up the avenue?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-ed-p1a', label: 'Everybody walks, boots provided', votes: 0 },
      { id: 'sample-ed-p1b', label: 'Cars all afternoon', votes: 0 },
      { id: 'sample-ed-p1c', label: 'Walk up, ride down', votes: 0 },
    ],
  }],
};

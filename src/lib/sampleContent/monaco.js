/**
 * SAMPLE CONTENT — monaco. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "You are invited"                     (websiteThemes.js:1271)
 *   tileDescription  "Black, white and gold, cut like a marina evening.
 *                     Precise, never loud."                (websiteThemes.js:1283)
 *
 * Precise, never loud, and that pair is the whole brief. Every line here states
 * a time, a place or a fact. Nothing is sold, nothing is described as glamorous,
 * and no sentence contains an adjective the photographs have already earned. A
 * universe about money is the easiest one to make vulgar in copy, so this one
 * simply gives instructions and gets out of the way. No souvenir vocabulary
 * (CLAUDE.md).
 *
 * Cloudinary folder `Monaco` (8 assets, all eight used, none rejected). Two
 * clean spares, so BOTH Home photographs are real spares and NOTHING is
 * doubled here.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const MONACO_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). Both are spares. No
  // doubling in this universe.
  home: [
    'hf_20260904_063711_f85315ec-38f4-458c-b0fa-b941c150e135_rec1vm', // spare landscape, the harbor
    'hf_20260904_063711_b3d46f9b-fbda-4f16-9afa-485b0bfe42dc_yc1mhb', // spare portrait, the steps
  ],
  hero:  'monaco-hero_kwfou0', // heroes-jpg 4096x2294, ratio 1.786
  story: [
    'hf_20260904_063518_aaa43bad-66a2-419e-ae69-769dd313232f_xg0qm1', // 1536x2048
    'hf_20260904_063711_59bb3a1e-4e93-4c48-bf44-722aeda29ff2_fopeap', // 1792x2400
    'hf_20260904_063711_294c70f5-51b6-4194-bef1-72f6cf26aa3f_hc1r7a', // 1792x2400
    'hf_20260904_063711_0ddc2a9b-305a-4aa4-9aa5-546cbab0f64c_inebgh', // 1792x2400
  ],
  experiences: 'hf_20260904_063712_ed9b29bf-aba5-4b2e-856f-e89f55343091_zmhwry', // 2400x1792
};

export const SAMPLE_MONACO = {
  __sample: true,
  couple1Name: 'Livia', couple2Name: 'Max', coupleNames: 'Livia & Max',
  weddingDate: null,
  activeUniverse: 'monaco',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(MONACO_IMAGES.hero, heroDeliveryWidth(MONACO_IMAGES.hero)),

  mainCeremony: { venueName: 'The terrace above the port', address: 'Top of the steps, past the second gate', startTime: '19:00', time: '19:00' },
  reception: { venueName: 'The lower deck', address: 'Berth 14, and it does not leave', startTime: '21:00', time: '21:00' },

  homeContent: {
    blocks: [
      { id: 'mn1', type: 'heading', order: 0, content: { text: 'Seven on the terrace, nine on the water', kicker: 'The evening' } },
      { id: 'mn2', type: 'paragraph', order: 1, content: {
        text: 'The ceremony is at seven, above the port, and takes fifteen minutes. Dinner is at nine, on the water, and the boat does not leave the berth. Between the two there are two hours, a bar and the last of the light.',
      } },
      { id: 'mn3', type: 'quote', order: 2, content: { text: 'Black tie, and flat shoes in your bag. There are ninety steps.', attribution: 'Livia & Max' } },
      { id: 'mn4', type: 'photo', order: 3, content: { url: img(MONACO_IMAGES.home[0], 1400) } },
      { id: 'mn5', type: 'photo', order: 4, content: { url: img(MONACO_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We met at somebody else\'s work dinner, both there as the person nobody had to talk to. We spent the evening at the end of the table being unhelpful about the seating plan, and left before dessert to find somewhere that was still serving.',
    photos: [img(MONACO_IMAGES.story[0], 1400), img(MONACO_IMAGES.story[1], 1400), img(MONACO_IMAGES.story[2], 1400), img(MONACO_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The work dinner', text: 'Neither of us was invited for our own sake. Both of us stayed for it.' },
      { date: 'The year of airports', text: 'Two cities, one weekend in three, and a rule about never arriving tired.' },
      { date: 'The question', text: 'Asked at eleven at night on a jetty, with the wrong ring, which she kept.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'A pianist on the terrace and a set on the deck from eleven. Tell us what belongs after eleven.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song, and it has to survive being played loudly.' },
  registryContent: { registryMessage: 'Between us we already own two of everything. If you would like to give something, there is a short list, and the rest goes to the sailing school on the far side of the port.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'By half past six. The gate at the top of the steps is locked at ten to seven and there is no second entrance.' },
    { question: 'How many steps are there?', answer: 'Ninety, in two flights, with a landing between them. There is a car up the back road for anybody who would rather not.' },
    { question: 'Does the boat go anywhere?', answer: 'No. It stays at the berth all night and you can step off at any point.' },
    { question: 'How formal is it?', answer: 'Black tie. It is the one thing we are firm about, and it is the easiest instruction to follow.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Black tie. Black, white, gold. Flat shoes for the steps, changed at the top.', weatherNote: 'Still and warm on the terrace, and cool on the water after midnight. Bring a jacket you like.' },
    photography: { display: true, unplugged: true, message: 'Nothing during the fifteen minutes on the terrace. Everything afterward.' },
    lateArrival: { display: true, policy: 'If the gate is locked, come down to the port and wait at the berth. We will be there by nine.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Port Hotel', description: 'Forty rooms, two minutes from the berth, and the only one you can walk to at three in the morning.', priceRange: '$$$' },
      { name: 'The apartments above the old town', description: 'Better for four people sharing, and the steps down are the same steps.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['train', 'taxi', 'walking'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-mn-t1', name: 'The station', type: 'train_station', address: 'Ten minutes up from the port', note: 'Trains along the coast until half past midnight, both directions.' },
      { id: 'sample-mn-t2', name: 'Taxis', type: 'taxi', address: 'The rank at the port entrance', note: 'Plentiful until one, then not at all. Book the late one in advance.' },
      { id: 'sample-mn-t3', name: 'On foot', type: 'other', address: 'Terrace to berth', note: 'Ninety steps down, then four minutes along the quay.' },
    ],
    notes: [{ id: 'sample-mn-n1', title: 'Parking', text: 'The port garage, and nowhere else. The street above is residents only and they do tow.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The coast',
    editorialIntro: 'Three things, none of them expensive, and all of them better before ten in the morning.',
    couplePicks: [{ place_id: 'sample-mn-p1', name: 'The far breakwater', category: 'Parks & Outdoors', note: 'Twenty minutes out along the wall. Nobody goes, and the whole port is behind you.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'The morning after', summary: 'Slow, and at sea level.',
        blocks: {
          morning: [{ id: 'sample-mn-i1', place_name: 'The far breakwater', description: 'Walk out to the end. Twenty minutes, flat, and empty before nine.', photo_url: img(MONACO_IMAGES.experiences, 800) }],
          afternoon: [{ id: 'sample-mn-i2', place_name: 'The old town', description: 'Up the steps behind the port. Shade, and lunch that is not on the water.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-mn-p1', title: 'What should we do with the two hours between?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-mn-p1a', label: 'Stay on the terrace', votes: 0 },
      { id: 'sample-mn-p1b', label: 'Walk down through the old town', votes: 0 },
      { id: 'sample-mn-p1c', label: 'Straight to the deck and start early', votes: 0 },
    ],
  }],
};

/**
 * SAMPLE CONTENT — capetown. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "You are warmly invited"              (websiteThemes.js:946)
 *   tileDescription  "Long tables, vineyard light, the kind of gathering that
 *                     lingers past dessert."               (websiteThemes.js:958)
 *
 * Warm and unhurried, and hospitable before it is elegant. The unit of this
 * universe is the long table, so the copy talks about seating, food and how
 * late it runs, and never about scenery the photographs already carry. No
 * souvenir vocabulary (CLAUDE.md).
 *
 * Cloudinary folder `CapeTown` (7 assets). ONE REJECTED: the square still life
 * of the wine glass and the note card, whose handwriting is generated and
 * illegible. The folder's one spare takes its place in Our Story, which leaves
 * NO spare for Home, so both Home photographs are DOUBLED from Our Story.
 * See the PR body for the table and the rejection.
 */
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const CAPETOWN_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). BOTH DOUBLED: the folder
  // had one spare and the rejection consumed it. Reuse rather than an empty role.
  home: [
    'hf_20260905_005622_4606588e-5a0c-4140-8f77-e510db2b086c_mhaol4', // DOUBLED from Our Story
    'hf_20260905_005530_30720159-1f17-4fba-9407-064eba8a85e2_c3ew71', // DOUBLED from Our Story
  ],
  hero:  'hf_20260905_005621_7edf723e-7279-4960-a23a-bf835593f80c_uhfav4', // 2003x1114
  story: [
    'hf_20260905_005621_ae8a68d1-affe-428e-8301-f19ee7e38110_gqsbbm', // 1536x2048
    'hf_20260905_005530_30720159-1f17-4fba-9407-064eba8a85e2_c3ew71', // 1536x2048
    'hf_20260905_005622_4606588e-5a0c-4140-8f77-e510db2b086c_mhaol4', // 1536x2752
    'hf_20260905_005622_7448900d-9ffd-46f4-9e81-54039457f5fe_qobx9m', // 2752x1536, replaces the rejected square
  ],
  experiences: 'hf_20260905_005622_0c63cd8a-e3e7-46eb-9773-edd3bbc1893b_nkefc7', // 2048x1536
};

export const SAMPLE_CAPETOWN = {
  __sample: true,
  couple1Name: 'Naledi', couple2Name: 'Sam', coupleNames: 'Naledi & Sam',
  weddingDate: null,
  activeUniverse: 'capetown',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  coverPhoto: img(CAPETOWN_IMAGES.hero, 2048),

  mainCeremony: { venueName: 'The Old Cellar', address: 'The estate, at the end of the gravel road', startTime: '16:30', time: '16:30' },
  reception: { venueName: 'Under the oak', address: 'The estate, at the end of the gravel road', startTime: '18:30', time: '18:30' },

  homeContent: {
    blocks: [
      { id: 'ct1', type: 'heading', order: 0, content: { text: 'One long table, and no head of it', kicker: 'The day' } },
      { id: 'ct2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying in the cellar at half past four and eating outside from half past six. Everybody sits at the same table. There is no top table, no seating plan beyond the one that keeps the talkers apart, and no reason to leave before the lights come on.',
      } },
      { id: 'ct3', type: 'quote', order: 2, content: { text: 'Stay for the second bottle. That is when the good part starts.', attribution: 'Naledi & Sam' } },
      { id: 'ct4', type: 'photo', order: 3, content: { url: img(CAPETOWN_IMAGES.home[0], 1400) } },
      { id: 'ct5', type: 'photo', order: 4, content: { url: img(CAPETOWN_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: "We were seated next to each other at somebody else's wedding, at the far end of a table, in the seats nobody wants. We have been arguing about whether that was luck or arrangement for six years, and the friend who did the seating still will not say.",
    photos: [img(CAPETOWN_IMAGES.story[0], 1400), img(CAPETOWN_IMAGES.story[1], 1400), img(CAPETOWN_IMAGES.story[2], 1400), img(CAPETOWN_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The far end of the table', text: 'Two hours, and neither of us moved when the music started.' },
      { date: 'The first harvest', text: 'We picked for a week, badly, and slept better than we ever have.' },
      { date: 'The question', text: 'Asked between the rows, without a ring, which arrived three weeks late.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'A guitar while we eat and a proper set after the plates go. Tell us what you want to hear in the second half.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'Send us the one you would get up for.' },
  registryContent: { registryMessage: 'We have been keeping house together for years, so there is nothing we are short of. If you would like to mark the day, there is a short list and a fund for the trip.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'From four. The ceremony is at half past and the cellar is cool, which is worth knowing in February.' },
    { question: 'How do we get there?', answer: 'Twenty five minutes from town, all sealed road until the last kilometer. There is a bus back at eleven and again at one.' },
    { question: 'What should we wear?', answer: 'Summer clothes and shoes that survive gravel. The table is set on grass.' },
    { question: 'Can we stay on the estate?', answer: 'There are six rooms and they go early. Everything else is a short drive.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Long dresses, linen, no jacket needed. Heels sink, so bring a flat pair for the grass.', weatherNote: 'Hot until seven and genuinely cold by ten. Something with sleeves.' },
    photography: { display: true, unplugged: true, message: 'Phones down for the ceremony. After that, the light does the work for you.' },
    lateArrival: { display: true, policy: 'The gate stays open. Come in at the side and take any seat at the back.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Estate Rooms', description: 'Six rooms above the cellar, breakfast included, and no drive home.', priceRange: '$$$' },
      { name: 'The Farm Cottages', description: 'Ten minutes down the valley. Better for a family or four friends sharing.', priceRange: '$$' },
      { name: 'In town', description: 'Everything you would expect, and a bus that runs both ways on the night.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['bus', 'car', 'taxi'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-ct-t1', name: 'The bus from town', type: 'bus_station', address: 'The square, half past three', note: 'Back at eleven and at one. Tell us which one you want.' },
      { id: 'sample-ct-t2', name: 'Driving', type: 'car_rental', address: 'The estate gate', note: 'Parking in the field, and you may leave the car overnight.' },
      { id: 'sample-ct-t3', name: 'Taxis', type: 'taxi', address: 'The gravel turn', note: 'Book the return before dinner. Reception is poor past the gate.' },
    ],
    notes: [{ id: 'sample-ct-n1', title: 'The last kilometer', text: 'Gravel, and slow. Allow ten minutes more than the map says.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The valley',
    editorialIntro: 'If you are making a weekend of it, these are the three we would send you to before any of the famous ones.',
    couplePicks: [{ place_id: 'sample-ct-p1', name: 'The oak terrace', category: 'Food & Drink', note: 'Lunch under the tree, and the only booking we would insist you make.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'The day after', summary: 'Slow, and outside.',
        blocks: {
          morning: [{ id: 'sample-ct-i1', place_name: 'The oak terrace', description: 'Coffee at the long table while somebody clears the night before.', photo_url: img(CAPETOWN_IMAGES.experiences, 800) }],
          afternoon: [{ id: 'sample-ct-i2', place_name: 'The top of the ridge', description: 'Forty minutes up, and the whole valley laid out at the end of it.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-ct-p1', title: 'How should we seat the tables?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-ct-p1a', label: 'Named places, decided by us', votes: 0 },
      { id: 'sample-ct-p1b', label: 'Sit where you like', votes: 0 },
      { id: 'sample-ct-p1c', label: 'Named for dinner, then move', votes: 0 },
    ],
  }],
};

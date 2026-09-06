/**
 * SAMPLE CONTENT — mykonos. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "You are invited"                     (websiteThemes.js:1010)
 *   tileDescription  "Whitewash and cobalt, cut clean against the sky.
 *                     Architecture becomes the decoration." (websiteThemes.js:1022)
 *
 * Cut clean is the instruction, and it is a copy instruction as much as a
 * design one. Short declaratives, one idea a sentence, nothing decorated. If a
 * line could lose three words and still say the same thing, it loses them. No
 * souvenir vocabulary (CLAUDE.md): the whitewash and the cobalt are the accent.
 *
 * Cloudinary folder `Mykonos` (9 assets, the deepest folder in this group).
 * None rejected. Both Home photographs come from real spares, so NOTHING is
 * doubled here. One asset is left unused and named in the PR body.
 */
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const MYKONOS_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). Both are spares. No
  // doubling in this universe.
  home: [
    'hf_20260904_090923_f1e18ca9-e860-46f7-9b7a-68d1b50d3799_wvizty', // spare landscape
    'hf_20260904_090923_44ee9a1e-e351-4354-8d95-aa894a00be7f_arcb8g', // spare wide
  ],
  hero:  'hf_20260904_090923_b58ff759-bc2c-4735-9af8-1b4069e585b1_bhqfgl', // 2752x1536
  story: [
    'hf_20260904_090757_2d90ddf0-bdd6-4cff-9fa0-98f25d9126ba_xak6aq', // 1536x2048
    'hf_20260904_091123_615a0401-1836-4426-b699-13c6b9a2cd66_s1binz', // 1536x2048
    'hf_20260904_090923_82df8d9a-a662-4657-944a-f77c95976dae_hagfhf', // 1792x2400
    'hf_20260904_090923_faab7fc5-e634-424b-95b7-39315dccbcf3_qe3lsz', // 1792x2400
  ],
  experiences: 'hf_20260904_090923_ff7c8b8a-4339-4f02-aae4-d8e999eb1a56_ir0zw0', // 2400x1792
};

export const SAMPLE_MYKONOS = {
  __sample: true,
  couple1Name: 'Sofia', couple2Name: 'Alex', coupleNames: 'Sofia & Alex',
  weddingDate: null,
  activeUniverse: 'mykonos',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  coverPhoto: img(MYKONOS_IMAGES.hero, 2048),

  mainCeremony: { venueName: 'The white chapel', address: 'Above the north cove', startTime: '18:00', time: '18:00' },
  reception: { venueName: 'The terrace', address: 'Below the chapel, down forty steps', startTime: '20:00', time: '20:00' },

  homeContent: {
    blocks: [
      { id: 'mk1', type: 'heading', order: 0, content: { text: 'Six at sunset, then down to the water', kicker: 'The day' } },
      { id: 'mk2', type: 'paragraph', order: 1, content: {
        text: 'The chapel holds forty people and we are inviting exactly forty. Dinner is on the terrace below it, forty steps down, and it goes until the music stops. Nothing else is scheduled.',
      } },
      { id: 'mk3', type: 'quote', order: 2, content: { text: 'Wear white if you want. We are not precious about it.', attribution: 'Sofia & Alex' } },
      { id: 'mk4', type: 'photo', order: 3, content: { url: img(MYKONOS_IMAGES.home[0], 1400) } },
      { id: 'mk5', type: 'photo', order: 4, content: { url: img(MYKONOS_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We met on a boat with eleven other people and spent four days pretending the others were interesting. On the last morning he asked for a number and got a name spelled wrong. It took him a month to find her anyway.',
    photos: [img(MYKONOS_IMAGES.story[0], 1400), img(MYKONOS_IMAGES.story[1], 1400), img(MYKONOS_IMAGES.story[2], 1400), img(MYKONOS_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The boat', text: 'Four days. Eleven witnesses, and no two of them agree.' },
      { date: 'The wrong spelling', text: 'One month of searching, and a message that opened with an apology.' },
      { date: 'The question', text: 'Asked in the water, out of breath, and repeated on dry land.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'Nothing until dinner, then everything. Send us what belongs after ten.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song. Loud is fine.' },
  registryContent: { registryMessage: 'You are crossing water to be here, and that is the gift. If you want to give something anyway, the list is short.', noGiftsPlease: false },

  qna: [
    { question: 'How do we get up to the chapel?', answer: 'A gravel track, five minutes on foot from the parking. Cars cannot make the last part.' },
    { question: 'What about the steps?', answer: 'Forty, uneven, and lit after dark. There is a road around for anyone who would rather not.' },
    { question: 'What should we wear?', answer: 'Light and loose. Flat shoes for the steps, and something over your shoulders after nine.' },
    { question: 'Is there a boat?', answer: 'Yes, from the old port at five, and it waits to bring everybody back.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Whites, blues, linen. Leave the heels at the hotel.', weatherNote: 'The wind comes up at dusk and does not drop. Hats will not survive it.' },
    photography: { display: true, unplugged: true, message: 'Nothing raised during the ceremony. The chapel is small and everybody is in shot.' },
    lateArrival: { display: true, policy: 'The track takes longer than you think. If you miss it, we will be on the terrace by eight.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Cove Rooms', description: 'Nine rooms, ten minutes below the chapel, and the easiest walk home.', priceRange: '$$$' },
      { name: 'The Village Houses', description: 'In town, cheaper, and a taxi each way. Better if you want more than a bed.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['ferry', 'taxi', 'walking'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-mk-t1', name: 'The boat', type: 'ferry', address: 'The old port, five in the afternoon', note: 'Twenty minutes across. It waits for the ride back.' },
      { id: 'sample-mk-t2', name: 'Taxis', type: 'taxi', address: 'The parking below the track', note: 'Few of them and they stop early. Book the return in the morning.' },
      { id: 'sample-mk-t3', name: 'On foot', type: 'other', address: 'Parking to chapel', note: 'Five minutes up, loose gravel, no shade.' },
    ],
    notes: [{ id: 'sample-mk-n1', title: 'Driving', text: 'The last stretch is single track with no room to turn. Park at the bottom.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The island',
    editorialIntro: 'Two things worth doing, and one worth skipping. We will tell you which is which when you get here.',
    couplePicks: [{ place_id: 'sample-mk-p1', name: 'The north beach', category: 'Beaches', note: 'Windy, empty, and the only one with no music.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'The morning after', summary: 'Late, and no further than the water.',
        blocks: {
          morning: [{ id: 'sample-mk-i1', place_name: 'The old town', description: 'Walk it before nine, while it still belongs to the people who live there.', photo_url: img(MYKONOS_IMAGES.experiences, 800) }],
          afternoon: [{ id: 'sample-mk-i2', place_name: 'The north beach', description: 'Bring your own shade. There is none.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-mk-p1', title: 'When should dinner start?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-mk-p1a', label: 'Eight, and eat while it is light', votes: 0 },
      { id: 'sample-mk-p1b', label: 'Nine, and eat in the dark', votes: 0 },
      { id: 'sample-mk-p1c', label: 'Whenever the wind drops', votes: 0 },
    ],
  }],
};

/**
 * SAMPLE CONTENT — brooklyn. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "The wedding"
 *   tileDescription  "Unfussy and direct, cut like a gig poster. This is the
 *                     wedding, come as you are."
 *
 * Short sentences. Nothing dressed up. The shortest copy of the fifteen, on
 * purpose — this universe says less than the others and the writing has to
 * match it or the tone is a lie. No souvenir vocabulary (CLAUDE.md).
 *
 * Cloudinary folder `Brooklyn` (8 assets). ONE REJECTED: a bar interior whose
 * neon reads as a garbled near-trademark brand mark; the stoop portrait took
 * its place. Recorded in the PR body.
 */
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const BROOKLYN_IMAGES = {
  hero:  'hf_20260904_090213_add0b2d6-8dcc-44ce-8360-762925a327c7_g5eb7y', // 2752x1536
  story: [
    'hf_20260904_090059_18da7a9c-eefa-4e7b-8779-86cdcc3b15e8_q418v1', // 1536x2048
    'hf_20260904_090213_dcaa917a-e117-4610-8618-a399139999a4_jv74kl', // 1792x2400
    'hf_20260904_090214_aa592056-d6cf-4c84-bb8e-20ad4a8d3827_esutl7', // 1792x2400
    'hf_20260904_090214_88086b18-1484-488b-bafc-6415ecdd335f_hzk7jo', // 1536x2752
  ],
  experiences: 'hf_20260904_090213_9e775ed3-5cad-408b-a2c0-cf80abcb9dc1_kz45wd', // 2400x1792
};

export const SAMPLE_BROOKLYN = {
  __sample: true,
  couple1Name: 'Frankie', couple2Name: 'Dev', coupleNames: 'Frankie & Dev',
  weddingDate: null,
  activeUniverse: 'brooklyn',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  coverPhoto: img(BROOKLYN_IMAGES.hero, 2048),

  mainCeremony: { venueName: 'The Warehouse', address: 'Under the tracks', startTime: '16:00', time: '16:00' },
  reception: { venueName: 'The Back Room', address: 'Under the tracks', startTime: '18:00', time: '18:00' },

  homeContent: {
    blocks: [
      { id: 'bk1', type: 'heading', order: 0, content: { text: 'One room, one night', kicker: 'The wedding' } },
      { id: 'bk2', type: 'paragraph', order: 1, content: {
        text: 'Short ceremony at four. Food at six. Dancing until they throw us out. That is the whole plan and there is not a second half we are keeping from you.',
      } },
      { id: 'bk3', type: 'quote', order: 2, content: { text: 'Come as you are. We mean it.', attribution: 'Frankie & Dev' } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We met working the same bad shift and spent two years pretending that was all it was. Everyone else had worked it out long before we did. They were not subtle about telling us afterward.',
    photos: [img(BROOKLYN_IMAGES.story[0], 1400), img(BROOKLYN_IMAGES.story[1], 1400), img(BROOKLYN_IMAGES.story[2], 1400), img(BROOKLYN_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The shift', text: 'Neither of us wanted it. Both of us kept swapping onto it.' },
      { date: 'The apartment', text: 'Fourth floor, no lift, and worth every flight.' },
      { date: 'The question', text: 'Asked on the stoop at two in the morning. No ring, no plan.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'The playlist is long and it is not finished. Add something to it.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song. Loud is fine.' },
  registryContent: { registryMessage: 'You turning up is the gift. There is a list if you want one.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'Half past three. The ceremony is ten minutes and it starts at four.' },
    { question: 'What should we wear?', answer: 'Whatever you would wear out. Nobody is checking.' },
    { question: 'Can we bring children?', answer: 'Yes. It gets loud after nine, so plan around that.' },
    { question: 'How do we get home?', answer: 'The train runs all night. Taxis are easier to find on the avenue than under the tracks.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'No dress code. Wear what you would wear out.', weatherNote: 'The room is cold before the dancing starts and warm after.' },
    photography: { display: true, unplugged: true, message: 'Phones down for ten minutes. After that, go ahead.' },
    lateArrival: { display: true, policy: 'Walk in. It is one room and nobody will notice.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Corner Hotel', description: 'Two blocks up. Nothing fancy and perfectly fine.', priceRange: '$$' },
      { name: 'The Guest Rooms', description: 'One stop on the train, cheaper, and quieter at night.', priceRange: '$' },
    ],
  },

  transport: { enabledModes: ['train', 'taxi'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-bk-t1', name: 'The train', type: 'train', address: 'Two minutes from the door', note: 'Runs all night. Easiest way in and out.' },
      { id: 'sample-bk-t2', name: 'Taxis', type: 'taxi', address: 'Up on the avenue', note: 'Hard to find under the tracks. Walk up one block.' },
    ],
    notes: [{ id: 'sample-bk-n1', title: 'Parking', text: 'Street only, and it is not easy after six.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The neighborhood',
    editorialIntro: 'Staying the weekend? These are ours.',
    couplePicks: [{ place_id: 'sample-bk-p1', name: 'The Counter', category: 'Coffee & Bakeries', note: 'Coffee from six. Stand up, drink it, leave.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'If you are around on Sunday', summary: 'Nothing booked.',
        blocks: {
          morning: [{ id: 'sample-bk-i1', place_name: 'The Counter', description: 'Coffee, standing, before anything opens.', photo_url: img(BROOKLYN_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-bk-i2', place_name: 'The roof', description: 'Go up for the last of the light.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-bk-p1', title: 'Last song of the night?', category: 'music', isActive: true, allowComments: true,
    options: [
      { id: 'sample-bk-p1a', label: 'Something everyone shouts', votes: 0 },
      { id: 'sample-bk-p1b', label: 'Something slow, to clear the room', votes: 0 },
      { id: 'sample-bk-p1c', label: 'Whatever is playing when the lights come up', votes: 0 },
    ],
  }],
};

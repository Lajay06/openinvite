/**
 * SAMPLE CONTENT — florence. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "You are invited"                     (websiteThemes.js:1307)
 *   tileDescription  "Olive and terracotta, sketched with a loose hand. A
 *                     vineyard held gently."               (websiteThemes.js:1319)
 *
 * A loose hand is the instruction, and it is the opposite of monaco's. Sentences
 * here are allowed to wander a little and to leave things unsettled, because
 * this is the universe of a wedding that is still being decided a week out. Held
 * gently means nothing is enforced: no dress code that reads as a rule, no hour
 * that reads as a deadline. No souvenir vocabulary (CLAUDE.md) — the olive, the
 * terracotta and the sketching are in the photographs.
 *
 * Cloudinary folder `Florence` (8 assets). ONE REJECTED: the trattoria interior,
 * whose vertical sign carries generated lettering ("trattt ri…", a legible
 * misspelling rather than an illegible blur). The folder's spare landscape takes
 * Experiences in its place, which leaves one spare, so the first Home photograph
 * is that spare and the second is DOUBLED from Our Story.
 */
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const FLORENCE_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). One spare, one DOUBLED —
  // the rejection below consumed the other spare.
  home: [
    'hf_20260905_002214_429e2213-24cf-4816-a7e5-d1c831c03ac5_q8nmoe', // spare portrait, the wall above the city
    'hf_20260905_002214_399c4e2d-77e4-413b-bbde-2ef07ffb4f8f_pq7npc', // DOUBLED from Our Story
  ],
  hero:  'hf_20260905_002214_1399c6db-0ddd-4088-9526-39183bd49209_xrv2pd', // 2752x1536
  story: [
    'hf_20260905_002213_2eaa3582-4a16-4ed9-8555-e5215af5952f_ag4mfk', // 1536x2048
    'hf_20260905_002102_cf3cd26e-c033-41cf-878c-2ff1c59e046f_c3yhxm', // 1536x2048
    'hf_20260905_002214_16f9fd86-cd4a-4a26-9aa7-d2779634fe4c_oiqkg3', // 1792x2400
    'hf_20260905_002214_399c4e2d-77e4-413b-bbde-2ef07ffb4f8f_pq7npc', // 1792x2400
  ],
  // The spare landscape, standing in for the rejected trattoria interior.
  experiences: 'hf_20260905_002213_4fff6638-07c1-4d3c-88dd-2e80236eb169_owjzbn', // 2048x1536
};

export const SAMPLE_FLORENCE = {
  __sample: true,
  couple1Name: 'Chiara', couple2Name: 'Sandro', coupleNames: 'Chiara & Sandro',
  weddingDate: null,
  activeUniverse: 'florence',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  coverPhoto: img(FLORENCE_IMAGES.hero, 2048),

  mainCeremony: { venueName: 'The olive terrace', address: 'Behind the farmhouse, up the track', startTime: '18:00', time: '18:00' },
  reception: { venueName: 'The long table under the pergola', address: 'The same terrace, ten steps over', startTime: '20:00', time: '20:00' },

  homeContent: {
    blocks: [
      { id: 'fl1', type: 'heading', order: 0, content: { text: 'Six on the terrace, and dinner when it is ready', kicker: 'The day' } },
      { id: 'fl2', type: 'paragraph', order: 1, content: {
        text: 'The ceremony is at six among the olives, and dinner is at the long table afterward, at whatever hour the kitchen says it is ready. We have deliberately not planned the middle of the evening. Somebody usually brings a guitar and we have never known that to go badly.',
      } },
      { id: 'fl3', type: 'quote', order: 2, content: { text: 'There is no schedule after six. That is not an oversight.', attribution: 'Chiara & Sandro' } },
      { id: 'fl4', type: 'photo', order: 3, content: { url: img(FLORENCE_IMAGES.home[0], 1400) } },
      { id: 'fl5', type: 'photo', order: 4, content: { url: img(FLORENCE_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'She was drawing in a doorway to get out of the rain and he asked what it was, which was a stupid question because it was obviously the doorway opposite. We have both been drawing the same six streets for eleven years and we still argue about whether that one was any good.',
    photos: [img(FLORENCE_IMAGES.story[0], 1400), img(FLORENCE_IMAGES.story[1], 1400), img(FLORENCE_IMAGES.story[2], 1400), img(FLORENCE_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The doorway', text: 'A stupid question, and an hour of waiting out the rain.' },
      { date: 'The shared studio', text: 'Two years of pretending it was about the rent.' },
      { date: 'The question', text: 'Asked on the terrace, over a drawing of the terrace, which he had been working on for a month.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'Nothing arranged and no band booked. If you play, bring it. If you do not, send us something for the speakers after midnight.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song, or one instrument. Either is welcome.' },
  registryContent: { registryMessage: 'We have far too much of everything already, most of it half finished. If you would like to mark the day, there is a short list, and the rest goes toward the roof of the studio.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'Any time after five. The ceremony is at six and nothing before it is arranged.' },
    { question: 'When is dinner?', answer: 'When it is ready, which is usually about eight and has once been half past nine.' },
    { question: 'What should we wear?', answer: 'Whatever you would wear to a long dinner outside. The terrace is gravel and the evening is warm.' },
    { question: 'How do we get up to the farmhouse?', answer: 'A mile of track from the road. Any car will do it dry, and none of them will do it fast.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Olive, terracotta, cream, linen. Nothing you would be sad to get dust on.', weatherNote: 'Hot until seven, perfect until eleven, cool after. Something over your shoulders.' },
    photography: { display: true, unplugged: true, message: 'Please keep the phones down for the ceremony. Afterward we would genuinely like your pictures, because we have not booked anybody for the evening.' },
    lateArrival: { display: true, policy: 'The track is slow and everybody underestimates it. Come up whenever you get here.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The farmhouse rooms', description: 'Five rooms, breakfast whenever you appear, and no drive at the end of the night.', priceRange: '$$' },
      { name: 'The village below', description: 'Fifteen minutes down the track. More choice, and a taxi that has to be booked in the morning.', priceRange: '$$' },
      { name: 'In the city', description: 'Forty minutes away, and worth it if you want two days before or after.', priceRange: '$$$' },
    ],
  },

  transport: { enabledModes: ['car', 'taxi'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-fl-t1', name: 'Driving', type: 'car_rental', address: 'The farmhouse track', note: 'A mile of gravel. Fine in any car. Park on the flat by the barn.' },
      { id: 'sample-fl-t2', name: 'Taxis', type: 'taxi', address: 'The bottom of the track', note: 'Book in the morning for the night. They will not come up the track after dark.' },
    ],
    notes: [{ id: 'sample-fl-n1', title: 'The track', text: 'Slow, and completely dark at night. If you are driving down late, take somebody with a torch.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The hills and the city',
    editorialIntro: 'We have lived here long enough to have stopped going to most of it. These are the ones we still go to.',
    couplePicks: [{ place_id: 'sample-fl-p1', name: 'The wall above the olives', category: 'Parks & Outdoors', note: 'Ten minutes up from the barn. Go at seven in the evening, not at midday.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'The day before, if you are early', summary: 'Nothing booked, and nothing that needs to be.',
        blocks: {
          morning: [{ id: 'sample-fl-i1', place_name: 'The studio', description: 'The door is open. There is coffee and there is usually somebody in it.', photo_url: img(FLORENCE_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-fl-i2', place_name: 'The wall above the olives', description: 'Take a bottle up at seven and watch the light go off the hills.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-fl-p1', title: 'Should we plan the evening at all?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-fl-p1a', label: 'No. Leave it exactly as it is', votes: 0 },
      { id: 'sample-fl-p1b', label: 'One thing at ten, then loose again', votes: 0 },
      { id: 'sample-fl-p1c', label: 'Book somebody, just in case', votes: 0 },
    ],
  }],
};

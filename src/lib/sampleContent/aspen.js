/**
 * SAMPLE CONTENT — aspen. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "You are invited"                     (websiteThemes.js:1126)
 *   tileDescription  "Snow, pine and quiet luxury. A lodge dressed for black
 *                     tie."                                (websiteThemes.js:1138)
 *
 * QUIET luxury, which in copy means the expensive things are mentioned the way
 * you mention the weather. Black tie is stated once, as a fact, and never sold.
 * The trap in this universe is the boast — a sentence that exists to say how
 * good the weekend will be — and there is not one below. What is left is
 * logistics, which at altitude in winter is genuinely what a guest needs.
 *
 * Cloudinary folder `Aspen` (6 assets, the shallowest in the whole programme,
 * all six used, none rejected). Six assets, six roles, no spare — so BOTH Home
 * photographs are DOUBLED from Our Story.
 */
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const ASPEN_IMAGES = {
  // TWO EXTRA HOME PHOTOS, BOTH DOUBLED: six assets, six roles, no spare.
  // Reuse rather than an empty role.
  home: [
    'hf_20260905_024502_4d83f52a-6e0b-4646-8139-ecb322b66c97_wvmeaa', // DOUBLED from Our Story
    'hf_20260905_024408_5ea5126e-9788-4fb3-8940-a0601f02f0b2_vgnvzm', // DOUBLED from Our Story
  ],
  hero:  'hf_20260905_024502_708157cd-fe8b-4f61-81fa-647f8c1c8125_chakrw', // 2752x1536
  story: [
    'hf_20260905_024408_5ea5126e-9788-4fb3-8940-a0601f02f0b2_vgnvzm', // 1536x2048
    'hf_20260905_024501_a377409a-d5cf-4466-9eab-4fbf74a2d127_eitv21', // 1536x2048
    'hf_20260905_024502_4d83f52a-6e0b-4646-8139-ecb322b66c97_wvmeaa', // 1792x2400
    'hf_20260905_024501_86ee12ec-65a0-42d9-8441-fbcfd3229806_pzgzjn', // 2048x1152
  ],
  experiences: 'hf_20260905_024501_3dce767e-ff1a-4e91-9a10-0e32030cf85a_f8l6dm', // 2048x1536
};

export const SAMPLE_ASPEN = {
  __sample: true,
  couple1Name: 'Elsa', couple2Name: 'Tomas', coupleNames: 'Elsa & Tomas',
  weddingDate: null,
  activeUniverse: 'aspen',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  coverPhoto: img(ASPEN_IMAGES.hero, 2048),

  mainCeremony: { venueName: 'The clearing above the lodge', address: 'Ten minutes up, on foot or by sled', startTime: '15:30', time: '15:30' },
  reception: { venueName: 'The lodge', address: 'Back down the same track', startTime: '18:00', time: '18:00' },

  homeContent: {
    blocks: [
      { id: 'as1', type: 'heading', order: 0, content: { text: 'Half past three, outside, in the snow', kicker: 'The day' } },
      { id: 'as2', type: 'paragraph', order: 1, content: {
        text: 'The ceremony is in the clearing above the lodge and it takes fifteen minutes, which is about as long as anyone will want to stand still up there. Dinner is at six, indoors, black tie, with the fire going. Boots up, shoes in a bag.',
      } },
      { id: 'as3', type: 'quote', order: 2, content: { text: 'Fifteen minutes of cold, and then the whole evening warm.', attribution: 'Elsa & Tomas' } },
      { id: 'as4', type: 'photo', order: 3, content: { url: img(ASPEN_IMAGES.home[0], 1400) } },
      { id: 'as5', type: 'photo', order: 4, content: { url: img(ASPEN_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We were both put on the last chair of the day with a stranger because the line was long, and neither of us skied the rest of the afternoon. Seven winters later we still argue about who suggested stopping, and neither of us has ever produced a witness.',
    photos: [img(ASPEN_IMAGES.story[0], 1400), img(ASPEN_IMAGES.story[1], 1400), img(ASPEN_IMAGES.story[2], 1400), img(ASPEN_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The last chair', text: 'Eleven minutes up, and neither of us went down.' },
      { date: 'The winter we stayed', text: 'A season in one room with one heater between us.' },
      { date: 'The question', text: 'Asked at the top, badly, with a glove still on.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'A trio through dinner and something considerably louder from ten. Send us the second half.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song, and it has to work at altitude.' },
  registryContent: { registryMessage: 'Getting here in February is the gift and we know exactly what it costs. If you would like to give something as well, the list is short.', noGiftsPlease: false },

  qna: [
    { question: 'How cold is the clearing?', answer: 'Around minus ten at half past three, colder if there is wind. Fifteen minutes, and there is somewhere warm at both ends.' },
    { question: 'How do we get up there?', answer: 'Ten minutes on foot up a packed track, or on the sled, which runs from three.' },
    { question: 'What about the altitude?', answer: 'Eight thousand feet. Arrive a day early if you can, drink more water than you want to, and go easy on the first night.' },
    { question: 'Black tie in the snow?', answer: 'Black tie at dinner. Whatever keeps you warm outside, over the top of it.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Black tie for the evening. Boots and a real coat for the clearing, left at the door.', weatherNote: 'Minus ten and falling after dark. Nothing you would not wear on a mountain.' },
    photography: { display: true, unplugged: true, message: 'Phones stay in pockets in the clearing. Gloves off for a photograph is how a phone ends up in the snow.' },
    lateArrival: { display: true, policy: 'The track is lit. Come up when you can, or wait at the lodge and meet us coming down.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The lodge', description: 'Twelve rooms above the dining room. Nobody drives, and breakfast runs until eleven.', priceRange: '$$$' },
      { name: 'The cabins', description: 'Five minutes down the track, better for a family, and half the price.', priceRange: '$$' },
      { name: 'In town', description: 'Twenty minutes by road with far more choice, and a shuttle back at midnight and at two.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['shuttle', 'car', 'airport'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-as-t1', name: 'The shuttle from town', type: 'bus_station', address: 'The square, two in the afternoon', note: 'Back at midnight and at two. Tell us which and we will hold you a seat.' },
      { id: 'sample-as-t2', name: 'From the airport', type: 'airport', address: 'Forty minutes when the road is clear', note: 'Allow twice that after snow, and do not book the last flight out.' },
      { id: 'sample-as-t3', name: 'Driving', type: 'car_rental', address: 'The lodge road', note: 'Chains or winter tires. The last mile is not plowed after dark.' },
    ],
    notes: [{ id: 'sample-as-n1', title: 'Leaving', text: 'The road closes in heavy snow, sometimes for a day. Keep the Monday loose.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The valley',
    editorialIntro: 'Two things to do if you are staying on, and one thing to avoid on the Sunday.',
    couplePicks: [{ place_id: 'sample-as-p1', name: 'The old mining road', category: 'Parks & Outdoors', note: 'An hour up, flat the whole way, and empty. Snowshoes at the lodge.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'The day after', summary: 'Late, and not far.',
        blocks: {
          morning: [{ id: 'sample-as-i1', place_name: 'The old mining road', description: 'An hour out and back. Take the snowshoes; the track is soft after ten.', photo_url: img(ASPEN_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-as-i2', place_name: 'The lodge fire', description: 'Where everyone ends up anyway. Nothing is booked.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-as-p1', title: 'Sled or walk, up to the clearing?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-as-p1a', label: 'Everybody walks', votes: 0 },
      { id: 'sample-as-p1b', label: 'Sled, and keep the boots clean', votes: 0 },
      { id: 'sample-as-p1c', label: 'Whichever you like on the day', votes: 0 },
    ],
  }],
};

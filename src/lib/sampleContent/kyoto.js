/**
 * SAMPLE CONTENT — kyoto. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "A quiet gathering"                   (websiteThemes.js:607)
 *   tileDescription  "Vast quiet, one perfect mark. Restraint as its own kind
 *                     of beauty."                          (websiteThemes.js:619)
 *
 * ONE PERFECT MARK is a copy instruction before it is a design one, and it is
 * the hardest in the set to obey: it means saying a thing once. No sentence
 * here restates the one before it, nothing is emphasised twice, and where a
 * fact would ordinarily be softened it is simply stated. Restraint as its own
 * kind of beauty also rules out apology — a short answer is not a curt one.
 *
 * The souvenir trap here is the loudest of any universe (CLAUDE.md's own
 * reductio names it): not one Japanese word, not one named ceremony, not one
 * borrowed noun doing work the typography and the photographs already do.
 *
 * Cloudinary folder `Kyoto` (9 assets). ONE REJECTED: the scanned print whose
 * paper border carries "sarngim." set into it — generated lettering that is
 * not a word, unremovable because it is in the pixels. The folder's tall
 * corridor takes its place in Our Story, and both Home photographs are real
 * spares, so NOTHING is doubled here.
 */
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const KYOTO_IMAGES = {
  // TWO EXTRA HOME PHOTOS. Both are spares; no doubling in this universe.
  home: [
    'hf_20260905_000552_c4179722-4919-4cf2-8b14-0d6b1c5e411a_jn432w', // 2048x1152, the lantern
    'hf_20260905_000552_c1f98b22-c502-44ce-87be-4dacbb3a40b0_owe8rh', // 2048x2048, the tray
  ],
  hero:  'hf_20260905_000552_520a1d94-bc5b-414f-b2dc-c2ea5c10eddd_joe95w', // 2752x1536
  story: [
    'hf_20260905_000552_2cca659c-1fe7-4200-bbf4-0c2bc5ae3681_io8hta', // 1536x2752, replaces the rejected print
    'hf_20260905_000552_544553cf-c442-4d7c-83eb-29a3675ec794_onvvkl', // 1536x2048
    'hf_20260905_000552_31514ac0-539d-4236-bdb8-bff4908addf4_czm3nh', // 1792x2400
    'hf_20260905_000552_6726a7fb-856a-4399-b95e-70d294880bef_cluis5', // 1792x2400
  ],
  experiences: 'hf_20260905_000552_6c316650-b2a9-4f13-ab71-b6897c4f485a_zpncx5', // 2400x1792
};

export const SAMPLE_KYOTO = {
  __sample: true,
  couple1Name: 'Mika', couple2Name: 'Ren', coupleNames: 'Mika & Ren',
  weddingDate: null,
  activeUniverse: 'kyoto',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  coverPhoto: img(KYOTO_IMAGES.hero, 2048),

  mainCeremony: { venueName: 'The garden room', address: 'The last house on the lane', startTime: '10:00', time: '10:00' },
  reception: { venueName: 'The same room', address: 'The last house on the lane', startTime: '12:00', time: '12:00' },

  homeContent: {
    blocks: [
      { id: 'ky1', type: 'heading', order: 0, content: { text: 'Ten in the morning, twenty people', kicker: 'The day' } },
      { id: 'ky2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying in a room that holds twenty, and eating in it afterward. There is one course at a time and no speeches. We will be finished by three.',
      } },
      { id: 'ky3', type: 'quote', order: 2, content: { text: 'We asked twenty people. That is the whole of the plan.', attribution: 'Mika & Ren' } },
      { id: 'ky4', type: 'photo', order: 3, content: { url: img(KYOTO_IMAGES.home[0], 1400) } },
      { id: 'ky5', type: 'photo', order: 4, content: { url: img(KYOTO_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We shared a wall for two years before we shared a word. She heard him playing the same eight bars every evening and never once mentioned it, and when they finally met on the stairs he apologized for the noise before either of them said hello.',
    photos: [img(KYOTO_IMAGES.story[0], 1400), img(KYOTO_IMAGES.story[1], 1400), img(KYOTO_IMAGES.story[2], 1400), img(KYOTO_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The wall', text: 'Two years. The same eight bars, most evenings.' },
      { date: 'The stairs', text: 'An apology, then a name, in that order.' },
      { date: 'The question', text: 'Asked in the garden, in the rain, with no ring and no witnesses.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'One player, in the room, for about twenty minutes. Tell us the piece you would want to hear in a quiet room.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One piece each.' },
  registryContent: { registryMessage: 'The house is small and finished. If you would like to mark the day, there is a short list of things that will be used rather than kept.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'By twenty to ten. The lane is narrow and the door is easy to walk past.' },
    { question: 'How long is it?', answer: 'The ceremony is twenty minutes. Lunch is two hours. Nothing is planned after three.' },
    { question: 'What should we wear?', answer: 'Quiet colors, and shoes you can take off. The room is matted and everyone is barefoot.' },
    { question: 'Is there parking?', answer: 'None on the lane. There is a lot five minutes away and it is rarely full before nine.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Grey, ivory, moss, black. Nothing that needs to be seen from across a room.', weatherNote: 'The room opens onto the garden and stays cool. A layer, even in June.' },
    photography: { display: true, unplugged: true, message: 'No photographs during the ceremony. The room is twenty feet across and a raised phone is the only thing anyone would look at.' },
    lateArrival: { display: true, policy: 'The garden door is open. Come around and sit at the back; nobody will turn.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The inn on the corner', description: 'Six rooms, two minutes on foot, breakfast at seven.', priceRange: '$$$' },
      { name: 'The guesthouse by the river', description: 'Fifteen minutes on foot and a good deal cheaper. Best for two nights or more.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['train', 'walking'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-ky-t1', name: 'The station', type: 'train_station', address: 'Eight minutes on foot', note: 'Trains every ten minutes until midnight.' },
      { id: 'sample-ky-t2', name: 'On foot', type: 'other', address: 'From the station to the lane', note: 'Eight minutes, flat, one turn. Follow the wall.' },
    ],
    notes: [{ id: 'sample-ky-n1', title: 'The lane', text: 'No cars past the corner. Everything from there is on foot.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The eastern hills',
    editorialIntro: 'Three places, all of them better before eight in the morning, and all of them free.',
    couplePicks: [{ place_id: 'sample-ky-p1', name: 'The moss garden', category: 'Parks & Outdoors', note: 'Go at opening. An hour later it is a different place entirely.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'The morning before', summary: 'Early, and on foot.',
        blocks: {
          morning: [{ id: 'sample-ky-i1', place_name: 'The moss garden', description: 'Twenty minutes to walk, an hour to sit.', photo_url: img(KYOTO_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-ky-i2', place_name: 'The canal path', description: 'Walk north until you run out of lamps.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-ky-p1', title: 'Should there be speeches after all?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-ky-p1a', label: 'No. That was the point', votes: 0 },
      { id: 'sample-ky-p1b', label: 'One, from whoever wants to', votes: 0 },
      { id: 'sample-ky-p1c', label: 'A written note at each place instead', votes: 0 },
    ],
  }],
};

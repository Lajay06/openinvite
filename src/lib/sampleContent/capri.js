/**
 * SAMPLE CONTENT — capri. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   tagline          "Mediterranean summer"
 *   tileDescription  "Sun on warm stone, citrus at the table, joy that doesn't
 *                     apologize for itself."
 *
 * Warm and unembarrassed, but NOT loud on the page. capri's own rsvpIntro
 * carries an exclamation mark as a deliberate, owner-approved exemption; the
 * copy below takes none, because this run's rule bars them in what we author.
 * No souvenir vocabulary (CLAUDE.md).
 *
 * Cloudinary folder `Capri` (6 assets, all six used). One is FLAGGED rather
 * than rejected — see the PR body: the square still life carries a small
 * handwritten card whose script is illegible. It is not confident wrong
 * lettering like Havana's, and capri has no spare asset, so rejecting it would
 * drop Our Story to three photographs. The owner's call, stated not taken.
 */
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const CAPRI_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). Where the folder had no
  // clean spare the asset is DOUBLED from Our Story — the owner's rule: reuse
  // rather than leave a role empty.
  home: [
    'hf_20260905_005926_ee593192-3fd1-4943-955c-17d37cf03652_vtp4ew', // DOUBLED from Our Story
    'hf_20260905_005925_36eb96af-09cf-4625-8819-63012283f2af_hog41h', // DOUBLED from Our Story
  ],
  hero:  'hf_20260905_005925_eb63737a-40ce-4eb0-8c7d-dc6e7c574f11_cencw5', // 2048x1152
  story: [
    'hf_20260905_005925_7a9b4f08-4f03-4a05-987e-143e56aa30f4_b8rzoj', // 1536x2048
    'hf_20260905_005926_ee593192-3fd1-4943-955c-17d37cf03652_vtp4ew', // 1792x2400
    'hf_20260905_005925_36eb96af-09cf-4625-8819-63012283f2af_hog41h', // 2048x2048
    'hf_20260905_005925_eecd3777-bce9-4681-b37e-b753e5912cde_qvvvzp', // 2048x1536
  ],
  experiences: 'hf_20260905_005926_71f24ef3-408f-451e-8d88-6c450136bc96_bemec7', // 2400x1792
};

export const SAMPLE_CAPRI = {
  __sample: true,
  couple1Name: 'Beatrix', couple2Name: 'Elio', coupleNames: 'Beatrix & Elio',
  weddingDate: null,
  activeUniverse: 'capri',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  coverPhoto: img(CAPRI_IMAGES.hero, 2048),

  mainCeremony: { venueName: 'The Terrace', address: 'Above the harbour steps', startTime: '17:00', time: '17:00' },
  reception: { venueName: 'The Lemon Garden', address: 'Above the harbour steps', startTime: '19:30', time: '19:30' },

  homeContent: {
    blocks: [
      { id: 'cp1', type: 'heading', order: 0, content: { text: 'A long lunch that forgot to end', kicker: 'The day' } },
      { id: 'cp2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying on a terrace in the late afternoon, and then we are eating outside for as long as the evening allows. There is more food than anyone needs and no speeches you have to sit still for.',
      } },
      { id: 'cp3', type: 'quote', order: 2, content: { text: 'Come hungry. That is the only preparation.', attribution: 'Beatrix & Elio' } },
      { id: 'cp4', type: 'photo', order: 3, content: { url: img(CAPRI_IMAGES.home[0], 1400) } },
      { id: 'cp5', type: 'photo', order: 4, content: { url: img(CAPRI_IMAGES.home[1], 1400) } },

    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We met at a lunch that ran from one in the afternoon until nearly midnight, seated at opposite ends and swapping places by the time the plates came out. Neither of us has been especially punctual since, and we have stopped apologizing for it.',
    photos: [img(CAPRI_IMAGES.story[0], 1400), img(CAPRI_IMAGES.story[1], 1400), img(CAPRI_IMAGES.story[2], 1400), img(CAPRI_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The lunch', text: 'Eleven hours, and we have never agreed on who moved seats first.' },
      { date: 'The summer after', text: 'One shared room, no air conditioning, and not a single argument worth remembering.' },
      { date: 'The question', text: 'Asked on the steps, badly, and answered before it was finished.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'There is a small band through dinner and a record player afterward. Tell us what belongs on it.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song, the one that gets you up from the table.' },
  registryContent: { registryMessage: 'You coming this far is the gift. If you would rather mark it with something, there is a short list.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'From half past four. The ceremony is short and starts on the hour.' },
    { question: 'How do we get up to the terrace?', answer: 'The harbour steps, or a car to the top gate if steps are difficult.' },
    { question: 'Can we bring children?', answer: 'Yes, and there is a shaded room off the garden when they have had enough sun.' },
    { question: 'Will it be hot?', answer: 'In the afternoon, yes. The terrace is shaded by six and pleasant after that.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Bright and light. The steps are uneven, so flat shoes are the kindest choice.', weatherNote: 'It stays warm late, but the wind picks up off the water after ten.' },
    photography: { display: true, unplugged: true, message: 'Everything after the ceremony is yours to photograph.' },
    lateArrival: { display: true, policy: 'Come up whenever you arrive. Somebody will pour you something.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Harbour Rooms', description: 'At the bottom of the steps, five minutes down and fifteen back up.', priceRange: '$$' },
      { name: 'The Hill House', description: 'Above the terrace, quieter, and better for a family.', priceRange: '$$$' },
    ],
  },

  transport: { enabledModes: ['taxi', 'walking'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-cp-t1', name: 'Taxis', type: 'taxi', address: 'The top gate', note: 'Book the return before dinner. They thin out after midnight.' },
      { id: 'sample-cp-t2', name: 'The harbour steps', type: 'walking', address: 'From the port', note: 'Fifteen minutes up, and worth doing once in daylight.' },
    ],
    notes: [{ id: 'sample-cp-n1', title: 'Parking', text: 'There is none at the terrace. The top gate is the closest a car can get.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The harbour and above',
    editorialIntro: 'If you are staying a few days, these are the places we would send you first.',
    couplePicks: [{ place_id: 'sample-cp-p1', name: 'The Harbour Bar', category: 'Coffee & Bakeries', note: 'Coffee from seven, and the best seats face the water.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'If you are staying on', summary: 'Loosely arranged, and none of it required.',
        blocks: {
          morning: [{ id: 'sample-cp-i1', place_name: 'The Harbour Bar', description: 'Coffee before the boats start.', photo_url: img(CAPRI_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-cp-i2', place_name: 'The west path', description: 'Walk it at sunset. Everyone ends up there.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-cp-p1', title: 'What should be on the table all afternoon?', category: 'food', isActive: true, allowComments: true,
    options: [
      { id: 'sample-cp-p1a', label: 'More of everything, brought out slowly', votes: 0 },
      { id: 'sample-cp-p1b', label: 'One long shared plate at a time', votes: 0 },
      { id: 'sample-cp-p1c', label: 'Whatever the kitchen feels like', votes: 0 },
    ],
  }],
};

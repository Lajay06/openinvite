/**
 * SAMPLE CONTENT — london. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   tileDescription  "Marble stairs, gilt mirrors, a city that has always known
 *                     how to dress up."
 *   copy.heroKicker  "An invitation"
 *
 * So: restrained, spoken quietly, a little formal without being stiff. The
 * luxury is what is left out — which is also the copy rule here. No souvenir
 * vocabulary (CLAUDE.md): london is carried by Cormorant Garamond, the warm
 * paper ground and these photographs, never by naming landmarks.
 *
 * Assets read from the owner's Cloudinary folder `London` (7 assets) and
 * allocated by aspect ratio. See the PR body for the table.
 */
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const LONDON_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). Where the folder had no
  // clean spare the asset is DOUBLED from Our Story — the owner's rule: reuse
  // rather than leave a role empty.
  home: [
    'hf_20260904_010212_d32d916a-32e0-4b43-811e-664019aaa901_rio25z', // spare portrait
    'hf_20260904_010212_002fc4a7-ce63-4861-bdc3-c7ac4908c4ae_b4pdim', // DOUBLED from Our Story
  ],
  hero:  'hf_20260904_010212_e9bf35e3-c220-4d78-8595-01d39c75be7e_se9wle', // 2752x1536
  story: [
    'hf_20260904_010121_e000fbac-491f-44b8-ad5e-9a9e2a6fae7e_bnmpgz', // 1536x2048
    'hf_20260904_010212_6e7e629c-7601-4a03-ba73-21581949a75b_gj6zfy', // 1792x2400
    'hf_20260904_010212_002fc4a7-ce63-4861-bdc3-c7ac4908c4ae_b4pdim', // 1792x2400
    'hf_20260904_010212_d65f2789-58a2-4a69-8455-0980e26d7139_dgjz3l', // 2752x1536
  ],
  experiences: 'hf_20260904_010212_eb0647a4-0aae-4917-b89b-26dcd3974c79_dm1acq', // 2400x1792
};

export const SAMPLE_LONDON = {
  __sample: true,
  couple1Name: 'Nora', couple2Name: 'Julian', coupleNames: 'Nora & Julian',
  weddingDate: null,
  activeUniverse: 'london',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  coverPhoto: img(LONDON_IMAGES.hero, 2048),

  mainCeremony: { venueName: 'The Reading Room', address: 'A square with plane trees', startTime: '15:00', time: '15:00' },
  reception: { venueName: 'The Long Gallery', address: 'A square with plane trees', startTime: '18:00', time: '18:00' },

  homeContent: {
    blocks: [
      { id: 'ln1', type: 'heading', order: 0, content: { text: 'A quiet afternoon, then a long evening', kicker: 'The day' } },
      { id: 'ln2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying in a room with tall windows, and afterward we are going upstairs for dinner. There is no schedule to keep beyond arriving, and no part of the day you need to prepare for.',
      } },
      { id: 'ln3', type: 'quote', order: 2, content: { text: 'Come as you would to a good dinner. That is the whole of it.', attribution: 'Nora & Julian' } },
      { id: 'ln4', type: 'photo', order: 3, content: { url: img(LONDON_IMAGES.home[0], 1400) } },
      { id: 'ln5', type: 'photo', order: 4, content: { url: img(LONDON_IMAGES.home[1], 1400) } },

    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We were introduced by someone who has since forgotten doing it. It took a year before either of us admitted anything, and another before we told our families. Nothing about it was quick, and we have both come to think that was the point.',
    photos: [img(LONDON_IMAGES.story[0], 1400), img(LONDON_IMAGES.story[1], 1400), img(LONDON_IMAGES.story[2], 1400), img(LONDON_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The introduction', text: 'Neither of us remembers who spoke first. She says he did.' },
      { date: 'The first winter', text: 'Long walks because neither of us could afford anything else.' },
      { date: 'The question', text: 'Asked at home, on an ordinary evening, with no audience.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'There is a quartet early and a rather louder arrangement later. Tell us what belongs in the second half.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song, and we will find room for it.' },
  registryContent: { registryMessage: 'We have a home already, and everything in it. If you would like to mark the day, there is a short list.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'From half past two. The ceremony begins at three and runs about twenty minutes.' },
    { question: 'Is there parking?', answer: 'Very little. The square is easier to reach on foot than by car.' },
    { question: 'Can we bring children?', answer: 'Yes, and there is a quiet room off the gallery if the evening runs long for them.' },
    { question: 'How formal is it?', answer: 'Dressed up, but not uncomfortable. Nobody is being judged on a hemline.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Black tie if you enjoy it, a good suit or a long dress if you do not.', weatherNote: 'The gallery is cool in the evening. A layer is worth carrying.' },
    photography: { display: true, unplugged: true, message: 'After the ceremony, please photograph everything.' },
    lateArrival: { display: true, policy: 'Come in at the back. Someone will find you a seat without any fuss.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Corner House', description: 'On the square itself, two minutes from the door. Rooms held until eight weeks before.', priceRange: '$$$' },
      { name: 'The Garden Rooms', description: 'A short walk, quieter, and better value for a family.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['taxi', 'walking'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-ln-t1', name: 'Taxis', type: 'taxi', address: 'The north side of the square', note: 'Easy to find until about one in the morning.' },
      { id: 'sample-ln-t2', name: 'On foot', type: 'walking', address: 'From the station', note: 'Twelve minutes, flat, and lit the whole way.' },
    ],
    notes: [{ id: 'sample-ln-n1', title: 'Parking', text: 'There is none at the venue and the square fills early.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The neighborhood',
    editorialIntro: 'If you are making a weekend of it, these are the places we would send you first.',
    couplePicks: [{ place_id: 'sample-ln-p1', name: 'The Reading Room Cafe', category: 'Coffee & Bakeries', note: 'Open from seven, and the only decent coffee before nine.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'If you are staying the weekend', summary: 'Loosely, and none of it arranged.',
        blocks: {
          morning: [{ id: 'sample-ln-i1', place_name: 'The Reading Room Cafe', description: 'Coffee before the square wakes up.', photo_url: img(LONDON_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-ln-i2', place_name: 'The gardens', description: 'Walk the long way round at dusk. Everyone does.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-ln-p1', title: 'What should the quartet play as we come in?', category: 'music', isActive: true, allowComments: true,
    options: [
      { id: 'sample-ln-p1a', label: 'Something everybody half recognises', votes: 0 },
      { id: 'sample-ln-p1b', label: 'Something nobody expects', votes: 0 },
      { id: 'sample-ln-p1c', label: 'Let them choose on the day', votes: 0 },
    ],
  }],
};

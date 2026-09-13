/**
 * SAMPLE CONTENT — bali. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "Welcome, with love"                  (websiteThemes.js:835)
 *   tileDescription  "Open arms under a jungle canopy, every edge soft, every
 *                     welcome wide."                       (websiteThemes.js:847)
 *
 * EVERY WELCOME WIDE. This is the warmest brief in the set and the easiest to
 * overshoot: warmth written as enthusiasm becomes a brochure, and the calm-pass
 * rules bar exactly that — no exclamation marks, nothing that sells the day
 * back to the people already invited. So the warmth is in what is offered
 * rather than in adjectives: come early, stay late, borrow a board, eat with us.
 * Soft edges mean no line reads as a rule.
 *
 * No souvenir vocabulary (CLAUDE.md): not one Indonesian word does work the
 * palette and the photographs already do.
 *
 * ── BALI IS NO LONGER THE OMISSION FIXTURE ────────────────────────────────
 *
 * Until 2026-09-06 this file carried placeholder copy and NO imagery on
 * purpose: it was the control the published-site checks ran against. The owner
 * uploaded eleven photographs, and a universe cannot be both the illustrated
 * example and the deliberately-empty control. The control moved out whole, to
 * src/lib/sampleContent/omissionFixture.js under a key the studio cannot
 * select, and bali is now a universe like any other. Keeping bali artificially
 * empty to serve a test would have been the test dictating the product.
 *
 * Cloudinary folder `Bali` (11 assets, the deepest in the programme). TWO
 * REJECTED, both for generated lettering: the surfboard reading "GNYOVE", and
 * the menu board reading "RGRAARA". Both Home photographs are real spares, so
 * nothing is doubled; one clean asset is left unused.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const BALI_IMAGES = {
  // TWO EXTRA HOME PHOTOS. Both are spares; no doubling in this universe.
  home: [
    'hf_20260905_095507_0842f0f9-82bb-462a-9756-c6d1b1cb4486_po7vnk', // 1792x2400, the grill after dark
    'hf_20260905_115640_90811331-2b10-4026-b352-bc32855b64bf_be3lok', // 2048x2048, the note on the hood
  ],
  hero:  'bali-hero_qvcc3j', // heroes-jpg 4096x2294, ratio 1.786
  story: [
    'hf_20260905_095412_dca878b7-903b-4d2c-b5f2-8e1f7ecd69cd_dzpjvc', // 1536x2048
    'hf_20260905_095506_2193232b-7c56-4af6-90f8-beda26082dc6_zoty4z', // 1792x2400, replaces the rejected board
    'hf_20260905_114656_d0247902-1578-45dd-bb0c-273c3503665e_ebwrff', // 1792x2400
    'hf_20260905_114656_8d34659a-ed40-4e3a-98a3-7f8cf59e464f_tkpklk', // 1792x2400
  ],
  experiences: 'hf_20260905_095506_b81e525d-f97b-4aa4-b704-c3cee1cee9d0_aftx5g', // 2752x1536
};

export const SAMPLE_BALI = {
  __sample: true,
  couple1Name: 'Sienna', couple2Name: 'Marlo', coupleNames: 'Sienna & Marlo',
  weddingDate: null,
  activeUniverse: 'bali',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(BALI_IMAGES.hero, heroDeliveryWidth(BALI_IMAGES.hero)),

  mainCeremony: { venueName: 'The black sand beach', address: 'The end of the track, past the last food stall', startTime: '17:00', time: '17:00' },
  reception: { venueName: 'The long table under the trees', address: 'Back up the track, five minutes', startTime: '19:00', time: '19:00' },

  homeContent: {
    blocks: [
      { id: 'bl1', type: 'heading', order: 0, content: { text: 'Barefoot, by the water', kicker: 'The day' } , style: { align: 'center' } },
      { id: 'bl2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying on the sand and eating under the trees afterward. Come early if you want the ocean to yourself, and stay as long as the evening holds you. Shoes are optional and mostly a nuisance.',
      }, style: { align: 'center' } },
      { id: 'bl3', type: 'quote', order: 2, content: { text: 'Nobody is dressed up and nobody is in a hurry. That is the arrangement.', attribution: 'Sienna & Marlo' } , style: { align: 'center' } },
      { id: 'bl4', type: 'photo', order: 3, content: { url: img(BALI_IMAGES.home[0], 1400) } },
      { id: 'bl5', type: 'photo', order: 4, content: { url: img(BALI_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'She was here for three weeks and he had been here four years, and he lent her a board on the second morning without asking her name. She gave it back six weeks later. Neither of us has managed to leave since, and at this point neither of us is trying.',
    photos: [img(BALI_IMAGES.story[0], 1400), img(BALI_IMAGES.story[1], 1400), img(BALI_IMAGES.story[2], 1400), img(BALI_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The borrowed board', text: 'Handed over on the second morning, returned after six weeks.' },
      { date: 'The first wet season', text: 'Four months of rain and one very small room.' },
      { date: 'The question', text: 'Asked in the water at dawn, and repeated on the sand because neither of us heard it.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'A guitar at the table and a proper set once it is dark. Tell us what you want played after the plates go.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song each, and it should be one you would dance to on sand.' },
  registryContent: { registryMessage: 'You have flown a long way and that is more than enough. If you would like to give something anyway, there is a short list and a fund for the beach clean the village runs.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'By half past four. The light goes fast and the ceremony starts at five whatever happens.' },
    { question: 'What should we wear?', answer: 'Light, loose, and nothing you mind sand in. Everyone is barefoot on the beach and most people stay that way.' },
    { question: 'How do we get to the beach?', answer: 'A track from the road, about four hundred meters, soft in places. Scooters can make it; cars cannot.' },
    { question: 'Can we swim?', answer: 'Yes, and most people do before the ceremony rather than after. The current runs left; stay in front of the boards.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Sand colors, white, faded anything. No heels, no jackets, nothing that needs ironing.', weatherNote: 'Hot until six and warm all night. A wrap for the mosquitoes after eight.' },
    photography: { display: true, unplugged: true, message: 'Phones down for the ten minutes. Afterward the light is the best it gets all day and we would like all of your pictures.' },
    lateArrival: { display: true, policy: 'The track takes longer than it looks. Come down whenever you arrive; we will be on the sand until six.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The rooms above the shop', description: 'Six rooms at the top of the track, cold water, and thirty seconds from the table.', priceRange: '$' },
      { name: 'The villas along the road', description: 'Ten minutes on a scooter. Better for a family, and there is a pool.', priceRange: '$$' },
      { name: 'The hotel at the point', description: 'Twenty minutes north, and the only place with air conditioning that reliably works.', priceRange: '$$$' },
    ],
  },

  transport: { enabledModes: ['car', 'walking'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-bl-t1', name: 'From the airport', type: 'airport', address: 'Ninety minutes, or two hours after four in the afternoon', note: 'Arrange the car before you land. The evening road is slow in one direction only.' },
      { id: 'sample-bl-t2', name: 'Scooters', type: 'car_rental', address: 'The shop at the top of the track', note: 'The usual rate, helmets included. Do not ride the track at night without lights.' },
      { id: 'sample-bl-t3', name: 'On foot', type: 'other', address: 'The road to the beach', note: 'Four hundred meters of soft track. Five minutes down, seven back up.' },
    ],
    notes: [{ id: 'sample-bl-n1', title: 'Cars', text: 'They stop at the top. Everything past that is on foot or on two wheels.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'This stretch of coast',
    editorialIntro: 'Four years of living here has narrowed it to three places, and two of them are beaches nobody has named.',
    couplePicks: [{ place_id: 'sample-bl-p1', name: 'The point at the north end', category: 'Beaches', note: 'Forty minutes up the beach at low tide. Take water; there is nothing there.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'Any morning you are here', summary: 'Water first, everything else after.',
        blocks: {
          morning: [{ id: 'sample-bl-i1', place_name: 'The point at the north end', description: 'Walk up at low tide. Nobody is there before eight and the water is glass.', photo_url: img(BALI_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-bl-i2', place_name: 'The table at the top of the track', description: 'Where we eat most nights. Sit down and somebody will bring you something.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-bl-p1', title: 'What should we do the morning of?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-bl-p1a', label: 'Everyone in the water at seven', votes: 0 },
      { id: 'sample-bl-p1b', label: 'Breakfast at the long table', votes: 0 },
      { id: 'sample-bl-p1c', label: 'Nothing at all until four', votes: 0 },
    ],
  }],
};

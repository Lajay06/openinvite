/**
 * SAMPLE CONTENT — taj. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "You are graciously invited"          (websiteThemes.js:1163)
 *   tileDescription  "Ruby, gold and ivory framed in a single quiet arch.
 *                     Luxurious, never loud."              (websiteThemes.js:1175)
 *
 * Graciously, and never loud. The formality here is in the courtesy, not in the
 * vocabulary: full sentences, a host's care for what a guest needs to know, and
 * no ornament. The souvenir trap in this universe is naming ceremonies and
 * garments to signal a place (CLAUDE.md, and its own reductio); the copy below
 * says what happens and at what hour, and lets the arch, the ruby and the gold
 * carry the rest.
 *
 * Cloudinary folder `Taj` (7 assets, all seven used, none rejected). The folder
 * gained a wide since the pre-read, so the hero is a wide as in every other
 * universe rather than the landscape the earlier shortfall would have forced.
 * One clean spare covers the first Home photograph; the second is DOUBLED.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const TAJ_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). One spare, one DOUBLED.
  home: [
    'hf_20260904_055315_bc8a7f4e-0267-491e-b876-97e78368ce8d_z3aft2', // spare portrait, the water garden
    'hf_20260904_055316_4efc8628-77ed-4737-83bd-d0715cf99d43_eoixpp', // DOUBLED from Our Story
  ],
  hero:  'taj-hero_xrxxhf', // heroes-jpg 4096x2294, ratio 1.786
  story: [
    'hf_20260904_055222_ddd6efc3-5dd7-4cbe-8d46-5ac6c7f66ff4_hf0lgp', // 1536x2048
    'hf_20260904_055316_fe1ed42d-2e2e-447f-b244-80bb0cbb21dd_hly7ic', // 1792x2400
    'hf_20260904_055316_aee46f96-4489-4bea-ac6e-7b351a6db75b_vja1wu', // 1792x2400
    'hf_20260904_055316_4efc8628-77ed-4737-83bd-d0715cf99d43_eoixpp', // 1792x2400
  ],
  experiences: 'hf_20260904_055316_54f41db9-076f-4e52-96b5-217eda9ba2af_zvjpyd', // 2400x1792
};

export const SAMPLE_TAJ = {
  __sample: true,
  couple1Name: 'Priya', couple2Name: 'Arjun', coupleNames: 'Priya & Arjun',
  weddingDate: null,
  activeUniverse: 'taj',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(TAJ_IMAGES.hero, heroDeliveryWidth(TAJ_IMAGES.hero)),

  mainCeremony: { venueName: 'The marble pavilion', address: 'The far end of the water garden', startTime: '17:00', time: '17:00' },
  reception: { venueName: 'The courtyard', address: 'Through the arch, behind the pavilion', startTime: '19:30', time: '19:30' },

  homeContent: {
    blocks: [
      { id: 'tj1', type: 'heading', order: 0, content: { text: 'Three days, and only one of them formal', kicker: 'The days' } },
      { id: 'tj2', type: 'paragraph', order: 1, content: {
        text: 'There is a long dinner on the Friday, the ceremony and the courtyard on the Saturday, and a slow breakfast on the Sunday for anyone still here. Only the Saturday asks anything of you. Come to as much of it as suits you and we will be glad of whichever you choose.',
      } },
      { id: 'tj3', type: 'quote', order: 2, content: { text: 'Our families have waited a long time for this. Please let them feed you.', attribution: 'Priya & Arjun' } },
      { id: 'tj4', type: 'photo', order: 3, content: { url: img(TAJ_IMAGES.home[0], 1400) } },
      { id: 'tj5', type: 'photo', order: 4, content: { url: img(TAJ_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'Our mothers arranged a meeting we both went to in order to be able to say we had gone. We agreed in the car afterward that it had been a waste of an afternoon, and then he called on the Tuesday, and she had been waiting for it since Sunday.',
    photos: [img(TAJ_IMAGES.story[0], 1400), img(TAJ_IMAGES.story[1], 1400), img(TAJ_IMAGES.story[2], 1400), img(TAJ_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The afternoon neither of us wanted', text: 'Two hours, and a great deal of tea.' },
      { date: 'The Tuesday', text: 'He called. She had been waiting since Sunday and admitted it years later.' },
      { date: 'The question', text: 'Asked in a garden at dusk, with both families pretending to be elsewhere.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'There are musicians in the pavilion for the ceremony and something with a great deal more volume in the courtyard. Tell us what belongs in the courtyard.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song, and it will be played.' },
  registryContent: { registryMessage: 'Many of you are flying a long way, and that is more than enough. If you would like to give something as well, there is a short list.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'By half past four. The pavilion is at the far end of the garden and the walk takes ten minutes at an unhurried pace.' },
    { question: 'What should we wear?', answer: 'Color, and plenty of it. Ivory is reserved, and heels will find the gravel difficult.' },
    { question: 'Is the Friday dinner formal?', answer: 'Not at all. It is long, loud and outdoors, and it is where you will meet everybody.' },
    { question: 'Can we bring children?', answer: 'Please do. There is a room off the courtyard with beds in it for when they have had enough.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Ruby, gold, deep green, anything with color in it. Not ivory, and not white.', weatherNote: 'Warm until seven and cool by ten. The courtyard is open to the sky.' },
    photography: { display: true, unplugged: true, message: 'Nothing raised during the ceremony. The pavilion is small and the light is the whole picture.' },
    lateArrival: { display: true, policy: 'Walk down the side of the water and take a seat at the back. Nobody will turn around.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Garden Wing', description: 'Fourteen rooms on the property, breakfast on the terrace, and no travel at either end of the day.', priceRange: '$$$' },
      { name: 'The Old Guesthouse', description: 'Ten minutes by car, plainer, and considerably better value for three nights.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['car', 'shuttle', 'walking'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-tj-t1', name: 'Cars from the guesthouse', type: 'car_rental', address: 'The guesthouse gate', note: 'Running from four, and again from eleven at night.' },
      { id: 'sample-tj-t2', name: 'From the airport', type: 'airport', address: 'Ninety minutes by road', note: 'Send us your arrival time and somebody will be there.' },
      { id: 'sample-tj-t3', name: 'On foot', type: 'other', address: 'The gate to the pavilion', note: 'Ten minutes along the water. Flat, and shaded most of the way.' },
    ],
    notes: [{ id: 'sample-tj-n1', title: 'Driving in', text: 'The last gate closes at eleven. After that, come around by the guesthouse road.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The old city',
    editorialIntro: 'If you are staying either side of the weekend, these are the two we would send you to first, and the one we would send you to last.',
    couplePicks: [{ place_id: 'sample-tj-p1', name: 'The water garden', category: 'Parks & Outdoors', note: 'Empty before eight, and worth setting an alarm for once.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'The morning before', summary: 'Early, and then out of the sun.',
        blocks: {
          morning: [{ id: 'sample-tj-i1', place_name: 'The water garden', description: 'Walk the long side while the stone is still cool.', photo_url: img(TAJ_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-tj-i2', place_name: 'The rooftop above the market', description: 'Go for the hour before dark. Stay for the hour after.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-tj-p1', title: 'How long should the Friday dinner run?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-tj-p1a', label: 'Until the food runs out', votes: 0 },
      { id: 'sample-tj-p1b', label: 'Until the music stops', votes: 0 },
      { id: 'sample-tj-p1c', label: 'Home by eleven, we have a wedding tomorrow', votes: 0 },
    ],
  }],
};

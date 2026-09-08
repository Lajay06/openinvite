/**
 * SAMPLE CONTENT — sedona. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "Join us"                             (websiteThemes.js:1090)
 *   tileDescription  "Rust and sandstone, ritual pace. A wedding grounded in
 *                     real rock."                          (websiteThemes.js:1102)
 *
 * Grounded, and slow on purpose. Plain nouns, concrete facts, no ornament and
 * no lyricism about the landscape, which is doing its own work in the
 * photographs. Ritual pace means the copy states the order of the day and does
 * not sell it. Western costume vocabulary is the souvenir trap here (CLAUDE.md)
 * and is avoided as carefully as any other.
 *
 * Cloudinary folder `Sedona` (7 assets, all seven used, none rejected). One
 * clean spare covers the first Home photograph; the second is DOUBLED from
 * Our Story. See the PR body for the table.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const SEDONA_IMAGES = {
  // TWO EXTRA HOME PHOTOS: one spare from the original folder, and one that WAS
  // DOUBLED from Our Story until the owner's 2026-09-06 upload gave the folder
  // a second clean spare. Asset refresh.
  home: [
    'hf_20260904_232810_b7223883-26ec-49bb-accc-019f65d4e968_f2anum', // spare portrait, the rim at dawn
    'hf_20260904_232810_fe62f568-ddc0-4edb-9337-2658f1a1c7f2_fuxjlf', // 2752x1536, WAS DOUBLED (asset refresh)
  ],
  hero:  'sedona-hero_lhnjr0', // heroes-jpg 4096x2294, ratio 1.786
  story: [
    'hf_20260904_232809_6378d8a2-60b7-45cc-9ae1-625438f90a9a_izgvvo', // 1536x2048
    'hf_20260904_232811_96ffa0e3-4aac-494c-9134-84c30b49e39f_dpinsl', // 1792x2400
    'hf_20260904_232810_14901a98-1d71-4d11-a372-261a310adfc2_d9p6op', // 1792x2400
    'hf_20260904_232716_a95fe047-22a0-462d-9c2a-869a20c904bb_ku77pa', // 1505x2047
  ],
  experiences: 'hf_20260904_232810_e05b5d41-9da5-4f51-84e2-6f70937ec648_uglblm', // 2048x1536
};

export const SAMPLE_SEDONA = {
  __sample: true,
  couple1Name: 'Wren', couple2Name: 'Cal', coupleNames: 'Wren & Cal',
  weddingDate: null,
  activeUniverse: 'sedona',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(SEDONA_IMAGES.hero, heroDeliveryWidth(SEDONA_IMAGES.hero)),

  mainCeremony: { venueName: 'The wash below the rim', address: 'Twelve miles out, the last four unpaved', startTime: '17:30', time: '17:30' },
  reception: { venueName: 'The ranch yard', address: 'Back at the house, a mile from the wash', startTime: '19:00', time: '19:00' },

  homeContent: {
    blocks: [
      { id: 'sd1', type: 'heading', order: 0, content: { text: 'Half past five, when the rock turns', kicker: 'The day' } },
      { id: 'sd2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying out in the wash at half past five because that is when the light comes off the rim, and it lasts about forty minutes. Dinner is back at the house afterward, outside, with the fire going. Bring a jacket. The desert takes the heat back the moment the sun is down.',
      } },
      { id: 'sd3', type: 'quote', order: 2, content: { text: 'We are not asking anybody to hike. We are asking everybody to stand still for ten minutes.', attribution: 'Wren & Cal' } },
      { id: 'sd4', type: 'photo', order: 3, content: { url: img(SEDONA_IMAGES.home[0], 1400) } },
      { id: 'sd5', type: 'photo', order: 4, content: { url: img(SEDONA_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'She was working two summers on a trail crew and he was fixing the fence on the far side of the same land. It took most of one summer before either of us said anything that was not about the weather. The second summer went differently.',
    photos: [img(SEDONA_IMAGES.story[0], 1400), img(SEDONA_IMAGES.story[1], 1400), img(SEDONA_IMAGES.story[2], 1400), img(SEDONA_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The first summer', text: 'Four months of talking about rain that never came.' },
      { date: 'The winter after', text: 'A truck that would not start, and forty miles of walking to sort it out.' },
      { date: 'The question', text: 'Asked at the fence, at the end of a working day, with the horses watching.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'A guitar and a fiddle at the house, and nothing amplified until the plates are cleared. Send us what you want played after that.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song. It has to work outside.' },
  registryContent: { registryMessage: 'Getting out here is expensive and we know it, so consider that the gift. If you would rather bring something, the list is short and mostly for the land.', noGiftsPlease: false },

  qna: [
    { question: 'How far out is it?', answer: 'Twelve miles from town. The last four are dirt road, graded, and fine in any car if you take them slowly.' },
    { question: 'What time should we arrive?', answer: 'By five. We start at half past because the light will not wait, and there is no way to hold it.' },
    { question: 'What should we wear?', answer: 'Boots or flat shoes. The wash is sand and loose stone, and the yard is gravel.' },
    { question: 'Is there cell service?', answer: 'None past the cattle grid. Download the directions before you leave town.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Rust, cream, denim, whatever you own. Nothing that drags in sand.', weatherNote: 'Ninety degrees at five and forty by midnight. A real jacket, not a wrap.' },
    photography: { display: true, unplugged: true, message: 'Phones away in the wash. We have ten minutes of that light and we would like to be looking at each other in it.' },
    lateArrival: { display: true, policy: 'If you miss the ceremony, drive on to the house. Somebody will be there and dinner is at seven.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Bunkhouse', description: 'Six rooms at the ranch, shared bathrooms, and nobody has to drive the dirt road at night.', priceRange: '$$' },
      { name: 'The Lodge in town', description: 'Twelve miles back, comfortable, and the easiest option for a family.', priceRange: '$$$' },
      { name: 'Camping', description: 'On the flat behind the corral. Bring everything. There is water and nothing else.', priceRange: '$' },
    ],
  },

  transport: { enabledModes: ['car', 'shuttle'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-sd-t1', name: 'The shuttle from town', type: 'bus_station', address: 'The lodge parking, four in the afternoon', note: 'Two runs back, at ten and at one. Say which you want and we will hold you a seat.' },
      { id: 'sample-sd-t2', name: 'Driving', type: 'car_rental', address: 'The ranch gate', note: 'Four miles of dirt. Any car will do it. Do not take it fast.' },
    ],
    notes: [{ id: 'sample-sd-n1', title: 'Fuel', text: 'The last station is in town. There is nothing between it and us.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The high desert',
    editorialIntro: 'If you are here for a few days, do these three and skip the ones with a parking fee.',
    couplePicks: [{ place_id: 'sample-sd-p1', name: 'The rim trail', category: 'Parks & Outdoors', note: 'Ninety minutes out and back. Start before seven or do not start.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'Before it gets hot', summary: 'Everything worth doing happens before ten.',
        blocks: {
          morning: [{ id: 'sample-sd-i1', place_name: 'The rim trail', description: 'Two liters of water each. There is no shade and no water on the trail.', photo_url: img(SEDONA_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-sd-i2', place_name: 'The flat behind the corral', description: 'No lights for forty miles. Lie down and give your eyes twenty minutes.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-sd-p1', title: 'What should we do with the hour before the ceremony?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-sd-p1a', label: 'Drinks at the house first', votes: 0 },
      { id: 'sample-sd-p1b', label: 'Walk out to the wash together', votes: 0 },
      { id: 'sample-sd-p1c', label: 'Arrive when you arrive', votes: 0 },
    ],
  }],
};

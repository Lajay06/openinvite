/**
 * SAMPLE CONTENT — marrakech. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   tagline          "Desert opulence"
 *   tileDescription  "Woven patterns and warm plaster make every invitation
 *                     feel carried by hand."
 *
 * Made by hand, warm, unhurried — and NOT ornamented in the writing. The
 * pattern is the universe's job; the copy stays plain. No souvenir vocabulary
 * (CLAUDE.md): not one word here reaches for a loanword, which for this
 * universe is the easiest rule to break and the most important to keep.
 *
 * Cloudinary folder `Marrakech` (7 assets). ONE REJECTED: the only landscape
 * asset has a caption baked into the pixels — "Woven by hand, held breath." —
 * which would put OUR words on a couple's page with no way to remove them, the
 * #576 failure in permanent form. It is still rejected and still unreferenced.
 *
 * THE EMPTY ROLE IS NOW FILLED (asset refresh, 2026-09-06). When this file was
 * written the folder had no spare, so `experiences` was left null and the
 * itinerary carried no photograph — the one deliberately empty role in the
 * whole sample directory. The owner has since uploaded a seventh asset, and it
 * is clean: a carved window in an ochre wall, no lettering anywhere in frame.
 * The role is filled from that, and the itinerary has its photograph.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const MARRAKECH_IMAGES = {
  // TWO EXTRA HOME PHOTOS (owner review, 2026-09-06). Where the folder had no
  // clean spare the asset is DOUBLED from Our Story — the owner's rule: reuse
  // rather than leave a role empty.
  home: [
    'hf_20260904_083147_a83e571e-f649-4e1c-869a-a40cc5af10b1_v2tqmy', // DOUBLED from Our Story
    'hf_20260904_083147_229c83c7-ec9b-4848-8571-4994529817ae_gph1qg', // DOUBLED from Our Story
  ],
  hero:  'marrakech-hero_sbciuz', // heroes-jpg 4096x2294, ratio 1.786
  story: [
    'hf_20260904_083051_2ab83be9-6958-4117-9df4-ec3c48685524_nwvein', // 1536x2048
    'hf_20260904_083147_a83e571e-f649-4e1c-869a-a40cc5af10b1_v2tqmy', // 1792x2400
    'hf_20260904_083147_229c83c7-ec9b-4848-8571-4994529817ae_gph1qg', // 1792x2400
    'hf_20260904_083147_4979edb8-a7bf-435b-a430-53cac4299906_qpidci', // 1536x2752
  ],
  // The seventh asset, uploaded after this block was written. Portrait rather
  // than landscape, which the itinerary's own thumbnail does not mind.
  experiences: 'hf_20260904_083147_ebd4b247-69be-4e0d-98cf-914dff9f65c2_pc9gmk', // 1792x2400
};

export const SAMPLE_MARRAKECH = {
  __sample: true,
  couple1Name: 'Yasmin', couple2Name: 'Idris', coupleNames: 'Yasmin & Idris',
  weddingDate: null,
  activeUniverse: 'marrakech',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(MARRAKECH_IMAGES.hero, heroDeliveryWidth(MARRAKECH_IMAGES.hero)),

  mainCeremony: { venueName: 'The Courtyard', address: 'Behind the blue door', startTime: '17:30', time: '17:30' },
  reception: { venueName: 'The Roof', address: 'Behind the blue door', startTime: '20:00', time: '20:00' },

  homeContent: {
    blocks: [
      { id: 'mk1', type: 'heading', order: 0, content: { text: 'A courtyard, and then the roof', kicker: 'The evening' } },
      { id: 'mk2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying downstairs as the heat goes out of the day, and eating upstairs once it is dark. The stairs are the only difficult part and somebody will help you with them.',
      } },
      { id: 'mk3', type: 'quote', order: 2, content: { text: 'Stay for the whole evening. It only gets better after ten.', attribution: 'Yasmin & Idris' } },
      { id: 'mk4', type: 'photo', order: 3, content: { url: img(MARRAKECH_IMAGES.home[0], 1400) } },
      { id: 'mk5', type: 'photo', order: 4, content: { url: img(MARRAKECH_IMAGES.home[1], 1400) } },

    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We were introduced over mint tea by two families who had decided the matter well before we did. It could have gone badly and did not. Nine years later we still take the tea at the same hour, and neither of us can remember whose idea that was.',
    photos: [img(MARRAKECH_IMAGES.story[0], 1400), img(MARRAKECH_IMAGES.story[1], 1400), img(MARRAKECH_IMAGES.story[2], 1400), img(MARRAKECH_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The introduction', text: 'Arranged by people who were very pleased with themselves afterward.' },
      { date: 'The first house', text: 'Two rooms, one working tap, and a roof we sat on every night.' },
      { date: 'The question', text: 'Asked on that roof, and answered before the sentence was finished.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'There is drumming on the roof once it is dark, and it goes on a long time. Tell us what else belongs up there.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song, and we will make room for it.' },
  registryContent: { registryMessage: 'Coming this far is the whole gift. If you would rather mark it with something, there is a short list.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'From five. The ceremony begins at half past, downstairs in the courtyard.' },
    { question: 'Can we bring children?', answer: 'Yes, and there is a cool room off the courtyard when the roof gets too loud.' },
    { question: 'Is the roof difficult to reach?', answer: 'There are two flights of stairs and no lift. Tell us if that is a problem and we will arrange the courtyard for you.' },
    { question: 'What should we wear?', answer: 'Something you can sit on cushions in. It stays warm on the roof until very late.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Loose and covered, in whatever color you like best.', weatherNote: 'The courtyard is cool by six. The roof stays warm until well after midnight.' },
    photography: { display: true, unplugged: true, message: 'Once the ceremony is done, photograph everything.' },
    lateArrival: { display: true, policy: 'The blue door is open all evening. Come up and find us.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Courtyard Rooms', description: 'In the same house, up one flight. Held until eight weeks before.', priceRange: '$$' },
      { name: 'The Garden House', description: 'Ten minutes on foot, quieter, and easier with children.', priceRange: '$$$' },
    ],
  },

  transport: { enabledModes: ['taxi', 'walking'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-mk-t1', name: 'Taxis', type: 'taxi', address: 'The end of the lane', note: 'They cannot reach the door. It is a three minute walk in.' },
      { id: 'sample-mk-t2', name: 'On foot', type: 'walking', address: 'From the square', note: 'Ten minutes, and easy to find in daylight.' },
    ],
    notes: [{ id: 'sample-mk-n1', title: 'The lane', text: 'Too narrow for a car. Bags are best left at your rooms first.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The old quarter',
    editorialIntro: 'If you are staying a few days, these are the places we would send you first.',
    couplePicks: [{ place_id: 'sample-mk-p1', name: 'The Corner Tea House', category: 'Coffee & Bakeries', note: 'Open from six, and the only quiet table before the day starts.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'If you are staying on', summary: 'Nothing arranged, and none of it expected.',
        blocks: {
          morning: [{ id: 'sample-mk-i1', place_name: 'The Corner Tea House', description: 'Tea before the lanes fill up.', photo_url: img(MARRAKECH_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-mk-i2', place_name: 'The roof at dusk', description: 'Go up before the light goes. Everyone does it once.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-mk-p1', title: 'How late should the drumming go on?', category: 'music', isActive: true, allowComments: true,
    options: [
      { id: 'sample-mk-p1a', label: 'Until the neighbours object', votes: 0 },
      { id: 'sample-mk-p1b', label: 'Until the neighbours join in', votes: 0 },
      { id: 'sample-mk-p1c', label: 'Until somebody makes breakfast', votes: 0 },
    ],
  }],
};

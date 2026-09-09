/**
 * SAMPLE CONTENT — amalfi. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   copy.heroKicker  "You are warmly invited"              (websiteThemes.js:1054)
 *   tileDescription  "Cliffside citrus groves and sea light. Bright, unhurried,
 *                     wide open."                          (websiteThemes.js:1066)
 *
 * Unhurried is the whole instruction. Longer sentences than mykonos, generous
 * rather than clipped, and never a line that hurries a guest along. Bright does
 * not mean loud: no exclamation marks, nothing performing enthusiasm. And no
 * souvenir vocabulary (CLAUDE.md) — the lemons are in the photographs, so the
 * copy does not need to name a single Italian noun to know where it is.
 *
 * Cloudinary folder `Amalfi` (7 assets, all seven used, none rejected). One
 * clean spare covers the first Home photograph; the second is DOUBLED from
 * Our Story. See the PR body for the table.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const AMALFI_IMAGES = {
  // TWO EXTRA HOME PHOTOS: one spare from the original folder, and one that WAS
  // DOUBLED from Our Story until the owner's 2026-09-06 upload gave the folder
  // a second clean spare. Asset refresh.
  home: [
    'hf_20260903_232125_2fad4206-da91-4be8-b52d-edef50dfe588_op3cr9', // spare square, the laid table
    'hf_20260903_232125_5c529d75-b796-4a24-aa3f-e543464b3cd5_kv9sam', // 2752x1536, WAS DOUBLED (asset refresh)
  ],
  hero:  'hf_20260903_234805_e1dafa9c-c82b-4722-b83c-65208f20bf50_xxsczf', // 2752x1536
  story: [
    'hf_20260903_231506_e04945b2-80b8-4db7-87c1-b21f9dd67728_wqrxtt', // 1536x2048
    'hf_20260903_232125_5da0f545-7368-423a-95ed-1cdbbf90b8e3_wlxjor', // 1792x2400
    'hf_20260903_232125_f902ac13-1aeb-4897-accf-07e4e24736f0_dpzfof', // 1792x2400
    'hf_20260903_232125_e3d26c1d-ea6a-4374-9443-107018d470f2_fn7vuc', // 1536x2752
  ],
  experiences: 'hf_20260903_232125_a7df358a-949b-45c9-b6fc-dfe25cc8b5ad_lsjt1t', // 2400x1792
};

export const SAMPLE_AMALFI = {
  __sample: true,
  couple1Name: 'Rosa', couple2Name: 'Nico', coupleNames: 'Rosa & Nico',
  weddingDate: null,
  activeUniverse: 'amalfi',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(AMALFI_IMAGES.hero, heroDeliveryWidth(AMALFI_IMAGES.hero)),

  mainCeremony: { venueName: 'The lemon terrace', address: 'The top of the garden, above the road', startTime: '17:00', time: '17:00' },
  reception: { venueName: 'The lower terrace', address: 'The same garden, one flight down', startTime: '19:00', time: '19:00' },

  homeContent: {
    blocks: [
      { id: 'am1', type: 'heading', order: 0, content: { text: 'Come and take your time with us', kicker: 'The day' } , style: { align: 'center' } },
      { id: 'am2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying above the water, where the lemon trees are, and eating outside afterward. There is nothing to rush toward and nothing to dress up for beyond your own comfort. Bring your appetite and let the evening go where it wants.',
      }, style: { align: 'center' } },
      { id: 'am3', type: 'quote', order: 2, content: { text: 'Nobody has ever regretted a long lunch. We are extending the principle.', attribution: 'Rosa & Nico' } , style: { align: 'center' } },
      { id: 'am4', type: 'photo', order: 3, content: { url: img(AMALFI_IMAGES.home[0], 1400) } },
      { id: 'am5', type: 'photo', order: 4, content: { url: img(AMALFI_IMAGES.home[1], 1400) } },
    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: "His family has had the house since before either of us was born, and she came for a weekend with somebody else entirely. That was nine years ago. The somebody else went home on the Sunday and she stayed until the Thursday, and we have never once been able to explain that week to anybody who was not in it.",
    photos: [img(AMALFI_IMAGES.story[0], 1400), img(AMALFI_IMAGES.story[1], 1400), img(AMALFI_IMAGES.story[2], 1400), img(AMALFI_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The extra four days', text: 'She missed a flight on purpose and told nobody for a year.' },
      { date: 'The winter here', text: 'Everything shut, the road empty, and the two of us painting the shutters.' },
      { date: 'The question', text: 'Asked on the terrace, in front of his mother, who had known for months.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'Something quiet while we eat, and a band from ten. Tell us what you would like played once the tables are pushed back.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song each, and we will get to all of them.' },
  registryContent: { registryMessage: 'The house has everything it needs and rather more than it has room for. If you would like to give something, there is a short list and a fund for the roof.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'From half past four. The walk up from the road takes ten minutes and it is warm at that hour.' },
    { question: 'How many steps are there?', answer: 'Ninety from the road to the terrace, in three flights, with somewhere to sit at each turn. There is a car that can bring anybody up who would rather not walk.' },
    { question: 'How long is dinner?', answer: 'Four hours, and it is meant to be. Eat lunch lightly.' },
    { question: 'Can we swim?', answer: 'Yes, and most people do, the morning after. The steps down to the water start behind the gate.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Bright, light, and anything you can sit in for four hours. Flat shoes for the steps and the gravel.', weatherNote: 'Hot at five, perfect at eight, cool by eleven. Bring something for your shoulders.' },
    photography: { display: true, unplugged: true, message: "Please put the phones away for the ceremony. The terrace is narrow and everybody ends up in somebody else's picture." },
    lateArrival: { display: true, policy: 'The road is the road. Come up when you get here and someone will pour you something.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Blue Rooms', description: 'Eight rooms on the same side of the hill, and no driving afterward.', priceRange: '$$$' },
      { name: 'The Fishermen Houses', description: 'Down at the water, twenty minutes up on foot, and half the price.', priceRange: '$$' },
      { name: 'The town along the coast', description: 'More choice, more life in the evening, and a boat back at midnight.', priceRange: '$$' },
    ],
  },

  transport: { enabledModes: ['ferry', 'bus', 'taxi'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-am-t1', name: 'The boat', type: 'ferry', address: 'The jetty below the town', note: 'Every hour until midnight, and it is the pleasant way to arrive.' },
      { id: 'sample-am-t2', name: 'The coast bus', type: 'bus_station', address: 'The stop at the bottom of the steps', note: 'Cheap, frequent, and slow. Allow an hour from the far town.' },
      { id: 'sample-am-t3', name: 'Taxis', type: 'taxi', address: 'The turning circle by the gate', note: 'Agree the fare first. They will not come up the last stretch.' },
    ],
    notes: [{ id: 'sample-am-n1', title: 'Driving', text: 'There is no parking above the road and the road is single lane with buses on it. Take the boat.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The coast',
    editorialIntro: 'Nine years of visiting has narrowed this down to four things. None of them are on the list they hand you at the hotel.',
    couplePicks: [{ place_id: 'sample-am-p1', name: 'The lemon terraces', category: 'Parks & Outdoors', note: 'Walk them at eight in the morning, before the coaches come along the top road.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'The day after, unplanned', summary: 'Water in the morning, shade in the afternoon.',
        blocks: {
          morning: [{ id: 'sample-am-i1', place_name: 'The lemon terraces', description: 'The path is uneven and entirely worth it. Twenty minutes, mostly up.', photo_url: img(AMALFI_IMAGES.experiences, 800) }],
          afternoon: [{ id: 'sample-am-i2', place_name: 'The rocks below the house', description: 'Deep water, no sand, and nobody there before four.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-am-p1', title: 'What should we do with the afternoon before dinner?', category: 'celebration', isActive: true, allowComments: true,
    options: [
      { id: 'sample-am-p1a', label: 'Swim, and dress afterward', votes: 0 },
      { id: 'sample-am-p1b', label: 'Sit in the shade and talk', votes: 0 },
      { id: 'sample-am-p1c', label: 'A boat along the coast and back', votes: 0 },
    ],
  }],
};

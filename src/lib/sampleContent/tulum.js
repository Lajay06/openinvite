/**
 * SAMPLE CONTENT — tulum. Not a couple's data. Never persisted, never published.
 *
 * Voice anchored on the universe's own two lines (src/lib/websiteThemes.js):
 *   tagline          "Organic luxury"
 *   tileDescription  "A sun-bleached journal page for a day spent barefoot and
 *                     unhurried."
 *
 * So: unhurried, plainly said, nothing performed. No souvenir vocabulary
 * (CLAUDE.md) — tulum is carried by Fraunces, the sand ground and these
 * photographs.
 *
 * Cloudinary folder `Tulum` (8 assets). ONE REJECTED: the square napkin still
 * life carries generated lettering reading "Mees Liscal ine"; the landscape
 * palapa interior took its place. Recorded in the PR body.
 */
import { heroDeliveryWidth } from '../heroMasters.js';
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
export const img = (publicId, w = 1600) => `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

export const TULUM_IMAGES = {
  // TWO EXTRA HOME PHOTOS. The second was DOUBLED from Our Story because the
  // folder had no clean spare; the owner's 2026-09-06 upload gave it one, and
  // it is now a real asset. Nothing distinct was removed to make room.
  home: [
    'hf_20260905_001735_a9300863-dbb3-4116-ac55-ed8ea564bc57_xmlmhw', // spare wide
    // WAS DOUBLED from Our Story. The owner re-shot the still life whose napkin
    // carried generated lettering ("Mees Liscal ine") and uploaded it as
    // `composite-2`: same table, same light, blank napkin. It takes the doubled
    // slot rather than the story slot, because the landscape that replaced the
    // rejected one is a distinct asset and nothing distinct is removed to make
    // room. Asset refresh, 2026-09-06.
    'composite-2_qxrfwk',                                             // 2048x2048
  ],
  // HERO REVERTED TO THE WIDE ASSET (owner, 2026-09-06). The Group A review
  // swapped the wide hero with a portrait from Our Story; this puts both back.
  // The dimension comments on these two lines were left describing the
  // PRE-SWAP assets and were wrong for a week — every id below is measured
  // against the Cloudinary listing now, not copied forward.
  hero:  'tulum-hero_pfdffd', // heroes-jpg 4096x2294, ratio 1.786
  story: [
    'hf_20260905_001643_d8992ec0-b2cc-480a-8c6c-8c5fb0e915bb_umafkq', // 1536x2048, back in Our Story
    'hf_20260905_001735_92fb56d4-9f40-4c89-bdcd-b9c053124180_ntt8vs', // 1536x2048
    'hf_20260905_001735_750038b5-8d32-467f-8bdc-7ae9cea5da12_bohkyu', // 1536x2752
    'hf_20260905_001735_49e4b931-667c-48d2-bb78-6f2f47668f8a_phsgpm', // 2048x1536
  ],
  experiences: 'hf_20260905_001735_5b3e7d05-abca-45b3-8e1c-2e5a16dd1cc8_kfx6q2', // 2400x1792
};

export const SAMPLE_TULUM = {
  __sample: true,
  couple1Name: 'Imogen', couple2Name: 'Kai', coupleNames: 'Imogen & Kai',
  weddingDate: null,
  activeUniverse: 'tulum',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls', 'experience'],
  // THE HERO SLOT, at the master's own ceiling. It was a flat 2048 into a
  // hero that renders 2880 device pixels wide at 1440@2x — the softness
  // the 4K masters were shot to remove. heroDeliveryWidth never asks for
  // more than the master holds, so nothing upscales.
  coverPhoto: img(TULUM_IMAGES.hero, heroDeliveryWidth(TULUM_IMAGES.hero)),

  mainCeremony: { venueName: 'The Palm House', address: 'At the end of the sand road', startTime: '16:30', time: '16:30' },
  reception: { venueName: 'The Long Table', address: 'At the end of the sand road', startTime: '19:00', time: '19:00' },

  homeContent: {
    blocks: [
      { id: 'tu1', type: 'heading', order: 0, content: { text: 'Barefoot, and no particular hurry', kicker: 'The weekend' } },
      { id: 'tu2', type: 'paragraph', order: 1, content: {
        text: 'We are marrying on the sand at the end of the afternoon, and eating afterward under the palms. Shoes are optional and mostly a nuisance. Stay as long as you like.',
      } },
      { id: 'tu3', type: 'quote', order: 2, content: { text: 'Bring nothing. Everything you need is already there.', attribution: 'Imogen & Kai' } },
      { id: 'tu4', type: 'photo', order: 3, content: { url: img(TULUM_IMAGES.home[0], 1400) } },
      { id: 'tu5', type: 'photo', order: 4, content: { url: img(TULUM_IMAGES.home[1], 1400) } },

    ],
  },
  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We met on a trip neither of us wanted to take, both dragged along by other people. By the third day we had stopped pretending to be interested in anyone else. We have traveled badly and happily together ever since.',
    photos: [img(TULUM_IMAGES.story[0], 1400), img(TULUM_IMAGES.story[1], 1400), img(TULUM_IMAGES.story[2], 1400), img(TULUM_IMAGES.story[3], 1400)],
    milestones: [
      { date: 'The trip', text: 'Neither of us chose it. Both of us stayed an extra week.' },
      { date: 'The move', text: 'One suitcase each, and far too many plants.' },
      { date: 'The question', text: 'Asked in the water, which made the answer hard to hear.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },
  musicContent: { customMessage: 'There is a guitar at sunset and something considerably louder after dark. Tell us what belongs to the second half.' },
  music: { guestRequestsEnabled: true, playlists: [], requestMessage: 'One song. The one you would put on at midnight.' },
  registryContent: { registryMessage: 'Getting here is the gift, and we know what it costs. If you want to mark it anyway, there is a short list.', noGiftsPlease: false },

  qna: [
    { question: 'What time should we arrive?', answer: 'From four. The ceremony starts at half past and the light is best just after.' },
    { question: 'What should we wear?', answer: 'Linen, and nothing you would mind getting sand in.' },
    { question: 'Can we bring children?', answer: 'Please do. There is shade and somewhere to sleep when they have had enough.' },
    { question: 'Is there anything to swim in?', answer: 'Yes, and most people do before dinner.' },
  ],

  weddingPolicies: {
    dressCode: { display: true, guidance: 'Loose and light. Heels sink, so leave them behind.', weatherNote: 'It cools off quickly once the sun goes. Bring something for your shoulders.' },
    photography: { display: true, unplugged: true, message: 'Once the ceremony is over, photograph everything.' },
    lateArrival: { display: true, policy: 'Walk down and join us. Nobody will look round.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Beach Cabanas', description: 'On site, five minutes from the table. Held until eight weeks before.', priceRange: '$$$' },
      { name: 'The Road Houses', description: 'Ten minutes inland, quieter, and much easier on a budget.', priceRange: '$' },
    ],
  },

  transport: { enabledModes: ['taxi', 'walking'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-tu-t1', name: 'Taxis', type: 'taxi', address: 'The top of the sand road', note: 'They wait there until late. Agree the fare first.' },
      { id: 'sample-tu-t2', name: 'On foot', type: 'walking', address: 'From the cabanas', note: 'Five minutes on sand. Take a torch for the way back.' },
    ],
    notes: [{ id: 'sample-tu-n1', title: 'The road', text: 'It is unsealed for the last stretch. A low car will manage it slowly.' }],
  },

  experienceGuide: {
    published: true,
    destination: 'The coast road',
    editorialIntro: 'If you are staying on, these are the places we keep going back to.',
    couplePicks: [{ place_id: 'sample-tu-p1', name: 'The Morning Kitchen', category: 'Coffee & Bakeries', note: 'Open early, and the coffee is worth the walk.' }],
    itinerary: {
      schedule: [{
        day: 1, title: 'If you are staying on', summary: 'Nothing arranged, and nothing expected.',
        blocks: {
          morning: [{ id: 'sample-tu-i1', place_name: 'The Morning Kitchen', description: 'Coffee before the heat arrives.', photo_url: img(TULUM_IMAGES.experiences, 800) }],
          evening: [{ id: 'sample-tu-i2', place_name: 'The cenote', description: 'Swim late in the day, when the light comes through.' }],
        },
      }],
    },
  },

  polls: [{
    id: 'sample-tu-p1', title: 'What happens after dinner?', category: 'schedule', isActive: true, allowComments: true,
    options: [
      { id: 'sample-tu-p1a', label: 'Dancing, until somebody stops us', votes: 0 },
      { id: 'sample-tu-p1b', label: 'A fire, and a much slower evening', votes: 0 },
      { id: 'sample-tu-p1c', label: 'Swimming, obviously', votes: 0 },
    ],
  }],
};

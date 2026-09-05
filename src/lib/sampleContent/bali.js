/**
 * SAMPLE CONTENT — bali. Not a couple's data. Never persisted, never published.
 *
 * A universe is sold on how it looks with words in it, and a new account has
 * none: onboarding writes names, date, venue, style and universe, and nothing
 * else. So the first thing a couple sees after choosing bali is thirteen empty
 * pages in a sand palette. This file is what those pages look like FULL.
 *
 * WHY THE NAMES AND PLACES ARE OBVIOUSLY NOT REAL. Sample content that reads
 * like a plausible real wedding is the failure #576 already shipped: our
 * sentence, in the couple's first person, published to their guests as theirs.
 * Everything here is written so that a couple reading it knows immediately it
 * is ours — a stated sample couple, a stated sample venue — rather than
 * something they might mistake for a draft of their own.
 *
 * NO SOUVENIR VOCABULARY (CLAUDE.md). bali is evoked by the palette, the faces
 * and the imagery the universe already ships. Not one word here reaches for a
 * loanword to do that work. The reductio is the test: if this file said one
 * thing in Indonesian, kyoto's would say one in Japanese, and the system
 * becomes costume.
 *
 * SHAPE. Keys mirror what the guest pages actually read, derived from the
 * pages rather than from the entity schema — `homeContent.blocks` uses the
 * renderTypes in src/components/guest-website/blocks/blockTypes.js, `qna` is
 * the field WeddingFAQPage reads (NOT `faq`, which is the mismatch the render
 * harness's own seed shipped with for weeks).
 *
 * There is deliberately NO `slug` and `websiteEnabled` is false. See index.js
 * for why that is a safety property and not a formality.
 */
export const SAMPLE_BALI = {
  __sample: true,

  couple1Name: 'Sample',
  couple2Name: 'Couple',
  coupleNames: 'Sample & Couple',
  // Far enough out that a countdown block renders a real number rather than a
  // negative one, without pinning a date that ages into the past. Resolved by
  // index.js at read time, never stored.
  weddingDate: null,

  activeUniverse: 'bali',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport'],

  mainCeremony: {
    venueName: 'The Sample Garden',
    address: 'A hillside above the river',
    startTime: '16:30',
    time: '16:30',
  },
  reception: {
    venueName: 'The Long Table',
    address: 'A hillside above the river',
    startTime: '19:00',
    time: '19:00',
  },

  homeContent: {
    blocks: [
      { id: 's1', type: 'heading', order: 0, content: { text: 'Two days, one long table', kicker: 'The weekend' } },
      { id: 's2', type: 'paragraph', order: 1, content: {
        text: 'We are getting married on a hillside above the river, and we would like you there for the whole of it. Everything you need is on these pages: where to be, when to be there, and where to sleep afterward.',
      } },
      { id: 's3', type: 'quote', order: 2, content: {
        text: 'Come early. Stay late. Bring nothing but yourselves.',
        attribution: 'Sample & Couple',
      } },
    ],
  },

  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We met at a friend\'s birthday where neither of us knew anybody else, and spent the whole evening talking in the kitchen because it was quieter. Seven years later we are still doing that at parties. This one is ours, so the kitchen is bigger.',
    milestones: [
      { title: 'The kitchen', description: 'A birthday neither of us wanted to go to.' },
      { title: 'The first trip', description: 'Two weeks, one bag, and a great deal learned about each other.' },
      { title: 'The question', description: 'Asked on an ordinary Tuesday, which is why it worked.' },
    ],
  },

  celebrationContent: {
    customMessage: 'The ceremony is outside and the ground is soft. Flat shoes are the kindest thing you can do for yourself.',
  },

  rsvpContent: {
    // No deadline. A sample date would either be in the past or imply a
    // schedule the couple has not chosen; the page reads fine without one.
    rsvpDeadline: null,
  },

  musicContent: {
    customMessage: 'There will be a long night of dancing and we are short of songs. Tell us what you want to hear.',
  },
  music: {
    guestRequestsEnabled: true,
    // No playlist link. An embed here would be a third party's playlist on a
    // couple's preview, which is somebody else's content, not a sample of ours.
    playlists: [],
    requestMessage: 'Tell us the one song that would get you out of your seat.',
  },

  registryContent: {
    registryMessage: 'Your being there is the whole of it. If you would like to give something anyway, there is a list below.',
    noGiftsPlease: false,
  },

  qna: [
    { question: 'What time should we arrive?', answer: 'From four. The ceremony starts at half past, and it starts on time.' },
    { question: 'Can we bring children?', answer: 'Please do. There is a shaded room off the terrace with somewhere to nap.' },
    { question: 'Is there parking?', answer: 'A little, at the top of the track. If you can share a car, share a car.' },
    { question: 'What should we wear?', answer: 'Something you can stand in on grass for an hour. It stays warm well past dark.' },
  ],

  weddingPolicies: {
    dressCode: { enabled: true, text: 'Garden formal. Flat shoes, and a layer for later.' },
    children: { enabled: true, text: 'Children are welcome all day and all evening.' },
    photography: { enabled: true, text: 'Phones down for the ceremony, please. Everything after is yours to photograph.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Sample Guesthouse', description: 'Ten minutes down the hill. We have held rooms until eight weeks before.', priceRange: '$$' },
      { name: 'The River Rooms', description: 'A short drive, quieter, and better for a family.', priceRange: '$$$' },
    ],
  },

  transport: {
    enabledModes: ['shuttle', 'taxi'],
    notes: 'A shuttle runs from the guesthouse at half past three and back again at midnight and at one.',
  },
};

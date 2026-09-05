/**
 * SAMPLE CONTENT — havana. Not a couple's data. Never persisted, never published.
 *
 * THIS IS THE ONE WITH REAL PHOTOGRAPHY. bali keeps its placeholders and stays
 * the omission fixture — the record a published site is checked against to
 * prove none of this reaches a guest. havana is the proof of the other half:
 * what a universe looks like when it is full, with the owner's own images.
 *
 * IMAGERY IS RULED DIFFERENTLY FROM COPY. Sample COPY may never appear on a
 * published guest site; the section is omitted instead. Sample IMAGERY may
 * appear on a published site, but only behind the publish acknowledgement —
 * "N sample images are on your site. Replace or publish anyway?" — with N
 * counted at publish time from this set. `SAMPLE_IMAGE_IDS` below is that
 * count's source, exported for exactly that purpose. Nothing here schedules
 * that acknowledgement; it does not exist yet.
 *
 * ── THE PUBLIC IDS ARE REAL AND THE ROLES ARE DERIVED, NOT NAMED ────────────
 *
 * Every id below was read from the owner's Cloudinary account (folder
 * `Havana`, seven assets) through the Admin API. The filenames are generator
 * output — `hf_<date>_<time>_<uuid>_<hash>` — and carry NO role signal
 * whatsoever. One asset (`tempImageVoljjw_-_Edited_sw0lhh`) is a hand-edited
 * jpg uploaded separately and is equally unnamed.
 *
 * So the roles here are assigned by ASPECT RATIO, which is real signal and
 * needs no renaming by the owner. The rule, applied in this order:
 *
 *   ratio >= 1.5   wide landscape   hero, then share image
 *   1.1 - 1.5      landscape        event card, then experiences
 *   0.9 - 1.1      square           experiences, then gallery
 *   0.66 - 0.9     portrait         story, then gallery
 *   < 0.66         tall portrait    gallery (reserved for full-bleed)
 *
 * Ties inside a class break on the timestamp embedded in the public id
 * (`hf_YYYYMMDD_HHMMSS`), ascending — the owner's own generation order, and
 * the only stable ordering the ids contain.
 *
 * WHAT THE RULE CANNOT DO, stated because it matters: aspect ratio describes
 * SHAPE, not SUBJECT. A portrait may be a couple, a doorway or a plate of
 * food. This allocation guarantees an image that FITS each slot; it cannot
 * guarantee one that BELONGS there. Confirming the seven below is the cheapest
 * possible check before the same rule is run across the other fifteen folders.
 *
 * NO SOUVENIR VOCABULARY (CLAUDE.md). havana is carried by Abril Fatface,
 * the coral/navy palette and these photographs. Not one word here reaches for
 * a loanword to do that work.
 */

const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';

/**
 * f_auto,q_auto is not optional. The originals are 4–10 MB PNGs; the same
 * asset through this transform is ~15 KB at display width. A raw id on a
 * guest page would ship ten megabytes to a phone.
 */
export const img = (publicId, w = 1600) =>
  `${CLOUD}/f_auto,q_auto,w_${w}/${publicId}`;

/** Role -> Cloudinary public id. Derived by the ratio rule in the header. */
export const HAVANA_IMAGES = {
  // 2048x1152, 16:9 — the only wide landscape in the folder, so it is both
  // the hero and the share image. A 16:9 crop is already close to the 1.91:1
  // that og:image wants.
  hero:        'hf_20260904_112949_7fd20c50-b661-46c5-8c59-cef0e3b7d9e5_mqzaga',
  share:       'hf_20260904_112949_7fd20c50-b661-46c5-8c59-cef0e3b7d9e5_mqzaga',
  // 2048x1536, 4:3
  eventCard:   'hf_20260904_112949_c18f011a-647f-4bc6-b75e-2752a3736efe_m3zomm',
  // 2048x2048, 1:1 — the only square, and the experiences grid is square-first
  experiences: 'hf_20260904_112948_eaa395d4-77e2-424e-9754-65586ca4270b_uztrvs',
  // 1536x2048, 3:4 — earliest portrait by timestamp
  story:       'hf_20260904_112948_aecc13c7-4644-4ea3-8a9b-43b21c6a3a73_qucu5d',
  gallery: [
    'hf_20260904_112950_ee43be91-2036-4b97-8ff9-f490913bfded_q6rrgk', // 1792x2400
    'hf_20260904_112950_c28145cb-425f-4060-803e-0ef8ad0474c9_okqxth', // 1536x2752, tall
    'tempImageVoljjw_-_Edited_sw0lhh',                                // 1536x2048, the jpg
  ],
};

/**
 * Every DISTINCT sample image, for the publish acknowledgement's count. `hero`
 * and `share` are the same asset, so a naive count would say eight and the
 * couple would go looking for an eighth picture that does not exist.
 */
export const SAMPLE_IMAGE_IDS = [...new Set([
  HAVANA_IMAGES.hero, HAVANA_IMAGES.share, HAVANA_IMAGES.eventCard,
  HAVANA_IMAGES.experiences, HAVANA_IMAGES.story, ...HAVANA_IMAGES.gallery,
])];

export const SAMPLE_HAVANA = {
  __sample: true,

  couple1Name: 'Sample',
  couple2Name: 'Couple',
  coupleNames: 'Sample & Couple',
  weddingDate: null,               // resolved at read time by index.js

  activeUniverse: 'havana',
  websiteMode: 'light',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls'],

  coverPhoto: img(HAVANA_IMAGES.hero, 2048),

  mainCeremony: {
    venueName: 'The Sample Rooms',
    address: 'A courtyard off the old square',
    startTime: '17:00',
    time: '17:00',
    photoUrl: img(HAVANA_IMAGES.eventCard, 1200),
  },
  reception: {
    venueName: 'The Upstairs Bar',
    address: 'A courtyard off the old square',
    startTime: '19:30',
    time: '19:30',
  },

  homeContent: {
    blocks: [
      { id: 'h1', type: 'heading', order: 0, content: { text: 'One evening, one long room', kicker: 'The night' } },
      { id: 'h2', type: 'paragraph', order: 1, content: {
        text: 'We are getting married in a courtyard, and afterward everyone goes upstairs and stays there. The band is loud, the room is warm, and nobody is expected to leave early.',
      } },
      { id: 'h3', type: 'quote', order: 2, content: {
        text: 'Wear something you can dance in. That is the only instruction.',
        attribution: 'Sample & Couple',
      } },
    ],
  },

  welcomeMessage: '',

  ourStoryContent: {
    storyText: 'We met the summer one of us was leaving and the other had just arrived, which should have been the end of it. It was not. Everything since has been a version of that evening: the wrong timing, the right person, and a long night that nobody wanted to call.',
    photoUrl: img(HAVANA_IMAGES.story, 1200),
    milestones: [
      { title: 'The wrong week', description: 'One of us had a flight booked. It got moved.' },
      { title: 'The long drive', description: 'Nine hours, one working speaker, no regrets.' },
      { title: 'The question', description: 'Asked on a balcony, badly, and answered before the sentence finished.' },
    ],
  },

  rsvpContent: { rsvpDeadline: null },

  musicContent: {
    customMessage: 'There is a band until midnight and a record player after. Tell us what belongs on it.',
  },
  music: {
    guestRequestsEnabled: true,
    playlists: [],
    requestMessage: 'One song. The one that would get you out of your chair.',
  },

  registryContent: {
    registryMessage: 'Coming is the gift. If you want to mark it with something, there is a short list.',
    noGiftsPlease: false,
  },

  qna: [
    { question: 'What time should we arrive?', answer: 'From five. The ceremony is short and it starts on the hour.' },
    { question: 'Is there dancing?', answer: 'There is very little else after nine.' },
    { question: 'Can we bring children?', answer: 'Yes, and there is a quiet room upstairs when they have had enough.' },
    { question: 'How do we get home?', answer: 'Taxis wait at the corner until late. The walk back to town is fifteen minutes and well lit.' },
  ],

  weddingPolicies: {
    dressCode: {
      display: true,
      guidance: 'Dress up. Flat shoes still dance better than good ones.',
      weatherNote: 'The courtyard is open to the sky and cools off after dark.',
    },
    photography: {
      display: true,
      unplugged: true,
      message: 'After the ceremony, photograph everything.',
    },
    lateArrival: {
      display: true,
      policy: 'Come in at the back. Somebody will find you a chair.',
    },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Sample Hotel', description: 'On the square, two minutes from the courtyard. A block of rooms is held until six weeks before.', priceRange: '$$' },
      { name: 'The Corner Rooms', description: 'Quieter, a short walk, and better for a family.', priceRange: '$' },
    ],
  },

  transport: { enabledModes: ['taxi', 'walking'] },
  guestSuiteTransport: {
    places: [
      { id: 'sample-hv-t1', name: 'Taxi rank', type: 'taxi', address: 'The north corner of the square', note: 'Cars wait there until about two.' },
      { id: 'sample-hv-t2', name: 'On foot', type: 'walking', address: 'From the town center', note: 'Fifteen minutes, flat, and lit the whole way.' },
    ],
    notes: [
      { id: 'sample-hv-n1', title: 'Parking', text: 'There is none at the venue. The square fills early on a Saturday.' },
    ],
  },

  experienceGuide: {
    published: true,
    destination: 'The old town',
    editorialIntro: 'If you are staying the weekend, these are the places we would send you first.',
    coverPhoto: img(HAVANA_IMAGES.experiences, 1200),
    couplePicks: [
      { place_id: 'sample-hv-p1', name: 'The Corner Cafe', category: 'Coffee & Bakeries', note: 'Open early, and the only place doing coffee before eight.' },
    ],
  },

  photosContent: {
    photos: HAVANA_IMAGES.gallery.map((id, i) => ({ id: `sample-hv-g${i + 1}`, url: img(id, 1400) })),
  },

  polls: [
    {
      id: 'sample-hv-p1',
      title: 'What should the band play last?',
      category: 'music',
      isActive: true,
      allowComments: true,
      options: [
        { id: 'sample-hv-p1a', label: 'Something slow, so everybody stands up', votes: 0 },
        { id: 'sample-hv-p1b', label: 'Something fast, so nobody sits down', votes: 0 },
        { id: 'sample-hv-p1c', label: 'Let them decide on the night', votes: 0 },
      ],
    },
  ],
};

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
  // 'polls' MUST be listed. Unlike stay/transport/music/good-to-know, the polls
  // page has no entry in MultiPageWeddingWebsite's subPageAvailability map, so
  // enabledPages is the ONLY thing that makes it reachable. Sample polls were
  // added and the page still refused to render — caught by rendering it, not by
  // reading it, which is why the guard below now checks reachability and not
  // just presence.
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'faq', 'stay', 'transport', 'polls'],

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

  // NO `celebrationContent` AT ALL, and that is the finding rather than an
  // omission. This carried a `customMessage` (which the page never reads) and
  // was then "fixed" to a `daySchedule` — which the page DOES read, but only
  // inside `{!hasEvents && daySchedule.length > 0}`. A record with a ceremony
  // and a reception has events, so the day schedule never rendered either.
  // Two wrong shapes in a row on the same key, both of which a presence check
  // called correct, and both caught only by looking at the rendered page.
  //
  // The sample's events ARE mainCeremony and reception above. They render.

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

  // THE SHAPE `linesFor()` READS, not the shape the field names suggest.
  // These were `{ enabled, text }`, which src/lib/goodToKnow.js reads not at
  // all: a section shows only when `display` is true AND its own per-section
  // fields carry something. Every Good-to-know entry here rendered NOTHING,
  // and the guard could not see it because a guard on strings cannot tell a
  // key the product ignores from one it reads.
  weddingPolicies: {
    dressCode:   { display: true, guidance: 'Garden formal, and nothing that minds grass.', weatherNote: 'It stays warm well past dark, but bring a layer for the walk down.' },
    children:    { display: true, option: 'all-welcome', message: 'There is a shaded room off the terrace with somewhere to nap.' },
    photography: { display: true, unplugged: true, message: 'Everything after the ceremony is yours to photograph.' },
    lateArrival: { display: true, policy: 'If you are late, come in at the back and nobody will mind.' },
  },

  accommodation: {
    manualProperties: [
      { name: 'The Sample Guesthouse', description: 'Ten minutes down the hill. We have held rooms until eight weeks before.', priceRange: '$$' },
      { name: 'The River Rooms', description: 'A short drive, quieter, and better for a family.', priceRange: '$$$' },
    ],
  },

  // TWO FIELDS, DELIBERATELY, because two different things read them.
  // `transport.enabledModes` is what MultiPageWeddingWebsite's availability
  // check consults to decide whether the page exists at all;
  // `guestSuiteTransport.places[]/notes[]` is what WeddingTransportPage
  // actually RENDERS. Setting only the first produced a reachable, empty page.
  transport: {
    enabledModes: ['shuttle', 'taxi'],
  },
  guestSuiteTransport: {
    places: [
      { id: 'sample-t1', name: 'The hill shuttle', type: 'shuttle', address: 'From the guesthouse door', note: 'Half past three up, midnight and one back down.' },
      { id: 'sample-t2', name: 'Taxis', type: 'taxi', address: 'Rank at the top of the track', note: 'Book ahead for the end of the night. There are not many.' },
    ],
    notes: [
      { id: 'sample-tn1', title: 'The track', text: 'The last few hundred meters are unsealed. A low car will manage it slowly.' },
    ],
  },

  // POLLS. Named in the ruling alongside names, story, events and
  // Good-to-know, and absent from the first version of this file entirely.
  // No `emoji` key: a poll can carry one, but this is copy WE author, and the
  // no-emoji rule binds what we write even where a couple's own choice would
  // be exempt.
  polls: [
    {
      id: 'sample-p1',
      title: 'What gets you onto the dance floor?',
      category: 'music',
      isActive: true,
      allowComments: true,
      options: [
        { id: 'sample-p1a', label: 'Something everybody knows the words to', votes: 0 },
        { id: 'sample-p1b', label: 'Something nobody expects', votes: 0 },
        { id: 'sample-p1c', label: 'Nothing. I am here for the food', votes: 0 },
      ],
    },
    {
      id: 'sample-p2',
      title: 'Sunday morning, before you go home',
      category: 'schedule',
      isActive: true,
      allowComments: false,
      options: [
        { id: 'sample-p2a', label: 'Breakfast by the river', votes: 0 },
        { id: 'sample-p2b', label: 'A slow walk and a coffee', votes: 0 },
        { id: 'sample-p2c', label: 'A long lie-in, thank you', votes: 0 },
      ],
    },
  ],
};

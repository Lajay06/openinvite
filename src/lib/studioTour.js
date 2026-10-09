/**
 * src/lib/studioTour.js
 *
 * THE STUDIO TOUR, AS DATA. Nine chapters and a finale card, no React, no
 * imports of anything that needs a browser. Goal 2026-09-28 requires it:
 * "All chapter content lives as pure data in src/lib/studioTour.js so the
 * mobile shell can import the same chapters later."
 *
 * So the rules for this file are narrow and worth stating, because the mobile
 * shell is a different app that will import it:
 *
 *   NO JSX, NO REACT, NO window. Every export is data or a pure function of
 *   its arguments. A guard can import it in Node and the app shell can import
 *   it without pulling a web dependency in behind it.
 *
 *   THE COPY IS THE OWNER'S, VERBATIM. Every string below is quoted from
 *   goals/2026-09-28-studio-tour.md, and tests/persistence/studio-tour-copy.mjs
 *   READS THAT FILE and compares, rather than trusting this transcription. That
 *   is the arrangement accepted-copy-landed.mjs uses for the RSVP rulings, and
 *   it exists because a copy guard written from the same source it checks is a
 *   tautology.
 *
 *   NO EM DASHES OR EN DASHES, per the ruling that opened this goal. A comma,
 *   a colon, or a full stop instead.
 *
 * PROGRESS LIVES IN guidanceState, WITH NO SCHEMA CHANGE. Completed chapters
 * are keys in guidanceState.dismissed behind a "tour:" prefix, and finishing or
 * skipping writes the tourSeenAt that already exists. That is why this file
 * exports the prefix and the helpers rather than letting each caller build the
 * key, which is how two spellings of one key end up in one product.
 */

/** The prefix that keeps tour progress from colliding with panel dismissals. */
export const TOUR_KEY_PREFIX = 'tour:';

/** The key a chapter is recorded under in guidanceState.dismissed. */
export function chapterProgressKey(chapterKey) {
  return `${TOUR_KEY_PREFIX}${chapterKey}`;
}

/**
 * The nine chapters, in order.
 *
 * `routes` is what the "?" control reads: the page a couple pressed it on
 * decides which chapter opens first. A route listed twice would make that
 * ambiguous, so the copy guard asserts every route appears once.
 *
 * `seconds` is the recording's TARGET length, inside the brief's 8 to 20
 * second window. The recording script measures what it actually produced and
 * the recording guard fails when the two disagree, so the time this file
 * reports is never a number somebody guessed and left.
 *
 * `spotlight` names the control "Try it" should point at. It is a string here,
 * not a selector, because a selector in a data file is a coupling the mobile
 * shell cannot honor; the web tour maps these names to selectors itself.
 */
export const CHAPTERS = [
  {
    key: 'welcome',
    seconds: 14,
    routes: ['/DailyUpdate'],
    title: 'Welcome to your studio, {coupleFirstNames}.',
    lead: 'Everything for the wedding lives here, in one place, in your voice.',
    body: 'The left side is the map. Planning holds the day itself. Guests holds the people. Style and experience holds how it looks and feels. Design studio is where the invitation, the website and the entrance are made. Ava is beside you throughout.',
    tip: 'You can leave this tour at any point and come back to it from Studio tour in the sidebar.',
    tryIt: { label: 'Daily update', to: '/DailyUpdate', spotlight: null },
  },
  {
    key: 'event-details',
    seconds: 16,
    routes: ['/event-details'],
    title: 'Start with the facts.',
    lead: 'Dates, places and the theme. Everything else reads from here.',
    body: 'Add the ceremony and reception, then any pre-wedding and post-wedding events. Set the theme once: aesthetic, atmosphere, setting, cultures, faith. The guest site, the invitation and Ava all use it.',
    tip: 'Dress code is a set of pills plus one line of notes per event. Guests see exactly what you set.',
    tryIt: { label: 'Event details', to: '/event-details?tab=theme', spotlight: 'theme-aesthetic-pills' },
  },
  {
    key: 'schedule',
    seconds: 14,
    routes: ['/Schedule', '/TodoList'],
    title: 'The day, in order.',
    lead: 'Every event, timed and chronological, on one schedule.',
    body: 'The schedule is what your guests see and what your run sheet exports from, so it is one list, not two. To do is yours alone, with what matters next at the top.',
    tip: 'Export the schedule as one workbook with two sheets: All events for you, Run sheet for the people running the day.',
    tryIt: { label: 'Schedule', to: '/Schedule', spotlight: 'schedule-export' },
  },
  {
    key: 'guests',
    seconds: 18,
    routes: ['/Guests', '/Messages', '/Seating', '/wedding-party'],
    title: 'The people.',
    lead: 'Guest list, replies, seating and notes, all connected.',
    // PERSONALIZED WHEN THE NUMBERS EXIST. The brief: 'Personalise the lead
    // with live numbers when present: "{n} guests, {m} replied so far."'
    // Both are read from data the dashboard has already loaded; the tour never
    // makes a read of its own.
    leadWithNumbers: '{n} guests, {m} replied so far.',
    body: 'Add guests, send invitations, and watch replies land on the list. Seating counts the same people the list does. When a guest sends you a note from your site, it appears in Messages, and your reply goes straight to their inbox.',
    tip: 'Guests reply through their own personal link. If one loses it, the RSVP page will send it again.',
    tryIt: { label: 'Guest list', to: '/Guests', spotlight: 'guests-send-invitations' },
  },
  {
    key: 'style',
    seconds: 16,
    routes: ['/Moodboard', '/Styling', '/Beauty', '/FoodBeverage', '/Music', '/Photography', '/VowsSpeeches', '/Polls'],
    title: 'How it feels.',
    lead: 'Moodboard, styling, food, music, photography, and the small things guests remember.',
    body: 'These pages shape the guest site as much as they shape the day. The music table takes requests from guests and lets you approve them. Good to know tells guests what to wear, where to park and what not to bring.',
    tip: 'Anything you switch on for guests shows on the guest site exactly as you see it in the editor.',
    tryIt: { label: 'Music', to: '/Music', spotlight: 'music-create-playlist' },
  },
  {
    key: 'design-studio',
    seconds: 18,
    routes: ['/studio', '/website-editor'],
    title: 'Made to look like yours.',
    lead: 'One universe, carried through the invitation, the website and the entrance.',
    body: 'Pick your universe once. The guest suite is built on it, page by page. Change a photo or a line and the preview shows what guests will see. The entrance greets each guest by name when they arrive from their invitation.',
    tip: 'Your web address is chosen here. Once invitations have gone out, old links keep working even if you change it.',
    tryIt: { label: 'Design studio', to: '/studio', spotlight: 'studio-my-universe' },
  },
  {
    key: 'ava',
    seconds: 14,
    routes: [],
    title: 'Ava has read all of it.',
    lead: 'A planner who knows your wedding, not a chatbot with a template.',
    body: 'Ask Ava to draft a message, suggest a running order, or check what is missing. She reads your event details, your guest list and your theme before she answers, and she learns your preferences as you go.',
    tip: 'The sparkle button in the corner opens Ava from any page.',
    // AVA IS NOT A ROUTE. It is a pod the Layout opens on the openAva event
    // (src/lib/avaOpen.js), so "Try it" asks for the pod rather than a page.
    tryIt: { label: 'Ava', to: null, spotlight: 'ava-composer', opens: 'ava' },
  },
  {
    key: 'publish',
    seconds: 16,
    // THE GUEST SUITE EDITOR BELONGS TO THIS CHAPTER, not to design studio.
    // Both '/studio/guest-suite' and '/studio/website' render StudioGuestSuite,
    // and this chapter's "Try it" sends a couple to exactly that page, so the
    // "?" there has to open this chapter. It did not: '/studio' matched first
    // and a couple who followed Try it and then pressed "?" was handed a
    // different chapter than the one that sent them. Longest route match is why
    // '/studio' still resolves to design studio.
    routes: [
      '/studio/guest-suite', '/studio/guest-suite/share', '/studio/guest-suite/policies',
      '/studio/guest-suite/assets', '/studio/website',
      '/GuestSuiteSchedule', '/QandA', '/GuestSuiteRegistry', '/GuestSuiteAccommodation',
      '/GuestSuiteTransport', '/GuestSuiteExperience', '/GuestSuitePolicies', '/GuestSuitePolls',
    ],
    title: 'When you are ready, it is one click.',
    lead: 'Publish the guest site, then send invitations from the guest list.',
    body: "Invitations go out by email in your names, each with the guest's personal link. Replies come back to the list. The guest site stays live and you can keep editing it; saves are published.",
    tip: 'Send yourself a test invitation first. It is the fastest way to see the whole journey as a guest.',
    // THE SHARE TAB, NOT THE PAGE. The Publish control lives on
    // /studio/guest-suite/share (StudioShareTab), and the tab is read from the
    // PATH rather than a query param, so landing on /studio/guest-suite would
    // open the website tab and spotlight nothing.
    tryIt: { label: 'Guest Suite', to: '/studio/guest-suite/share', spotlight: 'guest-suite-publish' },
  },
  {
    key: 'help',
    seconds: 12,
    routes: [],
    title: 'The question mark is always there.',
    lead: 'Every page has one. It opens this tour at that page.',
    body: 'Tap the question mark in the top right of any page for what is here and what most people miss. The Help center has the longer answers. Collaborate lets you bring a planner or a partner into the studio with you.',
    tip: 'Studio tour lives in the sidebar. Come back any time.',
    // THE LAST CHAPTER POINTS AT THE DOOR IT CAME THROUGH, and pulses it once.
    tryIt: { label: 'the question mark', to: null, spotlight: 'whats-here-control', pulseOnly: true },
  },
];

/**
 * THE RECORDINGS, IN ONE MAP, SO THE RECORDING PR EDITS ONE BLOCK.
 *
 * Every chapter shows a placeholder poster until its footage exists. That is
 * deliberate and it is the owner's instruction for this PR: "ship the UI with
 * poster frames from Cloudinary placeholders so the layout is real before the
 * footage is." A 1280 by 720 poster reserves the right box from the first
 * commit, so the recording PR changes data and not markup.
 *
 * ONE SHARED PLACEHOLDER, not nine identical grey rectangles at nine paths.
 * Nine would carry no more information than one and would be nine things to
 * find and delete later.
 *
 * webm is what Playwright produces. mp4 and the poster come from Cloudinary
 * DELIVERY DERIVATIVES of that same upload rather than from local exports,
 * because this checkout has no ffmpeg: the same public id served as .mp4 and
 * as .jpg. That is why a chapter needs only one uploaded asset.
 */
export const PLACEHOLDER_POSTER =
  'https://res.cloudinary.com/dsr84xknv/image/upload/v1790635009/studio-tour/_placeholder/poster-placeholder.png';

/**
 * chapter key -> the desktop recording, with the phone one nested.
 *
 *   { poster, webm, mp4, seconds, phone: { poster, webm, mp4, seconds } }
 *
 * null means no footage yet, and the chapter shows the shared placeholder.
 *
 * `seconds` IS MEASURED, not chosen: scripts/tour-recordings/record-all.mjs
 * counts the frames it wrote and divides by the frame rate, so the number here
 * is the length of the file. CHAPTERS[].seconds stays the TARGET the script is
 * written against, and tests/persistence/tour-recordings.mjs bounds the drift
 * between the two.
 */
export const MEDIA = {
  welcome: {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791530159/studio-tour/welcome/1440.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791530159/studio-tour/welcome/1440.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791530159/studio-tour/welcome/1440.mp4',
    seconds: 14.03,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791530156/studio-tour/welcome/390.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791530156/studio-tour/welcome/390.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791530156/studio-tour/welcome/390.mp4',
      seconds: 15.2,
    },
  },
  'event-details': {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791530165/studio-tour/event-details/1440.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791530165/studio-tour/event-details/1440.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791530165/studio-tour/event-details/1440.mp4',
    seconds: 18.1,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791530162/studio-tour/event-details/390.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791530162/studio-tour/event-details/390.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791530162/studio-tour/event-details/390.mp4',
      seconds: 17.5,
    },
  },
  schedule: {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791539338/studio-tour/schedule/1440.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791539338/studio-tour/schedule/1440.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791539338/studio-tour/schedule/1440.mp4',
    seconds: 14.47,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791539336/studio-tour/schedule/390.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791539336/studio-tour/schedule/390.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791539336/studio-tour/schedule/390.mp4',
      seconds: 13.33,
    },
  },
  guests: {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791544961/studio-tour/guests/1440-20261009112240.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791544961/studio-tour/guests/1440-20261009112240.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791544961/studio-tour/guests/1440-20261009112240.mp4',
    seconds: 18.73,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791544959/studio-tour/guests/390-20261009112237.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791544959/studio-tour/guests/390-20261009112237.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791544959/studio-tour/guests/390-20261009112237.mp4',
      seconds: 17.2,
    },
  },
  style: {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791530176/studio-tour/style/1440.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791530176/studio-tour/style/1440.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791530176/studio-tour/style/1440.mp4',
    seconds: 16.73,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791530175/studio-tour/style/390.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791530175/studio-tour/style/390.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791530175/studio-tour/style/390.mp4',
      seconds: 15.93,
    },
  },
  'design-studio': {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791530180/studio-tour/design-studio/1440.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791530180/studio-tour/design-studio/1440.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791530180/studio-tour/design-studio/1440.mp4',
    seconds: 18.03,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791530178/studio-tour/design-studio/390.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791530178/studio-tour/design-studio/390.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791530178/studio-tour/design-studio/390.mp4',
      seconds: 17.17,
    },
  },
  ava: {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791530183/studio-tour/ava/1440.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791530183/studio-tour/ava/1440.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791530183/studio-tour/ava/1440.mp4',
    seconds: 14.83,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791530181/studio-tour/ava/390.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791530181/studio-tour/ava/390.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791530181/studio-tour/ava/390.mp4',
      seconds: 15.2,
    },
  },
  publish: {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791539504/studio-tour/publish/1440.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791539504/studio-tour/publish/1440.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791539504/studio-tour/publish/1440.mp4',
    seconds: 17.27,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791539533/studio-tour/publish/390.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791539533/studio-tour/publish/390.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791539533/studio-tour/publish/390.mp4',
      seconds: 15.57,
    },
  },
  help: {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791544963/studio-tour/help/1440-20261009112242.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791544963/studio-tour/help/1440-20261009112242.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791544963/studio-tour/help/1440-20261009112242.mp4',
    seconds: 12.03,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791544962/studio-tour/help/390-20261009112241.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791544962/studio-tour/help/390-20261009112241.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791544962/studio-tour/help/390-20261009112241.mp4',
      seconds: 11.4,
    },
  },
};

/**
 * THE /tour PAGE'S OWN CLIPS, for the scenes no chapter films.
 *
 * Same shape as MEDIA, recorded by scripts/tour-recordings/record-tour-page.mjs
 * from the rich fixture and uploaded to studio-tour/tour-page/<clip>/<width>.
 * /tour reuses a chapter's recording wherever a chapter films the same page;
 * these are the rest.
 */
export const TOUR_PAGE_MEDIA = {
  budget: {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791540792/studio-tour/tour-page/budget/1440.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791540792/studio-tour/tour-page/budget/1440.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791540792/studio-tour/tour-page/budget/1440.mp4',
    seconds: 12.73,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791540791/studio-tour/tour-page/budget/390.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791540791/studio-tour/tour-page/budget/390.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791540791/studio-tour/tour-page/budget/390.mp4',
      seconds: 11,
    },
  },
  seating: {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791537173/studio-tour/tour-page/seating/1440.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791537173/studio-tour/tour-page/seating/1440.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791537173/studio-tour/tour-page/seating/1440.mp4',
    seconds: 14.07,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791537168/studio-tour/tour-page/seating/390.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791537168/studio-tour/tour-page/seating/390.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791537168/studio-tour/tour-page/seating/390.mp4',
      seconds: 13.13,
    },
  },
  site: {
    poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_1280,q_auto:good/v1791542205/studio-tour/tour-page/site/1440-20261009103644.jpg',
    webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791542205/studio-tour/tour-page/site/1440-20261009103644.webm',
    mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791542205/studio-tour/tour-page/site/1440-20261009103644.mp4',
    seconds: 15.13,
    phone: {
      poster: 'https://res.cloudinary.com/dsr84xknv/video/upload/so_1.0,w_780,q_auto:good/v1791542203/studio-tour/tour-page/site/390-20261009103641.jpg',
      webm: 'https://res.cloudinary.com/dsr84xknv/video/upload/v1791542203/studio-tour/tour-page/site/390-20261009103641.webm',
      mp4: 'https://res.cloudinary.com/dsr84xknv/video/upload/vc_h264,q_auto:good,br_900k/v1791542203/studio-tour/tour-page/site/390-20261009103641.mp4',
      seconds: 9.83,
    },
  },
};

/**
 * What a chapter should show.
 *
 * Always returns a poster, so no caller has to decide what to draw when the
 * footage is missing. `hasFootage` is the flag the reduced-motion and preload
 * logic reads, rather than each caller testing for null itself.
 *
 * `phone` PICKS THE 390 RECORDING, and nothing in the web panel passes it yet.
 * Both widths are recorded and both are in the map, because the brief asks for
 * both and because the mobile shell will import this file rather than keep its
 * own; what the web panel draws is unchanged, which is the recording PR's own
 * constraint: the media map moves, the markup does not. A chapter with only
 * the desktop set falls back to it rather than losing its footage, so a phone
 * caller never gets less than a web caller.
 */
export function mediaFor(chapterKey, { phone = false } = {}) {
  const chapter = MEDIA[chapterKey] || null;
  const entry = (phone && chapter?.phone) || chapter;
  return {
    poster: entry?.poster || PLACEHOLDER_POSTER,
    webm: entry?.webm || null,
    mp4: entry?.mp4 || null,
    seconds: entry?.seconds ?? null,
    hasFootage: !!(entry && entry.webm),
  };
}

/** The card after the last chapter. */
export const FINALE = {
  line: 'That is the studio. Go make it yours.',
  buttonLabel: 'Start planning',
  to: '/DailyUpdate',
};

/** Every chapter key, in order. */
export const CHAPTER_KEYS = CHAPTERS.map((c) => c.key);

/** Total recording seconds across the tour. */
export const TOTAL_SECONDS = CHAPTERS.reduce((sum, c) => sum + c.seconds, 0);

/**
 * The time the first-run card shows beside "Take the tour".
 *
 * ROUNDED UP, NEVER DOWN. A tour that says two minutes and takes three has
 * lied to someone deciding whether they have time for it.
 */
export function totalTimeLabel(seconds = TOTAL_SECONDS) {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? 'about a minute' : `about ${minutes} minutes`;
}

/**
 * The chapter the "?" on a given page should open first.
 *
 * Longest route match wins, so '/studio/guest-suite' resolves to the guest
 * suite chapter rather than to '/studio'. Returns the welcome chapter's key
 * for a page no chapter claims, because landing somewhere is better than
 * landing nowhere.
 */
export function chapterKeyForRoute(pathname) {
  const path = String(pathname || '');
  let best = null;
  for (const chapter of CHAPTERS) {
    for (const route of chapter.routes) {
      if (path === route || path.startsWith(`${route}/`) || path.startsWith(`${route}?`)) {
        if (!best || route.length > best.length) best = { key: chapter.key, length: route.length };
      }
    }
  }
  return best ? best.key : CHAPTERS[0].key;
}

/** A chapter by key, or null. */
export function chapterByKey(key) {
  return CHAPTERS.find((c) => c.key === key) || null;
}

/**
 * The chapter a couple should resume on: the first one they have not completed.
 *
 * Returns the first chapter when nothing is done, and null when everything is,
 * which is what the caller needs to distinguish "start here" from "you have
 * finished this".
 *
 * @param {string[]} dismissed  guidanceState.dismissed
 */
export function nextUnfinishedChapterKey(dismissed) {
  const done = new Set(dismissed || []);
  const next = CHAPTERS.find((c) => !done.has(chapterProgressKey(c.key)));
  return next ? next.key : null;
}

/** How many chapters are complete, for the rail's progress. */
export function completedCount(dismissed) {
  const done = new Set(dismissed || []);
  return CHAPTERS.filter((c) => done.has(chapterProgressKey(c.key))).length;
}

/**
 * A chapter with its placeholders filled.
 *
 * PURE, AND IT NEVER INVENTS. A missing name leaves the sentence without one
 * rather than printing a placeholder, the rule src/lib/emailGreeting.js exists
 * to state: the product must not read its own database out loud. The numbers
 * line is added ONLY when both numbers are real, because "0 guests, 0 replied
 * so far" is worse than the lead the chapter already has.
 *
 * @param {object} chapter
 * @param {{coupleFirstNames?: string, guestCount?: number, repliedCount?: number}} context
 */
export function resolveChapter(chapter, context = {}) {
  if (!chapter) return null;
  const names = typeof context.coupleFirstNames === 'string' ? context.coupleFirstNames.trim() : '';
  const fill = (text) => {
    if (typeof text !== 'string') return text;
    if (!text.includes('{coupleFirstNames}')) return text;
    // No name means no address, not "Welcome to your studio, ." So the clause
    // that carried the name is dropped with it.
    if (!names) return text.replace(/,?\s*\{coupleFirstNames\}/g, '');
    return text.replace(/\{coupleFirstNames\}/g, names);
  };

  const resolved = {
    ...chapter,
    title: fill(chapter.title),
    lead: fill(chapter.lead),
    body: fill(chapter.body),
    tip: fill(chapter.tip),
  };

  const n = context.guestCount;
  const m = context.repliedCount;
  if (chapter.leadWithNumbers && Number.isFinite(n) && n > 0 && Number.isFinite(m)) {
    resolved.lead = chapter.leadWithNumbers
      .replace('{n}', String(n))
      .replace('{m}', String(m));
  }
  delete resolved.leadWithNumbers;
  return resolved;
}

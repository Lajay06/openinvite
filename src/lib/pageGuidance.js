/**
 * src/lib/pageGuidance.js — what each page is for, in the couple's words.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 17: "Ava Studio — the guidance system, built behind a flag.
 * Two layers. A global first-run tour — 'Quick tips' — shown once after
 * onboarding completes, walking the dashboard. And a page-specific 'What's
 * here' panel on every page, opened from a consistent control, the way Ava is
 * both global and page-specific.
 *
 * Content model per page: { purpose, actions: [three strings], loop?, helpHref }.
 * Purpose is one sentence on what the page is for. Actions are the three
 * things most people do here. Loop, on four pages only (Guest list, Schedule,
 * Guest suite, Design studio), is the recurring thing to come back for."
 *
 * ── WHY THE CONTENT IS DATA AND NOT JSX ────────────────────────────────────
 *
 * Thirty-five pages, four fields each. Written into the panel component it
 * would be unreadable and unreviewable; written here it can be read end to
 * end, checked against the routes that actually exist, and held to the
 * product's copy rules by a test rather than by whoever reads the diff.
 *
 * ── THE RULES THIS COPY FOLLOWS ────────────────────────────────────────────
 *
 * Purpose is ONE sentence, about what the page is FOR, not about what is on
 * it. "A list of your guests" describes a screen; "Everyone you are inviting,
 * and where each of them stands" describes a job.
 *
 * Actions are the three things MOST PEOPLE do, in the order they do them —
 * not the three most impressive features. Each names something a couple can go
 * and do on the page they are already looking at.
 *
 * LOOP IS ON FOUR PAGES ONLY, as ruled. A recurring reason to return is a real
 * property of a page, not a slot to fill; putting one on Beauty would teach a
 * couple to come back to a page that has nothing new for them.
 *
 * No exclamation marks and no emoji — this is product chrome. Sentence case.
 * US English.
 */

/** Every page's guidance, keyed by the route the sidebar links to. */
export const PAGE_GUIDANCE = {
  // ── Planning ────────────────────────────────────────────────────────────
  '/DailyUpdate': {
    purpose: 'Where the wedding stands today, and the one thing worth doing next.',
    actions: ['Read what Ava has noticed since you were last here', 'Pick up anything overdue', 'Check the numbers against what you expected'],
    helpHref: '/Help#daily-update',
  },
  '/event-details': {
    purpose: 'The facts every other page is built on: who, when, where, and the shape of the day.',
    actions: ['Set the ceremony and reception venues', 'Add the events around the wedding day', 'Answer the five questions about the wedding’s character'],
    helpHref: '/Help#event-details',
  },
  '/Schedule': {
    purpose: 'Everything with a date on it, in one order — yours, your vendors’ and your to-dos’.',
    actions: ['Add an event or a moment', 'Switch to the run sheet for one event’s order of proceedings', 'Export the workbook for a vendor'],
    loop: 'Come back as each event firms up, and again in the last fortnight to build the run sheet.',
    helpHref: '/Help#schedule',
  },
  '/TodoList': {
    purpose: 'The jobs that are yours, in the order they need doing.',
    actions: ['Add what you have just thought of', 'Give the next few a date', 'Move what is done'],
    helpHref: '/Help#to-do',
  },
  '/Checklist': {
    purpose: 'How far along the wedding is, measured against what most weddings need.',
    actions: ['Read what is still open', 'Follow a group through to the page that owns it', 'Use it to decide what to do this month'],
    helpHref: '/Help#checklist',
  },

  // ── Guests ──────────────────────────────────────────────────────────────
  '/Guests': {
    purpose: 'Everyone you are inviting, and where each of them stands.',
    actions: ['Import or add your guests', 'Send invitations', 'Read the replies as they come in'],
    loop: 'Come back whenever a reply lands, and again before every deadline that depends on numbers.',
    helpHref: '/Help#guest-list',
  },
  '/Messages': {
    purpose: 'What your guests have written to you, and your replies.',
    actions: ['Read what has arrived', 'Reply, and the guest gets it by email', 'Mark what you have dealt with'],
    helpHref: '/Help#messages',
  },
  '/Seating': {
    purpose: 'Who sits where, built from the guests who have said yes.',
    actions: ['Lay out your tables', 'Put guests on them', 'Check nobody is left unassigned'],
    helpHref: '/Help#seating',
  },
  '/wedding-party': {
    purpose: 'The people standing beside you, and what each of them is doing.',
    actions: ['Add your party', 'Give each of them a role', 'Note what they need to know'],
    helpHref: '/Help#wedding-party',
  },

  // ── Style and experience ────────────────────────────────────────────────
  '/Moodboard': {
    purpose: 'The look you are going for, in pictures rather than words.',
    actions: ['Add images you like', 'Group them by what they are for', 'Share it with a vendor'],
    helpHref: '/Help#moodboard',
  },
  '/Styling': {
    purpose: 'What you and your party are wearing, and who is making it happen.',
    actions: ['Record what each of you is wearing', 'Add the vendors behind it', 'Note fittings and dates'],
    helpHref: '/Help#styling',
  },
  '/Beauty': {
    purpose: 'Hair, makeup and the timings they need on the morning.',
    actions: ['Add your artists', 'Record trials and what came of them', 'Work out how early the day starts'],
    helpHref: '/Help#beauty',
  },
  '/FoodBeverage': {
    purpose: 'What people are eating and drinking, and what the caterer needs from you.',
    actions: ['Set your menu options', 'Add the caterer and the bar', 'Check the dietary notes from your replies'],
    helpHref: '/Help#food-and-beverage',
  },
  '/Music': {
    purpose: 'The songs of the day — yours, and the ones your guests ask for.',
    actions: ['Add songs and tag them to a part of the day', 'Approve or decline what guests request', 'Link a playlist for your guests to hear'],
    helpHref: '/Help#music',
  },
  '/Photography': {
    purpose: 'Who is photographing the day, and the shots you do not want missed.',
    actions: ['Add your photographer and videographer', 'Write the shot list', 'Agree the hours and the timings'],
    helpHref: '/Help#photography',
  },
  '/VowsSpeeches': {
    purpose: 'The words that get said out loud, and who is saying them.',
    actions: ['Draft your vows', 'Note who is speaking and for how long', 'Keep the order of speeches'],
    helpHref: '/Help#vows-and-speeches',
  },
  '/wedding-favours': {
    purpose: 'What your guests take home.',
    actions: ['Decide what you are giving', 'Record the supplier and the cost', 'Count what you need against your replies'],
    helpHref: '/Help#guest-gifts',
  },
  '/Polls': {
    purpose: 'Questions you can put to your guests, and games for the day.',
    actions: ['Write a poll or a quiz', 'Choose who can answer it', 'Share the link and read the answers'],
    helpHref: '/Help#polls-and-games',
  },

  // ── Vendors ─────────────────────────────────────────────────────────────
  '/Vendors': {
    purpose: 'Everyone you are paying, what they cost and where each booking stands.',
    actions: ['Add a vendor and find them in the business search', 'Record quotes and deposits', 'Move a booking from researching to booked'],
    helpHref: '/Help#vendors',
  },
  '/VendorMarketplace': {
    purpose: 'Finding vendors near your venue, without leaving the product.',
    actions: ['Search a category', 'Read what is nearby', 'Add one to your vendors'],
    helpHref: '/Help#marketplace',
  },

  // ── On the day ──────────────────────────────────────────────────────────
  '/ceremony-details': {
    purpose: 'How the ceremony itself runs, beat by beat.',
    actions: ['Record the order of the ceremony', 'Note who walks, and when', 'Add readings and who is reading them'],
    helpHref: '/Help#ceremony-details',
  },
  '/transport': {
    purpose: 'How everyone gets there, and how they get home.',
    actions: ['Add the ways to reach the venue', 'Note pickup times and places', 'Say what you are arranging and what guests arrange themselves'],
    helpHref: '/Help#getting-here',
  },
  '/accommodation': {
    purpose: 'Where guests from out of town can stay.',
    actions: ['Add places near the venue', 'Note any rooms you have held', 'Say what you are covering'],
    helpHref: '/Help#stay',
  },
  '/emergency-contact': {
    purpose: 'Who to call on the day when something needs sorting and it is not you.',
    actions: ['Name the person in charge', 'Add the vendor numbers for the day', 'Note anything that must not reach you'],
    helpHref: '/Help#emergency-contact',
  },

  // ── Finances ────────────────────────────────────────────────────────────
  '/Budget': {
    purpose: 'What the wedding costs, against what you meant to spend.',
    actions: ['Set what each part is allowed', 'Record what has actually been paid', 'See what is left'],
    helpHref: '/Help#budget',
  },
  '/Registry': {
    purpose: 'What you would like, and where guests can find it.',
    actions: ['Add what you are asking for', 'Link a registry you already have', 'Say how you would rather be given a gift'],
    helpHref: '/Help#registry',
  },

  // ── Guest suite ─────────────────────────────────────────────────────────
  '/studio': {
    purpose: 'The wedding site your guests see, and every choice that shapes how it looks.',
    actions: ['Pick a universe and a typeface', 'Write the pages your guests read', 'Publish, and check the live link'],
    loop: 'Come back each time something changes that your guests should know about.',
    helpHref: '/Help#design-studio',
  },
  '/GuestSuiteSchedule': {
    purpose: 'The version of your schedule that your guests are allowed to see.',
    actions: ['Choose which events appear', 'Write what each one says to a guest', 'Check it against the real schedule'],
    loop: 'Come back whenever the day’s shape changes, so your guests are not reading last month’s plan.',
    helpHref: '/Help#guest-suite',
  },
  '/QandA': {
    purpose: 'The questions guests keep asking, answered once.',
    actions: ['Add a question and your answer', 'Reorder them so the common ones are first', 'Add anything a guest has asked you twice'],
    helpHref: '/Help#q-and-a',
  },
  '/GuestSuiteRegistry': {
    purpose: 'How your registry reads on the guest site.',
    actions: ['Choose what to show', 'Write the note that sits above it', 'Preview it as a guest'],
    helpHref: '/Help#guest-suite',
  },
  '/GuestSuiteAccommodation': {
    purpose: 'The places to stay, as a guest sees them.',
    actions: ['Add places near the venue', 'Say what you have arranged', 'Preview it as a guest'],
    helpHref: '/Help#guest-suite',
  },
  '/GuestSuiteTransport': {
    purpose: 'How to get there, as a guest sees it.',
    actions: ['Add the ways to reach the venue', 'Note anything you are laying on', 'Preview it as a guest'],
    helpHref: '/Help#guest-suite',
  },
  '/GuestSuiteExperience': {
    purpose: 'What there is to do around the wedding, for guests making a trip of it.',
    actions: ['Add places worth their time', 'Say why each one is here', 'Preview it as a guest'],
    helpHref: '/Help#guest-suite',
  },
  '/GuestSuitePolicies': {
    purpose: 'The things guests need to know before they arrive.',
    actions: ['Answer the questions about children, gifts and photographs', 'Add anything particular to your day', 'Preview it as a guest'],
    helpHref: '/Help#good-to-know',
  },
  '/GuestSuitePolls': {
    purpose: 'The polls your guests can answer from the wedding site.',
    actions: ['Choose which polls appear', 'Read the answers', 'Close one when you have what you need'],
    helpHref: '/Help#polls-and-games',
  },

  // ── Extras ──────────────────────────────────────────────────────────────
  '/honeymoon': {
    purpose: 'The trip after the wedding, planned in the same place as the wedding.',
    actions: ['Note where you are going and when', 'Record bookings and costs', 'Keep what you need to pack or arrange'],
    helpHref: '/Help#honeymoon',
  },
  '/Considerations': {
    purpose: 'What tends to matter for a wedding like yours, gathered in one place.',
    actions: ['Read what applies to your day', 'Take what is useful into your to-dos', 'Update Event details if anything here reads wrong'],
    helpHref: '/Help#considerations',
  },
};

/** The four pages a couple has a reason to return to, as ruled. */
export const LOOP_PAGES = ['/Guests', '/Schedule', '/GuestSuiteSchedule', '/studio'];

/**
 * The guidance for a path, or null.
 *
 * MATCHED ON THE PATH, NOT ON A PAGE NAME. The sidebar links some pages by
 * createPageUrl('X') and others by a literal route, so a name-based lookup
 * would quietly miss half of them. Trailing slashes and query strings are
 * stripped; nothing else is guessed.
 */
export function guidanceFor(pathname) {
  const path = String(pathname || '').split('?')[0].replace(/\/+$/, '') || '/';
  return PAGE_GUIDANCE[path] || null;
}

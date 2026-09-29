# Studio tour

One guided tour of the studio, to Openinvite standard. It replaces three things: the "Quick tips" sidebar item and its 7-card TipsModal, and the 6-stop QuickTipsTour that opens on first run. Those are retired in this goal. The "?" control on every page header stays and becomes a door into the tour.

## What it is

A chaptered walkthrough, one chapter per area of the studio, each with a short looping screen recording of the real product, three lines of copy in the house voice, one tip that most people miss, and a "Try it" button that takes the couple to the real page with the relevant control spotlighted. It is personalised: it uses the couple's names, their universe, their days to go, and their own numbers where they exist (guests, replies) from data already loaded. It never makes a new read.

## Where it appears

1. First run: opens full screen on the first dashboard load, before anything else. Two buttons: "Take the tour" with the total time shown, and "Later". Skipping or finishing writes guidanceState.tourSeenAt. It never opens automatically again.
2. Sidebar: "Studio tour" replaces "Quick tips", same position. Opens the tour from the start, or from the last unfinished chapter.
3. The "?" on every page header: opens the tour as a side panel, on that page's chapter first, with the rest of the chapters one tap away. The final chapter of the tour points at this control and pulses it once so the couple knows where help lives.

## Shape

- Chapters listed in a left rail with progress; completed chapter keys are stored in guidanceState.dismissed with a "tour:" prefix, so the tour resumes and no schema change is needed.
- Each chapter: recording (poster shown until loaded, only current and next chapter preloaded, autoplay muted loop, under 1.5 MB each), title, lead, body, tip, "Try it".
- Keyboard: arrows move chapters, Escape closes, focus trapped while open. prefers-reduced-motion shows the poster frame, no autoplay.
- Mobile: a full-height sheet at 390 with the rail as a horizontal strip.
- All chapter content lives as pure data in src/lib/studioTour.js so the mobile shell can import the same chapters later.

## Recordings

Record from the real product against the seeded fixture wedding, at 1440 and 390, with Playwright: a scripted interaction per chapter, 8 to 20 seconds, cursor visible, no personal data. Export webm plus mp4 plus a poster jpg. Upload to Cloudinary under studio-tour/<chapter>/<width>; reference by URL; keep the scripts in scripts/tour-recordings/ so they can be re-recorded after any UI change. If Cloudinary upload is not possible with the existing local credential, stop and report.

## Chapters and copy (mine, verbatim)

0. Welcome
Title: Welcome to your studio, {coupleFirstNames}.
Lead: Everything for the wedding lives here, in one place, in your voice.
Body: The left side is the map. Planning holds the day itself. Guests holds the people. Style and experience holds how it looks and feels. Design studio is where the invitation, the website and the entrance are made. Ava is beside you throughout.
Tip: You can leave this tour at any point and come back to it from Studio tour in the sidebar.
Try it: Daily update.

1. Event details
Title: Start with the facts.
Lead: Dates, places and the theme. Everything else reads from here.
Body: Add the ceremony and reception, then any pre-wedding and post-wedding events. Set the theme once: aesthetic, atmosphere, setting, cultures, faith. The guest site, the invitation and Ava all use it.
Tip: Dress code is a set of pills plus one line of notes per event. Guests see exactly what you set.
Try it: Event details, Theme tab, aesthetic pills spotlighted.

2. Schedule and To do
Title: The day, in order.
Lead: Every event, timed and chronological, on one schedule.
Body: The schedule is what your guests see and what your run sheet exports from, so it is one list, not two. To do is yours alone, with what matters next at the top.
Tip: Export the schedule as one workbook with two sheets: All events for you, Run sheet for the people running the day.
Try it: Schedule, export button spotlighted.

3. Guests
Title: The people.
Lead: Guest list, replies, seating and notes, all connected.
Body: Add guests, send invitations, and watch replies land on the list. Seating counts the same people the list does. When a guest sends you a note from your site, it appears in Messages, and your reply goes straight to their inbox.
Tip: Guests reply through their own personal link. If one loses it, the RSVP page will send it again.
Try it: Guest list, Send invitations spotlighted. Personalise the lead with live numbers when present: "{n} guests, {m} replied so far."

4. Style and experience
Title: How it feels.
Lead: Moodboard, styling, food, music, photography, and the small things guests remember.
Body: These pages shape the guest site as much as they shape the day. The music table takes requests from guests and lets you approve them. Good to know tells guests what to wear, where to park and what not to bring.
Tip: Anything you switch on for guests shows on the guest site exactly as you see it in the editor.
Try it: Music, Create playlist spotlighted.

5. Design studio
Title: Made to look like yours.
Lead: One universe, carried through the invitation, the website and the entrance.
Body: Pick your universe once. The guest suite is built on it, page by page. Change a photo or a line and the preview shows what guests will see. The entrance greets each guest by name when they arrive from their invitation.
Tip: Your web address is chosen here. Once invitations have gone out, old links keep working even if you change it.
Try it: Design studio, My Universe card spotlighted.

6. Ava
Title: Ava has read all of it.
Lead: A planner who knows your wedding, not a chatbot with a template.
Body: Ask Ava to draft a message, suggest a running order, or check what is missing. She reads your event details, your guest list and your theme before she answers, and she learns your preferences as you go.
Tip: The sparkle button in the corner opens Ava from any page.
Try it: Ava, with the composer focused.

7. Publish and share
Title: When you are ready, it is one click.
Lead: Publish the guest site, then send invitations from the guest list.
Body: Invitations go out by email in your names, each with the guest's personal link. Replies come back to the list. The guest site stays live and you can keep editing it; saves are published.
Tip: Send yourself a test invitation first. It is the fastest way to see the whole journey as a guest.
Try it: Guest Suite, Publish spotlighted.

8. Help, whenever you need it
Title: The question mark is always there.
Lead: Every page has one. It opens this tour at that page.
Body: Tap the question mark in the top right of any page for what is here and what most people miss. The Help center has the longer answers. Collaborate lets you bring a planner or a partner into the studio with you.
Tip: Studio tour lives in the sidebar. Come back any time.
Try it: pulse the "?" on the current page once, then close.

Finale card: "That is the studio. Go make it yours." Button: "Start planning", which lands on Daily update.

## Retire

TipsModal and its 7 cards; QuickTipsTour; the "Quick tips" sidebar label and route. Any text those carried that is not in the chapters above is dropped, not moved. WhatsHereControl and WhatsHerePanel stay, re-pointed to open the tour on the page's chapter.

## Guards

Render guard at 390 and 1440 for: first-run takeover, sidebar entry, "?" entry landing on the right chapter, resume from a half-finished tour, reduced motion showing posters, keyboard navigation. A copy guard pinning every chapter string verbatim and asserting no em or en dash and no emoji anywhere in the tour. A size guard failing on any recording over 1.5 MB. Mobile impact: the mobile shell would need the same tour; it must import src/lib/studioTour.js rather than keep its own chapters, and the recordings are shared by URL. Record this in the PR; do not touch the mobile branch.

## Not in this goal

Help center content. Ava's own onboarding. Translations. Split the browser guards into a parallel CI job; next goal after this one closes.

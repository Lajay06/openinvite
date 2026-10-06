# Per-event invitations

A wedding with 500 at the ceremony and 300 at the reception has to be able to say who is invited to what. The data already can: Guest.event_responses[].invited is per event, the RSVP form, seating and Send invites already read it, and replies are keyed by event. What is missing is the couple's control over it, and four surfaces that ignore it. No schema change.

## 1. Guests page: the control

Every guest row shows an "Invited to" set as compact event chips (ceremony, reception, each custom event), toggleable in place. Bulk: select guests, then "Invite to..." and "Remove from..." with the event list. Filter the list by event. Defaults unchanged: main events invited, custom events not, exactly as weddingEvents.js:141-175 resolves today, so no existing wedding changes. The per-event invite prompt at Guests.jsx:339 folds into this and goes away. Every write of event_responses from the Guests page is the full resolved set for that guest, never a single toggle.

The headline counts become per event when the wedding has more than one: for each event, "{n} invited, {m} replied". With one event, the counts read as they do now.

## 2. Send invites: the event step

A step before Select guests: "Which event is this about?" with the event list and "All events" as the first choice. Sub line: "Only guests invited to it will be on the list." Choosing an event filters the guest list to those invited to it; choosing All keeps today's behaviour. Nothing new is stamped: the send filters the list by event and the email lists the guest's own events, which is enough.

Invitation email: when the wedding has more than one event, the invite shows the guest's own events as one line each, name and date only. Venue and schedule stay the site's to reveal, as the template comment says. With one event, the invite is unchanged. Reminders and updates already show events; they now show only the guest's own.

## 3. Guest site: who sees which event

With a personal link, the celebration page, the schedule and the dress-code page show only the events the guest is invited to, read from event_responses, and the dress-code question "Which of these are you coming to?" is replaced by the guest's set. Without a link, an event is public only if no guest has been removed from it; an event any guest is not invited to is shown only on personal links. Computed from the guest list by the server allowlist path, no new field. The guest-facing schedule and the dashboard schedule read the same events; if the Schedule entity carries wedding-day items the guest should see, show them under their event, and say in the PR which source won and why. Good to know and the experience guide stay as they are.

## 4. Server: replies only for invited events

api/rsvp-submit.js keeps a submitted event row only if the guest is invited to that event; others are dropped and counted in the response, never written. Named exception, HELD. Custom event ids are assigned on save in the Event details save path, not only backfilled on load (EventDetails.jsx:695-710 stays as a second line of defense).

## 5. Dashboard and Ava

Daily update's RSVP chart and Ava's context (avaContextFormat.js:123-130 and :234-236) carry the event dimension: every event with invited and replied counts, and each guest's invited set. Ava can then answer "who is coming to the welcome drinks" from data she already has.

## 6. Fixtures and guards

Render fixture: guest B not invited to the reception, guest C not invited to Welcome drinks, guest D invited to all. Published fixture: one custom event with one guest removed from it. Guards: send for Welcome drinks addresses only the invited; B's personal link never shows the reception; the public site hides Welcome drinks and shows the ceremony; per-event counts match the fixture; rsvp-submit drops a row for an uninvited event; the invite email lists exactly the guest's events; at 390 and 1440 for every couple-facing surface. Copy guard pins the new strings verbatim, no dashes, no emoji.

## 7. Deleting an event

EventDetails must either refuse to delete an event that has replies, with the count and a plain sentence, or, when there are none, remove its event_responses entries from every guest and its schedule items. Today it does neither: EventDetails.jsx:930-936 filters the event out of the array and stops, leaving event_responses entries, RsvpResponse rows and schedule items pointing at an event that no longer exists. Guard with the fixture.

## Copy (mine, verbatim)

"Invited to" (column and chip group label). "Invite to..." and "Remove from..." (bulk). "{n} invited, {m} replied" (per-event count). "Which event is this about?" / "Only guests invited to it will be on the list." / "All events" (send step). Invite email line: "You are invited to:" followed by one line per event, "{eventName}, {date}".

## Mobile impact

Items 1 and 2 are dashboard; the shell needs the same control and step, recorded per PR. Item 3 is the guest site, shared by URL. Items 4 and 5 are server and context, shared.

## Not in this goal

Plus-one rules per event. Seating per event beyond what Seating.jsx:321 already does. Save the date targeting. Any schema change.

Closed 2026-10-06 at main 46ff3a1f8193573feb4afd96de1fe93d3b53d431, PRs #886 #887 #888 #889 #890 #891 #892 #893

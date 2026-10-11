# Site fixes batch 3 (owner walkthrough 2026-10-11; lane B, ahead of the mobile pass)

Lane B. Runs under the goal autonomy protocol in WORKFLOW.md. Marketing pages only. One PR per item. The mobile pass pauses after parity PR 2 (#966) and resumes when this goal closes.

## Scout (2026-10-11, production, before any build)

The home red section, "All the powerful tools..." (src/components/home/ValuePropSection.jsx):

- Height rule: height 100vh, overflow hidden. 900px at 1440 by 900, 844px at 390 by 844.
- Heading at 1440: 60px (clamp(26px, 4.17vw, 97px)), weight 700, line height 1.15, letter spacing -0.02em, white, five lines, in a box at left 5.56vw with max width 48.6vw (80px and 700px), centered vertically.
- Heading at 390: 23.4px (clamp(22px, 6vw, 40px)), weight 700, line height 1.2, five lines, full width with 24px side padding, centered vertically.
- Image: one photograph, full bleed, object-fit cover, centered.
- Text to image: the heading spans 0.486 of the width at 1440 and 0.877 at 390; it covers 0.186 and 0.146 of the area.
- No body copy, no button.

## Items, in this order: 1, 2, 5, 3, then the item 4 proposal

1. Home app section. Remove the Ava style title banner (Ava keeps its own). Rebuild the section as a twin of the red section: the same height rule, so it fits one screen with no scrolling at 1440 and at 390; a big heading on the left; the copy right sized; one picture on the right, the generic phone and its recording reduced to fit inside that height. Copy verbatim: heading "The whole planner, in your pocket."; body "Plan on the train, on the couch, in the queue for coffee. Your guest list, budget and seating chart on your phone and your computer, always the same wedding."; small line "iPhone and Android. Coming at launch." No store badges or links.
2. Features app section. The same shape and height rule, no banner, the dark "morning page" box kept. Heading "Everything, on your phone". Lines verbatim: "Add a guest from the car park; it is on your computer before you are back inside." / "Replies land on your phone as guests tap them." / "Check the budget in the queue, not at the desk." / "The seating chart in your hand at the venue walk-through." / the existing desktop sentence unchanged. Each claim is verified against the product before shipping; any that cannot be stood behind is printed instead of shipped.
5. The tour, small PR. Remove /tour from the navigation and the footer, keep the page live and its URL working, add noindex, keep the guards passing. Later, after item 4 is ruled: /tour becomes four moments at most (the morning page, replies arriving, the seating chart, the guest suite), each full width with one line of the owner's voice and nothing else; the nav link returns only when it reads like the rest of the site. The four moment page does not start before item 4's ruling.
3. /app. The same section treatment, larger allowed, still one screen for the hero. Goes ahead after items 1 and 2 (owner ruling 2026-10-11).
4. The product inside /features. Scout and propose, no build. For each feature section on /features, one real, tightly cropped still or short clip of that exact feature (the morning page, replies arriving, seating, budget, vendors, the guest suite) and where it sits inside the section's existing layout without changing its type, spacing, photography or rhythm. The page's feel stays as it is; the product adapts to the page, never the page to a screen recording. Stills from the rich fixture at the site's own crop ratios, inside the site's existing framed card style, no dashboard chrome, no browser chrome, no device frame. Printed as a table (section, asset with crop and size, placement, a one line caption in the owner's voice), then stop for a ruling.

## Guards

Each app section's height follows the red section's rule at 1440 and at 390; no Ava title banner on these sections; the copy pinned; the phone recording never resized out of its 1320 by 2868 aspect. Prerender regenerated with each PR.

## Merges

Self-merge under the protocol; print the merge SHA and the URLs for each PR. Stop at the item 4 proposal.

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".
